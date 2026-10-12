import { setMaxListeners } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Keys, type Hands } from './keys.svelte';
import { Learn } from './learn.svelte';
import { Piece } from './piece.svelte';
import { DRUM_PRESETS, deviceNote, type DrumMap } from '../../midi/drum-presets';
import { gmDrumNote, noteOf } from '../../engine/midi';
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
/** Where the fake routing sends each voice: the lead on channel 1 of the first output, the kit on 10, the rest nowhere. */
const ROUTES: Readonly<Record<string, readonly { port: number; channel: number }[]>> = { lead: [{ port: 1, channel: 1 }], kit: [{ port: 1, channel: 10 }] };

function made(
  code = SONG,
  {
    drums = DRUM_PRESETS.GM as DrumMap,
    claimed,
    padChannel,
    routes = ROUTES,
  }: { drums?: DrumMap; claimed?: (d: Uint8Array) => boolean; padChannel?: number; routes?: Readonly<Record<string, readonly { port: number; channel: number }[]>> } = {},
) {
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
  // what thru sent, and to which output
  const sent: number[][] = [];
  const sentTo: number[][] = [];
  const letGoers = new Set<(alive?: ReadonlySet<string>) => void>();
  const midi = {
    access: {} as MidiAccess,
    inPortId: 'Keys',
    drumsFrom: () => drums,
    padChannel,
    hear: (h: Hearer) => {
      hearers.add(h);
      return () => void hearers.delete(h);
    },
    thruOf: (voice: string, freq: number, kit: boolean, a4 = 440) =>
      (routes[kit ? 'kit' : voice] ?? []).map((r) => ({ ...r, note: kit ? deviceNote(drums, gmDrumNote(voice) ?? 0) : noteOf(freq, a4).note })),
    sendTo: (port: number, d: readonly number[]) => {
      sent.push([...d]);
      sentTo.push([port, ...d]);
    },
    letGo: (l: (alive?: ReadonlySet<string>) => void) => {
      letGoers.add(l);
      return () => void letGoers.delete(l);
    },
  };
  const keys = new Keys(piece, hands, midi, { claimed });
  cleanups.push(() => keys.dispose());
  const play = (...bytes: number[]) => hearers.forEach((h) => h(new Uint8Array(bytes), 'Keys', 0));
  const playFrom = (source: string, ...bytes: number[]) => hearers.forEach((h) => h(new Uint8Array(bytes), source, 0));
  const letGo = (alive?: ReadonlySet<string>) => letGoers.forEach((l) => l(alive));
  return { piece, keys, hands, asked, play, playFrom, sent, sentTo, midi, letGo, letGoers };
}

