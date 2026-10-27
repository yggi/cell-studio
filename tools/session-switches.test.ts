import { describe, expect, it } from 'vitest';
import { percentile, switchesOf, within, type SwitchRecord } from './session-switches';

const at = (x: number, y: number) => `translate(${x}px, ${y}px)`;
const record = (over: Partial<SwitchRecord> = {}): SwitchRecord => ({
  at: 10_000,
  before: { a: at(0, 0), b: at(100, 50), gone: at(5, 5) },
  after: { a: at(0, 0), b: at(100, 50), new: at(200, 0) },
  scroll: { before: 300, after: 300, gutter: 300, paint: 300.5 },
  ...over,
});
// (60 Hz frames over the switch's window, one of them long)
const frames = Array.from({ length: 140 }, (_, i) => 9_000 + i * 16.6).map((t) => (t > 10_000 ? t + 120 : t));

describe('a followed session’s switches as drawn', () => {
  it('says what stayed, came and went, how far what stayed moved, the work and the frames round each', () => {
    const [s] = switchesOf([record()], frames, [
      [10_002, 120],
      [10_400, 60],
      [20_000, 900],
    ]);
    expect(s).toMatchObject({ stayed: 2, came: 1, went: 1, moved: 0, work: 180, longest: 120, scrollKept: true });
    // (one frame of 136 ms in about a hundred: the 95th percentile is a 60 Hz frame's)
    expect(s!.frame).toBeCloseTo(16.6, 6);
    expect(within(s!)).toBe(true);
  });

  it('holds a switch to the bounds: work, a cell that stayed moved, the scroll lost or the gutter left behind', () => {
    const [heavy] = switchesOf([record()], frames, [[10_002, 300]]);
    expect(within(heavy!)).toBe(false);
    const [moved] = switchesOf([record({ after: { a: at(0, 0.5), b: at(100, 50) } })], frames, []);
    expect(moved!.moved).toBe(0.5);
    expect(within(moved!)).toBe(false);
    const [lost] = switchesOf([record({ scroll: { before: 300, after: 0, gutter: 0, paint: 0 } })], frames, []);
    expect(lost!.scrollKept).toBe(false);
    const [behind] = switchesOf([record({ scroll: { before: 300, after: 300, gutter: 0, paint: 300 } })], frames, []);
    expect(behind!.scrollKept).toBe(false);
    // (a shorter text keeps it as far as it reaches)
    const [shorter] = switchesOf([record({ scroll: { before: 300, after: 120, max: 120, gutter: 120, paint: 120 } })], frames, []);
    expect(shorter!.scrollKept).toBe(true);
    // (frames a dropped one apart are no 60 Hz frames)
    const dropped = Array.from({ length: 140 }, (_, i) => 9_000 + i * 33.3);
    expect(within(switchesOf([record()], dropped, [])[0]!)).toBe(false);
    // (a cell whose line was rewritten isn't one that stayed: it may move, and is counted apart)
    const [rewritten] = switchesOf([record({ after: { a: at(0, 104), b: at(100, 50) }, rewritten: ['a'] })], frames, []);
    expect(rewritten).toMatchObject({ stayed: 1, rewritten: 1, rewrittenMoved: 104, moved: 0 });
    expect(within(rewritten!)).toBe(true);
    // (one whose after wasn't taken yet is left out)
    expect(switchesOf([record({ after: null })], frames, [])).toEqual([]);
  });

  it('takes the percentile by the nearest rank', () => {
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([5, 1, 3, 2, 4], 0.95)).toBe(5);
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
  });
});
