import { describe, expect, it, vi } from 'vitest';
import { Activity, DECAY, glow } from './activity';

describe('the MIDI light', () => {
  it('flashes full at a message and fades out over DECAY', () => {
    expect(glow(100, 100)).toBe(1);
    expect(glow(100, 100 + DECAY / 2)).toBeCloseTo(0.5);
    expect(glow(100, 100 + DECAY)).toBe(0);
    expect(glow(100, 100 + 10 * DECAY)).toBe(0);
    expect(glow(-Infinity, 5)).toBe(0);
    expect(glow(500, 100)).toBe(0);
  });

  it('counts each direction on its own and tells the light on a hit', () => {
    const a = new Activity();
    const woke = vi.fn();
    a.onhit = woke;
    expect(a.level('in', 0)).toBe(0);
    a.hit('in', 1000);
    expect(woke).toHaveBeenCalledTimes(1);
    expect(a.level('in', 1000)).toBe(1);
    expect(a.level('out', 1000)).toBe(0);
    expect(a.level('in', 1000 + DECAY)).toBe(0);
    expect(a.busy(1000 + DECAY / 2)).toBe(true);
    expect(a.busy(1000 + DECAY)).toBe(false);
    // a note sent ahead lights when it sounds, and the light stays awake until then
    a.hit('out', 2000);
    expect(a.level('out', 1500)).toBe(0);
    expect(a.busy(1500)).toBe(true);
    expect(a.level('out', 2000)).toBe(1);
    // notes sent ahead one after another: each lights in its turn, though a later one is already pending
    a.hit('out', 3000);
    a.hit('out', 3100);
    expect(a.level('out', 3000)).toBe(1);
    expect(a.level('out', 3100 + DECAY / 2)).toBeCloseTo(0.5);
    expect(a.level('out', 3100 + DECAY)).toBe(0);
  });
});
