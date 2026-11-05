import { describe, expect, it } from 'vitest';
import type { Played } from '@yggi/cells/engine/realize';
import { blendTerms, blendWave, shareOf, terms } from './blend';
import { playNote, type Built } from './voice';
import type { ToneNS } from './nodes';

// A blend of two built-in waves (#533, cells decision 066): its terms, and the wave each note starts on.

/** Two term lists, each scaled to its first non-zero term: the same shape, whatever their level. */
const shape = (xs: ArrayLike<number>) => {
  const a = Array.from(xs);
  const first = a.find((x) => x !== 0) ?? 1;
  return a.map((x) => +(x / first).toFixed(6));
};

describe('a blend of two waves (#533)', () => {
  it('is the first wave at share 0 and the second at 1', () => {
    expect(shape(blendTerms('triangle', 'square', 0))).toEqual(shape(terms('triangle')));
    expect(shape(blendTerms('triangle', 'square', 1))).toEqual(shape(terms('square')));
    expect(shape(blendTerms('sine', 'sawtooth', 0)).slice(0, 2)).toEqual([0, 1]);
  });

  it('holds each wave at its own peak between: half the one, half the other', () => {
    const [t, q, half] = [0, 1, 0.5].map((w) => blendTerms('triangle', 'square', w));
    for (const k of [1, 3, 5, 99]) expect(half![k]).toBeCloseTo(0.5 * t![k]! + 0.5 * q![k]!, 12);
    // (each at its own peak: the square's 1023 harmonics peak above 1, its Gibbs overshoot, the triangle's at 1)
    expect(q![1]! / terms('square')[1]!).toBeLessThan(0.9);
    expect(t![1]! / terms('triangle')[1]!).toBeCloseTo(1, 3);
  });

  it('reads a share in hundredths, between 0 and 1', () => {
    expect([0.123, 0.126, -1, 2, NaN].map(shareOf)).toEqual([0.12, 0.13, 0, 1, 0]);
  });

  it('makes each share’s wave once', () => {
    let made = 0;
    const ctx = { createPeriodicWave: () => ({ n: ++made }) } as unknown as AudioContext;
    const cache = new Map<number, PeriodicWave>();
    const a = blendWave(ctx, cache, 'triangle', 'square', 0.501);
    expect(blendWave(ctx, cache, 'triangle', 'square', 0.499)).toBe(a);
    blendWave(ctx, cache, 'triangle', 'square', 0.6);
    expect(made).toBe(2);
  });
});

describe('a note on a blending voice (#533)', () => {
  const param = () => ({ value: 0, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect: (x: unknown) => x, disconnect() {} });
  function play(share: number | undefined) {
    const waves: unknown[] = [];
    const set: unknown[] = [];
    const osc = { ...node(), type: 'triangle', frequency: param(), detune: param(), start() {}, stop() {}, setPeriodicWave: (w: unknown) => set.push(w) };
    const ctx = {
      currentTime: 0,
      createOscillator: () => osc,
      createGain: () => ({ ...node(), gain: param() }),
      createStereoPanner: () => ({ ...node(), pan: { value: 0 } }),
      createPeriodicWave: (_r: Float32Array, imag: Float32Array) => (waves.push(imag), { imag }),
    } as unknown as AudioContext;
    const b = {
      params: {},
      wave: 'triangle',
      noise: null,
      live: new Map(),
      notes: [],
      moving: {},
      seed: 1,
      blend: { from: 'triangle', to: 'square', waves: new Map() },
    } as unknown as Built;
    const params = share === undefined ? undefined : { s: { kind: 'points', points: [{ at: 1, value: share }] } };
    const note = { at: 1, dur: 1, voice: 'v', freq: 440, bends: [], gains: [1, 1], levels: [{ at: 1, level: 1 }], ...(params ? { params } : {}) } as unknown as Played;
    playNote({ connect() {} } as unknown as ToneNS, ctx, b, note, () => undefined);
    return { osc, set, waves };
  }

  it('plays the wave of the share it starts on', () => {
    const { set, waves } = play(1);
    expect(set).toHaveLength(1);
    expect(shape((set[0] as { imag: Float32Array }).imag)).toEqual(shape(Float32Array.from(terms('square'))));
    expect(waves).toHaveLength(1);
  });

  it('with no share given, its first wave, built in', () => {
    const { osc, set } = play(undefined);
    expect(set).toHaveLength(0);
    expect(osc.type).toBe('triangle');
  });
});
