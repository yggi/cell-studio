import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from './drawn';
import { edgeLabel } from '@yggi/cells/engine/transform';

const tail = '\n&v s=sine loop=C4\n&out map=sample [&t * &v]';

describe('degree(&x, n) and inverse(&x): a reference’s values moved before its table reads them (#31)', () => {
  const motif = '&m 0 1 2\n';
  it('the graph labels the reference with its operation', () => {
    // (&m read by another too: a net-ref, its edge drawn; read by &t alone it would be a bulb, #221)
    const r = compileSource(motif + '&t over=scale(0,5) step=2 degree(&m, 1) degree(inverse(&m), 4)\n&u step=2 &m' + tail);
    const edge = buildGraph(r).edges.find((e) => e.port === 'braid' && e.source === 'cell:t' && e.target.endsWith('m'))!;
    expect(edge.transforms).toEqual([[{ kind: 'degree', by: 1 }], [{ kind: 'inverse' }, { kind: 'degree', by: 4 }]]);
    expect(edgeLabel(edge)).toBe('×2 ^1 inverse ^4');
  });
});
