// The graph's drawing, lifted from cells (#650 step 3): its pictures are held by the layout's baselines; this holds its key.
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells';
import { drawnWritten, structureKey } from './graph';

describe('the graph as drawn (#650)', () => {
  it('the key changes with the set of nodes and edges, not their contents', () => {
    const r = compileSource('&bar meter("4/4") step=120bpm\n&v s=sine loop=C4\n&t step=4n 0 2\n&out map=sample [&t * &v]');
    const g = drawnWritten(r);
    expect(structureKey({ nodes: g.nodes.map((n) => ({ ...n, depth: 9 })), edges: g.edges })).toBe(structureKey(g));
    expect(structureKey({ nodes: g.nodes.slice(1), edges: g.edges })).not.toBe(structureKey(g));
  });
});
