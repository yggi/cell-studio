import { setMaxListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Fingers, type Touch } from './fingers';
import { Keys, type Hands } from './state/keys.svelte';
import { Piece } from './state/piece.svelte';
import { DRUM_PRESETS } from '../midi/drum-presets';
import type { MidiAccess } from '../midi/access';

const store = new Map<string, string>();
const page = new EventTarget();
setMaxListeners(0, page);
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

// a pentatonic melody on a sine at C4, and a kit
const SONG = `# Song
&bar step=4
&penta 0 2 4 7 9
&tune over=&penta step=&bar 0 1 2
&lead s=sine loop=C4
&drums step=&bar &bd &hh &sd &hh
&bd s=sine loop=A1
&sd s=white
&hh s=white hpf=7000
&mix map=sample [&tune * &lead, &drums]
`;

/** The real Keys on a piece, with hands that say what they were asked, and the fingers of the on-screen keys and pads on them. */
function made() {
  const piece = new Piece(SONG);
  const asked: string[] = [];
  let id = 0;
  const hands: Hands = {
    press: (voice, _freq, velocity) => {
      asked.push(`press ${++id} ${voice} v${velocity}`);
      return id;
    },
    release: (i) => void asked.push(`release ${i}`),
    onKeysCut: null,
  };
  const midi = { access: {} as MidiAccess, drumsFrom: () => DRUM_PRESETS.GM!, hear: () => () => {}, thruOf: () => [], sendTo: () => {} };
  const keys = new Keys(piece, hands, midi);
  cleanups.push(() => keys.dispose());
  // (as KeysDock wires them)
  const piano = new Fingers({ press: (n, v) => keys.press(n, v), release: (n) => keys.release(n) });
  const pads = new Fingers({ press: (n, v) => keys.pressPad(n, v), release: (n) => keys.releasePad(n) });
  return { keys, asked, piano, pads };
}

/** A pointer event as the browser sends one, with a key that records what was captured (or throws, as a vanished pointer does). */
function touch(pointerId: number, { pointerType = 'touch', button = 0, throws = false } = {}) {
  const captured: number[] = [];
  let prevented = false;
  const e: Touch = {
    pointerId,
    pointerType,
    button,
    currentTarget: {
      setPointerCapture: (id: number) => {
        if (throws) throw new Error('InvalidPointerId');
        captured.push(id);
      },
    } as unknown as EventTarget,
    preventDefault: () => void (prevented = true),
  };
  return { e, captured, prevented: () => prevented };
}

