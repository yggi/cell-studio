import { describe, expect, it } from 'vitest';
import { envelopeAt, envelopeAxis } from './envelope';

const E = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.4 };

describe('an envelope now', () => {
  it('rises, falls to the sustain, holds, releases after the note ends, then has rung out', () => {
    const hold = envelopeAxis(E).hold;
    expect(envelopeAt(E, 0.05, 1)).toEqual({ t: 0.05, level: 0.5 });
    expect(envelopeAt(E, 0.2, 1)!.level).toBeCloseTo(0.75);
    expect(envelopeAt(E, 0.65, 1)!.t).toBeCloseTo(0.3 + hold / 2);
    expect(envelopeAt(E, 0.65, 1)!.level).toBe(0.5);
    const r = envelopeAt(E, 1.2, 1)!;
    expect(r.t).toBeCloseTo(0.3 + hold + 0.2);
    expect(r.level).toBeCloseTo(0.25);
    expect(envelopeAt(E, 1.5, 1)).toBeNull();
  });
  it('a note shorter than its attack releases from where it got to', () => {
    expect(envelopeAt(E, 0.06, 0.05)!.level).toBeCloseTo(0.5 * (1 - 0.01 / 0.4));
  });
});