describe('two inputs, and a kit put on another channel', () => {
  it('two inputs playing the same key are two keys: one let go leaves the other sounding', () => {
    const { playFrom, asked } = made();
    playFrom('Keys', 0x90, 60, 100);
    playFrom('Pads', 0x90, 60, 100);
    playFrom('Keys', 0x80, 60, 0);
    expect(asked).toEqual([`press 1 lead ${C4.toFixed(2)} v100`, `press 2 lead ${C4.toFixed(2)} v100`, 'release 1']);
    playFrom('Pads', 0x80, 60, 0);
    expect(asked.at(-1)).toBe('release 2');
  });

  it("the pads and a controller's kit channel are the piece's kit channel, 10 unless put elsewhere", () => {
    const on10 = made();
    expect(on10.keys.drumChannel).toBe(9);
    const on3 = made(SONG, { padChannel: 3 });
    expect(on3.keys.drumChannel).toBe(2);
    on3.play(0x92, 36, 100); // channel 3: the kick
    on3.play(0x99, 36, 100); // channel 10 is a melody's key now: not the kit
    expect(on3.asked[0]).toMatch(/^press 1 bd /);
    expect(on3.asked[1]).toMatch(/^press 2 lead /);
    on3.keys.pressPad(36); // (a pad)
    expect(on3.asked[2]).toMatch(/^press 3 bd /);
  });

  it("a kit on channel 1 is not the computer keys' or the screen's: they stay melodic, and a controller's channel 1 is the kit", () => {
    const { keys, play, asked } = made(SONG, { padChannel: 1 });
    keys.press(60); // (an on-screen key)
    keys.release(60);
    expect(asked[0]).toMatch(/^press 1 lead /);
    play(0x90, 36, 100); // a controller on channel 1
    expect(asked[2]).toMatch(/^press 2 bd /);
  });

  it('a pad let go finds the channel it was pressed on, though the kit was moved while it was down', () => {
    let channel = 10;
    const made_ = made();
    const { keys, asked } = made_;
    Object.defineProperty(made_.midi, 'padChannel', { get: () => channel });
    keys.pressPad(36);
    channel = 4;
    keys.releasePad(36);
    expect(asked).toEqual([expect.stringMatching(/^press 1 bd /), 'release 1']);
  });

  it('under All inputs, an input unplugged lets go of the keys held from it, and only those', () => {
    const { playFrom, asked, letGo } = made();
    playFrom('Keys', 0x90, 62, 100);
    playFrom('Pads', 0x90, 62, 100);
    letGo(new Set(['Keys']));
    expect(asked.slice(2)).toEqual(['release 2']);
    letGo(new Set(['Keys']));
    expect(asked.slice(2)).toEqual(['release 2']);
  });
});

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

  it('the open sheet arms its cell; one chosen in the MIDI page wins; a cell that plays nothing arms nothing', () => {
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
    keys.mode = 'allow';
    keys.press(66);
    expect(asked).toEqual([`press 1 lead ${at(6).toFixed(2)} v100`]);
  });

  it('one setting for a key off the table (#210): snap the nearest, allow as played, ignore nothing; the on-screen keys alike', () => {
    const { keys, asked } = made();
    expect(keys.mode).toBe('snap');
    keys.press(66); // F#: G
    keys.mode = 'ignore';
    keys.press(65); // F: off the pentatonic, nothing
    keys.press(67); // G: on it
    keys.mode = 'allow';
    keys.press(61); // C#, as played
    expect(asked).toEqual([`press 1 lead ${at(7).toFixed(2)} v100`, `press 2 lead ${at(7).toFixed(2)} v100`, `press 3 lead ${at(1).toFixed(2)} v100`]);
  });

  it("#207's two ways, kept, read as the three: as played is allow, nearest snap", () => {
    for (const [kept, mode] of [
      ['played', 'allow'],
      ['nearest', 'snap'],
      ['ignore', 'ignore'],
      ['junk', 'snap'],
    ]) {
      store.set('cell-studio:keys', JSON.stringify({ mode: kept }));
      expect(made().keys.mode, kept).toBe(mode);
    }
  });

  it('tells its listener of every key and row, down and up, with their moments (a take records them)', () => {
    const { keys } = made();
    const heard: string[] = [];
    keys.listener = { down: (at, what, ms) => void heard.push(`down ${at} ${JSON.stringify(what)} ${ms}`), up: (at, ms) => void heard.push(`up ${at} ${ms}`) };
    keys.mode = 'ignore';
    keys.press(65, 100, 0, 10); // (off the table: it doesn't sound, but a take hears it: it writes nothing)
    keys.release(65, 0, 20);
    keys.press(36, 100, 9, 30); // (a pad: not a melody's key)
    keys.pressRow('tune', 3, 100, 40);
    keys.releaseRow('tune', 3, 50);
    expect(heard).toEqual(['down 0:65 {"note":65} 10', 'up 0:65 20', 'down row:tune:3 {"cell":"tune","value":3} 40', 'up row:tune:3 50']);
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

  it('thru: off unless asked for; on, the keys and the pedal echoed at once wherever the voice they play goes out', () => {
    const { keys, play, sent, sentTo } = made(SONG, {
      routes: {
        lead: [
          { port: 1, channel: 3 },
          { port: 2, channel: 5 },
        ],
        kit: [{ port: 2, channel: 10 }],
      },
    });
    play(0x90, 60, 100);
    play(0x80, 60, 0);
    expect(sent).toEqual([]);
    keys.thru = true;
    play(0x90, 60, 100);
    play(0xb0, 64, 127);
    play(0x80, 60, 0);
    keys.press(62, 80); // (the computer keys and the on-screen keys too)
    keys.pressPad(38); // (a pad: the kit's row)
    expect(sentTo).toEqual([
      [1, 0x92, 60, 100],
      [2, 0x94, 60, 100],
      [1, 0xb2, 64, 127],
      [2, 0xb4, 64, 127],
      [1, 0x82, 60, 0],
      [2, 0x84, 60, 0],
      [1, 0x92, 62, 80],
      [2, 0x94, 62, 80],
      [2, 0x99, 38, 100],
    ]);
  });

  it('thru sends what the voice sounds: a key snapped to the scale as the note it sounds, and nothing for a voice that goes out nowhere', () => {
    const { keys, sent } = made(SONG, { routes: {} });
    keys.thru = true;
    keys.press(60);
    expect(sent).toEqual([]);
    const m = made();
    m.keys.thru = true;
    m.keys.press(61); // (C sharp over the pentatonic: snapped)
    expect(m.sent).toHaveLength(1);
    expect(m.sent[0]![1]).not.toBe(61);
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

  it('thru: the keys down get their note-offs (and the pedal comes up) when thru goes off, on a let-go and on Stop', () => {
    const offs = (sent: number[][]) => sent.filter((m) => (m[0] & 0xf0) === 0x80 || (m[0] & 0xf0) === 0xb0);
    // off
    let m = made(SONG, { routes: { lead: [{ port: 1, channel: 2 }] } });
    m.keys.thru = true;
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
    // a let-go and Stop
    for (const how of ['letGo', 'stop'] as const) {
      m = made(SONG, { routes: { lead: [{ port: 1, channel: 3 }] } });
      m.keys.thru = true;
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
    first.keys.mode = 'allow';
    const again = made();
    expect([again.keys.thru, again.keys.mode, again.keys.computer]).toEqual([true, 'allow', false]);
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
    const midi = {
      access: {} as MidiAccess,
      inPortId: 'Keys',
      drumsFrom: () => DRUM_PRESETS.GM!,
      hear: (h: Hearer) => (hearers.add(h), () => void hearers.delete(h)),
      thruOf: () => [],
      sendTo: () => {},
      send: () => {},
      echo: () => {},
      reaches: () => true,
    };
    // (made in the Studio's order: learn hears a message first)
    const learn = new Learn(piece, midi, { frame: () => {} });
    const keys = new Keys(piece, hands, midi, { claimed: (d) => learn.claims(d) });
    cleanups.push(() => (keys.dispose(), learn.dispose()));
    const play = (...bytes: number[]) => hearers.forEach((h) => h(new Uint8Array(bytes), 'Keys', 0));
    // learn CC 64 for the bar's step, then play: the pedal is the slider's
    learn.learn('bar/step');
    play(0xb0, 64, 127);
    expect(learn.bindings['bar/step']).toEqual({ kind: 'cc', channel: 0, number: 64, from: 'Keys' });
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
    expect(learn.bindings['bar/step']).toEqual({ kind: 'note', channel: 0, number: 72, from: 'Keys' });
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
