import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { freeList } from '../../engine/held';
import type { MidiAccess } from '../../midi/access';
import { Learn } from './learn.svelte';
import { Piece } from './piece.svelte';

const store = new Map<string, string>();
const page = new EventTarget();
let cleanups: (() => void)[] = [];

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  vi.stubGlobal('window', page);
});
afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
  vi.unstubAllGlobals();
});

const SONG = `# Song\n&bar scan(4 4 4 4) step=free(90bpm, 60..240)\n&fx lpf=free(1200, 200..5000)\n&pad meter(free(1, 0..3, "2/4 3/4 4/4 6/8"), 0) step=free(100bpm, 40..208)\n`;

/** A Learn on a piece, with a MIDI input a test plays into (`play`), what it sent (`sent`) and its frames run by hand (`frame`). */
function made(code = SONG) {
  const piece = new Piece(code);
  type Hearer = (data: Uint8Array, source: string, timeStamp: number) => void;
  const hearers = new Set<Hearer>();
  const sent: number[][] = [];
  const midi = {
    access: {} as MidiAccess,
    hear: (h: Hearer) => {
      hearers.add(h);
      return () => void hearers.delete(h);
    },
    send: (d: readonly number[]) => void sent.push([...d]),
  };
  const frames: (() => void)[] = [];
  const learn = new Learn(piece, midi, (run) => frames.push(run));
  cleanups.push(() => learn.dispose());
  const play = (...bytes: number[]) => hearers.forEach((h) => h(new Uint8Array(bytes), 'Knobs', 0));
  const frame = () => frames.splice(0).forEach((run) => run());
  const value = (place: string) => [...piece.program.cells.values()].flatMap((c) => c.frees).find((f) => learn.placeOf(f) === place)?.value;
  const spec = (place: string) => [...piece.program.cells.values()].flatMap((c) => c.frees).find((f) => learn.placeOf(f) === place)!;
  return { piece, learn, play, frame, frames, sent, value, spec };
}

describe('Learn: binding a knob', () => {
  it('binds the next control change to the control learning, and shows it', () => {
    const { learn, play } = made();
    learn.learn('bar/step');
    expect(learn.learning).toBe('bar/step');
    play(0xb0, 7, 20);
    expect(learn.learning).toBeNull();
    expect(learn.bindings).toEqual({ 'bar/step': { kind: 'cc', channel: 0, number: 7 } });
  });
  it('binds a pad (a note-on), never a note-off or the clock', () => {
    const { learn, play } = made();
    learn.learn('pad/choice');
    play(0x80, 36, 0);
    play(0xf8);
    expect(learn.learning).toBe('pad/choice');
    play(0x99, 36, 100);
    expect(learn.bindings['pad/choice']).toEqual({ kind: 'note', channel: 9, number: 36 });
  });
  it('Esc cancels learning before anything else hears it; asked again, it stops too', () => {
    const { learn, play } = made();
    const other = vi.fn();
    learn.learn('bar/step');
    page.addEventListener('keydown', other);
    const esc = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
    page.dispatchEvent(esc);
    expect(learn.learning).toBeNull();
    expect(other).not.toHaveBeenCalled();
    play(0xb0, 7, 20);
    expect(learn.bindings).toEqual({});
    // (not learning, Esc is everyone else's again)
    page.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
    expect(other).toHaveBeenCalledTimes(1);
    page.removeEventListener('keydown', other);
    learn.learn('bar/step');
    learn.learn('bar/step');
    expect(learn.learning).toBeNull();
  });
  it('Forget lets go; a knob learned again for another control leaves the first', () => {
    const { learn, play } = made();
    learn.learn('bar/step');
    play(0xb0, 7, 20);
    learn.learn('fx/param:lpf');
    play(0xb0, 7, 30);
    expect(Object.keys(learn.bindings)).toEqual(['fx/param:lpf']);
    learn.forget('fx/param:lpf');
    expect(learn.bindings).toEqual({});
  });
  it('keeps bindings in this browser, by piece title, and none for another piece', () => {
    const { learn, play } = made();
    learn.learn('bar/step');
    play(0xb0, 7, 20);
    expect(made().learn.bindings).toEqual({ 'bar/step': { kind: 'cc', channel: 0, number: 7 } });
    expect(made(SONG.replace('Song', 'Other')).learn.bindings).toEqual({});
  });
  it('keeps nothing in a private window, and still learns', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    const { learn, play } = made();
    learn.learn('bar/step');
    play(0xb0, 7, 20);
    expect(learn.bindings['bar/step']).toBeDefined();
  });
});

