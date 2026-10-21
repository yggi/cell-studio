import { describe, expect, it } from 'vitest';
import { dragged, keyed, stepOf } from './tempo';

const T = { value: 100, lo: 70, hi: 130 };

describe('dragged', () => {
  it('is still a press under 4 px', () => {
    expect(dragged(T, 100, 3, 0, false)).toBeNull();
    expect(dragged(T, 100, 2, -1, false)).toBeNull();
  });
  it('turns into a drag from 4 px, right or up faster', () => {
    // 240 px cross the 60 of the range: 4 px is 1
    expect(dragged(T, 100, 4, 0, false)).toBe(101);
    expect(dragged(T, 100, 0, -4, false)).toBe(101);
    expect(dragged(T, 100, -4, 0, false)).toBe(99);
  });
  it('once a drag, follows the smallest move', () => {
    expect(dragged(T, 100, 2, 0, true)).toBe(100.5);
  });
  it('is clamped to lo … hi', () => {
    expect(dragged(T, 100, 2000, 0, false)).toBe(130);
    expect(dragged(T, 100, -2000, 0, false)).toBe(70);
  });
});

describe('keyed', () => {
  it('steps a hundredth of the range', () => {
    expect(stepOf(T)).toBeCloseTo(0.6);
    expect(keyed(T, 'ArrowUp', false)).toBeCloseTo(100.6);
    expect(keyed(T, 'ArrowRight', false)).toBeCloseTo(100.6);
    expect(keyed(T, 'ArrowDown', false)).toBeCloseTo(99.4);
    expect(keyed(T, 'ArrowLeft', false)).toBeCloseTo(99.4);
  });
  it('is clamped to lo … hi', () => {
    expect(keyed({ ...T, value: 130 }, 'ArrowUp', false)).toBe(130);
    expect(keyed({ ...T, value: 70 }, 'ArrowDown', false)).toBe(70);
  });
  it('closes the slider with Escape only when it is open', () => {
    expect(keyed(T, 'Escape', true)).toBe('close');
    expect(keyed(T, 'Escape', false)).toBeNull();
  });
  it('takes no other key', () => {
    expect(keyed(T, 'Enter', true)).toBeNull();
  });
});
