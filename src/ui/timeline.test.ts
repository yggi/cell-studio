import { describe, expect, it } from 'vitest';
import { DRAG_PX, keyTarget, segmentAt, segmentsOf, stillJump, timeAt } from './timeline';

// Pop's shape: intro · verse · verse · chorus · break · chorus, over 60 s
const POP = [
  { at: 0, label: 'intro' },
  { at: 10, label: 'verse' },
  { at: 20, label: 'verse' },
  { at: 30, label: 'chorus' },
  { at: 40, label: 'break' },
  { at: 50, label: 'chorus' },
];
const WIDE = 1000;

describe('segmentsOf', () => {
  it('makes a run of one name one segment, a tick at each repeat', () => {
    const verse = segmentsOf(POP, 60, WIDE).find((s) => s.label === 'verse')!;
    expect(verse).toMatchObject({ from: 10, to: 30, ticks: [20] });
  });

  it('keeps two runs of one name apart as two segments', () => {
    const labels = segmentsOf(POP, 60, WIDE).map((s) => s.label);
    expect(labels).toEqual(['intro', 'verse', 'chorus', 'break', 'chorus']);
  });

  it('starts with an unnamed segment from 0 when the first section starts later', () => {
    const [lead, first] = segmentsOf([{ at: 8, label: 'verse' }], 32, WIDE);
    expect(lead).toMatchObject({ from: 0, to: 8, label: '', named: false });
    expect(first).toMatchObject({ from: 8, to: 32, label: 'verse' });
  });

  it('names a segment only where its name fits its width', () => {
    // 'chorus' needs 6 × 6.8 + 16 = 56.8 px: a sixth of the span is 60 px at 360, 50 px at 300
    const chorus = (width: number) => segmentsOf(POP, 60, width).find((s) => s.from === 50)!;
    expect(chorus(360).named).toBe(true);
    expect(chorus(300).named).toBe(false);
  });

  it('is one unnamed segment over the span without sections, and none without a span', () => {
    expect(segmentsOf(null, 90, WIDE)).toEqual([{ from: 0, to: 90, label: '', named: false, ticks: [] }]);
    expect(segmentsOf([], 90, WIDE)).toHaveLength(1);
    expect(segmentsOf(POP, null, WIDE)).toEqual([]);
  });
});

describe('segmentAt', () => {
  const segs = segmentsOf(POP, 60, WIDE);
  it('at a boundary is the segment that starts there', () => {
    expect(segmentAt(segs, 30)?.label).toBe('chorus');
    expect(segmentAt(segs, 29.99)?.label).toBe('verse');
  });
  it('at the span’s end (or past it) is the last', () => {
    expect(segmentAt(segs, 60)?.from).toBe(50);
    expect(segmentAt(segs, 75)?.from).toBe(50);
  });
  it('on a repeat’s tick is still the run’s segment', () => {
    expect(segmentAt(segs, 20)).toMatchObject({ label: 'verse', from: 10 });
  });
  it('is null without segments', () => {
    expect(segmentAt([], 3)).toBeNull();
  });
});

describe('timeAt', () => {
  const rect = { left: 100, width: 200 };
  it('maps the track to 0 … span', () => {
    expect(timeAt(200, rect, 60)).toBe(30);
  });
  it('is clamped outside the track', () => {
    expect(timeAt(40, rect, 60)).toBe(0);
    expect(timeAt(900, rect, 60)).toBe(60);
  });
});

describe('keyTarget', () => {
  const segs = segmentsOf(POP, 60, WIDE);
  const key = (k: string, now: number) => keyTarget(k, now, 60, segs);
  it('moves five seconds with the arrows, clamped', () => {
    expect(key('ArrowRight', 12)).toBe(17);
    expect(key('ArrowUp', 12)).toBe(17);
    expect(key('ArrowLeft', 12)).toBe(7);
    expect(key('ArrowDown', 2)).toBe(0);
    expect(key('ArrowRight', 58)).toBe(60);
  });
  it('goes to the ends with Home and End', () => {
    expect(key('Home', 33)).toBe(0);
    expect(key('End', 33)).toBe(60);
  });
  it('goes to the segment’s start with Page Up, or the one before within a second of it', () => {
    expect(key('PageUp', 35)).toBe(30);
    expect(key('PageUp', 30.5)).toBe(10);
    expect(key('PageUp', 3)).toBe(0);
  });
  it('goes to the next segment with Page Down (a repeat’s tick is not one), and to the end from the last', () => {
    expect(key('PageDown', 12)).toBe(30);
    expect(key('PageDown', 30)).toBe(40);
    expect(key('PageDown', 55)).toBe(60);
  });
  it('takes no other key', () => {
    expect(key('Enter', 12)).toBeNull();
    expect(key('a', 12)).toBeNull();
  });
});

describe('stillJump', () => {
  it('a press on a name jumps there until it moves DRAG_PX', () => {
    expect(stillJump(30, 100, 100 + DRAG_PX - 1)).toBe(30);
    expect(stillJump(30, 100, 100 - DRAG_PX + 1)).toBe(30);
    expect(stillJump(30, 100, 100 + DRAG_PX)).toBeNull();
    expect(stillJump(30, 100, 100 - DRAG_PX)).toBeNull();
  });
  it('a press off a name never jumps', () => {
    expect(stillJump(null, 100, 100)).toBeNull();
  });
});
