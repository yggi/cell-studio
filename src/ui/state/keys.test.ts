import { setMaxListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Keys, type Hands } from './keys.svelte';
import { Learn } from './learn.svelte';
import { Piece } from './piece.svelte';
import { DRUM_PRESETS, type DrumMap } from '../../midi/drum-presets';
import type { MidiAccess } from '../../midi/access';

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

// a pentatonic melody on a sine at C4, a bass nobody's melody plays, and a kit (bd, hh, sd)
const SONG = `# Song
&bar step=4
&penta 0 2 4 7 9
&tune over=&penta step=&bar 0 1 2
&lead s=sine loop=C4
&bass s=square loop=C2
&drums step=&bar &bd &hh &sd &hh
&bd s=sine loop=A1
&sd s=white
&hh s=white hpf=7000
&mix map=sample [&tune * &lead, &bass * 0, &drums]
`;
const C4 = 440 * Math.pow(2, -9 / 12);
const at = (semis: number) => C4 * Math.pow(2, semis / 12);

type Hearer = (data: Uint8Array, source: string, timeStamp: number) => void;

/** Keys on a piece, with hands that say what they were asked, and a MIDI input a test plays into (`play`). */
function made(code = SONG, { drums = DRUM_PRESETS.GM as DrumMap, claimed }: { drums?: DrumMap; claimed?: (d: Uint8Array) => boolean } = {}) {
  const piece = new Piece(code);
  const asked: string[] = [];
  let id = 0;
  const hands: Hands = {
    press: (voice, freq, velocity) => {
      asked.push(`press ${++id} ${voice} ${freq.toFixed(2)} v${velocity}`);
      return id;
    },
    release: (i) => void asked.push(`release ${i}`),
    onKeysCut: null,
  };
  const hearers = new Set<Hearer>();
  const sent: number[][] = [];
  const letGoers = new Set<() => void>();
  const midi = {
    access: {} as MidiAccess,
    inPortId: 'Keys',
    drums,
    hear: (h: Hearer) => {
      hearers.add(h);
      return () => void hearers.delete(h);
    },
    send: (d: readonly number[]) => void sent.push([...d]),
    letGo: (l: () => void) => {
      letGoers.add(l);
      return () => void letGoers.delete(l);
    },
  };
  const keys = new Keys(piece, hands, midi, { claimed });
  cleanups.push(() => keys.dispose());
  const play = (...bytes: number[]) => hearers.forEach((h) => h(new Uint8Array(bytes), 'Keys', 0));
  const letGo = () => letGoers.forEach((l) => l());
  return { piece, keys, hands, asked, play, sent, midi, letGo, letGoers };
}

