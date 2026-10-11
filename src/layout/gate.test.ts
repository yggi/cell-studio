import { describe, expect, it } from 'vitest';
import { gateBars } from './gate';

describe("a gate's meter", () => {
  it('a bar per note, side by side and centred, as tall as the velocity, under the gate', () => {
    const m = gateBars(128, 3, 0.8, 0.5);
    expect(m.bars).toHaveLength(3);
    expect(m.bars.map((b) => [b.velocity, b.level])).toEqual([
      [0.8, 0.5],
      [0.8, 0.5],
      [0.8, 0.5],
    ]);
    // (in order, not overlapping, centred in the well)
    for (let i = 1; i < 3; i++) expect(m.bars[i].x).toBeGreaterThanOrEqual(m.bars[i - 1].x + m.bars[i - 1].width);
    const mid = (m.bars[0].x + m.bars[2].x + m.bars[2].width) / 2;
    expect(mid).toBeCloseTo(m.x + m.width / 2);
    expect(m.yOf(0)).toBeCloseTo(m.top + m.height);
    expect(m.yOf(1)).toBeCloseTo(m.top);
  });
  it('a rest is no bar; levels are clamped to the well', () => {
    expect(gateBars(128, 0, 1, 1).bars).toEqual([]);
    expect(gateBars(128, 1, 2, -1).bars[0]).toMatchObject({ velocity: 1, level: 0 });
  });
});
