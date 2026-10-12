// Probe (not part of the gate): how the graph of an arranged piece is placed, and whether it keeps its taps' order
// (decision 016: a table of taps fans its taps over its top in braid order; the parts should be laid out so, left to
// right). For each piece with a table of taps: the crossings as drawn (nets laid) at the start (the layered drawing,
// before the physics) and at rest, and the taps' order kept: each tap's cells, by the mean x of where they are, against
// the order of the taps' bulbs (inversions of n·(n−1)/2 pairs; 0: in order).
// Run: PROBE=out.txt npx vitest run tools/probe/tap-order.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '../../src/engine/presets';
import { compileSource } from '../../src/engine/compile';
import { type GraphModel } from '../../src/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { ForceLayout } from '../../src/layout/physics';

/** Each table's taps, left to right on its fan, with the cells each steps. */
function tapsOf(model: GraphModel): Map<string, { tap: string; x: number; cells: string[] }[]> {
  const out = new Map<string, Map<string, { tap: string; x: number; cells: string[] }>>();
  for (const e of model.edges) {
    if (!e.bulb || !e.bulbAt) continue;
    const t = out.get(e.from) ?? out.set(e.from, new Map()).get(e.from)!;
    const tap = t.get(e.bulb) ?? t.set(e.bulb, { tap: e.bulb, x: e.bulbAt.x, cells: [] }).get(e.bulb)!;
    tap.cells.push(e.to);
  }
  return new Map([...out].map(([k, v]) => [k, [...v.values()].sort((a, b) => a.x - b.x)]));
}

/** Pairs of taps whose cells lie the other way round from their bulbs (by their cells' mean x). */
function inversions(taps: { cells: string[] }[], at: (id: string) => { x: number } | undefined): number {
  const xs = taps.map((t) => {
    const ps = t.cells.map(at).filter((p): p is { x: number } => !!p);
    return ps.reduce((a, p) => a + p.x, 0) / Math.max(1, ps.length);
  });
  let n = 0;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[i] > xs[j]) n++;
  return n;
}

describe.runIf(process.env.PROBE)('the taps’ order, at the start and at rest', () => {
  it('measures every arranged piece', () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    log('piece          taps  inversions start → rest   crossings start → rest');
    const sum = { inv0: 0, inv1: 0, c0: 0, c1: 0 };
    for (const [key, p] of Object.entries(PRESETS)) {
      const model = buildGraph(compileSource(p.source));
      const tables = tapsOf(model);
      if (!tables.size) continue;
      const l = new ForceLayout(undefined, { live: false });
      l.setGraph(model);
      const at = (id: string) => l.position(id);
      const inv0 = [...tables.values()].map((t) => inversions(t, at));
      l.layNet();
      const c0 = l.quality().crossings;
      l.tick(500);
      l.layNet();
      const inv1 = [...tables.values()].map((t) => inversions(t, at));
      const c1 = l.quality().crossings;
      const n = [...tables.values()].map((t) => t.length);
      const pairs = n.map((k) => (k * (k - 1)) / 2);
      log(
        `${key.padEnd(14)} ${n.join('+').padEnd(5)} ${inv0.map((v, i) => `${v}/${pairs[i]}`).join(' ')} → ${inv1.map((v, i) => `${v}/${pairs[i]}`).join(' ')}      ${c0} → ${c1}`,
      );
      sum.inv0 += inv0.reduce((a, b) => a + b, 0);
      sum.inv1 += inv1.reduce((a, b) => a + b, 0);
      sum.c0 += c0;
      sum.c1 += c1;
      l.destroy();
    }
    log(`all: inversions ${sum.inv0} → ${sum.inv1}, crossings ${sum.c0} → ${sum.c1}`);
  }, 600_000);
});
