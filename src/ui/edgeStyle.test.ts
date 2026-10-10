import { describe, expect, it } from 'vitest';
import { fillColour, liveColour } from './edgeStyle';
import { palette } from './palette';

const C12 = { cycle: 12 };
const pitch = (hue: number, octave = 0) => ({ kind: 'pitch' as const, hue, octave });

describe('a live edge takes the colour of what its source pushes now (edgeStyle.ts)', () => {
  it('a note’s link carries nothing', () => {
    expect(liveColour({ band: 'none', port: 'about' })).toBeNull();
  });

  it('a clock’s ticks: the level of the tick', () => {
    expect(liveColour({ band: 'sync', port: 'step', tick: () => 0 })).toBe(palette('sync', 0));
    expect(liveColour({ band: 'sync', port: 'step', tick: () => 2 })).toBe(palette('sync', 2));
  });

  it('sound: its fundamental on its grid; a mix of several, neutral', () => {
    expect(liveColour({ band: 'audio', port: 'mix', sound: () => ({ position: 7, grid: C12 }) })).toBe(palette('audio', { position: 7, loud: 1 }, C12));
    expect(liveColour({ band: 'audio', port: 'mix', sound: () => ({ position: null, grid: null }) })).toBe(palette('audio', { position: null, loud: 1 }, null));
  });

  it('a melody: the note its source shows now, before what the voice sounds (a transposition is on the label)', () => {
    const heard = () => ({ position: -24, grid: C12 });
    // (&roots − 24 into its voice: the root as &roots' wheel shows it, not two octaves down)
    expect(liveColour({ band: 'cv', port: 'voice', fill: () => pitch(90), heard })).toBe(fillColour(pitch(90)));
    // (a source that shows no note — a tape, a generator: what the voice sounds)
    expect(liveColour({ band: 'cv', port: 'play', fill: () => undefined, heard })).toBe(palette('pitch', -24, C12));
    expect(liveColour({ band: 'cv', port: 'trigger', fill: () => undefined })).toBe(palette('level', 1));
  });

  it('a level (an envelope, a gain, lpf=): the neutral hue, as bright as the source’s level; never what a voice sounds', () => {
    let asked = false;
    const heard = () => ((asked = true), { position: 0, grid: C12 });
    expect(liveColour({ band: 'cv', port: 'lpf', fill: () => ({ kind: 'level', v: 0.25 }), heard })).toBe(palette('level', 0.25));
    expect(liveColour({ band: 'cv', port: 'level', fill: () => undefined, heard })).toBe(palette('level', 1));
    expect(asked).toBe(false);
  });
});