describe('press and release: the armed voice, through its table', () => {
  it('nothing chosen and no sheet open: the first cell that plays, in reading order (the melody, on its voice)', () => {
    const { keys, asked } = made();
    expect(keys.armed).toBe('tune');
    keys.press(66, 90); // F#: the nearest of the pentatonic is G
    keys.release(66);
    expect(asked).toEqual([`press 1 lead ${at(7).toFixed(2)} v90`, 'release 1']);
  });

  it('a release with no press is ignored, and so is a second release', () => {
    const { keys, asked } = made();
    keys.release(60);
    keys.press(60);
    keys.release(60);
    keys.release(60);
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`, 'release 1']);
  });

  it('the open sheet arms its cell; one chosen in the dialog wins; a cell that plays nothing arms nothing', () => {
    const { keys, asked } = made();
    keys.sheet = 'bass';
    expect(keys.armed).toBe('bass');
    keys.press(61); // a voice no melody plays: as played
    keys.sheet = 'penta';
    expect(keys.armed).toBe('tune');
    keys.chosen = 'tune';
    keys.sheet = 'bass';
    expect(keys.armed).toBe('tune');
    keys.press(64);
    expect(asked).toEqual([`press 1 bass ${at(1).toFixed(2)} v100`, `press 2 lead ${at(4).toFixed(2)} v100`]);
  });

  it('as played (a setting): the key at its own pitch', () => {
    const { keys, asked } = made();
    keys.mode = 'played';
    keys.press(66);
    expect(asked).toEqual([`press 1 lead ${at(6).toFixed(2)} v100`]);
  });

  it('a key struck again while it sounds strikes again', () => {
    const { keys, asked } = made();
    keys.press(60);
    keys.press(60);
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`, 'release 1', `press 2 lead ${C4.toFixed(2)} v100`]);
  });

  it('holds the keys down for the on-screen keys, and lights the voice and the cell armed while they sound', () => {
    const { keys } = made();
    keys.chosen = 'tune';
    keys.press(60);
    keys.press(64);
    expect([...keys.held]).toEqual([60, 64]);
    expect([...keys.lit].sort()).toEqual(['cell:lead', 'cell:tune']);
    keys.release(60);
    keys.release(64);
    expect(keys.held.size).toBe(0);
    expect(keys.lit.size).toBe(0);
  });

  it('Stop cuts every key: nothing is down, and a release after it is ignored', () => {
    const { keys, hands, asked } = made();
    keys.press(60);
    hands.onKeysCut?.();
    expect(keys.held.size).toBe(0);
    keys.release(60);
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`]);
  });
});

describe('MIDI in', () => {
  it('a note-on presses with its velocity, a note-off (or a note-on at velocity 0) releases', () => {
    const { play, asked } = made();
    play(0x90, 60, 64);
    play(0x80, 60, 0);
    play(0x91, 62, 127);
    play(0x91, 62, 0);
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v64`, 'release 1', `press 2 lead ${at(2).toFixed(2)} v127`, 'release 2']);
  });

  it('channel 10 plays the kit by General MIDI note, whatever is armed; a note no member has, nothing', () => {
    const { keys, play, asked } = made();
    play(0x99, 36, 100);
    play(0x99, 38, 100);
    play(0x99, 42, 100);
    play(0x99, 50, 100);
    expect(asked.map((a) => a.split(' ')[2])).toEqual(['bd', 'sd', 'hh']);
    // (pads are not keys: the on-screen keys don't light them)
    expect(keys.held.size).toBe(0);
  });

  it("a device's drum notes are mapped back through its drum map: a Circuit's 60 is the kick, 62 the snare, 64 the hat", () => {
    const { play, asked } = made(SONG, { drums: DRUM_PRESETS['Novation Circuit'] });
    for (const n of [60, 62, 64, 36]) play(0x99, n, 100);
    expect(asked.map((a) => a.split(' ')[2])).toEqual(['bd', 'sd', 'hh']);
  });

  it('a kit armed plays its members on any channel', () => {
    const { keys, play, asked } = made();
    keys.chosen = 'drums';
    play(0x90, 38, 100);
    keys.press(36);
    expect(asked.map((a) => a.split(' ')[2])).toEqual(['sd', 'bd']);
  });

  it('the sustain pedal holds releases until it comes up; a key held by it struck again strikes again', () => {
    const { play, asked } = made();
    play(0x90, 60, 100);
    play(0xb0, 64, 127);
    play(0x80, 60, 0);
    play(0x90, 62, 100);
    play(0x80, 62, 0);
    expect(asked.filter((a) => a.startsWith('release'))).toEqual([]);
    play(0x90, 62, 100); // (held by the pedal, struck again)
    play(0x80, 62, 0);
    play(0xb0, 64, 0);
    expect(asked.slice(2)).toEqual(['release 2', `press 3 lead ${at(2).toFixed(2)} v100`, 'release 1', 'release 3']);
    // (the pedal up: a release is a release again)
    play(0x90, 64, 100);
    play(0x80, 64, 0);
    expect(asked.slice(-1)).toEqual(['release 4']);
  });

  it("a controller's All notes off (CC 123) or All sound off (CC 120) lets every key go and the pedal up", () => {
    for (const cc of [123, 120]) {
      const { play, asked } = made();
      play(0x90, 60, 100);
      play(0xb0, 64, 127);
      play(0x90, 62, 100);
      play(0x80, 62, 0); // (held by the pedal)
      play(0xb0, cc, 0);
      expect(asked.filter((a) => a.startsWith('release')).sort()).toEqual(['release 1', 'release 2']);
      // (the pedal is up: a key let go is let go, not held)
      play(0x90, 64, 100);
      play(0x80, 64, 0);
      expect(asked.slice(-1)).toEqual(['release 3']);
    }
  });

  it('thru: off unless asked for; on, the keys and the pedal echoed at once on the channel chosen', () => {
    const { keys, play, sent } = made();
    play(0x90, 60, 100);
    play(0x80, 60, 0);
    expect(sent).toEqual([]);
    keys.thru = true;
    keys.thruChannel = 3;
    play(0x90, 60, 100);
    play(0xb0, 64, 127);
    play(0x80, 60, 0);
    keys.press(62, 80); // (the computer keys and the on-screen keys too)
    expect(sent).toEqual([
      [0x92, 60, 100],
      [0xb2, 64, 127],
      [0x82, 60, 0],
      [0x92, 62, 80],
    ]);
  });

  it("MIDI's let-go (All notes off, the input changed or unplugged) lets every key go and the pedal up; disposed, no longer", () => {
    const { keys, play, asked, letGo, letGoers } = made();
    play(0x90, 60, 100);
    play(0xb0, 64, 127);
    keys.press(62);
    letGo();
    expect(asked.filter((a) => a.startsWith('release')).sort()).toEqual(['release 1', 'release 2']);
    expect(keys.held.size).toBe(0);
    play(0x90, 64, 100);
    play(0x80, 64, 0);
    expect(asked.slice(-1)).toEqual(['release 3']);
    keys.dispose();
    expect(letGoers.size).toBe(0);
  });

  it('thru: the keys down get their note-offs (and the pedal comes up) when thru goes off, its channel changes, on a let-go and on Stop', () => {
    const offs = (sent: number[][]) => sent.filter((m) => (m[0] & 0xf0) === 0x80 || (m[0] & 0xf0) === 0xb0);
    // off
    let m = made();
    m.keys.thru = true;
    m.keys.thruChannel = 2;
    m.play(0x90, 60, 100);
    m.play(0xb0, 64, 127);
    m.keys.press(62);
    m.sent.length = 0;
    m.keys.thru = false;
    expect(offs(m.sent)).toEqual([
      [0x81, 60, 0],
      [0x81, 62, 0],
      [0xb1, 64, 0],
    ]);
    m.play(0x80, 60, 0);
    expect(m.sent).toHaveLength(3); // (off now: nothing more goes out)
    // the channel moved: offs on the old one, and the key's own note-off later on the new
    m = made();
    m.keys.thru = true;
    m.keys.thruChannel = 2;
    m.play(0x90, 60, 100);
    m.sent.length = 0;
    m.keys.thruChannel = 2; // (the same: nothing)
    expect(m.sent).toEqual([]);
    m.keys.thruChannel = 5;
    expect(m.sent).toEqual([[0x81, 60, 0]]);
    // a let-go and Stop
    for (const how of ['letGo', 'stop'] as const) {
      m = made();
      m.keys.thru = true;
      m.keys.thruChannel = 3;
      m.play(0x90, 60, 100);
      m.sent.length = 0;
      if (how === 'letGo') m.letGo();
      else m.hands.onKeysCut?.();
      expect(m.sent).toEqual([[0x82, 60, 0]]);
    }
  });

  it('the settings are kept in this browser', () => {
    const first = made();
    first.keys.thru = true;
    first.keys.thruChannel = 5;
    first.keys.mode = 'played';
    const again = made();
    expect([again.keys.thru, again.keys.thruChannel, again.keys.mode, again.keys.computer]).toEqual([true, 5, 'played', false]);
  });
});

