// The settings part lifted from yggi/jambot apps/web/src/midi/settings.test.ts @ 8cdb6b8.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAccess, fakeInput, fakePort, installMidi, uninstallMidi } from '@yggi/webmidi/testing';
import { CONNECT_WAIT, Midi } from './midi.svelte';
import { compilePiece } from '../../compile';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import {
  activeSetup,
  ANY_INPUT,
  BUILT_IN,
  hardwareOutputs,
  hasBuiltIn,
  AS_PLAYED,
  DRUM_PRESETS,
  inputRow,
  saveAs,
  useSetup,
  withClock,
  withCrossing,
  withPlays,
  withProfile,
  type SetupBook,
} from '@yggi/webmidi/core';
import type { NoteSink } from '../../audio/player';
import { plan, type Played } from '@yggi/cells/engine/realize';
import { codeShifts } from '@yggi/cells/engine/program';
import { retime, windowAt } from '@yggi/cells/engine/schedule';

const store = new Map<string, string>();
const page = Object.assign(new EventTarget(), { visibilityState: 'visible' });
let cleanups: (() => void)[] = [];

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  vi.stubGlobal('document', page);
});
afterEach(() => {
  for (const c of cleanups) c();
  cleanups = [];
  uninstallMidi();
  vi.unstubAllGlobals();
});

/** A `Midi`, its first connection settled. */
async function made(): Promise<Midi> {
  const midi = new Midi();
  cleanups.push(() => midi.dispose());
  await vi.waitFor(() => expect(midi.connecting).toBe(false));
  return midi;
}

/** What is kept: webmidi's book, its setup in use, and what Cell studio keeps beside it. */
const kept = () => JSON.parse(store.get('cell-studio:midi-setups')!) as SetupBook;
const keptSetup = () => activeSetup(kept());
const keptOwn = () => JSON.parse(store.get('cell-studio:midi-own')!) as { internal: boolean; moved?: true };

const comeBack = () => {
  page.visibilityState = 'hidden';
  page.dispatchEvent(new Event('visibilitychange'));
  page.visibilityState = 'visible';
  page.dispatchEvent(new Event('visibilitychange'));
};

describe('Midi: the settings', () => {
  it('opens with no MIDI chosen, and asks for no access on a first visit', async () => {
    const ask = vi.fn(() => Promise.resolve(fakeAccess() as unknown as MIDIAccess));
    navigator.requestMIDIAccess = ask;
    const midi = await made();
    expect([midi.outPortId, midi.inPortId, midi.outPort, midi.access]).toEqual(['none', 'none', null, null]);
    expect(ask).not.toHaveBeenCalled();
  });

  it('reads a book kept before what an input plays (webmidi 0.1) by what it heard, each input heard playing the default', async () => {
    installMidi(fakeAccess([fakeInput('in-1', 'Keys'), fakeInput('in-2', 'Pads')], []));
    const kept0 = (heard: unknown) => ({ version: 1, setups: [{ id: 's1', name: 'Setup 1', outputs: [{ key: 'o1', id: 'none', name: '' }], heard }], active: 's1' });
    store.set('cell-studio:midi-setups', JSON.stringify(kept0([{ id: 'in-1', name: 'Keys' }])));
    const one = await made();
    await one.connect();
    expect([activeSetup(one.book).plays, one.inPortId]).toEqual([{ 'in:Keys': 'default' }, 'in-1']);
    store.set('cell-studio:midi-setups', JSON.stringify(kept0('all')));
    const all = await made();
    expect([activeSetup(all.book).plays, all.inPortId]).toEqual([{ 'in:*': 'default' }, 'all']);
  });

  it('keeps the ports chosen, by id and name, and connects to them again on load without a click', async () => {
    const out = fakePort('out-1', 'Synth');
    installMidi(fakeAccess([fakeInput('in-1', 'Keys')], [out]));
    const first = await made();
    await first.connect();
    first.chooseOutput('out-1');
    first.chooseInput('in-1');

    const again = await made();
    expect(again.access).not.toBeNull();
    expect([again.outPortId, again.outPortName, again.inPortId, again.inPortName]).toEqual(['out-1', 'Synth', 'in-1', 'Keys']);
    expect(again.outPort).toBe(out);
    expect(again.message).toBe('MIDI connected: 1 input, 1 output.');
  });

  it('opens with the defaults from a corrupt store, or one of another shape', async () => {
    store.set('cell-studio:midi', '{not json');
    expect((await made()).outPortId).toBe('none');
    store.set('cell-studio:midi', JSON.stringify({ out: { id: 3 }, in: null }));
    const midi = await made();
    expect([midi.outPortId, midi.inPortId]).toEqual(['none', 'none']);
  });

  it('runs without storage (a private window), keeping nothing', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    });
    installMidi(fakeAccess([], [fakePort('out-1', 'Synth')]));
    const midi = await made();
    await midi.connect();
    expect(() => midi.chooseOutput('out-1')).not.toThrow();
    expect(midi.outPortId).toBe('out-1');
  });

  it('says in words why it could not connect', async () => {
    const midi = await made();
    await midi.connect();
    expect(midi.access).toBeNull();
    expect(midi.message).toContain('no Web MIDI');
  });
});

describe('Midi: reconnecting on load', () => {
  const chosen = async () => {
    installMidi(fakeAccess([], [fakePort('out-1', 'Synth')]));
    const first = await made();
    await first.connect();
    first.chooseOutput('out-1');
  };
  const permission = (state: string) => vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { permissions: { query: () => Promise.resolve({ state }) } }));

  it('waits for a click when the browser has not granted MIDI yet, and says so', async () => {
    await chosen();
    permission('prompt');
    const ask = vi.fn(() => Promise.resolve(fakeAccess() as unknown as MIDIAccess));
    navigator.requestMIDIAccess = ask;
    const midi = await made();
    expect(ask).not.toHaveBeenCalled();
    expect(midi.access).toBeNull();
    expect(midi.message).toMatch(/press Connect/);
  });

  it('does not wait for a permission query that never answers', async () => {
    vi.useFakeTimers();
    try {
      await chosen();
      vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { permissions: { query: () => new Promise(() => {}) } }));
      installMidi(fakeAccess([], [fakePort('out-1', 'Synth')]));
      const midi = new Midi();
      cleanups.push(() => midi.dispose());
      await vi.advanceTimersByTimeAsync(1500);
      await vi.waitFor(() => expect(midi.connecting).toBe(false));
      expect(midi.access).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('connects quietly when it has', async () => {
    await chosen();
    permission('granted');
    installMidi(fakeAccess([], [fakePort('out-1', 'Synth')]));
    const midi = await made();
    expect(midi.access).not.toBeNull();
  });

  it('reconnects for a port chosen only on a second output', async () => {
    store.set(
      'cell-studio:midi',
      JSON.stringify({
        outputs: [
          { key: 'o1', id: 'none', name: '' },
          { key: 'o2', id: 'out-2', name: 'Juno' },
        ],
      }),
    );
    installMidi(fakeAccess([], [fakePort('out-2', 'Juno')]));
    const midi = await made();
    expect(midi.remembersPorts).toBe(true);
    expect(midi.access).not.toBeNull();
  });

  it("reads a store from before the matrix: the output first, each piece's channels and kit on it, a slot's device as that output", async () => {
    store.set(
      'cell-studio:midi',
      JSON.stringify({
        out: { id: 'out-1', name: 'Circuit' },
        channels: { Sailor: { bass: 7 } },
        kits: { Sailor: 3 },
        slots: { Song: { 2: { id: 'out-2', name: 'Juno' } } },
      }),
    );
    installMidi(fakeAccess([], [fakePort('out-1', 'Circuit'), fakePort('out-2', 'Juno')]));
    const midi = await made();
    expect(midi.columns.map((c) => [c.port, c.id, c.name])).toEqual([
      [1, 'out-1', 'Circuit'],
      [2, 'out-2', 'Juno'],
    ]);
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    expect(midi.channelsOf('bass', 1)).toEqual([7]);
    expect(midi.channelsOf('bass', 2)).toEqual([]);
    expect(midi.kitChannel).toBe(3);
  });
});

