// The fragment map's probe (#625): before the map is built, how the style ↔ structure balance trades fragments' distance
// from their style (weighted by certainty) against the springs' length, where its knee is on every pair of cells' axes,
// how many edges cross, and where the hubs sit. Skipped in `npm test`:
//   PROBE=/path/out.txt npx vitest run tools/probe/fragmentmap.test.ts && cat /path/out.txt
import { appendFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { AXES } from '@yggi/cells/engine/style';
import { mapGraph, mapLayout, type Placed } from '../../src/layout/fragmentmap';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
// (both ends are degenerate: at 0 nothing holds the graph in place and it drifts to a corner; at 1 the pieces, which no
// anchor holds yet, stay where they start. The knee is read on the open range between)
const BALANCES = Array.from({ length: 19 }, (_, i) => (i + 1) / 20);
const SEEDS = [0, 1, 2];
const PAIRS = AXES.flatMap((a, i) => AXES.slice(i + 1).map((b) => [a.name, b.name] as const));

/** How far fragments sit from their anchors, per axis, weighted by certainty: the style's error. */
function styleError(placed: readonly Placed[]): number {
  let [sum, w] = [0, 0];
  for (const p of placed) {
    const [ax, ay] = p.anchors;
    if (ax) ((sum += ax.certainty * Math.abs(p.x - ax.at)), (w += ax.certainty));
    if (ay) ((sum += ay.certainty * Math.abs(p.y - ay.at)), (w += ay.certainty));
  }
  return w ? sum / w : 0;
}
function crossings(placed: readonly Placed[], edges: readonly (readonly [string, string])[]): number {
  const at = new Map(placed.map((p) => [p.node.key, p]));
  const segs = edges.flatMap(([a, b]) => (at.has(a) && at.has(b) ? [[a, b, at.get(a)!, at.get(b)!] as const] : []));
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (cx - ax) * (by - ay) - (bx - ax) * (cy - ay);
  let n = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const [a1, b1, p, q] = segs[i]!;
      const [a2, b2, r, s] = segs[j]!;
      if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue;
      const d1 = ccw(r.x, r.y, s.x, s.y, p.x, p.y);
      const d2 = ccw(r.x, r.y, s.x, s.y, q.x, q.y);
      const d3 = ccw(p.x, p.y, q.x, q.y, r.x, r.y);
      const d4 = ccw(p.x, p.y, q.x, q.y, s.x, s.y);
      if (d1 * d2 < 0 && d3 * d4 < 0) n++;
    }
  return n;
}
const edgeLength = (placed: readonly Placed[], edges: readonly (readonly [string, string])[]) => {
  const at = new Map(placed.map((p) => [p.node.key, p]));
  const ls = edges.flatMap(([a, b]) => (at.has(a) && at.has(b) ? [Math.hypot(at.get(a)!.x - at.get(b)!.x, at.get(a)!.y - at.get(b)!.y)] : []));
  return ls.reduce((s, l) => s + l, 0) / ls.length;
};
/** The knee of a falling curve against a rising one: the point farthest from the chord between their ends, both normalised. */
function knee(xs: readonly number[], ys: readonly number[]): number {
  const norm = (v: readonly number[]) => {
    const [lo, hi] = [Math.min(...v), Math.max(...v)];
    return v.map((x) => (hi > lo ? (x - lo) / (hi - lo) : 0));
  };
  const [x, y] = [norm(xs), norm(ys)];
  const [x0, y0, x1, y1] = [x[0]!, y[0]!, x.at(-1)!, y.at(-1)!];
  const d = (i: number) => Math.abs((y1 - y0) * x[i]! - (x1 - x0) * y[i]! + x1 * y0 - y1 * x0) / Math.hypot(y1 - y0, x1 - x0);
  return BALANCES.reduce((best, _, i) => (d(i) > d(best) ? i : best), 0);
}

