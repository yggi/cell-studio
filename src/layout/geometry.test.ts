import { describe, expect, it } from 'vitest';
import { polar, ringSegment } from './geometry';

describe('geometry', () => {
  it('measures turns clockwise from 12 o\'clock', () => {
    const [x0, y0] = polar(0, 0, 10, 0);
    const [x1, y1] = polar(0, 0, 10, 0.25);
    expect([Math.round(x0), Math.round(y0)]).toEqual([0, -10]);
    expect([Math.round(x1), Math.round(y1)]).toEqual([10, 0]);
  });

  it('uses the large-arc flag past half a turn', () => {
    expect(ringSegment(50, 50, 20, 40, 0, 0.25)).toContain('0 0 1');
    expect(ringSegment(50, 50, 20, 40, 0, 0.75)).toContain('0 1 1');
  });

  it('draws a full turn as two concentric rings', () => {
    const d = ringSegment(50, 50, 20, 40, 0, 1);
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d).not.toContain('NaN');
  });
});
