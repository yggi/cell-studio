import { describe, expect, it } from 'vitest';
import { openBelt, pulleys } from './belts';

describe('belts: two runs, outer tangents; pulleys by the ratio', () => {
  it('equal pulleys: the runs are parallel, a diameter apart', () => {
    const [[a1, a2], [b1, b2]] = openBelt({ x: 0, y: 0 }, 10, { x: 100, y: 0 }, 10)!;
    expect(a1.y).toBeCloseTo(a2.y, 9);
    expect(b1.y).toBeCloseTo(b2.y, 9);
    expect(Math.abs(a1.y - b1.y)).toBeCloseTo(20, 9);
  });
  it('each run touches both pulleys at a right angle to their radius (a tangent)', () => {
    const c1 = { x: 0, y: 0 };
    const c2 = { x: 120, y: 40 };
    for (const [p, q] of openBelt(c1, 30, c2, 12)!) {
      const run = { x: q.x - p.x, y: q.y - p.y };
      expect(Math.hypot(p.x - c1.x, p.y - c1.y)).toBeCloseTo(30, 6);
      expect(Math.hypot(q.x - c2.x, q.y - c2.y)).toBeCloseTo(12, 6);
      expect((p.x - c1.x) * run.x + (p.y - c1.y) * run.y).toBeCloseTo(0, 6);
      expect((q.x - c2.x) * run.x + (q.y - c2.y) * run.y).toBeCloseTo(0, 6);
    }
  });
  it('one pulley inside the other: no belt', () => {
    expect(openBelt({ x: 0, y: 0 }, 30, { x: 5, y: 0 }, 10)).toBeNull();
  });
  it('a cell at half its driver’s rate has a pulley twice the size (within its wheel)', () => {
    const [a, b] = pulleys(60, 120, 0.5);
    expect(b).toBeCloseTo(2 * a, 9);
    const [, big] = pulleys(60, 60, 0.05);
    expect(big).toBeLessThanOrEqual(60 * 0.46); // (clamped: still inside its wheel)
  });
});