describe.runIf(process.env.PROBE)('the fragment map', () => {
  it('measures the balance on every pair of axes', () => {
    const graph = mapGraph();
    const kinds = ['fragment', 'piece', 'meeting'].map((k) => `${graph.nodes.filter((n) => n.kind === k).length} ${k}s`).join(', ');
    log(`# The fragment map's probe\n\n${graph.nodes.length} nodes (${kinds}), ${graph.edges.length} edges.\n`);
    const degree = new Map<string, number>();
    for (const [a, b] of graph.edges) for (const k of [a, b]) degree.set(k, (degree.get(k) ?? 0) + 1);
    const hubs = [...degree].sort((a, b) => b[1] - a[1]).slice(0, 6);
    log(`Hubs (degree): ${hubs.map(([k, d]) => `${k} ${d}`).join(', ')}\n`);
    const knees: number[] = [];
    const errKnees: number[] = [];
    for (const [xa, ya] of PAIRS) {
      log(`## ${xa} × ${ya} (means of ${SEEDS.length} seeds)\n\n| balance | style error | edge length | crossings | ms |\n|---|---|---|---|---|`);
      const rows = BALANCES.map((balance) => {
        const runs = SEEDS.map((seed) => {
          const t0 = performance.now();
          const placed = mapLayout(graph, xa, ya, { balance, seed });
          const ms = performance.now() - t0;
          return { err: styleError(placed), len: edgeLength(placed, graph.edges), cross: crossings(placed, graph.edges), ms, placed };
        });
        const mean = (f: (r: (typeof runs)[number]) => number) => runs.reduce((s2, r) => s2 + f(r), 0) / runs.length;
        const r = { balance, err: mean((r2) => r2.err), len: mean((r2) => r2.len), cross: mean((r2) => r2.cross), ms: mean((r2) => r2.ms), placed: runs[0]!.placed };
        log(`| ${balance.toFixed(2)} | ${r.err.toFixed(3)} | ${r.len.toFixed(3)} | ${r.cross.toFixed(0)} | ${r.ms.toFixed(0)} |`);
        return r;
      });
      // (the knee: style error falls as the balance rises, edge length rises)
      const k = knee(
        rows.map((r) => r.len),
        rows.map((r) => r.err),
      );
      knees.push(BALANCES[k]!);
      // (and the knee of the style error against the balance alone: where raising it stops buying style)
      const ke = knee(
        BALANCES,
        rows.map((r) => r.err),
      );
      errKnees.push(BALANCES[ke]!);
      log(`Style error's own knee: balance ${BALANCES[ke]!.toFixed(2)} (style error ${rows[ke]!.err.toFixed(3)}, ${rows[ke]!.cross.toFixed(0)} crossings).`);
      const at = rows[k]!;
      log(`\nKnee: balance ${BALANCES[k]!.toFixed(2)} (style error ${at.err.toFixed(3)}, edge length ${at.len.toFixed(3)}, ${at.cross.toFixed(0)} crossings).`);
      // (each hub at the knee: how far from the middle of its neighbours, and from its own anchor)
      const pos = new Map(at.placed.map((p) => [p.node.key, p]));
      const lines = hubs.map(([h]) => {
        const nb = graph.edges.flatMap(([a, b]) => (a === h ? [b] : b === h ? [a] : [])).map((k2) => pos.get(k2)!);
        const [mx, my] = [nb.reduce((s, p) => s + p.x, 0) / nb.length, nb.reduce((s, p) => s + p.y, 0) / nb.length];
        const p = pos.get(h)!;
        return `${h} at (${p.x.toFixed(2)}, ${p.y.toFixed(2)}), ${Math.hypot(p.x - mx, p.y - my).toFixed(3)} from its neighbours' middle`;
      });
      log(`Hubs: ${lines.join('; ')}.\n`);
    }
    const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
    log(`Style error's own knees: ${errKnees.map((k) => k.toFixed(2)).join(', ')}; median ${med(errKnees).toFixed(2)}.`);
    // (how long it takes: the ticks a layout runs, at the style error's knee, the mean of six pairs and three seeds)
    for (const ticks of [100, 150, 200, 300]) {
      const runs = PAIRS.flatMap(([xa, ya]) =>
        SEEDS.map((seed) => {
          const t0 = performance.now();
          const placed = mapLayout(graph, xa, ya, { balance: med(errKnees), seed, ticks });
          return { ms: performance.now() - t0, err: styleError(placed), cross: crossings(placed, graph.edges) };
        }),
      );
      const mean = (f: (r: (typeof runs)[number]) => number) => runs.reduce((s2, r) => s2 + f(r), 0) / runs.length;
      log(`${ticks} ticks: ${mean((r) => r.ms).toFixed(0)} ms, style error ${mean((r) => r.err).toFixed(3)}, ${mean((r) => r.cross).toFixed(0)} crossings.`);
    }
    log(`Knees over the six pairs: ${knees.map((k) => k.toFixed(2)).join(', ')}; median ${[...knees].sort((a, b) => a - b)[Math.floor(knees.length / 2)]!.toFixed(2)}.`);
  }, 600_000);
});
