// The graph's drawing lifted from cells (#650 step 3): a node's ring and a step's belt, worked out here, are what cells'
// written graph gave them at v0.30.0, for every example. At the pin that takes cells' removal of those fields this
// equality has nothing left to compare against, and goes: its pictures stay held by the layout's baselines.
import { describe, expect, it } from 'vitest';
import { compileSource, EXAMPLES, resolveSeed } from '@yggi/cells';
import { writtenGraph } from '@yggi/cells/inspect';
import { drawnWritten, structureKey } from './graph';

describe('the drawing lifted from cells’ graph (#650)', () => {
  it('every example: each node at the ring cells gave it, each belt where cells drew one', () => {
    let belts = 0;
    for (const [key, { source }] of Object.entries(EXAMPLES)) {
      const r = compileSource(source, undefined, { resolve: resolveSeed });
      const theirs = writtenGraph(r) as unknown as { nodes: { id: string; depth: number }[]; edges: { id: string; belt?: string }[] };
      const ours = drawnWritten(r);
      expect(
        ours.nodes.map((n) => [n.id, n.depth]),
        key,
      ).toEqual(theirs.nodes.map((n) => [n.id, n.depth]));
      expect(
        ours.edges.map((e) => [e.id, e.belt ?? null]),
        key,
      ).toEqual(theirs.edges.map((e) => [e.id, e.belt ?? null]));
      belts += ours.edges.filter((e) => e.belt).length;
    }
    // (some piece has a belt: the comparison is shown reaching one)
    expect(belts).toBeGreaterThan(0);
  });

  it('the key changes with the set of nodes and edges, not their contents', () => {
    const r = compileSource('&bar meter("4/4") step=120bpm\n&v s=sine loop=C4\n&t step=4n 0 2\n&out map=sample [&t * &v]');
    const g = drawnWritten(r);
    expect(structureKey({ nodes: g.nodes.map((n) => ({ ...n, depth: 9 })), edges: g.edges })).toBe(structureKey(g));
    expect(structureKey({ nodes: g.nodes.slice(1), edges: g.edges })).not.toBe(structureKey(g));
  });
});
