import { describe, expect, it } from 'vitest';
import { buildGraph } from './drawn';
import { compilePiece } from '../compile';
import { PRESETS } from '@yggi/cells/engine/presets';
import { isSide, sideEntries, sideless } from './side';

const SRC = `&intro label="A tune and its bass." about=&out
&tuneNote label="The tune climbs." about=&tune
&bar scan(1 1 1 1) step=120bpm
&tune step=4n 0 2 4 7
&lead s=saw loop=C4
&eq scope=xy &lead
&out map=sample [&tune * &lead]
`;

describe('the margin: notes and scopes beside the graph', () => {
  it('takes notes and scopes out of the graph, with their edges and readers', () => {
    const model = buildGraph(compilePiece(SRC));
    const g = sideless(model);
    const names = g.nodes.map((n) => n.cell?.name);
    expect(names).not.toContain('intro');
    expect(names).not.toContain('tuneNote');
    expect(names).not.toContain('eq');
    expect(names).toEqual(expect.arrayContaining(['tune', 'lead', 'out', 'bar']));
    const ids = new Set(g.nodes.map((n) => n.id));
    for (const e of g.edges) expect(ids.has(e.source) && ids.has(e.target), e.id).toBe(true);
    const edgeIds = new Set(g.edges.map((e) => e.id));
    for (const n of g.nets) for (const t of n.readers) expect(edgeIds.has(t)).toBe(true);
  });

  it('numbers the notes in the order the piece writes them, each with what it is about; a scope with what it watches', () => {
    const entries = sideEntries(buildGraph(compilePiece(SRC)));
    expect(entries.map((e) => [e.name, e.kind, e.mark, e.about])).toEqual([
      ['intro', 'note', 1, ['cell:out']],
      ['tuneNote', 'note', 2, ['cell:tune']],
      ['eq', 'scope', 0, ['cell:lead']],
    ]);
  });

  it('every example: what the margin holds is all its notes and scopes, and the graph keeps the rest', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const model = buildGraph(compilePiece(p.source));
      const side = model.nodes.filter(isSide).length;
      expect(sideEntries(model).length, key).toBe(side);
      expect(sideless(model).nodes.length, key).toBe(model.nodes.length - side);
    }
  });
});
