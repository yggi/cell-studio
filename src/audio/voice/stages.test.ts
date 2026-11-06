import { describe, expect, it } from 'vitest';
import { compilePiece } from '../../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan, type Played } from '@yggi/cells/engine/realize';
import { buildVoice, dropGates, freeVoice, playNote, type Built, type Bus, type Rack } from './voice';
import type { ToneNS } from './nodes';

// An instrument's filters as a stage after its voices' own (#542, cells decision 067): the chain a note goes through,
// built from a stand-in Tone that records what connects to what (no audio in node).

/** A parameter that records what is scheduled on it. */
function param(value: number) {
  const calls: string[] = [];
  return {
    value,
    calls,
    cancelScheduledValues: () => {},
    setValueAtTime: (v: number) => calls.push(`set ${Math.round(v)}`),
    linearRampToValueAtTime: (v: number) => calls.push(`ramp ${Math.round(v)}`),
    exponentialRampToValueAtTime: (v: number) => calls.push(`exp ${Math.round(v)}`),
    setTargetAtTime: () => {},
  };
}

interface Fake {
  label: string;
  to?: Fake;
  frequency?: ReturnType<typeof param>;
  disposed?: boolean;
}

function fakeTone() {
  const node = (label: string, extra: object = {}): Fake & { connect(x: Fake): Fake; dispose(): void } => {
    const n = {
      label,
      ...extra,
      connect(x: Fake) {
        n.to ??= x;
        return n;
      },
      dispose() {
        n.disposed = true;
      },
    } as Fake & { connect(x: Fake): Fake; dispose(): void };
    return n;
  };
  const into: Fake[] = [];
  const Tone = {
    Gain: class {
      constructor(g: number) {
        return node(`gain ${g}`, { gain: param(g) });
      }
    },
    Panner: class {
      constructor() {
        return node('panner');
      }
    },
    Split: class {
      constructor() {
        return node('split');
      }
    },
    Analyser: class {
      constructor() {
        return node('analyser');
      }
    },
    Filter: class {
      constructor(o: { type: string; frequency: number; Q: number }) {
        return node(`${o.type} ${o.frequency}`, { frequency: param(o.frequency), Q: param(o.Q) });
      }
    },
    connect: (_from: unknown, to: Fake) => into.push(to),
  } as unknown as ToneNS;
  const ctx = {
    currentTime: 0,
    createPeriodicWave: () => ({}),
    createOscillator: () => ({ type: 'sine', frequency: param(0), detune: param(0), connect: (x: unknown) => x, setPeriodicWave: () => {}, start: () => {}, stop: () => {} }),
    createGain: () => ({ gain: param(0), connect: (x: unknown) => x, disconnect: () => {} }),
    createStereoPanner: () => ({ pan: { value: 0 }, connect: (x: unknown) => x, disconnect: () => {} }),
  } as unknown as AudioContext;
  const bus = { master: node('master'), reverb: node('reverb'), echo: node('echo') } as unknown as Bus;
  return { Tone, ctx, bus, into };
}

/** The chain from where a note goes in to the voice's output, by label. */
const path = (from: Fake | undefined) => {
  const out: string[] = [];
  for (let n = from; n && !n.label.startsWith('gain'); n = n.to) out.push(n.label);
  return out;
};

const BASE = '&tune step=8 0 3 7\n';

/** Each voice of a text built on one rack, and its notes in the first second. */
function setUp(text: string) {
  const r = compilePiece(BASE + text);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const f = fakeTone();
  const rack: Rack = new Map();
  const voices = new Map<string, Built>();
  for (const c of r.cells.values()) if (c.voice) voices.set(c.name, buildVoice(f.Tone, f.ctx, f.bus, r, c.name, codeShifts(r), c.name, rack));
  const notes = eventsBetween(plan(r, codeShifts(r)), 0, 1) as Played[];
  const play = (n: Played) => {
    playNote(f.Tone, f.ctx, voices.get(n.voice)!, { ...n, at: n.at + 1 }, (x) => voices.get(x));
    return path(f.into.at(-1));
  };
  return { voices, notes, play, rack };
}

