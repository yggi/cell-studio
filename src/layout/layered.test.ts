import { describe, expect, it } from 'vitest';
import { layered } from './layered';
import { DEFAULT_LAYOUT } from './physics';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';

describe('layered: tags as blocks', () => {
  for (const key of ['cellscape', 'baustelle', 'hypercell', 'brothers'] as const) {
    it(`${key}: each tag starts as a block of its own, and no two blocks overlap`, () => {
      const model = buildGraph(compileSource(PRESETS[key].source));
      const byId = new Map(model.nodes.map((n) => [n.id, n]));
      const radius = (id: string) => DEFAULT_LAYOUT.radius(byId.get(id)!);
      const at = layered(model, { gapX: 54, gapY: 130, radius });
      const box = new Map<string, [number, number, number, number]>();
      for (const n of model.nodes) {
        const t = !n.petalOf && !n.cell.note ? n.cell.tags[0] : undefined;
        if (!t) continue;
        const p = at.get(n.id)!;
        const r = radius(n.id);
        const b = box.get(t) ?? [Infinity, Infinity, -Infinity, -Infinity];
        box.set(t, [Math.min(b[0], p.x - r), Math.min(b[1], p.y - r), Math.max(b[2], p.x + r), Math.max(b[3], p.y + r)]);
      }
      expect(box.size).toBeGreaterThan(2);
      const bs = [...box];
      for (let i = 0; i < bs.length; i++)
        for (let j = i + 1; j < bs.length; j++) {
          const [[s, a], [t, b]] = [bs[i], bs[j]];
          // (apart, but for the few px any two rows share: two wheels' radii are a little more than a row)
          const dx = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
          const dy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
          expect(Math.min(dx, dy), `${s} and ${t}: ${Math.round(dx)} × ${Math.round(dy)}`).toBeLessThan(10);
        }
    });
  }

  it('one level (flat): tags interleave as they fall', () => {
    const model = buildGraph(compileSource(PRESETS.baustelle.source));
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    const o = { gapX: 54, gapY: 130, radius: (id: string) => DEFAULT_LAYOUT.radius(byId.get(id)!) };
    expect(layered(model, { ...o, flat: true })).not.toEqual(layered(model, o));
  });
});
