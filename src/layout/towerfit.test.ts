import { describe, expect, it } from 'vitest';
import { towerFit } from './towerfit';

describe('the tower fitted to the graph', () => {
  it('follows the graph where it already rises with the tower, interpolating between', () => {
    const f = towerFit([
      { at: 0, y: 300 },
      { at: 1, y: 200 },
      { at: 3, y: 0 },
    ])!;
    expect(f(0)).toBe(300);
    expect(f(1)).toBe(200);
    expect(f(2)).toBe(100);
    expect(f(-5)).toBe(300);
    expect(f(9)).toBe(0);
  });

  it('pools what runs against it: never lower in the graph for higher on the tower', () => {
    const f = towerFit([
      { at: 0, y: 300 },
      { at: 1, y: 100 },
      { at: 2, y: 200 },
      { at: 3, y: 0 },
    ])!;
    for (let d = 0; d < 3; d += 0.25) expect(f(d + 0.25)).toBeLessThanOrEqual(f(d) + 1e-9);
    expect(f(1)).toBeCloseTo(f(2), 6);
  });

  it('needs two heights on the tower; the constant and the card take no part', () => {
    expect(towerFit([{ at: 1, y: 0 }])).toBeNull();
    expect(
      towerFit([
        { at: -Infinity, y: 500 },
        { at: 1, y: 0 },
        { at: Infinity, y: -500 },
      ]),
    ).toBeNull();
  });
});