describe("an instrument's filters, a stage after its voices' own (#542)", () => {
  it("a voice's own filter, then its instrument's: two in series", () => {
    const { notes, play } = setUp('&saw s=saw loop=C2 lpf=3000\n&vcf lpf=800 [&saw]\n&out map=sample [&tune * &vcf * .4]');
    expect(play(notes[0]!)).toEqual(['lowpass 3000', 'lowpass 800']);
  });

  it('a filter it takes from its instrument is not its own: the instrument plays it, once', () => {
    const { voices, notes, play } = setUp('&saw s=saw loop=C2\n&vcf lpf=800 hpf=40 [&saw]\n&out map=sample [&tune * &vcf * .4]');
    expect(voices.get('saw')!.params.lpf).toBe(800);
    expect(path(voices.get('saw')!.head as unknown as Fake)).toEqual([]);
    expect(play(notes[0]!)).toEqual(['lowpass 800', 'highpass 40']);
  });

  it('nested instruments: the innermost first', () => {
    const { notes, play } = setUp('&saw s=saw loop=C2\n&bright lpf=3000 [&saw]\n&vcf lpf=800 [&bright]\n&out map=sample [&tune * &vcf * .4]');
    expect(play(notes[0]!)).toEqual(['lowpass 3000', 'lowpass 800']);
  });

  it('a voice played through the instrument and without it: each note its own way', () => {
    const { notes, play } = setUp('&saw s=saw loop=C2\n&vcf lpf=900 [&saw]\n&out map=sample [&tune * &vcf * .4, &tune * &saw * .1]');
    const ways = notes.filter((n) => n.at === notes[0]!.at).map(play);
    expect(ways.sort()).toEqual([[], ['lowpass 900']]);
  });

  it("an instrument's moving filter: each note through it moves it on every voice's way, and a pause holds it", () => {
    const { voices, notes, play, rack } = setUp(
      '&eg map=adsr .002 .2 .1 .1\n&saw s=saw loop=C2\n&sub s=square loop=C1\n&vcf lpf=70..4800 * &eg [&saw, &sub]\n&out map=sample [&tune * &vcf * .4]',
    );
    const saw = notes.find((n) => n.voice === 'saw')!;
    expect(Object.keys(saw.through?.[0]?.params ?? {})).toEqual(['lpf']);
    play(saw);
    play(notes.find((n) => n.voice === 'sub')!);
    const copies = [...(rack.get('vcf')?.get('lpf') ?? [])] as unknown as ReturnType<typeof param>[];
    expect(copies).toHaveLength(2);
    // (the first copy, &saw's, moved by &sub's note too: the stage on the voices' sum; &sub's was made by its note)
    expect(copies.map((c) => c.calls.filter((x) => x === 'set 70').length)).toEqual([2, 1]);
    dropGates(voices.get('saw')!, 5);
    expect(copies[0]!.calls.at(-1)).toBe('set 70');
    freeVoice(voices.get('saw')!);
    expect(rack.get('vcf')?.get('lpf')?.size).toBe(1);
  });

  it('a key played on it takes its output’s way', () => {
    const { voices } = setUp('&saw s=saw loop=C2\n&vcf lpf=800 [&saw]\n&out map=sample [&tune * &vcf * .4]');
    expect(voices.get('saw')!.keyWay).toEqual([{ instrument: 'vcf' }]);
  });

  it("an instrument's room=: its send after its filters, not the voice's; a voice's own room= its own send beside it (#566)", () => {
    const { voices, notes, play, rack } = setUp(
      '&saw s=saw loop=C2 room=.2\n&sub s=square loop=C1\n&rev lpf=900 room=0..0.6 * &tune [&saw, &sub]\n&out map=sample [&tune * &rev * .4]',
    );
    // (&sub inherits the moving room= and sends nothing of its own; &saw writes its own)
    expect(voices.get('sub')!.moving.room).toBeUndefined();
    expect(voices.get('saw')!.moving.room).toBeDefined();
    expect(play(notes.find((n) => n.voice === 'saw')!)).toEqual(['lowpass 900']);
    play(notes.find((n) => n.voice === 'sub')!);
    // (one send for each voice's way through &rev, both moved by every note through it)
    const sends = [...(rack.get('rev')?.get('room') ?? [])] as unknown as ReturnType<typeof param>[];
    expect(sends).toHaveLength(2);
    expect(sends.map((g) => g.calls.length > 0)).toEqual([true, true]);
  });
});
