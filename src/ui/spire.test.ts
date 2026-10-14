import { describe, expect, it } from 'vitest';
import { bandFreq } from '../layout/spectrum';
import { spireOf } from './spire';

const BANDS = 120;
const bandOf = (hz: number) => Math.round(12 * Math.log2(hz / bandFreq(0, BANDS)));

describe('an out as a spire', () => {
  it('stands on its note: the fundamental, its partials over it, as strong as they sound; nothing under 20 Hz', () => {
    const levels = new Float32Array(BANDS);
    levels[bandOf(10)] = 0.9; // (rumble, under hearing)
    levels[bandOf(110)] = 0.8;
    levels[bandOf(220)] = 0.5;
    levels[bandOf(330)] = 0.3;
    const s = spireOf(levels, 110, BANDS)!;
    expect(s.root).toBe(bandOf(110));
    expect(s.level).toBeCloseTo(0.8, 6);
    expect(s.partials.map((p) => p.band)).toEqual([bandOf(220), bandOf(330)]);
    expect(s.top).toBe(bandOf(330));
  });
  it('takes its lowest partial where its note does not sound (a drum), and is nothing when silent', () => {
    const levels = new Float32Array(BANDS);
    levels[bandOf(60)] = 0.7;
    levels[bandOf(3000)] = 0.4;
    expect(spireOf(levels, null, BANDS)!.root).toBe(bandOf(60));
    expect(spireOf(new Float32Array(BANDS), 440, BANDS)).toBeNull();
  });
});
