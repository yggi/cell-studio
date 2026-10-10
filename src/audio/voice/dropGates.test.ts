import { describe, expect, it } from 'vitest';
import { dropGates, type Built, type Sounding } from './voice';

/** A parameter that records what was done to it, in order. */
function param(value = 1) {
  const calls: string[] = [];
  return {
    value,
    calls,
    cancelScheduledValues: (t: number) => calls.push(`cancel@${t}`),
    setValueAtTime: (v: number, t: number) => calls.push(`set ${v}@${t}`),
    setTargetAtTime: (v: number, t: number, k: number) => calls.push(`target ${v}@${t} k=${+k.toFixed(4)}`),
    linearRampToValueAtTime: () => calls.push('ramp'),
    exponentialRampToValueAtTime: () => calls.push('ramp'),
  };
}
const source = () => {
  const stops: number[] = [];
  return { stops, stop: (t: number) => stops.push(t) };
};

function note(at: number, release = 0.3) {
  const osc = source();
  const mod = source();
  const amp = { gain: param(0.35) };
  const lvl = { gain: param(0.8) };
  const frequency = param(440);
  const detune = param(25);
  const n = { at, amp, lvl, pitch: [frequency, detune], mods: [mod], release } as unknown as Sounding;
  return { osc, mod, amp, lvl, frequency, detune, n };
}
const voice = (live: [unknown, Sounding][], moving: Record<string, ReturnType<typeof param>> = {}, notes: { at: number; freq: number }[] = []) =>
  ({ live: new Map(live), moving, notes }) as unknown as Built;

describe('a pause drops every gate (dropGates)', () => {
  it('a note that sounds: its envelope, level, pitch and FM are held where they are, and it releases from there', () => {
    const a = note(1);
    dropGates(voice([[a.osc, a.n]]), 2);
    // held: what was scheduled from now on is dropped and the value now kept …
    expect(a.amp.gain.calls.slice(0, 2)).toEqual(['cancel@2', 'set 0.35@2']);
    expect(a.lvl.gain.calls).toEqual(['cancel@2', 'set 0.8@2']);
    expect(a.frequency.calls).toEqual(['cancel@2', 'set 440@2']);
    expect(a.detune.calls).toEqual(['cancel@2', 'set 25@2']);
    // … and the gate goes down into the note's own release, which then rings out (4 time constants + a little)
    expect(a.amp.gain.calls[2]).toBe('target 0@2 k=0.1');
    expect(a.osc.stops).toEqual([2 + 0.3 * 4 + 0.05]);
    expect(a.mod.stops).toEqual([2 + 0.3 * 4 + 0.05]);
  });
  it('a note that has not started is never played', () => {
    const a = note(2.1);
    dropGates(voice([[a.osc, a.n]]), 2);
    expect(a.osc.stops).toEqual([2]);
    expect(a.mod.stops).toEqual([2]);
    expect(a.amp.gain.calls).toEqual([]);
  });
  it("a note scheduled ahead is not what the voice sounds: it leaves the voice's notes", () => {
    const b = voice([], {}, [
      { at: 1, freq: 220 },
      { at: 2.1, freq: 440 },
    ]);
    dropGates(b, 2);
    expect(b.notes).toEqual([{ at: 1, freq: 220 }]);
  });
  it('a note with no release still lets go (a few milliseconds, not a click or a hang)', () => {
    const a = note(1, 0);
    dropGates(voice([[a.osc, a.n]]), 2);
    expect(a.osc.stops[0]).toBeCloseTo(2 + 0.005 * 4 + 0.05);
  });
  it("a voice's moving parameters (its filter) hold where they are", () => {
    const lpf = param(900);
    dropGates(voice([], { lpf }), 2);
    expect(lpf.calls).toEqual(['cancel@2', 'set 900@2']);
  });
});
