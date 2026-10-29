import { describe, expect, it } from 'vitest';
import type { Played } from '@yggi/cells/engine/realize';
import { playNote, type Built } from './voice';
import type { ToneNS } from './nodes';

// What a note schedules on its amplitude, and how its panner is set (#516): a fake context records it.

/** A parameter that records what was scheduled on it, in order. */
function param() {
  const calls: string[] = [];
  const r = (x: number) => +x.toFixed(4);
  return {
    value: 0,
    calls,
    cancelScheduledValues: () => {},
    setValueAtTime: (v: number, t: number) => calls.push(`set ${r(v)}@${r(t)}`),
    setTargetAtTime: (v: number, t: number) => calls.push(`target ${r(v)}@${r(t)}`),
    linearRampToValueAtTime: (v: number, t: number) => calls.push(`ramp ${r(v)}@${r(t)}`),
    exponentialRampToValueAtTime: (v: number, t: number) => calls.push(`exp ${r(v)}@${r(t)}`),
  };
}
const node = () => ({ connect: (x: unknown) => x, disconnect: () => {} });

function context() {
  const gains: ReturnType<typeof param>[] = [];
  const panners: { pan: { value: number }; channelCount: number; channelCountMode: string }[] = [];
  const ctx = {
    currentTime: 0,
    createOscillator: () => ({ ...node(), type: 'sine', frequency: param(), detune: param(), setPeriodicWave: () => {}, start: () => {}, stop: () => {} }),
    createGain: () => {
      const g = param();
      gains.push(g);
      return { ...node(), gain: g };
    },
    createStereoPanner: () => {
      const p = { ...node(), pan: { value: 0 }, channelCount: 2, channelCountMode: 'clamped-max' };
      panners.push(p);
      return p;
    },
  };
  // (the first gain a note makes is its envelope, the second its volume streams)
  return { ctx: ctx as unknown as AudioContext, amp: () => gains[0]!.calls, panner: () => panners[0]! };
}
const Tone = { connect: () => {} } as unknown as ToneNS;
const voice = () => ({ params: {}, wave: 'sine', noise: null, live: new Map(), notes: [], moving: {}, seed: 1 }) as unknown as Built;

/** A note at 1 s, its envelope (attack, decay, sustain, release), a second long, at full level in the middle. */
function play(env: { attack: number; decay: number; sustain: number; release: number }, dur = 1, gains: [number, number] = [1, 1]) {
  const c = context();
  const note = { at: 1, dur, voice: 'v', freq: 440, bends: [], gains, levels: [{ at: 1, level: 1 }], env } as unknown as Played;
  playNote(Tone, c.ctx, voice(), note, () => undefined);
  return c;
}

describe('a note’s envelope, as scheduled (#516)', () => {
  it('with an attack: a ramp up to its peak, a fall to its sustain, and after the gate (90 % of the note) its release', () => {
    expect(play({ attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.05 }).amp()).toEqual(['set 0@1', 'ramp 0.35@1.01', 'target 0.175@1.01', 'target 0@1.9']);
  });

  it('with no attack: the peak at once, never a ramp of no length (which overshoots between two samples in Chromium)', () => {
    const calls = play({ attack: 0, decay: 0.3, sustain: 0, release: 0.05 }).amp();
    expect(calls).toEqual(['set 0@1', 'set 0.35@1', 'target 0@1', 'target 0@1.9']);
    expect(calls.some((c) => c.startsWith('ramp'))).toBe(false);
  });

  it('a gate that shuts before the attack ends: up to where the attack reached, then the release', () => {
    // a note of .5 s, its gate .45 s, its attack 1.5 s: it reaches .45 / 1.5 of its peak
    expect(play({ attack: 1.5, decay: 0.5, sustain: 0.8, release: 1.5 }, 0.5).amp()).toEqual(['set 0@1', `ramp ${+((0.35 * 0.45) / 1.5).toFixed(4)}@1.45`, 'target 0@1.45']);
  });
});

describe('a note’s place (#516)', () => {
  it('is panned as one channel, by the equal-power law', () => {
    const p = play({ attack: 0.01, decay: 0.1, sustain: 1, release: 0.05 }, 1, [1, 0.4]).panner();
    expect([p.channelCount, p.channelCountMode]).toEqual([1, 'explicit']);
    expect(p.pan.value).toBeCloseTo((4 / Math.PI) * Math.atan2(0.4, 1) - 1, 9);
  });
});
