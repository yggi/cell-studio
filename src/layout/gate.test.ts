import { describe, expect, it } from 'vitest';
import { gateBars } from './gate';

describe("a gate's meter", () => {
  it('a bar per note, side by side and centred, as tall as the level', () => {
    const m = gateBars(128, 3, 0.4);
    expect(m.bars.map((b) => b.level)).toEqual([0.4, 0.4, 0.4]);
    // (in order, not overlapping, centred in the well)
    for (let i = 1; i < 3; i++) expect(m.bars[i].x).toBeGreaterThanOrEqual(m.bars[i - 1].x + m.bars[i - 1].width);
    const mid = (m.bars[0].x + m.bars[2].x + m.bars[2].width) / 2;
    expect(mid).toBeCloseTo(m.x + m.width / 2);
    expect(m.yOf(0)).toBeCloseTo(m.top + m.height);
    expect(m.yOf(1)).toBeCloseTo(m.top);
  });
  it('a rest is no bar; the level is clamped to the well', () => {
    expect(gateBars(128, 0, 1).bars).toEqual([]);
    expect(gateBars(128, 1, 2).bars[0].level).toBe(1);
  });
});
