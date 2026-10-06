import { describe, expect, it } from 'vitest';
import { clusterDisc } from './clusters';

describe('clusterDisc', () => {
  it('centres on the members and covers most of them, not the furthest straggler', () => {
    const ms = [...Array(9)].map((_, i) => ({ x: Math.cos(i) * 10, y: Math.sin(i) * 10 }));
    const c = clusterDisc([...ms, { x: 1000, y: 0 }], 5, 0);
    expect(c.r).toBeLessThan(200); // (one far member doesn't stretch it to 1000)
    expect(c.r).toBeGreaterThan(0);
  });
  it('is never smaller than its minimum', () => {
    expect(clusterDisc([{ x: 3, y: 4 }], 0, 50)).toEqual({ x: 3, y: 4, r: 50 });
  });
});
