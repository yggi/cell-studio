// Probe (not part of the gate): how the graph of an arranged piece is placed, and whether it keeps its sections' order
// (decision 016: a table of sections fans its sections over its top in braid order; the parts should be laid out so, left to
// right). For each piece with a table of sections: the crossings as drawn (nets laid) at the start (the layered drawing,
// before the physics) and at rest, and the sections' order kept: each section's cells, by the mean x of where they are, against
// the order of the sections' bulbs (inversions of n·(n−1)/2 pairs; 0: in order).
// Run: PROBE=out.txt npx vitest run tools/probe/section-order.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compileSource } from '@yggi/cells/engine/compile';
import { type GraphModel } from '@yggi/cells/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { ForceLayout } from '../../src/layout/physics';

/** Each table's sections, left to right on its fan, with the cells each steps. */
function sectionsOf(model: GraphModel): Map<string, { section: string; x: number; cells: string[] }[]> {
  const out = new Map<string, Map<string, { section: string; x: number; cells: string[] }>>();
  for (const e of model.edges) {
    if (!e.bulb || !e.bulbAt) continue;
    const t = out.get(e.from) ?? out.set(e.from, new Map()).get(e.from)!;
    const section = t.get(e.bulb) ?? t.set(e.bulb, { section: e.bulb, x: e.bulbAt.x, cells: [] }).get(e.bulb)!;
    section.cells.push(e.to);
  }
  return new Map([...out].map(([k, v]) => [k, [...v.values()].sort((a, b) => a.x - b.x)]));
}

/** Pairs of sections whose cells lie the other way round from their bulbs (by their cells' mean x). */
function inversions(sections: { cells: string[] }[], at: (id: string) => { x: number } | undefined): number {
  const xs = sections.map((t) => {
    const ps = t.cells.map(at).filter((p): p is { x: number } => !!p);
    return ps.reduce((a, p) => a + p.x, 0) / Math.max(1, ps.length);
  });
  let n = 0;
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) if (xs[i] > xs[j]) n++;
  return n;
}

describe.runIf(process.env.PROBE)('the sections’ order, at the start and at rest', () => {
  it('measures every arranged piece', () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    log('piece          sections  inversions start → rest   crossings start → rest');
    const sum = { inv0: 0, inv1: 0, c0: 0, c1: 0 };
    for (const [key, p] of Object.entries(PRESETS)) {
      const model = buildGraph(compileSource(p.source));
      const tables = sectionsOf(model);
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
        `${key.padEnd(14)} ${n.join('+').padEnd(9)} ${inv0.map((v, i) => `${v}/${pairs[i]}`).join(' ')} → ${inv1.map((v, i) => `${v}/${pairs[i]}`).join(' ')}      ${c0} → ${c1}`,
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