describe('the fingers on the on-screen keys, through studio.keys', () => {
  it('a tap: captured, pressed at its velocity on the armed voice, lit, and let go on pointerup', () => {
    const { keys, asked, piano } = made();
    const t = touch(1);
    piano.down(t.e, 60, 90);
    expect(t.captured).toEqual([1]);
    expect(t.prevented()).toBe(true);
    expect([...keys.held]).toEqual([60]);
    piano.up(t.e);
    expect(keys.held.size).toBe(0);
    expect(asked).toEqual(['press 1 lead v90', 'release 1']);
  });

  it('two fingers at once: a chord, each let go by its own finger', () => {
    const { keys, asked, piano } = made();
    piano.down(touch(1).e, 60, 100);
    piano.down(touch(2).e, 64, 100);
    expect([...keys.held].sort()).toEqual([60, 64]);
    piano.up({ pointerId: 1 });
    expect([...keys.held]).toEqual([64]);
    piano.up({ pointerId: 2 });
    expect(asked).toEqual(['press 1 lead v100', 'press 2 lead v100', 'release 1', 'release 2']);
  });

  it('a lost capture lets go; the pointerup after it, or a second lost capture, does nothing', () => {
    const { keys, asked, piano } = made();
    piano.down(touch(7).e, 62, 100);
    piano.up({ pointerId: 7 }); // lostpointercapture
    piano.up({ pointerId: 7 }); // pointerup
    piano.up({ pointerId: 7 });
    expect(keys.held.size).toBe(0);
    expect(asked).toEqual(['press 1 lead v100', 'release 1']);
  });

  it('pointercancel (the page scrolled, a call came) lets go', () => {
    const { keys, piano } = made();
    piano.down(touch(3).e, 60, 100);
    piano.up({ pointerId: 3 });
    expect(keys.held.size).toBe(0);
  });

  it('a pointer that cannot be captured still plays, and lets go on pointerup', () => {
    const { asked, piano } = made();
    const t = touch(9, { throws: true });
    piano.down(t.e, 60, 100);
    piano.up(t.e);
    expect(asked).toEqual(['press 1 lead v100', 'release 1']);
  });

  it("a mouse's other buttons don't play; a finger already down doesn't press twice", () => {
    const { asked, piano } = made();
    piano.down(touch(1, { pointerType: 'mouse', button: 2 }).e, 60, 100);
    expect(asked).toEqual([]);
    piano.down(touch(1).e, 60, 100);
    piano.down(touch(1).e, 64, 100);
    expect(asked).toEqual(['press 1 lead v100']);
  });

  it('two fingers on one key: struck again, sounding until the last lifts', () => {
    const { keys, asked, piano } = made();
    piano.down(touch(1).e, 60, 100);
    piano.down(touch(2).e, 60, 80);
    piano.up({ pointerId: 1 });
    expect([...keys.held]).toEqual([60]);
    piano.up({ pointerId: 2 });
    expect(keys.held.size).toBe(0);
    expect(asked).toEqual(['press 1 lead v100', 'release 1', 'press 2 lead v80', 'release 2']);
  });

  it('Enter or Space holds a focused key while down (a repeat ignored); other keys are not the fingers’', () => {
    const { asked, piano } = made();
    const key = (k: string, repeat = false) => ({ key: k, repeat, preventDefault: () => {} });
    expect(piano.keyDown(key('a'), 60, 100)).toBe(false);
    expect(piano.keyDown(key(' '), 60, 100)).toBe(true);
    piano.keyDown(key(' ', true), 60, 100);
    piano.keyUp(60);
    piano.keyUp(60); // (and the blur after it)
    expect(asked).toEqual(['press 1 lead v100', 'release 1']);
  });

  it('releaseAll (the dock closed, the window blurred) lets every finger go', () => {
    const { keys, asked, piano } = made();
    piano.down(touch(1).e, 60, 100);
    piano.down(touch(2).e, 67, 100);
    piano.releaseAll();
    expect(keys.held.size).toBe(0);
    expect(asked.filter((a) => a.startsWith('release'))).toHaveLength(2);
  });

  it('the sustain pedal holds what the fingers let go, until it lifts', () => {
    const { keys, asked, piano } = made();
    keys.sustain(true);
    expect(keys.pedal).toBe(true);
    piano.down(touch(1).e, 60, 100);
    piano.up({ pointerId: 1 });
    expect(asked).toEqual(['press 1 lead v100']);
    keys.sustain(false);
    expect(keys.pedal).toBe(false);
    expect(asked).toEqual(['press 1 lead v100', 'release 1']);
  });
});

describe('the fingers on the pads: the kit on channel 10, by General MIDI note', () => {
  it('one pad per member; a pad plays its member, lights it, and lets go', () => {
    const { keys, asked, pads } = made();
    expect(keys.pads).toEqual([
      { member: 'bd', note: 36 },
      { member: 'hh', note: 42 },
      { member: 'sd', note: 38 },
    ]);
    pads.down(touch(1).e, 38, 100);
    expect(keys.lit.has('cell:sd')).toBe(true);
    expect(keys.held.size).toBe(0); // (the keyboard's keys don't light from a pad)
    pads.up({ pointerId: 1 });
    expect(keys.lit.size).toBe(0);
    expect(asked).toEqual(['press 1 sd v100', 'release 1']);
  });

  it('two pads at once, whatever the keys play beside them', () => {
    const { asked, pads, piano } = made();
    pads.down(touch(1).e, 36, 100);
    pads.down(touch(2).e, 42, 100);
    piano.down(touch(3).e, 60, 100);
    pads.releaseAll();
    piano.releaseAll();
    expect(asked).toEqual(['press 1 bd v100', 'press 2 hh v100', 'press 3 lead v100', 'release 1', 'release 2', 'release 3']);
  });

  it('the scale dots follow the armed melody; a kit armed has none', () => {
    const { keys } = made();
    expect([...keys.scale!].filter((n) => n >= 60 && n < 72)).toEqual([60, 62, 64, 67, 69]);
    keys.chosen = 'drums';
    expect(keys.scale).toBeNull();
  });
});
