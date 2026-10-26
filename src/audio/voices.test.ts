/**
 * A voice a sync rebuilds or drops rings on until its last note has ended (#490, #492): a section's text giving way to
 * the next, or an edit while playing, cuts no note short. Tone is a stand-in that takes every call (no audio in node),
 * and a voice is a stand-in whose notes the test ends; what is tested is when the bank frees it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import type { Built } from './voice/voice';
import type { ToneNS } from './voice/nodes';

const voice = vi.hoisted(() => ({
  built: [] as { name: string; live: Map<object, unknown> }[],
  freed: [] as string[],
}));

// (the tests share their modules, `isolate: false`: the voice module is mocked afresh, and the bank imported after it)
vi.resetModules();
vi.doMock('./voice/voice', async (original) => ({
  ...(await original<typeof import('./voice/voice')>()),
  buildVoice: (_T: unknown, _c: unknown, _b: unknown, _r: unknown, name: string, _s: unknown, key: string) => {
    const b = { name, key, live: new Map(), nodes: [], notes: [], out: anything() };
    voice.built.push(b);
    return b;
  },
  freeVoice: (b: { name: string }) => voice.freed.push(b.name),
  // (a note sounds until the test ends it: its source is live until then)
  playNote: (_T: unknown, _c: unknown, b: Built, note: { at: number; dur: number }) => {
    const osc = {};
    b.live.set(osc as AudioScheduledSourceNode, { at: note.at } as never);
    return { at: note.at, end: note.at + note.dur, osc };
  },
}));

/** Anything: a node, a constructor, a method, a value: every call and every `new` gives another, every property one too. */
function anything(): never {
  const f = function () {} as unknown as object;
  const p: object = new Proxy(f, {
    get: (_, k) => (k === 'then' ? undefined : k === Symbol.toPrimitive ? () => 0 : k === 'currentTime' || k === 'sampleRate' ? 0 : p),
    set: () => true,
    apply: () => p,
    construct: () => p,
  });
  return p as never;
}

const { createVoices } = await import('./voices');

const A = `&a loop=A3
&b loop=E4
&out [&a * .5, &b * .5]`;
const B = `&b loop=E4
&out [&b * .5]`;
const note = (v: string) => ({ at: 0, dur: 1, voice: v, freq: 220, bends: [], gains: [0.5, 0.5] as const, levels: [{ at: 0, level: 1 }] });

describe('a voice a sync drops', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    voice.built.length = 0;
    voice.freed.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  const bank = () => {
    const v = createVoices(anything() as ToneNS);
    const a = compileSource(A);
    v.sync(a, codeShifts(a));
    return v;
  };
  const drop = (v: ReturnType<typeof createVoices>) => {
    const b = compileSource(B);
    v.sync(b, codeShifts(b));
  };
  const live = (name: string) => voice.built.find((b) => b.name === name)!.live;

  it('is freed at once when nothing of it sounds', () => {
    const v = bank();
    drop(v);
    expect(voice.freed).toEqual(['a']);
  });

  it('rings on while its note sounds, and is freed only after its last note has ended', () => {
    const v = bank();
    v.play(note('a'));
    v.play(note('a'));
    drop(v);
    expect(voice.freed).toEqual([]);
    vi.advanceTimersByTime(5000);
    expect(voice.freed).toEqual([]);
    // (one note ends: the other still sounds)
    const [first] = live('a').keys();
    live('a').delete(first!);
    vi.advanceTimersByTime(5000);
    expect(voice.freed).toEqual([]);
    live('a').clear();
    vi.advanceTimersByTime(500);
    expect(voice.freed).toEqual(['a']);
    // (once only)
    vi.advanceTimersByTime(5000);
    expect(voice.freed).toEqual(['a']);
  });

  it('keeps the voice the next text plays, and frees one still ringing when the bank goes', () => {
    const v = bank();
    v.play(note('a'));
    drop(v);
    expect(voice.built.map((b) => b.name)).toEqual(['a', 'b']);
    v.dispose();
    expect(voice.freed.sort()).toEqual(['a', 'b']);
    // (its timer, come round, frees nothing again)
    live('a').clear();
    vi.advanceTimersByTime(1000);
    expect(voice.freed.sort()).toEqual(['a', 'b']);
  });
});
