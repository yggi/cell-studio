// Probe (not part of the gate): the tower layout (src/layout/towerlayout.ts, docs/notes/tower-strip.md) against the
// signal path's, over the library, three seeds. Each example laid out as the app lays it out (500 ticks, layNet):
// today; today without the card's node (the same edges the tower layout draws, so crossings compare like for like);
// the tower layout (heights held, its few forces); the tower layout with today's forces. Measured: crossings and their
// cost between drawn edges, area, overlaps, and the tower's own nets into the strip (one a base frequency): what their
// trunks cross (cells in their way, drawn edges; not each other) and how long they are.
// Run: PROBE=out.txt npx vitest run tools/probe/tower-layout.test.ts   (ONLY=word: the examples with it in their key;
// VARIANTS=0,2: only those rows; SEEDS=0,1,2)
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { ForceLayout } from '../../src/layout/physics';
import { type GraphModel } from '../../src/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '../../src/engine/compile';
import { PRESETS } from '../../src/engine/presets';
import { TOWER_LAYOUT, type LayoutOptions } from '../../src/layout/options';
import { netPaths, socketHeights, towerHeights, towerIns, towerNets, towerOuts, withoutCard, withSockets } from '../../src/layout/towerlayout';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');

type Variant = { name: string; tower: boolean; card: boolean; opts: Partial<LayoutOptions>; sockets?: boolean };
// (the few forces first tried)
const FEW: Partial<LayoutOptions> = { rankPull: 0, columnPull: 0, upPull: 0, spread: 0, kindRepel: 0, tagPull: 0, tagRepel: 0, mux: 0, clusters: false, rowOrder: 0, placeLast: 0 };
const VARIANTS: Variant[] = [
  { name: 'today (the signal path)', tower: false, card: true, opts: {} },
  { name: 'today, no card node', tower: false, card: false, opts: {} },
  { name: 'tower, few forces (as first built)', tower: true, card: false, opts: FEW },
  { name: 'tower, TOWER_LAYOUT', tower: true, card: false, opts: TOWER_LAYOUT },
  { name: 'tower, TOWER_LAYOUT, a socket each into the card', tower: true, card: false, opts: TOWER_LAYOUT, sockets: true },
  { name: "tower, today's forces", tower: true, card: false, opts: {} },
  // a middle set: one of today's forces back at a time, then together (meters last now held to their row)
  { name: '… + spread', tower: true, card: false, opts: { ...FEW, spread: 0.5 } },
  { name: '… + columns', tower: true, card: false, opts: { ...FEW, columnPull: 0.035 } },
  { name: '… + row trials', tower: true, card: false, opts: { ...FEW, rowOrder: 3 } },
  { name: '… + meters last (on their row)', tower: true, card: false, opts: { ...FEW, placeLast: 1 } },
  { name: '… + row trials, spread, columns', tower: true, card: false, opts: { ...FEW, rowOrder: 3, spread: 0.5, columnPull: 0.035 } },
  { name: '… + row trials, spread, columns, meters last', tower: true, card: false, opts: { ...FEW, rowOrder: 3, spread: 0.5, columnPull: 0.035, placeLast: 1 } },
  // today's forces, the meters where the forces leave them
  { name: "tower, today's forces, no meters last", tower: true, card: false, opts: { placeLast: 0 } },
  { name: '… and no kinds apart', tower: true, card: false, opts: { placeLast: 0, kindRepel: 0 } },
  { name: '… and no tags', tower: true, card: false, opts: { placeLast: 0, tagPull: 0, tagRepel: 0, mux: 0, clusters: false } },
];

interface Row {
  crossings: number;
  cost: number;
  area: number;
  overlap: number;
  /** The tower's wires into the strips: how many, the cells they pass over, the drawn edges they cross, their length (px). */
  wires: number;
  overCells: number;
  /** Of those, cells with no height (they can move off a row). */
  overFree: number;
  /** Hops the routed wires make round cells, and how much longer they are for it (px). */
  hops: number;
  overEdges: number;
  length: number;
  /** Nodes held at a height, and all nodes laid out. */
  held: number;
  nodes: number;
}

