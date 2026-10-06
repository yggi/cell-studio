import { describe, expect, it } from 'vitest';
import { HUB, wheelGeometry } from './wheel';

describe('wheel geometry', () => {
  it('is as at 128 px from there up', () => {
    const g = wheelGeometry(128);
    expect(g.rInner).toBeCloseTo(128 * HUB);
    expect(g.rOuter).toBe(57);
    expect(g.rDisc).toBe(63);
    expect(g.hand.width).toBe(2.5);
    expect(wheelGeometry(256).margin).toBe(7);
  });

  it('keeps every part in order at any size', () => {
    for (const size of [24, 44, 64, 96, 128, 200, 232]) {
      const g = wheelGeometry(size);
      expect(g.rHub).toBeGreaterThan(0);
      expect(g.rHub).toBeLessThan(g.rInner);
      expect(g.rInner).toBeLessThan(g.rOuter);
      expect(g.tick.r0).toBeGreaterThan(g.rOuter);
      expect(g.tick.r1).toBeLessThanOrEqual(g.rDisc + 1);
      expect(g.hand.r1).toBeLessThanOrEqual(g.rDisc);
    }
  });
});
