import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { ForceLayout, DEFAULT_LAYOUT, countCrossings } from './physics';
import type { LayoutQuality } from './quality';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';

// Every example laid out with the defaults and settled: the slow part of the layout tests. Each example is
// laid out once and every check below reads that one layout (it is the same layout each would make on its
// own); a file of its own, so it runs beside the rest of physics.test.ts.
const made: ForceLayout[] = [];
const settle = (source: string, opts: Partial<typeof DEFAULT_LAYOUT> = {}) => {
  const model = buildGraph(compileSource(source));
  const layout = new ForceLayout(undefined, { live: false, ...opts });
  layout.setGraph(model); // (petals hang from their parent: the physics only sees named cells)
  const start = layout.quality(); // (the layered drawing, before the physics relaxes it)
  layout.tick(500);
  made.push(layout);
  return { model, layout, start };
};
const library = Object.entries(PRESETS).map(([key, p]) => ({ key, source: p.source, ...settle(p.source) }));
afterAll(() => made.forEach((l) => l.destroy()));

describe('no overlaps', () => {
  it('settled examples have no overlapping nodes', () => {
    for (const { key, model, layout: l } of library) {
      const nodes = model.nodes.filter((n) => !n.petalOf);
      let worst = 0;
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const a = l.position(nodes[i].id)!;
          const b = l.position(nodes[j].id)!;
          worst = Math.max(worst, DEFAULT_LAYOUT.radius(nodes[i]) + DEFAULT_LAYOUT.radius(nodes[j]) - Math.hypot(a.x - b.x, a.y - b.y));
        }
      expect(worst, key).toBeLessThan(10); // at most a sliver
    }
  });
});

describe('drawn crossings', () => {
  it('every example: few crossings as drawn — laid out in layers, nothing pinned', () => {
    // (up to 25 cells: at most 8; the large arranged pieces at most one per cell — Cellscape's two barrels
    // read seven shared parts, which can't be drawn without crossings)
    let total = 0;
    for (const { key, model, layout: l } of library) {
      const cells = model.nodes.filter((n) => !n.petalOf).length;
      const c = l.drawnCrossings();
      total += c;
      expect(c, key).toBeLessThanOrEqual(cells <= 25 ? 8 : Math.ceil(cells * 1.1));
    }
    expect(total).toBeLessThanOrEqual(160); // the whole library (117 when this was written; 145 with five more pieces)
  });
});

describe('crossing-free layout', () => {
  it('edges may cross, but crossing edges still push apart a little', () => {
    const withUncross = library.reduce((n, { model, layout }) => n + countCrossings(layout, model), 0);
    const without = library.reduce((n, { source }) => {
      const { model, layout } = settle(source, { uncross: 0 });
      return n + countCrossings(layout, model);
    }, 0);
    expect(withUncross).toBeLessThanOrEqual(without);
  }, 30_000); // (every example laid out again, without the force)
});

// The layout's quality per example (quality.ts), against the recorded baseline: the library as a whole may
// not get worse, and a change that makes it better records the new numbers, so each PR's diff of
// quality.baseline.json shows what it did, piece by piece. Record: UPDATE_LAYOUT_BASELINE=1 npx vitest run src/layout/physics.library.test.ts
describe('layout quality', () => {
  type Row = LayoutQuality & { start: number };
  const path = 'src/layout/quality.baseline.json';
  const now: Record<string, Row> = Object.fromEntries(
    library.map(({ key, layout, start }) => {
      const { cells, ...settled } = layout.quality();
      return [key, { cells, start: start.crossings, ...settled }];
    }),
  );
  const sum = (rows: Record<string, Row>, f: (r: Row) => number) => Object.values(rows).reduce((a, r) => a + f(r), 0);

  it('is no worse than the baseline, over the library', () => {
    if (process.env.UPDATE_LAYOUT_BASELINE) {
      const lines = Object.entries(now).map(([key, r]) => `  ${JSON.stringify(key)}: ${JSON.stringify(r)}`);
      writeFileSync(path, `{\n${lines.join(',\n')}\n}\n`);
    }
    const base = JSON.parse(readFileSync(path, 'utf8')) as Record<string, Row>;
    expect(Object.keys(now).sort(), 'examples added or removed: record the baseline').toEqual(Object.keys(base).sort());
    const record = 'record it (UPDATE_LAYOUT_BASELINE=1) if the trade is worth it';
    expect(sum(now, (r) => r.crossings), `drawn crossings: ${record}`).toBeLessThanOrEqual(sum(base, (r) => r.crossings));
    expect(sum(now, (r) => r.intruders), `cells in a foreign cluster: ${record}`).toBeLessThanOrEqual(sum(base, (r) => r.intruders));
    expect(sum(now, (r) => r.clusters), `overlapping clusters: ${record}`).toBeLessThanOrEqual(sum(base, (r) => r.clusters));
    expect(sum(now, (r) => r.aim), `read heads' cells turned from their heads: ${record}`).toBeLessThanOrEqual(sum(base, (r) => r.aim ?? Infinity));
    expect(sum(now, (r) => r.width * r.height), `area: ${record}`).toBeLessThanOrEqual(sum(base, (r) => r.width * r.height) * 1.05);
  });
});
