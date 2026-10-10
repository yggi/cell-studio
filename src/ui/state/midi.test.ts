// The settings part lifted from yggi/jambot apps/web/src/midi/settings.test.ts @ 8cdb6b8.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAccess, fakeInput, fakePort, installMidi, uninstallMidi } from '../../midi/fixtures';
import { Midi } from './midi.svelte';
import { compileSource } from '../../engine/compile';
import { PRESETS } from '../../engine/presets';
import { DRUM_PRESETS } from '../../midi/drum-presets';
import type { NoteSink } from '../../audio/player';
import { plan, type Played } from '../../engine/realize';
import { codeShifts } from '../../engine/program';
import { retime, windowAt } from '../../engine/schedule';

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
    expect(JSON.parse(store.get('cell-studio:midi')!).out).toEqual({ id: 'out-2', name: 'Synth' });
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
  async function tapped(title = 'Sailor', source = PRESETS.sailor.source) {
    const out = fakePort('out-1', 'Circuit');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    out.sent = [];
    const player = { sink: null as NoteSink | null, internal: true };
    midi.attach(player, { program: compileSource(source), title });
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

  it('taps the player: its sink, and its sound follows the internal-sound switch, kept', async () => {
    const { midi, player } = await tapped();
    expect(player.sink).toBe(midi);
    midi.internal = false;
    expect(player.internal).toBe(false);
    expect(JSON.parse(store.get('cell-studio:midi')!).internal).toBe(false);
  });

  it('sends what the player plays, timestamped for when it is heard, on the channel table; each kit member on 10', async () => {
    const { midi, out } = await tapped();
    expect(midi.table!.voices).toEqual([
      { voice: 'fiddle', channel: 1 },
      { voice: 'bass', channel: 2 },
    ]);
    const kit = compileSource(PRESETS.sailor.source).outputs.find((o) => o.kit)!.id;
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
    const kept = JSON.parse(store.get('cell-studio:midi')!);
    expect(kept.channels).toEqual({ Sailor: { bass: 7 } });
    expect(kept.drums.Circuit[38]).toBe(63);
    const again = await made();
    expect([again.drums[36], again.drums[38], again.bendRange, again.rotate]).toEqual([60, 63, 48, { from: 2, to: 9 }]);
    again.attach({ sink: null, internal: true }, { program: compileSource(PRESETS.sailor.source), title: 'Sailor' });
    expect(again.table!.voices.find((v) => v.voice === 'bass')!.channel).toBe(7);
    // (another piece: its own table)
    again.attach({ sink: null, internal: true }, { program: compileSource(PRESETS.sailor.source), title: 'Other' });
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
    midi.attach(player, { program: compileSource(PRESETS.sailor.source), title: 'Sailor' });
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

  it('sends nothing without an output, and the player plays on', async () => {
    const midi = await made();
    const player = { sink: null as NoteSink | null, internal: true };
    midi.attach(player, { program: compileSource(PRESETS.sailor.source), title: 'Sailor' });
    expect(() => midi.play(fakeTone(1), [note('bass', 1.1)], 1.25)).not.toThrow();
    expect(() => midi.stop(fakeTone(1))).not.toThrow();
  });
});

describe('Midi: MIDI clock', () => {
  async function tapped(source = PRESETS.sailor.source) {
    const out = fakePort('out-1', 'Drum machine');
    installMidi(fakeAccess([], [out]));
    const midi = await made();
    await midi.connect();
    midi.chooseOutput('out-1');
    out.sent = [];
    const program = compileSource(source);
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
    expect(JSON.parse(store.get('cell-studio:midi')!).clock).toEqual({ 'Drum machine': true });
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
