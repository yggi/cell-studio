import { describe, expect, test } from 'vitest';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compileSource } from '@yggi/cells/engine/compile';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import built from 'virtual:examples-index';
import { buildExamplesIndex, examplesIndexModule } from '../tools/examples-index';
import { ORDER } from '@yggi/cells/engine/order';
import { miniature } from './layout/miniature';
import { rowsKey } from './layout/start';
import { buildGraph } from './layout/drawn';

describe('examples/*.cells', () => {
  test('the build-time index lists every example in order, as compiling each file says', () => {
    const fresh = buildExamplesIndex();
    expect(built.map((e) => (e as { key: string }).key)).toEqual([...ORDER]);
    expect(built).toEqual(fresh);
    for (const e of fresh) {
      const m = pieceMeta(PRESETS[e.key].source);
      expect([e.title, e.description, e.tags, e.tier]).toEqual([m?.title, m?.description, m?.tags, m?.tier]); // (the tags are written canonical: checked above)
      expect(e.size, `${e.key}: size`).toBeGreaterThan(0);
      // its miniature: what the browser would work out from its text, one node per cell drawn and a dot per product
      expect(e.miniature, `${e.key}: miniature`).toEqual(miniature(PRESETS[e.key].source));
      const products = buildGraph(compileSource(PRESETS[e.key].source)).nodes.filter((n) => n.kind === 'junction').length;
      expect(e.miniature?.nodes, `${e.key}: miniature`).toHaveLength(e.size + products);
      // (laid out with the rows' order the index keeps, as the browser lays it out choosing afresh: the same order)
      expect(e.rows.key, `${e.key}: its graph's shape`).toBe(rowsKey(buildGraph(compileSource(PRESETS[e.key].source))));
    }
  }, 180_000); // (it works every miniature out again, each laid out twice first to choose its rows, junctions folded in: about 30 s alone on a quiet machine, 60 s or more on a loaded one)
  test('the index module keeps an endless cycle (JSON would make it null)', () => {
    // (the first entry of the index as built: working every miniature out again only to take one is slow)
    const [first] = built as ReturnType<typeof buildExamplesIndex>;
    const text = examplesIndexModule([{ ...first, time: { ends: null, cycle: Infinity, chance: false, longest: null } }]);
    expect(text).toContain('"cycle":Infinity');
  });
});