type Placed = {
  nodes: { id: string; x: number; y: number; r: number; label?: boolean; of?: string }[];
  edges: { a: string; b: string }[];
};

/** Does the level segment at y from x0 to x1 cross the straight segment p–q? */
function crossesLevel(y: number, x0: number, x1: number, p: { x: number; y: number }, q: { x: number; y: number }): boolean {
  if ((p.y - y) * (q.y - y) >= 0) return false;
  const x = p.x + ((q.x - p.x) * (y - p.y)) / (q.y - p.y);
  return x > Math.min(x0, x1) && x < Math.max(x0, x1);
}

function measure(source: string, v: Variant, seed: number): Row {
  const program = compileSource(source);
  const whole = buildGraph(program);
  const model: GraphModel = v.card ? whole : v.sockets ? withSockets(whole) : withoutCard(whole);
  const heights = v.tower ? new Map([...towerHeights(program, model), ...(v.sockets ? socketHeights(program, whole, model) : [])]) : undefined;
  const outs = towerOuts(program, whole);
  const l = new ForceLayout(undefined, { live: false, seed, ...v.opts, ...(heights ? { heights } : {}) });
  l.setGraph({ ...model, nodes: model.nodes.filter((n) => !n.petalOf) });
  l.tick(500);
  l.layNet();
  const q = l.quality();
  const row: Row = {
    crossings: q.crossings,
    cost: q.cost,
    area: (q.width * q.height) / 1e6,
    overlap: q.overlap > 1 ? 1 : 0,
    wires: 0,
    overCells: 0,
    overFree: 0,
    hops: 0,
    overEdges: 0,
    length: 0,
    held: heights?.size ?? 0,
    nodes: model.nodes.filter((n) => !n.petalOf).length,
  };
  if (v.tower && !v.sockets) {
    const placed = (l as unknown as { placed(): Placed }).placed();
    const at = new Map(placed.nodes.map((n) => [n.id, n]));
    // (the strip stands just outside the graph's box, at its right)
    const cells = placed.nodes.filter((n) => !n.label);
    const xr = Math.max(...cells.map((n) => n.x + n.r)) + 40;
    // (a voice's room is its wheel and its label: its body, the part a wire visibly crosses, about 0.7 of it)
    const obstacles = placed.nodes
      .filter((n) => !n.label || n.of)
      .map((n) => ({ of: n.of ?? n.id, x0: n.x - n.r * 0.7, x1: n.x + n.r * 0.7, top: n.y - n.r * 0.7, bottom: n.y + n.r * 0.7 }));
    const ins = towerIns(outs, program, (id) => {
      const n = at.get(id);
      return n && { x: n.x, y: n.y, height: n.r * 1.4 };
    });
    // one net a base frequency, its trunk from its first source to the strip at the right (its wires crossing each
    // other don't count: they are one bus into the card)
    for (const net of towerNets(ins)) {
      const own = new Set(net.taps.map((t) => t.from));
      const x0 = net.taps[0].x;
      row.wires++;
      row.length += xr - x0;
      for (const n of placed.nodes) {
        if (own.has(n.id) || own.has(n.of ?? '') || (n.label && !n.of)) continue;
        if (Math.abs(n.y - net.top) < n.r * 0.7 && n.x > x0 && n.x < xr) {
          row.overCells++;
          if (!heights!.has(n.of ?? n.id)) row.overFree++;
        }
      }
      row.hops += netPaths(net, xr, obstacles).hops;
      for (const e of placed.edges) {
        if (own.has(e.a) || own.has(e.b)) continue;
        const p = at.get(e.a);
        const r = at.get(e.b);
        if (p && r && crossesLevel(net.top, x0, xr, p, r)) row.overEdges++;
      }
    }
  }
  l.destroy();
  return row;
}

