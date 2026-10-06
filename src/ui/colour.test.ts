import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { positionOctave } from '../engine/helix';
import { noteColour } from './theme';

describe('colouring rule: 0 … 12 (C4 – C5) the natural range; other octaves muted, lighter above, darker below', () => {
  const r = compileSource('&g cycle=12 0\n&t over=&g 0');
  it('octaves on the grid: 0 … 12 natural, then −1 below, 1 above', () => {
    // (the usual grid: twelve to the octave)
    expect([0, 7, 12, 13, 24, -1, -12, -13].map((p) => positionOctave(r, 'chromatic', p))).toEqual([0, 0, 0, 1, 2, -1, -1, -2]);
  });
  it('full colour in the natural range; muted and lighter above, muted and darker below', () => {
    const hsl = (c: string) =>
      c
        .match(/hsl\(([-\d.]+) ([\d.]+)% ([\d.]+)%\)/)!
        .slice(1)
        .map(Number);
    const [, s0, l0] = hsl(noteColour(0));
    const [, s1, l1] = hsl(noteColour(0, false, 1));
    const [, sm, lm] = hsl(noteColour(0, false, -1));
    expect(s1).toBeLessThan(s0);
    expect(sm).toBeLessThan(s0);
    expect(l1).toBeGreaterThan(l0);
    expect(lm).toBeLessThan(l0);
  });
});
