import { describe, expect, it } from 'vitest';
import { angleOf, nearestRotation, rotationFor, segmentAt, segmentAtTop, turnDelta } from './dial';

describe('dial', () => {
  it('rotationFor and segmentAtTop are inverse', () => {
    for (const n of [7, 12]) for (let p = 0; p < n; p++) expect(segmentAtTop(rotationFor(p, n), n)).toBe(p);
  });

  it('snaps to the closest equivalent rotation', () => {
    expect(nearestRotation(-350, 0, 12)).toBe(-360);
    expect(nearestRotation(10, 11, 12)).toBe(30); // 11 is one step anticlockwise of 0
    expect(segmentAtTop(30, 12)).toBe(11);
  });

  it('finds the tapped segment on a rotated ring', () => {
    expect(segmentAt(0, 0, 12)).toBe(0);
    expect(segmentAt(0.25, 0, 12)).toBe(3); // 3 o'clock
    expect(segmentAt(0.25, rotationFor(3, 12), 12)).toBe(6);
  });

  it('measures screen angles clockwise from 12 o\'clock', () => {
    expect(angleOf(0, -1, 0, 0)).toBeCloseTo(0);
    expect(angleOf(1, 0, 0, 0)).toBeCloseTo(0.25);
    expect(angleOf(0, 1, 0, 0)).toBeCloseTo(0.5);
    expect(turnDelta(0.95, 0.05)).toBeCloseTo(0.1);
    expect(turnDelta(0.05, 0.95)).toBeCloseTo(-0.1);
  });
});