describe('MIDI learn and the keys', () => {
  it('a message learn claims is not played, nor the pedal', () => {
    const { play, asked } = made(SONG, { claimed: (d) => d[1] === 64 || d[1] === 61 });
    play(0x90, 60, 100);
    play(0xb0, 64, 127); // (learn's: not the pedal)
    play(0x90, 61, 100); // (learn's pad: not a key)
    play(0x80, 60, 0);
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`, 'release 1']);
  });

  it("with the real Learn: CC 64 learned for a slider is the slider's, not the pedal; unlearned, the pedal again; a key that binds while learning doesn't sound", () => {
    const piece = new Piece(SONG.replace('&bar step=4', '&bar step=free(4, 1..8)'));
    const asked: string[] = [];
    let id = 0;
    const hands: Hands = { press: (_v, _f, vel) => (asked.push(`press ${++id} v${vel}`), id), release: (i) => void asked.push(`release ${i}`), onKeysCut: null };
    const hearers = new Set<Hearer>();
    const midi = { access: {} as MidiAccess, inPortId: 'Keys', drums: DRUM_PRESETS.GM, hear: (h: Hearer) => (hearers.add(h), () => void hearers.delete(h)), send: () => {} };
    // (made in the Studio's order: learn hears a message first)
    const learn = new Learn(piece, midi, { frame: () => {} });
    const keys = new Keys(piece, hands, midi, { claimed: (d) => learn.claims(d) });
    cleanups.push(() => (keys.dispose(), learn.dispose()));
    const play = (...bytes: number[]) => hearers.forEach((h) => h(new Uint8Array(bytes), 'Keys', 0));
    // learn CC 64 for the bar's step, then play: the pedal is the slider's
    learn.learn('bar/step');
    play(0xb0, 64, 127);
    expect(learn.bindings['bar/step']).toEqual({ kind: 'cc', channel: 0, number: 64 });
    play(0x90, 60, 100);
    play(0xb0, 64, 127);
    play(0x80, 60, 0);
    expect(asked).toEqual(['press 1 v100', 'release 1']);
    // forgotten, CC 64 is the pedal again
    learn.forget('bar/step');
    play(0x90, 60, 100);
    play(0xb0, 64, 127);
    play(0x80, 60, 0);
    expect(asked.slice(2)).toEqual(['press 2 v100']);
    play(0xb0, 64, 0);
    expect(asked.slice(3)).toEqual(['release 2']);
    // a note-on that binds while learning is learn's; its note-off, with nothing pressed, is ignored
    learn.learn('bar/step');
    play(0x90, 72, 100);
    play(0x80, 72, 0);
    expect(asked.length).toBe(4);
    expect(learn.bindings['bar/step']).toEqual({ kind: 'note', channel: 0, number: 72 });
  });
});

describe('the computer keys', () => {
  const key = (type: 'keydown' | 'keyup', k: string, more: { repeat?: boolean; ctrlKey?: boolean; target?: unknown } = {}) => {
    const e = Object.assign(new Event(type), { key: k, repeat: more.repeat ?? false, metaKey: false, ctrlKey: more.ctrlKey ?? false, altKey: false });
    if (more.target) Object.defineProperty(e, 'target', { value: more.target });
    page.dispatchEvent(e);
  };

  it('off by default: the page keeps its keys', () => {
    const { asked } = made();
    key('keydown', 'a');
    expect(asked).toEqual([]);
  });

  it('on: a to l play the armed voice (A is C4), 1 to 7 the kit; a key let go releases', () => {
    const { keys, asked } = made();
    keys.computer = true;
    key('keydown', 'a');
    key('keydown', 'd');
    key('keyup', 'a');
    key('keydown', '1');
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`, `press 2 lead ${at(4).toFixed(2)} v100`, 'release 1', `press 3 bd 55.00 v100`]);
  });

  it('ignored typing into a field or the code editor, a repeat, or a shortcut; a key down when the window loses focus lets go', () => {
    const { keys, asked } = made();
    keys.computer = true;
    key('keydown', 'a', { target: { tagName: 'INPUT' } });
    key('keydown', 's', { target: { tagName: 'DIV', isContentEditable: true } });
    key('keydown', 'd', { repeat: true });
    key('keydown', 'f', { ctrlKey: true });
    expect(asked).toEqual([]);
    key('keydown', 'g');
    key('keydown', 'g'); // (held: the browser's repeat without the flag is still the same key)
    page.dispatchEvent(new Event('blur'));
    expect(asked).toEqual([`press 1 lead ${at(7).toFixed(2)} v100`, 'release 1']);
  });

  it('switched off, the keys down let go and the page has its keys back', () => {
    const { keys, asked } = made();
    keys.computer = true;
    key('keydown', 'a');
    keys.computer = false;
    key('keydown', 's');
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`, 'release 1']);
  });
});

describe("rows: the piano roll's key column (#211)", () => {
  it('a row of a cell sounds as the cell plays it, whatever is armed; let go, it releases; the rows down are lit', () => {
    const { keys, asked } = made();
    keys.chosen = 'bass';
    keys.pressRow('tune', 5, 80); // (a lap up: C5)
    expect([...keys.heldRows('tune')]).toEqual([5]);
    expect(keys.heldRows('bass').size).toBe(0);
    expect([...keys.lit].sort()).toEqual(['cell:lead', 'cell:tune']);
    keys.releaseRow('tune', 5);
    keys.releaseRow('tune', 5);
    expect(keys.heldRows('tune').size).toBe(0);
    expect(asked).toEqual([`press 1 lead ${at(12).toFixed(2)} v80`, 'release 1']);
  });
  it("a kit's row is its member; a cell that plays nothing, nothing", () => {
    const { keys, asked } = made();
    keys.pressRow('drums', 2);
    keys.pressRow('penta', 0);
    expect(asked.map((a) => a.split(' ').slice(0, 3).join(' '))).toEqual(['press 1 sd']);
  });
  it('the pedal holds a row; a row pressed again strikes again; thru sends the MIDI note nearest', () => {
    const { keys, asked, sent } = made();
    keys.thru = true;
    keys.sustain(true);
    keys.pressRow('tune', 1);
    keys.releaseRow('tune', 1);
    keys.pressRow('tune', 1);
    keys.sustain(false);
    expect(asked.slice(-1)).toEqual(['press 2 lead ' + at(2).toFixed(2) + ' v100']);
    keys.releaseRow('tune', 1);
    expect(asked).toEqual([`press 1 lead ${at(2).toFixed(2)} v100`, 'release 1', `press 2 lead ${at(2).toFixed(2)} v100`, 'release 2']);
    expect(sent).toEqual([
      [0x90, 62, 100],
      [0x80, 62, 0],
      [0x90, 62, 100],
      [0x80, 62, 0],
    ]);
  });
  it('a row down gets its note-off through thru when thru goes off', () => {
    const { keys, sent } = made();
    keys.thru = true;
    keys.pressRow('tune', 1);
    keys.thru = false;
    expect(sent).toEqual([
      [0x90, 62, 100],
      [0x80, 62, 0],
    ]);
  });
});
