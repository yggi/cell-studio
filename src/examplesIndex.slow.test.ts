import { describe, expect, test } from 'vitest';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compilePiece } from './compile';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import built from 'virtual:examples-index';
import { buildExamplesIndex } from '../tools/examples-index';
import { ORDER } from '@yggi/cells/engine/order';
import { miniature } from './layout/miniature';
import { rowsKey } from './layout/start';
import { buildGraph } from './layout/drawn';
import { sideless } from './layout/side';
import { towerSetup } from './ui/towerSetup';

// (slow: every example's starts chosen afresh, in both layouts, each from six trial layouts — most of a minute; the
// index the build uses is kept by what it is made from, so this is also what says a kept one is stale)
describe('examples/*.md', () => {
  test('the build-time index lists every example in order, as compiling each file says', () => {
    const fresh = buildExamplesIndex();
    expect(built.map((e) => (e as { key: string }).key)).toEqual([...ORDER]);
    expect(built).toEqual(fresh);
    for (const e of fresh) {
      const m = pieceMeta(PRESETS[e.key].file);
      expect([e.title, e.description, e.tags, e.tier]).toEqual([m?.title, m?.description, m?.tags, m?.tier]); // (the tags are written canonical: checked above)
      expect(e.size, `${e.key}: size`).toBeGreaterThan(0);
      // its miniature: what the browser would work out from its text, one node per cell drawn and a dot per product
      expect(e.miniature, `${e.key}: miniature`).toEqual(miniature(PRESETS[e.key].source));
      const products = buildGraph(compilePiece(PRESETS[e.key].source)).nodes.filter((n) => n.kind === 'junction').length;
      expect(e.miniature?.nodes, `${e.key}: miniature`).toHaveLength(e.size + products);
      // (laid out with the rows' order the index keeps, as the browser lays it out choosing afresh: the same order)
      expect(e.rows.key, `${e.key}: its graph's shape`).toBe(rowsKey(buildGraph(compilePiece(PRESETS[e.key].source))));
      // (and in the tower layout, as graphLayout.svelte.ts hands it to the layout: its sockets, no petals, no notes)
      const program = compilePiece(PRESETS[e.key].source);
      const tower = towerSetup(program, buildGraph(program)).model;
      expect(e.towerRows.key, `${e.key}: its tower graph's shape`).toBe(rowsKey(sideless({ ...tower, nodes: tower.nodes.filter((n) => !n.petalOf) })));
    }
  });
});