describe('Learn: a knob moves its free()', () => {
  /** Bound with the knob at 0, the value 90 (of 60..240: CC 21.2), caught by turning it past. */
  function caught() {
    const t = made();
    t.learn.learn('bar/step');
    t.play(0xb0, 7, 0);
    t.play(0xb0, 7, 64);
    t.frame();
    return t;
  }

  it('moves a bound tempo through piece.hold, as the slider does: CC 64 of 60..240 is 151', () => {
    const { value, piece } = caught();
    expect(value('bar/step')).toBe(151);
    expect(piece.held.get(0)).toBe(151);
    expect(piece.code).toContain('free(90bpm, 60..240)');
  });
  it('soft takeover: a knob away from the value leaves it, and shows the gap until it passes through', () => {
    const { learn, play, frame, value } = made();
    learn.learn('bar/step');
    play(0xb0, 7, 100);
    play(0xb0, 7, 90);
    frame();
    expect(value('bar/step')).toBe(90);
    expect(learn.gaps.get('bar/step')).toBeCloseTo(90 / 127);
    // down through 90bpm (CC ≈ 21): caught
    play(0xb0, 7, 15);
    frame();
    expect(value('bar/step')).toBe(81);
    expect(learn.gaps.has('bar/step')).toBe(false);
  });
  it('coalesces: a fast knob holds once a frame, the last value', () => {
    const { learn, play, frame, frames, piece, value } = caught();
    const hold = vi.spyOn(piece, 'hold');
    for (let cc = 65; cc <= 100; cc++) play(0xb0, 7, cc);
    expect(frames.length).toBe(1);
    expect(hold).not.toHaveBeenCalled();
    frame();
    expect(hold).toHaveBeenCalledTimes(1);
    expect(value('bar/step')).toBe(202);
    expect(learn.gaps.size).toBe(0);
  });
  it('a moved slider lets go of the knob, which takes over again by passing through', () => {
    const { piece, play, frame, value, spec } = caught();
    piece.hold(spec('bar/step'), 200);
    play(0xb0, 7, 66);
    frame();
    expect(value('bar/step')).toBe(200);
  });
  it('a binding outlives Stop clearing what was held: a binding holds nothing', () => {
    const { piece, learn, play, frame, value } = caught();
    piece.held = new Map();
    expect(value('bar/step')).toBe(90);
    expect(learn.bindings['bar/step']).toBeDefined();
    // the knob at 64 no longer holds 90: it takes over once it comes back through it
    play(0xb0, 7, 60);
    frame();
    expect(value('bar/step')).toBe(90);
    play(0xb0, 7, 10);
    frame();
    expect(value('bar/step')).toBe(74);
  });
  it('survives an edit that moves its free() in reading order but not its cell', () => {
    const { piece, play, frame, value } = caught();
    piece.code = SONG.replace('# Song\n', '# Song\n&first scan(4) step=free(2hz, 1..4)\n');
    expect(freeList(piece.result).findIndex((f) => f.unit === 'bpm')).toBe(1);
    play(0xb0, 7, 10);
    play(0xb0, 7, 0);
    play(0xb0, 7, 21);
    frame();
    expect(value('bar/step')).toBe(90);
    play(0xb0, 7, 127);
    frame();
    expect(value('bar/step')).toBe(240);
    expect(piece.held.get(1)).toBe(240);
  });
  it('a log control: CC 0 and 127 are exactly its ends', () => {
    const { learn, play, frame, value } = made();
    learn.learn('fx/param:lpf');
    play(0xb0, 74, 0);
    play(0xb0, 74, 127);
    frame();
    expect(value('fx/param:lpf')).toBe(5000);
    play(0xb0, 74, 0);
    frame();
    expect(value('fx/param:lpf')).toBe(200);
  });
  it('a labelled free() takes pads as its choices, and a knob in equal parts', () => {
    const t = made();
    t.learn.learn('pad/choice');
    t.play(0x99, 36, 100);
    t.play(0x99, 39, 100);
    t.frame();
    expect(t.value('pad/choice')).toBe(3);
    t.play(0x99, 37, 100);
    t.frame();
    expect(t.value('pad/choice')).toBe(1);
    t.learn.forget('pad/choice');
    t.learn.learn('pad/choice');
    t.play(0xb1, 20, 40);
    t.frame();
    expect(t.value('pad/choice')).toBe(1);
    t.play(0xb1, 20, 127);
    t.frame();
    expect(t.value('pad/choice')).toBe(3);
  });
  it('ignores knobs it has not learned, and other channels', () => {
    const { play, frames } = caught();
    play(0xb0, 8, 10);
    play(0xb1, 7, 10);
    expect(frames.length).toBe(0);
  });
});

describe('Learn: echo out', () => {
  it('is off by default; on, a moved slider sends its CC back', () => {
    const { learn, sent, spec } = (() => {
      const t = made();
      t.learn.learn('bar/step');
      t.play(0xb2, 7, 0);
      return t;
    })();
    learn.moved(spec('bar/step'), 150);
    expect(sent).toEqual([]);
    learn.echo = true;
    learn.moved(spec('bar/step'), 150);
    learn.moved(spec('bar/step'), 240);
    learn.moved(spec('fx/param:lpf'), 1000);
    expect(sent).toEqual([
      [0xb2, 7, 64],
      [0xb2, 7, 127],
    ]);
    expect(made().learn.echo).toBe(true);
  });
});
