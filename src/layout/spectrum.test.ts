import { describe, expect, it } from 'vitest';
import { C0, F_HI, F_LO, bandHue, bandsFromFFT, freqTurn, hslToRgb, restingProfile, restingSpectrum, wheelLUT } from './spectrum';
import { codeShifts, compileSource } from '../engine/compile';

describe('voice wheels', () => {
  it('spans ten octaves from just below C0, log-scaled: each octave a tenth of the way', () => {
    expect(freqTurn(F_LO)).toBe(0);
    expect(freqTurn(F_HI)).toBe(1);
    expect(freqTurn(C0 * 2 ** 5)).toBeCloseTo(0.5 + 1 / 240); // C5: half way, plus half a band
    expect(freqTurn(C0 * 4) - freqTurn(C0 * 2)).toBeCloseTo(0.1);
  });

  it('lays left channel on the left half, right on the right; low at the bottom; newest at the hub', () => {
    const size = 64;
    const B = 16;
    const F = 8;
    const lut = wheelLUT(size, 10, 30, B, F);
    const at = (x: number, y: number) => lut[y * size + x];
    const decode = (i: number) => ({ side: Math.floor(i / (F * B)), frame: Math.floor((i % (F * B)) / B), band: i % B });
    expect(at(32, 32)).toBe(-1); // hub
    expect(decode(at(32 + 10, 32))).toMatchObject({ side: 1, frame: 0 }); // right, by the hub: newest
    expect(decode(at(32 - 11, 32))).toMatchObject({ side: 0, frame: 0 }); // left
    expect(decode(at(32 + 28, 32)).frame).toBe(F - 1); // at the rim: oldest — it flows outward
    expect(decode(at(32 + 1, 32 + 28)).band).toBe(0); // bottom: low
    expect(decode(at(32 + 1, 32 - 28)).band).toBe(B - 1); // top: high
  });

  it('collapses an FFT into bands', () => {
    const db = new Float32Array(1024).fill(-120);
    db[Math.round(440 / (48000 / 2 / 1024))] = -30;
    const b = bandsFromFFT(db, 48000, 32);
    expect(Math.max(...b)).toBeCloseTo(1);
    expect(b.findIndex((v) => v > 0.9)).toBe(Math.floor(freqTurn(440) * 32));
  });

  it('a resting voice shows its harmonics', () => {
    const r = compileSource('&m step=1\n&t step=&m 0\n&sq loop=110 0 1\n&sine s=sine loop=440\n&mix_ [&t * &sq, &t * &sine]\n&out_ loop=44k map=sample &mix_');
    const sq = restingSpectrum(r, 'sq', codeShifts(r), 64);
    const lit = (x: Float32Array) => [...x].filter((v) => v > 0).length;
    expect(lit(sq.left)).toBeGreaterThan(5); // a square has many partials
    const s = restingSpectrum(r, 'sine', codeShifts(r), 64);
    expect(lit(s.left)).toBe(1); // a sine has one
    expect(lit(s.right)).toBe(1);
  });

  it('colours by note: one rainbow per octave', () => {
    // a rainbow per octave, by pitch class: band b of 120 is the note C0 + b semitones
    const hue = (note: number) => bandHue(note, 120);
    expect([hue(0), hue(2), hue(4), hue(7), hue(9)]).toEqual([0, 60, 120, 210, 270]); // C D E G A
    expect(hue(12 * 4)).toBe(0); // C4: red again
    expect(hue(12 * 4 + 7)).toBe(210); // G4: light blue
    expect(hslToRgb(0, 1, 0.5)).toEqual([255, 0, 0]);
    expect(hslToRgb(120, 1, 0.5)).toEqual([0, 255, 0]);
    const [r, g, b] = hslToRgb(275, 1, 0.5);
    expect(b).toBe(255);
    expect(r).toBeGreaterThan(g);
  });

  it('mixes and the sound card have a resting profile too', () => {
    const r = compileSource(
      '&m step=1\n&t step=&m 0\n&lo s=sine loop=110\n&hi s=sine loop=1760\n&l [&t * &lo]\n&r [&t * &hi * 0.5]\n&both [&t * &lo, &t * &hi]\n&out loop=SAMPLE_RATE map=sample &l &r',
    );
    const lit = (x: Float32Array) => [...x].map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    const both = restingProfile(r, 'both', codeShifts(r), 64);
    expect(lit(both.left)).toHaveLength(2); // two sines
    const out = restingProfile(r, 'out', codeShifts(r), 64);
    expect(lit(out.left)).toEqual(lit(restingProfile(r, 'lo', codeShifts(r), 64).left)); // left: the low sine
    expect(lit(out.right)).toEqual(lit(restingProfile(r, 'hi', codeShifts(r), 64).left)); // right: the high one
    // a gain lowers the level
    const half = restingProfile(r, 'r', codeShifts(r), 64);
    const full = restingProfile(r, 'hi', codeShifts(r), 64);
    expect(Math.max(...half.left)).toBeLessThan(Math.max(...full.left));
  });
});