describe('Midi: the ports coming and going', () => {
  it('lists a port plugged in, and shows a chosen one unplugged as still chosen', async () => {
    const access = fakeAccess([], [fakePort('out-1', 'Synth')]);
    installMidi(access);
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    access.outputs.clear();
    access.change();
    expect(midi.ports.outputs).toEqual([]);
    expect(midi.outPortId).toBe('out-1');
    expect(midi.outPort).toBeNull();
    const back = fakePort('out-2', 'Synth');
    access.outputs.set('out-2', back);
    access.change();
    expect(midi.outPort).toBe(back);
    expect(midi.outPortId).toBe('out-2');
    expect(hardwareOutputs(keptSetup())).toEqual([{ key: 'o1', id: 'out-2', name: 'Synth' }]);
  });
});

describe('Midi: All notes off', () => {
  async function withOutput() {
    const out = fakePort('out-1', 'Synth');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    return { midi, out };
  }
  const cc123 = (out: ReturnType<typeof fakePort>) => out.sent.filter((m) => (m.data[0] & 0xf0) === 0xb0 && m.data[1] === 123).map((m) => m.data[0] & 0x0f);

  it('sends CC 123 only on the channels used, then forgets them', async () => {
    const { midi, out } = await withOutput();
    midi.send([0x92, 60, 100]);
    midi.send([0x99, 36, 100]);
    midi.send([0x82, 60, 0]);
    midi.panic();
    expect(cc123(out)).toEqual([2, 9]);
    out.sent = [];
    midi.send([0x90, 60, 100]);
    midi.panic();
    expect(cc123(out)).toEqual([0]);
  });

  it('sends it on all 16 channels when none was used (the button)', async () => {
    const { midi, out } = await withOutput();
    midi.panic();
    expect(cc123(out)).toEqual([...Array(16).keys()]);
  });

  it('runs when the tab comes back into view, if anything was sent', async () => {
    const { midi, out } = await withOutput();
    comeBack();
    expect(cc123(out)).toEqual([]);
    midi.send([0x93, 60, 100]);
    comeBack();
    expect(cc123(out)).toEqual([3]);
  });

  it('keeps the pads on 10 for a piece with MIDI cards, whatever kit channel is stored for its title', async () => {
    installMidi(fakeAccess([], [fakePort('out-1', 'Circuit')]));
    const midi = await made();
    await midi.connect();
    const source = `&bar scan(1 1 1 1) step=2\n&bass step=4n 0\n&sub loop=55\n&far map=midi(5) [&bass * &sub]`;
    midi.attach({ sink: null, internal: true }, { program: compilePiece(source), title: 'Cards' });
    midi.kitChannel = 3;
    expect(midi.padChannel).toBe(10);
    midi.attach({ sink: null, internal: true }, { program: compilePiece('&bar scan(1 1 1 1) step=2\n&a step=4n 0\n&v loop=55\n&m [&a * &v]'), title: 'Plain' });
    midi.kitChannel = 3;
    expect(midi.padChannel).toBe(3);
  });

  it('reaches an output slot with no default output: the button is live, and the tab coming back sends CC 123 there', async () => {
    const other = fakePort('out-2', 'Juno');
    installMidi(fakeAccess([], [fakePort('out-1', 'Circuit'), other]));
    const midi = await made();
    await midi.connect();
    expect(midi.canPanic).toBe(false);
    const program = compilePiece(`&bar scan(1 1 1 1) step=2\n&bass step=4n 0\n&sub loop=55\n&far map=midi(3, 2) [&bass * &sub]`);
    midi.attach({ sink: null, internal: true }, { program, title: 'Slot' });
    expect(midi.canPanic).toBe(false);
    expect(midi.columns.map((c) => [c.port, c.key])).toEqual([
      [1, 'o1'],
      [2, null],
    ]);
    midi.chooseDevice(2, 'out-2');
    expect(midi.canPanic).toBe(true);
    // (a note sent there: the slot has been used)
    const p = plan(program, codeShifts(program));
    midi.play(fakeTone(10), retime(windowAt(p, 0, 1), 10, 1).events, 11);
    other.sent = [];
    comeBack();
    expect(cc123(other)).toContain(2);
  });

  it('stops listening for the tab once disposed', async () => {
    const { midi, out } = await withOutput();
    midi.send([0x93, 60, 100]);
    for (const c of cleanups) c();
    cleanups = [];
    comeBack();
    expect(cc123(out)).toEqual([]);
  });

  it('lets go of the ports once disposed, also when the connection comes after', async () => {
    const keys = fakeInput('in-1', 'Keys');
    const access = fakeAccess([keys]);
    navigator.requestMIDIAccess = () => Promise.resolve(access as unknown as MIDIAccess);
    const midi = new Midi();
    const asking = midi.connect();
    midi.dispose();
    await asking;
    expect(midi.access).toBeNull();
    expect(access.onstatechange).toBeNull();
    expect(keys.onmidimessage).toBeNull();
  });

  it('silences the old output before another is chosen', async () => {
    const { midi, out } = await withOutput();
    midi.send([0x94, 60, 100]);
    midi.chooseOutput('none');
    expect(cc123(out)).toEqual([4]);
    expect(midi.outPort).toBeNull();
  });

  it('goes on to the other channels when one send fails', async () => {
    const { midi, out } = await withOutput();
    midi.send([0x91, 60, 100]);
    midi.send([0x93, 60, 100]);
    const send = out.send;
    let first = true;
    out.send = (data, timestamp) => {
      if (data[0] === 0xb1 && first) {
        first = false;
        throw new Error('gone');
      }
      send(data, timestamp);
    };
    midi.panic();
    expect(cc123(out)).toEqual([3]);
  });

  it('goes on to the other channels of a second output when one send fails, and a piece titled like an object key has none of its own', async () => {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    installMidi(fakeAccess([], [out, other]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    const source = `&bar scan(1 1 1 1) step=2
&bass step=4n 0
&sub loop=55
&far map=midi(3, 2) [&bass * &sub]`;
    const program = compilePiece(source);
    midi.attach({ sink: null, internal: true }, { program, title: 'constructor' });
    // (nothing kept under that title: not Object.prototype.constructor)
    expect(midi.kitChannel).toBe(10);
    expect(midi.columns.map((c) => [c.port, c.id])).toEqual([
      [1, 'out-1'],
      [2, 'none'],
    ]);
    midi.chooseDevice(2, 'out-2');
    const send = other.send;
    let first = true;
    other.send = (data, timestamp) => {
      if (data[0] === 0xb0 && data[1] === 123 && first) {
        first = false;
        throw new Error('gone');
      }
      send(data, timestamp);
    };
    other.sent = [];
    midi.panic();
    // (channel 1, the one whose send threw, is the only one missing)
    expect(new Set(cc123(other))).toEqual(new Set(Array.from({ length: 15 }, (_, i) => i + 1)));
  });

  it('survives a port unplugged mid-send', async () => {
    const { midi, out } = await withOutput();
    out.send = () => {
      throw new Error('gone');
    };
    expect(() => midi.send([0x90, 60, 100])).not.toThrow();
    expect(() => midi.panic()).not.toThrow();
  });
});

/** Tone as the sink sees it: an AudioContext at `t` whose output is heard `lag` later, `t` seconds being `t * 1000 + 5000` ms on the page. */
function fakeTone(t: number, lag = 0.03) {
  const native = {
    currentTime: t,
    outputLatency: lag,
    getOutputTimestamp: () => ({ contextTime: native.currentTime - lag, performanceTime: (native.currentTime - lag) * 1000 + 5000 }),
  };
  return { getContext: () => ({ rawContext: native, lookAhead: 0.3 }), immediate: () => native.currentTime } as unknown as Parameters<NoteSink['play']>[0];
}

describe('Midi: MIDI out', () => {
  async function tapped(title = 'Sailor', source = EXAMPLES.sailor.source) {
    const out = fakePort('out-1', 'Circuit');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    out.sent = [];
    const player = { sink: null as NoteSink | null, internal: true };
    midi.attach(player, { program: compilePiece(source), title });
    return { midi, out, player };
  }
  const note = (voice: string, at: number, output?: string): Played => ({ at, dur: 0.2, voice, freq: 220, bends: [], gains: [1, 1], levels: [], output });

  it('clamps a bend range, a channel and a drum note typed out of range, rather than ignoring them', async () => {
    const { midi } = await tapped();
    midi.bendRange = 200;
    expect(midi.bendRange).toBe(96);
    midi.bendRange = 0;
    expect(midi.bendRange).toBe(1);
    midi.bendRange = NaN;
    expect(midi.bendRange).toBe(1);
    midi.rotate = { from: 0, to: 40 };
    expect(midi.rotate).toEqual({ from: 1, to: 16 });
    midi.setChannel('bass', 20);
    expect(midi.table!.voices.find((v) => v.voice === 'bass')!.channel).toBe(16);
    midi.setDrumNote(38, 300);
    expect(midi.drums[38]).toBe(127);
  });

  it("keeps a piece's kit channel (10 unless put elsewhere), clamped, in the table", async () => {
    const { midi } = await tapped();
    expect(midi.kitChannel).toBe(10);
    midi.kitChannel = 3;
    expect(midi.kitChannel).toBe(3);
    expect(midi.table!.kits).toEqual([{ port: 1, channel: 3 }]);
    // (the piece's first change writes what it played into the setup, then the change)
    expect(keptSetup().routes).toEqual({ 'piece:Sailor': { fiddle: { o1: 1 }, bass: { o1: 2 }, '*': { o1: 3 } } });
    midi.kitChannel = 40;
    expect(midi.kitChannel).toBe(16);
  });

  it('taps the player: its sink, and its sound follows the setup’s built-in column, kept in the setup', async () => {
    const { midi, player } = await tapped();
    expect(player.sink).toBe(midi);
    expect([midi.internal, player.internal]).toEqual([true, true]);
    midi.setBuiltIn(false);
    expect([midi.internal, player.internal, hasBuiltIn(keptSetup())]).toEqual([false, false, false]);
    midi.setBuiltIn(true);
    expect([player.internal, keptSetup().outputs[0]]).toEqual([true, BUILT_IN]);
  });

  it('moves the switch kept before into every setup of the book once: on, the built-in first in each; off, none', async () => {
    for (const [internal, has] of [
      [true, true],
      [false, false],
    ] as const) {
      store.clear();
      store.set('cell-studio:midi-own', JSON.stringify({ internal, legacy: {} }));
      const midi = await made();
      expect([midi.internal, hasBuiltIn(keptSetup()), keptOwn().moved]).toEqual([has, has, true]);
      // once: taken out afterwards, it stays out
      midi.setBuiltIn(false);
      midi.dispose();
      expect((await made()).internal).toBe(false);
    }
  });

  it('shows on the built-in’s column the rows the piece’s own sound plays, and keeps none of it: the piece says', async () => {
    const { midi } = await tapped();
    const shown = activeSetup(midi.matrixBook);
    expect(shown.outputs[0]).toEqual(BUILT_IN);
    expect(Object.entries(shown.routes['piece:Sailor']!).filter(([, c]) => Object.hasOwn(c, 'builtin')).length).toBeGreaterThan(0);
    midi.changeMatrix(withCrossing(midi.matrixBook, 'piece:Sailor', 'bass', 'o1', 5));
    expect(JSON.stringify(keptSetup().routes)).not.toContain('builtin');
  });

  it('sends what the player plays, timestamped for when it is heard, on the channel table; each kit member on 10', async () => {
    const { midi, out } = await tapped();
    expect(midi.table!.voices).toEqual([
      { voice: 'fiddle', channel: 1, port: 1 },
      { voice: 'bass', channel: 2, port: 1 },
    ]);
    const kit = compilePiece(EXAMPLES.sailor.source).outputs.find((o) => o.kit)!.id;
    midi.play(fakeTone(10), [note('bass', 10.3), note('sd', 10.3, kit)], 10.5);
    expect(out.sent).toEqual([
      { data: [0x91, 57, 127], timestamp: 10.3 * 1000 + 5000 },
      { data: [0x99, 38, 127], timestamp: 10.3 * 1000 + 5000 },
      { data: [0x81, 57, 0], timestamp: 10.5 * 1000 + 5000 },
      { data: [0x89, 38, 0], timestamp: 10.5 * 1000 + 5000 },
    ]);
  });

  it("keeps a voice's channel per piece, and a device's drum map per port", async () => {
    const { midi } = await tapped();
    midi.setChannel('bass', 7);
    midi.drums = DRUM_PRESETS['Novation Circuit'];
    midi.setDrumNote(38, 63);
    midi.bendRange = 48;
    midi.rotate = { from: 2, to: 9 };
    expect(keptSetup().routes).toEqual({ 'piece:Sailor': { fiddle: { o1: 1 }, bass: { o1: 7 }, '*': { o1: 10 } } });
    expect(kept().devices.Circuit!.drums[38]).toBe(63);
    const again = await made();
    expect([again.drums[36], again.drums[38], again.bendRange, again.rotate]).toEqual([60, 63, 48, { from: 2, to: 9 }]);
    again.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    expect(again.table!.voices.find((v) => v.voice === 'bass')!.channel).toBe(7);
    // (another piece: its own table)
    again.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Other' });
    expect(again.table!.voices.find((v) => v.voice === 'bass')!.channel).toBe(2);
  });

  it('stops: all notes off now, and a note-off for each note still held, then nothing held', async () => {
    const { midi, out } = await tapped();
    midi.play(fakeTone(10), [note('bass', 10.3)], 10.4);
    out.sent = [];
    midi.stop(fakeTone(10.35));
    expect(out.sent.map((m) => [m.data, m.timestamp])).toEqual([
      [[0xb1, 123, 0], 10.35 * 1000 + 5000],
      [[0x81, 57, 0], 10.35 * 1000 + 5000],
    ]);
  });

  it('a resume or a seek just after a stop is not cut: nothing past the stop silences it', async () => {
    const { midi, out } = await tapped();
    midi.play(fakeTone(10), [{ ...note('bass', 10.3), dur: 2 }], 10.5);
    midi.stop(fakeTone(10.35));
    midi.play(fakeTone(10.4), [{ ...note('bass', 10.45), dur: 2 }], 10.65);
    midi.play(fakeTone(12.4), [], 12.65);
    const late = out.sent.filter((m) => m.timestamp! > 10.45 * 1000 + 5000 && m.timestamp! < 12.45 * 1000 + 5000);
    expect(late).toEqual([]);
    expect(out.sent.at(-1)).toEqual({ data: [0x81, 57, 0], timestamp: 12.45 * 1000 + 5000 });
  });

  it('keeps a note held through a recompile while playing (a held free() moved), and sends its note-off', async () => {
    const { midi, out, player } = await tapped();
    midi.play(fakeTone(10), [{ ...note('bass', 10.3), dur: 2 }], 10.5);
    midi.attach(player, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    midi.play(fakeTone(10.25), [], 10.75);
    midi.play(fakeTone(12.2), [], 12.5);
    expect(out.sent.map((m) => [...m.data, Math.round(m.timestamp!)])).toEqual([
      [0x91, 57, 127, 15300],
      [0x81, 57, 0, 17300],
    ]);
  });

  it("silences a voice's notes when its channel changes while playing, one struck ahead at its start", async () => {
    const { midi, out } = await tapped();
    midi.play(fakeTone(10), [{ ...note('bass', 10.3), dur: 2 }], 10.5);
    midi.setChannel('bass', 7);
    midi.play(fakeTone(10.25), [], 10.75);
    expect(out.sent.slice(1)).toEqual([
      { data: [0xb1, 123, 0], timestamp: 10.25 * 1000 + 5000 },
      { data: [0x81, 57, 0], timestamp: 10.3 * 1000 + 5000 },
    ]);
  });

  it('lets go of a note struck ahead on All notes off, and on another output chosen, while playing', async () => {
    for (const act of [(m: Midi) => m.panic(), (m: Midi) => m.chooseOutput('none')]) {
      const { midi, out } = await tapped();
      midi.play(fakeTone(10), [note('bass', 10.3)], 10.4);
      act(midi);
      expect(out.sent).toContainEqual({ data: [0x81, 57, 0], timestamp: 10.3 * 1000 + 5000 });
    }
  });

  it('a piece with MIDI cards sends only what they name, on their channels and output slots (slot n the nth output)', async () => {
    const source = `&bar scan(1 1 1 1) step=2
&theme step=4n 0 2
&reed s=square loop=220
&bass step=4n 0
&sub loop=55
&lone s=sine loop=330
&out map=sample [&theme * &reed, &bass * &lone]
&synth map=midi ~ [&theme * &reed]
&far map=midi(3, 2) [&bass * &sub]`;
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    installMidi(fakeAccess([], [out, other]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    out.sent = [];
    const program = compilePiece(source);
    midi.attach({ sink: null, internal: true }, { program, title: 'Cards' });
    expect(midi.table!.byPiece).toBe(true);
    expect(midi.columns.map((c) => [c.port, c.id, c.name])).toEqual([
      [1, 'out-1', 'Circuit'],
      [2, 'none', ''],
    ]);
    midi.chooseDevice(2, 'out-2');
    expect(hardwareOutputs(keptSetup())).toEqual([
      { key: 'o1', id: 'out-1', name: 'Circuit' },
      { key: 'o2', id: 'out-2', name: 'Juno' },
    ]);
    const p = plan(program, codeShifts(program));
    const w = retime(windowAt(p, 0, 1), 10, 1);
    midi.play(fakeTone(10), w.events, 11);
    const ons = (port: ReturnType<typeof fakePort>) => port.sent.filter((m) => (m.data[0] & 0xf0) === 0x90).map((m) => [m.data[0] & 0x0f, m.data[1]]);
    // the reed on channel 2 of slot 1 (~ skipped 1), the sub, sent (and heard: cells decision 064), on channel 3 of slot 2; &lone on no card: not sent
    expect(new Set(ons(out).map(([c]) => c))).toEqual(new Set([1]));
    expect(ons(out).length).toBe(w.events.filter((e) => e.voice === 'reed').length);
    expect(ons(other)).toEqual(w.events.filter((e) => e.voice === 'sub').map((e) => [2, Math.round(69 + 12 * Math.log2(e.freq / 440))]));
    expect(w.events.filter((e) => e.voice === 'sub').every((e) => !e.unheard && e.gains[0] === 1)).toBe(true);
    // stopped: the second slot is silenced too
    midi.stop(fakeTone(11));
    expect(other.sent.some((m) => m.data[0] === 0xb2 && m.data[1] === 123)).toBe(true);
  });

  it('a matrix: a voice on any output and channel, the kit on each with its own drum map, kept per piece; the outputs kept for all', async () => {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    const third = fakePort('out-3', 'Pads');
    installMidi(fakeAccess([], [out, other, third]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    // (everything on the first; the add button offers the other two)
    expect(midi.spare.map((p) => p.name)).toEqual(['Juno', 'Pads']);
    midi.addOutput('out-2');
    expect(midi.spare.map((p) => p.name)).toEqual(['Pads']);
    expect(midi.channelsOf('bass', 2)).toEqual([]);
    midi.setChannel('bass', 5, 2);
    midi.setChannel('bass', 0, 1);
    midi.setKitChannel(10, 2);
    midi.setDrums(2, DRUM_PRESETS['Novation Circuit']);
    expect([midi.channelsOf('bass', 1), midi.channelsOf('bass', 2), midi.kitChannelsOf(2)]).toEqual([[], [5], [10]]);
    const kit = compilePiece(EXAMPLES.sailor.source).outputs.find((o) => o.kit)!.id;
    out.sent = [];
    midi.play(fakeTone(10), [note('bass', 10.3), note('fiddle', 10.3), note('bd', 10.3, kit)], 10.5);
    const ons = (port: ReturnType<typeof fakePort>) => port.sent.filter((m) => (m.data[0] & 0xf0) === 0x90).map((m) => [(m.data[0] & 0x0f) + 1, m.data[1]]);
    // the bass on 5 of the second alone; the fiddle on the first alone; the kick on both, sent as each device's note
    expect(ons(out)).toEqual([
      [1, 57],
      [10, 36],
    ]);
    expect(ons(other)).toEqual([
      [5, 57],
      [10, 60],
    ]);
    expect(keptSetup().routes).toEqual({ 'piece:Sailor': { fiddle: { o1: 1 }, bass: { o2: 5 }, '*': { o1: 10, o2: 10 } } });
    // (another piece: the outputs are there, its routing the default: all on the first)
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Other' });
    expect(midi.columns.map((c) => c.name)).toEqual(['Circuit', 'Juno']);
    expect([midi.channelsOf('bass', 1), midi.channelsOf('bass', 2), midi.kitChannelsOf(2)]).toEqual([[2], [], []]);
  });

  it('forgets a device’s profile, and resets every setup and profile to a first visit’s, silencing what went out', async () => {
    const out = fakePort('out-1', 'Circuit');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    expect(midi.hasProfile(1)).toBe(false);
    midi.setProfile(1, { latency: 20 });
    expect([midi.hasProfile(1), midi.profileOf(1).latency]).toEqual([true, 20]);
    midi.forgetDevice(1);
    expect([midi.hasProfile(1), midi.profileOf(1).latency]).toEqual([false, 0]);
    midi.setProfile(1, { latency: 20 });
    midi.sendTo(1, [0x92, 60, 100]);
    out.sent = [];
    midi.reset();
    expect([kept().devices, hardwareOutputs(keptSetup()), midi.outPortId]).toEqual([{}, [{ key: 'o1', id: 'none', name: '' }], 'none']);
    expect(out.sent.some((m) => m.data[0] === 0xb2 && m.data[1] === 123)).toBe(true);
  });

  it('removes an output: silenced, its routing gone, the next taking its place; the first removed, the second is first', async () => {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    installMidi(fakeAccess([], [out, other]));
    const midi = await made();
    // (a setup of MIDI alone: with the built-in beside it, the last output removed leaves the built-in alone, below)
    midi.setBuiltIn(false);
    await midi.connect();
    midi.chooseOutput('out-1');
    midi.addOutput('out-2');
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    midi.setChannel('bass', 4, 2);
    midi.play(fakeTone(10), [{ ...note('bass', 10.3), dur: 2 }], 10.5);
    other.sent = [];
    midi.removeOutput(1);
    expect(midi.columns.map((c) => [c.port, c.name])).toEqual([[1, 'Juno']]);
    expect(midi.outPort).toBe(other);
    // (the bass was on 4 of what is now the first: still there)
    expect(midi.channelsOf('bass', 1)).toEqual([4]);
    // the last is left with no device, its routing kept for the next device chosen
    other.sent = [];
    midi.removeOutput(1);
    expect(midi.columns.map((c) => [c.port, c.name])).toEqual([[1, '']]);
    expect([midi.outPortId, midi.outPort]).toEqual(['none', null]);
    expect(midi.channelsOf('bass', 1)).toEqual([4]);
    expect(other.sent.some((m) => m.data[0] === 0xb3 && m.data[1] === 123)).toBe(true);
    midi.chooseOutput('out-2');
    midi.addOutput('out-1');
    out.sent = [];
    midi.removeOutput(1);
    expect(other.sent.some((m) => m.data[0] === 0xb3 && m.data[1] === 123)).toBe(true);
    expect(midi.columns.map((c) => c.name)).toEqual(['Circuit']);
    expect(keptSetup().routes).toEqual({ 'piece:Sailor': {} });
    // with the built-in beside it, the last output removed goes, and the built-in plays on alone, sending nowhere
    midi.setBuiltIn(true);
    midi.removeOutput(1);
    expect([midi.columns, keptSetup().outputs, midi.outPort, midi.internal]).toEqual([[], [BUILT_IN], null, true]);
  });

  it('sends MIDI clock to each output switched on, kept per device', async () => {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Drums');
    installMidi(fakeAccess([], [out, other]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    midi.addOutput('out-2');
    const program = compilePiece(EXAMPLES.sailor.source);
    midi.attach({ sink: null, internal: true }, { program, title: 'Sailor' });
    midi.setClock(2, true);
    expect([midi.sendClock, midi.clockOf(2), midi.clocking]).toEqual([false, true, true]);
    const p = plan(program, codeShifts(program));
    midi.play(fakeTone(9.7), [], 10.25, retime(windowAt(p, 0, 0.25), 10, 1).clock);
    const ticks = (port: ReturnType<typeof fakePort>) => port.sent.filter((m) => m.data[0] === 0xf8).length;
    expect(ticks(out)).toBe(0);
    expect(ticks(other)).toBeGreaterThan(0);
    expect(keptSetup().clock).toEqual(['o2']);
  });

  it("says where thru sends a key: every crossing of its voice's row, a kit member as each output's drum note; the kit's channels for a controller", async () => {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    installMidi(fakeAccess([], [out, other]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    midi.addOutput('out-2');
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    midi.setChannel('bass', 6, 2);
    midi.setKitChannel(3, 2);
    midi.setDrums(2, DRUM_PRESETS['Novation Circuit']);
    expect(midi.thruOf('bass', 220, false)).toEqual([
      { port: 1, channel: 2, note: 57 },
      { port: 2, channel: 6, note: 57 },
    ]);
    expect(midi.thruOf('bd', 0, true)).toEqual([
      { port: 1, channel: 10, note: 36 },
      { port: 2, channel: 3, note: 60 },
    ]);
    expect(midi.thruOf('nobody', 220, false)).toEqual([]);
    expect([...midi.drumChannels].sort((a, b) => a - b)).toEqual([3, 10]);
    // (a device's notes come back through its own map, by the name it sends under)
    expect([midi.drumsFrom('Juno')[36], midi.drumsFrom('Circuit')[36], midi.drumsFrom('Keys')[36]]).toEqual([60, undefined, undefined]);
    midi.sendTo(2, [0x95, 57, 100]);
    expect(other.sent.at(-1)!.data).toEqual([0x95, 57, 100]);
  });

  it('keeps the bend range and the rotation per device, each output sending with its own', async () => {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Seaboard');
    installMidi(fakeAccess([], [out, other]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    midi.addOutput('out-2');
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    midi.setBend(2, 48);
    midi.setRotate(2, { from: 2, to: 4 });
    expect([midi.bendOf(1), midi.bendOf(2), midi.rotateOf(1), midi.rotateOf(2)]).toEqual([2, 48, null, { from: 2, to: 4 }]);
    expect(kept().devices.Seaboard).toMatchObject({ bend: 48, mpe: { from: 2, to: 4 } });
    midi.setChannel('bass', 1, 2);
    // three quarter-tone-sharp notes at once: on the Seaboard each on a channel of its own, bent for ±48
    const sharp = (at: number): Played => ({ ...note('bass', at), freq: 220 * Math.pow(2, 0.5 / 12), dur: 1 });
    midi.play(fakeTone(10), [sharp(10.3), sharp(10.3), sharp(10.3)], 10.4);
    const ons = (port: ReturnType<typeof fakePort>) => port.sent.filter((m) => (m.data[0] & 0xf0) === 0x90).map((m) => (m.data[0] & 0x0f) + 1);
    expect(ons(other)).toEqual([2, 3, 4]);
    expect(other.sent.find((m) => (m.data[0] & 0xf0) === 0xe0)!.data).toEqual([0xe1, 43, 63]); // (57.5 is 58, 50 cents down: 8192 - 85)
    expect(new Set(ons(out))).toEqual(new Set([2]));
  });

  it("echoes a learned knob to its controller's own output port, by the input's name, whether or not it is an output", async () => {
    const synth = fakePort('out-1', 'Circuit');
    const faders = fakePort('out-2', 'Faders');
    installMidi(fakeAccess([], [synth, faders]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    expect([midi.reaches('Faders'), midi.reaches('Knobs'), midi.reaches(undefined)]).toEqual([true, false, true]);
    midi.echo('Faders', [0xb0, 7, 64]);
    midi.echo('Knobs', [0xb0, 7, 64]);
    expect([synth.sent, faders.sent]).toEqual([[], [{ data: [0xb0, 7, 64], timestamp: undefined }]]);
    // (a knob kept from before, with no controller: the first output, as it was)
    midi.echo(undefined, [0xb0, 7, 1]);
    expect(synth.sent.map((m) => m.data)).toEqual([[0xb0, 7, 1]]);
  });

  it('sends nothing without an output, and the player plays on', async () => {
    const midi = await made();
    const player = { sink: null as NoteSink | null, internal: true };
    midi.attach(player, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    expect(() => midi.play(fakeTone(1), [note('bass', 1.1)], 1.25)).not.toThrow();
    expect(() => midi.stop(fakeTone(1))).not.toThrow();
  });
});

describe('Midi: MIDI clock', () => {
  async function tapped(source = EXAMPLES.sailor.source) {
    const out = fakePort('out-1', 'Drum machine');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    out.sent = [];
    const program = compilePiece(source);
    midi.attach({ sink: null, internal: true }, { program, title: 'A piece' });
    const p = plan(program, codeShifts(program));
    // (the player: windows of 0.25 code seconds from 0, the first heard at audio second 10)
    const play = (from: number, to: number) => {
      for (let x = from; x < to - 1e-9; x += 0.25) midi.play(fakeTone(10 + x - 0.3), [], 10 + x + 0.25, retime(windowAt(p, x, 0.25), 10 + x, 1).clock);
    };
    return { midi, out, play };
  }
  const clockMessages = (sent: { data: number[]; timestamp?: number }[]) => sent.filter((m) => m.data[0] >= 0xf8 || m.data[0] === 0xf2);

  it('is off by default, and then sends nothing', async () => {
    const { midi, out, play } = await tapped();
    expect(midi.sendClock).toBe(false);
    play(0, 2);
    midi.stop(fakeTone(12));
    expect(clockMessages(out.sent)).toEqual([]);
  });

  it("switched on, sends Start, the main meter's ticks through the same clock offset as the notes, and Stop when stopped; kept per device", async () => {
    const { midi, out, play } = await tapped();
    midi.sendClock = true;
    play(0, 4);
    midi.stop(fakeTone(14));
    const sent = clockMessages(out.sent);
    expect(sent[0]).toEqual({ data: [0xfa], timestamp: 10 * 1000 + 5000 - 2 });
    // (sailor's bar at 112 bpm: a beat of 60/112 s, 24 ticks; a 4/4 bar, 96)
    const beat = (n: number) => sent.filter((m) => m.data[0] === 0xf8 && m.timestamp! < 15000 + (n * 60 * 1000) / 112 - 1e-6);
    expect(beat(1)).toHaveLength(24);
    expect(beat(4)).toHaveLength(96);
    expect(sent[1]).toEqual({ data: [0xf8], timestamp: 10 * 1000 + 5000 });
    expect(sent.at(-1)!.data).toEqual([0xfc]);
    expect(keptSetup().clock).toEqual(['o1']);
    expect((await made()).sendClock).toBe(true);
  });

  it('switched off while playing: Stop, and no more ticks', async () => {
    const { midi, out, play } = await tapped();
    midi.sendClock = true;
    play(0, 1);
    midi.sendClock = false;
    play(1, 2);
    const sent = clockMessages(out.sent);
    expect(sent.at(-1)!.data).toEqual([0xfc]);
    expect(sent.filter((m) => m.data[0] === 0xfc)).toHaveLength(1);
  });

  it('sends Stop to the old output when another is chosen while playing', async () => {
    const { midi, out, play } = await tapped();
    midi.sendClock = true;
    play(0, 1);
    midi.chooseOutput('none');
    expect(clockMessages(out.sent).at(-1)!.data).toEqual([0xfc]);
  });

  it('a piece with no meter sends no clock, and says so', async () => {
    const { midi, out, play } = await tapped('&tune step=4 0 2 4\n&v s=sine loop=C4\n&out map=sample [&tune * &v]');
    midi.sendClock = true;
    expect(midi.meter).toBeNull();
    play(0, 2);
    midi.stop(fakeTone(12));
    expect(clockMessages(out.sent)).toEqual([]);
  });
});

describe('Midi: hearing the input', () => {
  it('passes every message from the input listened to, raw, to whoever hears, until they stop', async () => {
    const keys = fakeInput('in-1', 'Keys');
    installMidi(fakeAccess([keys]));
    const midi = await made();
    await midi.connect();
    midi.chooseInput('in-1');
    const heard: number[][] = [];
    const stop = midi.hear((data) => void heard.push([...data]));
    keys.play([0xb0, 7, 64]);
    keys.play([0x90, 60, 100]);
    stop();
    keys.play([0xb0, 7, 65]);
    expect(heard).toEqual([
      [0xb0, 7, 64],
      [0x90, 60, 100],
    ]);
  });
});

describe('Midi: letting the keys go', () => {
  async function listening() {
    const keys = fakeInput('in-1', 'Keys');
    const access = fakeAccess([keys, fakeInput('in-2', 'Pads')], [fakePort('out-1', 'Synth')]);
    installMidi(access);
    const midi = await made();
    await midi.connect();
    midi.chooseInput('in-1');
    const told = vi.fn();
    const stop = midi.letGo(told);
    return { midi, access, told, stop };
  }

  it('tells on All notes off, on coming back into view (sent anything or not), and until stopped', async () => {
    const { midi, told, stop } = await listening();
    midi.panic();
    expect(told).toHaveBeenCalledTimes(1);
    comeBack();
    expect(told).toHaveBeenCalledTimes(2);
    midi.chooseOutput('out-1');
    midi.send([0x90, 60, 100]);
    comeBack(); // (through All notes off: once)
    expect(told).toHaveBeenCalledTimes(3);
    stop();
    midi.panic();
    expect(told).toHaveBeenCalledTimes(3);
  });

  it('tells when another input is chosen, not when the same one is', async () => {
    const { midi, told } = await listening();
    midi.chooseInput('in-1');
    expect(told).not.toHaveBeenCalled();
    midi.chooseInput('all');
    expect(told).toHaveBeenCalledTimes(1);
  });

  it('tells when the input listened to is unplugged, not when another port comes or goes', async () => {
    const { access, told } = await listening();
    access.inputs.delete('in-2');
    access.change();
    expect(told).not.toHaveBeenCalled();
    access.inputs.delete('in-1');
    access.change();
    expect(told).toHaveBeenCalledTimes(1);
  });

  it('lets go once when the input goes, not at every later change of ports', async () => {
    const { access, told } = await listening();
    access.inputs.delete('in-1');
    access.change();
    access.inputs.delete('in-2');
    access.change();
    access.change();
    expect(told).toHaveBeenCalledTimes(1);
  });

  it('tells once when an input remembered from the last visit is unplugged, though nothing was chosen this time', async () => {
    store.set('cell-studio:midi', JSON.stringify({ in: { id: 'in-1', name: 'Keys' } }));
    const access = fakeAccess([fakeInput('in-1', 'Keys')], []);
    installMidi(access);
    const midi = await made();
    const told = vi.fn();
    midi.letGo(told);
    access.inputs.delete('in-1');
    access.change();
    expect(told).toHaveBeenCalledTimes(1);
  });

  it('under All inputs, says which inputs are still there, so only the keys of one unplugged let go', async () => {
    const { midi, access, told } = await listening();
    midi.chooseInput('all');
    told.mockClear();
    access.inputs.delete('in-2');
    access.change();
    expect(told).toHaveBeenCalledTimes(1);
    expect(told.mock.calls[0][0]).toEqual(new Set(['Keys']));
  });

  it('tells when the input listened to stays listed but disconnected', async () => {
    const { access, told } = await listening();
    (access.inputs.get('in-1') as unknown as { state: string }).state = 'disconnected';
    access.change();
    expect(told).toHaveBeenCalledTimes(1);
  });
});

describe('Midi: the store from before the book, migrated', () => {
  const kit = () => compilePiece(EXAMPLES.sailor.source).outputs.find((o) => o.kit)!.id;
  const note = (voice: string, at: number, output?: string): Played => ({ at, dur: 0.2, voice, freq: 220, bends: [], gains: [1, 1], levels: [], output });
  const ons = (port: ReturnType<typeof fakePort>) => port.sent.filter((m) => (m.data[0] & 0xf0) === 0x90).map((m) => [(m.data[0] & 0x0f) + 1, m.data[1]]);
  // (a store with every field the store before the book kept: a voice not sent on the first output (0), one routed
  // to the second, the kit moved, a voice left to its default; profiles and clock by device name)
  const OLD = {
    outputs: [
      { key: 'o1', id: 'out-1', name: 'Circuit' },
      { key: 'o2', id: 'out-2', name: 'Juno' },
    ],
    in: { id: 'in-1', name: 'Keys' },
    routes: { Sailor: { o1: { bass: 0, '*': 3 }, o2: { bass: 6 } } },
    drums: { Circuit: DRUM_PRESETS['Novation Circuit'] },
    internal: false,
    bendRange: 12,
    rotate: null,
    bends: { Juno: 48 },
    rotates: {},
    clock: { Juno: true, Circuit: false },
  };

  async function migratedMidi() {
    store.set('cell-studio:midi', JSON.stringify(OLD));
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    installMidi(fakeAccess([fakeInput('in-1', 'Keys')], [out, other]));
    const midi = await made();
    const player = { sink: null as NoteSink | null, internal: true };
    midi.attach(player, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    return { midi, out, other, player };
  }

  it('routes, sends, clocks and hears as the old store did', async () => {
    const { midi, out, other, player } = await migratedMidi();
    expect(midi.access).not.toBeNull();
    expect(midi.table!.voices).toEqual([
      { voice: 'fiddle', channel: 1, port: 1 },
      { voice: 'bass', channel: 6, port: 2 },
    ]);
    expect(midi.table!.kits).toEqual([{ port: 1, channel: 3 }]);
    expect([midi.kitChannel, midi.bendOf(1), midi.bendOf(2), midi.clockOf(1), midi.clockOf(2), midi.inPortId, player.internal]).toEqual([3, 12, 48, false, true, 'in-1', false]);
    midi.play(fakeTone(10), [note('bass', 10.3), note('fiddle', 10.3), note('bd', 10.3, kit())], 10.5);
    expect(ons(out)).toEqual([
      [1, 57],
      [3, 60],
    ]);
    expect(ons(other)).toEqual([[6, 57]]);
    // (the book holds it as one named setup; nothing is changed by reading it)
    expect(kept().setups.map((s) => s.name)).toEqual(['Cell studio']);
    expect(keptOwn()).toEqual({ internal: false, legacy: OLD.routes, moved: true });
  });

  it('a piece the old store left to the defaults plays them; another piece, its own', async () => {
    const { midi } = await migratedMidi();
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Other' });
    expect(midi.table!.voices).toEqual([
      { voice: 'fiddle', channel: 1, port: 1 },
      { voice: 'bass', channel: 2, port: 1 },
    ]);
  });

  it("a change to a piece's routes writes what it played into the setup's custom variant, then the change", async () => {
    const { midi } = await migratedMidi();
    midi.setChannel('fiddle', 4, 2);
    expect(midi.table!.voices).toEqual([
      { voice: 'fiddle', channel: 1, port: 1 },
      { voice: 'fiddle', channel: 4, port: 2 },
      { voice: 'bass', channel: 6, port: 2 },
    ]);
    expect(kept().setups.map((s) => s.name)).toEqual(['Cell studio', 'Cell studio - custom']);
    expect(keptSetup().routes['piece:Sailor']).toEqual({ fiddle: { o1: 1, o2: 4 }, bass: { o2: 6 }, '*': { o1: 3 } });
    // (the named setup stays as it was: nothing of what was only shown is kept there)
    expect(kept().setups[0]!.routes).toEqual({});
  });

  it('a store from before the matrix migrates through the same reader', async () => {
    store.set('cell-studio:midi', JSON.stringify({ out: { id: 'out-1', name: 'Circuit' }, in: { id: 'none', name: '' }, clock: { Circuit: true } }));
    installMidi(fakeAccess([], [fakePort('out-1', 'Circuit')]));
    const midi = await made();
    expect([midi.outPortId, midi.sendClock, midi.inPortId]).toEqual(['out-1', true, 'none']);
  });
});

describe('Midi: the patch matrix', () => {
  async function two() {
    const out = fakePort('out-1', 'Circuit');
    const other = fakePort('out-2', 'Juno');
    const keys = fakeInput('in-1', 'Keys');
    const pads = fakeInput('in-2', 'Pads');
    installMidi(fakeAccess([keys, pads], [out, other]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    midi.addOutput('out-2');
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Sailor' });
    out.sent = [];
    other.sent = [];
    return { midi, out, other, keys, pads };
  }

  it("shows a piece with no routes as it plays (cells' defaults), its rows the voices, the kit and its members", async () => {
    const { midi } = await two();
    expect(midi.matrixRows.map((r) => [r.id, r.kind])).toEqual([['fiddle', 'voice'], ['bass', 'voice'], ['*', 'kit'], ...midi.table!.kit.map((k) => [`*${k.member}`, 'member'])]);
    // (the built-in's column shows what the piece's own sound plays: here, all of it)
    expect(activeSetup(midi.matrixBook).routes['piece:Sailor']).toEqual({ fiddle: { o1: 1, builtin: 1 }, bass: { o1: 2, builtin: 1 }, '*': { o1: 10, builtin: 1 } });
    // (only shown: nothing is kept until it is changed)
    expect(keptSetup().routes).toEqual({});
  });

  it("forwards an input's messages where its row is routed: its channel replaced, or kept as played; heard or not", async () => {
    const { midi, out, other, keys, pads } = await two();
    const heard: number[][] = [];
    midi.hear((data) => void heard.push([...data]));
    midi.changeMatrix(withCrossing(midi.matrixBook, 'piece:Sailor', 'in:Pads', 'o2', 5));
    midi.changeMatrix(withCrossing(midi.matrixBook, 'piece:Sailor', 'in:Keys', 'o1', AS_PLAYED));
    pads.play([0x90, 36, 100]);
    pads.play([0xb3, 7, 64]);
    pads.play([0xf8]);
    keys.play([0x92, 60, 90]);
    expect(other.sent.map((m) => m.data)).toEqual([
      [0x94, 36, 100],
      [0xb4, 7, 64],
    ]);
    expect(out.sent.map((m) => m.data)).toEqual([[0x92, 60, 90]]);
    // (no input heard: nothing reaches the keys or MIDI learn)
    expect(heard).toEqual([]);
    midi.chooseInput('in-1');
    keys.play([0x82, 60, 0]);
    pads.play([0x80, 36, 0]);
    expect(heard).toEqual([[0x82, 60, 0]]);
    expect(other.sent.at(-1)!.data).toEqual([0x84, 36, 0]);
    // (another piece has its own routes: the inputs aren't forwarded there)
    midi.attach({ sink: null, internal: true }, { program: compilePiece(EXAMPLES.sailor.source), title: 'Other' });
    other.sent = [];
    pads.play([0x90, 36, 100]);
    expect(other.sent).toEqual([]);
  });

  it('hears several inputs, each playing (its Plays choice), and lets the keys of one unplugged go', async () => {
    const { midi, keys, pads } = await two();
    const heard: string[] = [];
    midi.hear((_, source) => void heard.push(source));
    const told = vi.fn();
    midi.letGo(told);
    midi.changeMatrix(withPlays(withPlays(midi.matrixBook, 'in:Keys', 'default'), 'in:Pads', 'default'));
    expect(told).toHaveBeenCalledTimes(1);
    keys.play([0x90, 60, 100]);
    pads.play([0x90, 36, 100]);
    expect(heard).toEqual(['Keys', 'Pads']);
    expect(midi.inPortId).toBe('in-1,in-2');
  });

  it("an input not heard under every input's choice reaches neither the keys nor MIDI learn, though its port is listened to (webmidi decision 003)", async () => {
    const { midi, keys, pads } = await two();
    const heard: string[] = [];
    midi.hear((_, source) => void heard.push(source));
    midi.changeMatrix(withPlays(withPlays(midi.matrixBook, ANY_INPUT, 'default'), 'in:Pads', 'none'));
    expect(midi.inPortId).toBe('all');
    keys.play([0x90, 60, 100]);
    pads.play([0x90, 36, 100]);
    expect(heard).toEqual(['Keys']);
  });

  it("says what an input plays among the piece's rows: its own row, else the first of its role, else the default", async () => {
    const { midi } = await two();
    expect(midi.matrixRows.filter((r) => r.role).map((r) => [r.id, r.role])).toEqual([
      ['fiddle', 'lead'],
      ['bass', 'lead'],
      ['*', 'drums'],
    ]);
    midi.changeMatrix(withPlays(withPlays(midi.matrixBook, 'in:Keys', { row: 'bass', role: 'lead' }), 'in:Pads', { row: 'kit', role: 'drums' }));
    expect([midi.playsFrom('Keys'), midi.playsFrom('Pads')]).toEqual(['bass', '*']);
    // (on a piece without a bass: the first voice, the role's; an input playing the default: null, the keys' armed cell)
    midi.attach({ sink: null, internal: true }, { program: compilePiece('&lead s=sine loop=C4'), title: 'Solo' });
    expect(midi.playsFrom('Keys')).toBe('lead');
    midi.changeMatrix(withPlays(midi.matrixBook, 'in:Keys', 'default'));
    expect(midi.playsFrom('Keys')).toBeNull();
  });

  it('sends clock to the outputs of its row, the same for every piece; switched off while playing, Stop', async () => {
    const { midi, out, other } = await two();
    midi.changeMatrix(withClock(midi.matrixBook, 'o2', true));
    expect(keptSetup().clock).toEqual(['o2']);
    const program = compilePiece(EXAMPLES.sailor.source);
    midi.attach({ sink: null, internal: true }, { program, title: 'Another' });
    expect([midi.clockOf(1), midi.clockOf(2)]).toEqual([false, true]);
    const p = plan(program, codeShifts(program));
    midi.play(fakeTone(9.7), [], 10.25, retime(windowAt(p, 0, 0.25), 10, 1).clock);
    const ticks = (port: ReturnType<typeof fakePort>) => port.sent.filter((m) => m.data[0] === 0xf8).length;
    expect([ticks(out), ticks(other)]).toEqual([0, expect.any(Number)]);
    expect(ticks(other)).toBeGreaterThan(0);
    midi.changeMatrix(withClock(midi.matrixBook, 'o2', false));
    expect(other.sent.at(-1)!.data).toEqual([0xfc]);
  });

  it("sends a device's notes and clock its latency earlier; none, as the clock says", async () => {
    const { midi, other } = await two();
    midi.setChannel('bass', 3, 2);
    const note = { at: 10.3, dur: 0.2, voice: 'bass', freq: 220, bends: [], gains: [1, 1], levels: [] } as Played;
    midi.play(fakeTone(10), [note], 10.5);
    expect(other.sent[0]).toEqual({ data: [0x92, 57, 127], timestamp: 10.3 * 1000 + 5000 });
    midi.stop(fakeTone(10.6));
    midi.setProfile(2, { latency: 12 });
    other.sent = [];
    midi.play(fakeTone(11), [{ ...note, at: 11.3 }], 11.5);
    expect(other.sent[0]).toEqual({ data: [0x92, 57, 127], timestamp: 11.3 * 1000 + 5000 - 12 });
    expect(kept().devices.Juno!.latency).toBe(12);
  });

  it('a piece routed by its MIDI cards shows their channels on every slot, read only, and keeps nothing of its own rows', async () => {
    const { midi } = await two();
    const source = `&bar scan(1 1 1 1) step=2\n&bass step=4n 0\n&sub loop=55\n&far map=midi(3, 3) [&bass * &sub]`;
    midi.attach({ sink: null, internal: true }, { program: compilePiece(source), title: 'Cards' });
    expect(midi.locked).toBe(true);
    const shown = activeSetup(midi.matrixBook);
    expect(shown.outputs.map((o) => o.key)).toEqual(['builtin', 'o1', 'o2', 'o3']);
    expect(shown.routes['piece:Cards']).toEqual({ sub: { o3: 3, builtin: 1 } });
    midi.changeMatrix(withCrossing(withPlays(midi.matrixBook, 'in:Keys', 'default'), 'piece:Cards', 'sub', 'o1', 9));
    expect(keptSetup().plays).toEqual({ 'in:Keys': 'default' });
    expect(keptSetup().routes).toEqual({});
    expect(hardwareOutputs(keptSetup())).toHaveLength(2);
  });

  it("a piece routed by its MIDI cards keeps what its matrix still edits: an input's crossing, the clock, a drum note (webmidi v0.1.4)", async () => {
    const { midi } = await two();
    const source = `&bar scan(1 1 1 1) step=2\n&bass step=4n 0\n&sub loop=55\n&far map=midi(3, 3) [&bass * &sub]`;
    midi.attach({ sink: null, internal: true }, { program: compilePiece(source), title: 'Cards' });
    expect(midi.locked).toBe(true);
    let shown = midi.matrixBook;
    shown = withCrossing(shown, 'piece:Cards', inputRow({ id: 'in-1', name: 'Keys' }), 'o2', AS_PLAYED);
    // the clock to a real output, and to the slot only the cards name (o3), which the setup lacks
    shown = withClock(withClock(shown, 'o2', true), 'o3', true);
    shown = withProfile(shown, 'Juno', { drums: { 38: 62 } });
    midi.changeMatrix(shown);
    expect(keptSetup().routes['piece:Cards']).toEqual({ 'in:Keys': { o2: AS_PLAYED } });
    expect(keptSetup().clock).toEqual(['o2']);
    expect(kept().devices.Juno!.drums).toEqual({ 38: 62 });
    expect(hardwareOutputs(keptSetup())).toHaveLength(2);
    // and what the matrix shows of it, after
    expect(activeSetup(midi.matrixBook).routes['piece:Cards']).toEqual({ sub: { o3: 3, builtin: 1 }, 'in:Keys': { o2: AS_PLAYED } });
  });

  it('switching setups silences the outputs that change, and plays the other setup', async () => {
    const { midi, out, other } = await two();
    midi.setBook(saveAs(midi.book, 'Home'));
    const home = midi.book.active;
    // (a change to Home: its custom variant, in use; the first output's old device silenced)
    midi.send([0x93, 60, 100]);
    midi.chooseOutput('none');
    expect(out.sent.some((m) => m.data[0] === 0xb3 && m.data[1] === 123)).toBe(true);
    expect(kept().setups.map((s) => s.name)).toEqual(['Setup 1', 'Home', 'Home - custom']);
    expect(midi.outPort).toBeNull();
    midi.sendTo(2, [0x94, 60, 100]);
    midi.setBook(useSetup(midi.book, home));
    expect(midi.outPort).toBe(out);
    // (the second output's device is the same in both: not silenced)
    expect(other.sent.some((m) => m.data[1] === 123)).toBe(false);
  });
});

describe('Midi: what went wrong, said', () => {
  it('says the browser is still asking when it hasn’t answered, and lets Connect be pressed again', async () => {
    vi.useFakeTimers();
    try {
      navigator.requestMIDIAccess = () => new Promise(() => {});
      const midi = await made();
      void midi.connect();
      expect(midi.connecting).toBe(true);
      await vi.advanceTimersByTimeAsync(CONNECT_WAIT);
      expect(midi.connecting).toBe(false);
      expect(midi.message).toMatch(/^Still waiting for the browser to allow MIDI/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('says a test note with no port, and a port that throws, once however often it throws; dismissed, they go', async () => {
    const out = fakePort('out-1', 'Circuit');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    midi.testNote(1);
    expect(midi.problems).toEqual(['The test note has no port to go to: choose a device that is plugged in']);
    await midi.connect();
    midi.chooseOutput('out-1');
    out.send = () => {
      throw new DOMException('port gone', 'InvalidStateError');
    };
    midi.testNote(1);
    midi.testNote(1);
    expect(midi.problems).toEqual([
      'The test note has no port to go to: choose a device that is plugged in',
      'A message couldn’t be sent to Circuit (InvalidStateError: port gone)',
    ]);
    midi.dismissProblems();
    expect(midi.problems).toEqual([]);
  });

  it('says a message a hearer couldn’t play, and the other hearers still hear it', async () => {
    const keys = fakeInput('in-1', 'Keys');
    installMidi(fakeAccess([keys], []));
    const midi = await made();
    await midi.connect();
    midi.chooseInput('in-1');
    const heard: number[] = [];
    cleanups.push(
      midi.hear(() => {
        throw new Error('no voice');
      }),
      midi.hear((data) => void heard.push(data[1]!)),
    );
    keys.play([0x90, 60, 100]);
    expect(heard).toEqual([60]);
    expect(midi.problems).toEqual(['A message from Keys couldn’t be played (Error: no voice)']);
  });
});