describe.runIf(process.env.PROBE)('the tower layout', () => {
  it('measures the library', () => {
    const only = process.env.ONLY;
    const pieces = Object.entries(PRESETS).filter(([k]) => !only || k.toLowerCase().includes(only.toLowerCase()));
    const pick = process.env.VARIANTS?.split(',').map(Number);
    const variants = pick ? VARIANTS.filter((_, i) => pick.includes(i)) : VARIANTS;
    const seeds = (process.env.SEEDS ?? '0,1,2').split(',').map(Number);
    log(`# The tower layout (${pieces.length} pieces × ${seeds.length} seeds; library sums, mean over seeds)\n`);
    log('| layout | crossings | cost | area Mpx² | pieces with an overlap | nets into the strip | over a cell (of them free) | hops routed | over an edge | wire length kpx |');
    log('|---|---|---|---|---|---|---|---|---|---|');
    const perPiece = new Map<string, Map<string, Row>>();
    let held = 0;
    let nodes = 0;
    for (const v of variants) {
      const rows: Row[] = [];
      for (const seed of seeds)
        for (const [key, p] of pieces) {
          const r = measure(p.source, v, seed);
          rows.push(r);
          const m = perPiece.get(key) ?? new Map<string, Row>();
          const acc = m.get(v.name);
          m.set(v.name, acc ? { ...acc, crossings: acc.crossings + r.crossings, overCells: acc.overCells + r.overCells, overEdges: acc.overEdges + r.overEdges } : { ...r });
          perPiece.set(key, m);
          if (v.tower && seed === seeds[0] && v === variants.find((x) => x.tower)) {
            held += r.held;
            nodes += r.nodes;
          }
        }
      const sum = (f: (r: Row) => number) => rows.reduce((n, r) => n + f(r), 0) / seeds.length;
      const t = v.tower;
      log(
        `| ${v.name} | ${sum((r) => r.crossings).toFixed(1)} | ${sum((r) => r.cost).toFixed(1)} | ${sum((r) => r.area).toFixed(1)} | ${sum((r) => r.overlap).toFixed(1)} | ${t ? sum((r) => r.wires).toFixed(0) : '—'} | ${t ? `${sum((r) => r.overCells).toFixed(1)} (${sum((r) => r.overFree).toFixed(1)})` : '—'} | ${t ? sum((r) => r.hops).toFixed(1) : '—'} | ${t ? sum((r) => r.overEdges).toFixed(1) : '—'} | ${t ? (sum((r) => r.length) / 1000).toFixed(0) : '—'} |`,
      );
    }
    if (nodes) log(`\nheld at a height: ${held} of ${nodes} nodes (${Math.round((100 * held) / nodes)} %)`);
    // the pieces the tower layout helps or hurts most, crossings against today without the card (mean of the seeds)
    const [base, tower] = [variants.find((v) => !v.tower && !v.card), variants.find((v) => v.opts === TOWER_LAYOUT)];
    if (!base || !tower) return;
    const d = [...perPiece]
      .map(([k, m]) => ({
        k,
        base: (m.get(base.name)?.crossings ?? 0) / seeds.length,
        tower: (m.get(tower.name)?.crossings ?? 0) / seeds.length,
        cells: (m.get(tower.name)?.overCells ?? 0) / seeds.length,
        edges: (m.get(tower.name)?.overEdges ?? 0) / seeds.length,
      }))
      .sort((a, b) => b.tower - b.base - (a.tower - a.base));
    log(`\ncrossings by piece, ${base.name} → ${tower.name} (+ its wires over cells / over edges), the most hurt first:`);
    for (const r of d.slice(0, 10)) log(`  ${r.k.padEnd(28)} ${r.base.toFixed(1)} → ${r.tower.toFixed(1)}  (+${r.cells.toFixed(1)} / +${r.edges.toFixed(1)})`);
    log('  …');
    for (const r of d.slice(-6)) log(`  ${r.k.padEnd(28)} ${r.base.toFixed(1)} → ${r.tower.toFixed(1)}  (+${r.cells.toFixed(1)} / +${r.edges.toFixed(1)})`);
    log(`\nwaltz: ${JSON.stringify(d.find((r) => r.k.includes('waltz')))}`);
  }, 3_600_000);
});
