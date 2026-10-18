import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { beltLabel, beltRatio, openBelt, pulleys } from './belts';

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
  it('a belt on a tap of a meter: its ratio the tap’s steps per the meter’s, as a driven step’s (decision 040)', () => {
    const r = compileSource('&bar scan(1 1 1 1) step=104bpm motor=4 mass=1\n&b step=8n belt=3000 0 1\n&c step=&bar*2 belt=30 0 1\n&d step=1m belt=30 0');
    expect(beltRatio(r, 'b')).toBeCloseTo(2, 9);
    expect(beltRatio(r, 'c')).toBeCloseTo(2, 9);
    expect(beltRatio(r, 'd')).toBeCloseTo(0.25, 9);
    expect(beltRatio(r, 'bar')).toBe(1);
  });
  it('a belt that names no rate gets its ratio (`×2 · belt`); a label with one already, a tap (`8n · belt`), or a ratio of 1, stays', () => {
    expect(beltLabel('· belt', 2)).toBe('×2 · belt');
    expect(beltLabel('loop · belt', 2)).toBe('×2 loop · belt');
    expect(beltLabel('8n · belt', 2)).toBe('8n · belt');
    expect(beltLabel('beat · belt', 0.5)).toBe('beat · belt');
    expect(beltLabel('· belt', 0.25)).toBe('÷4 · belt');
    expect(beltLabel('· belt', 4 / 3)).toBe('×1.33 · belt');
    expect(beltLabel('×2 · belt', 2)).toBe('×2 · belt');
    expect(beltLabel('· belt', 1)).toBe('· belt');
    expect(beltLabel(undefined, 2)).toBe('×2');
    expect(beltLabel(undefined, 1)).toBeNull();
  });
});
