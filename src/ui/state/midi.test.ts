// The settings part lifted from yggi/jambot apps/web/src/midi/settings.test.ts @ 8cdb6b8.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeAccess, fakeInput, fakePort, installMidi, uninstallMidi } from '../../midi/fixtures';
import { Midi } from './midi.svelte';

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

  it('silences the old output before another is chosen', async () => {
    const { midi, out } = await withOutput();
    midi.send([0x94, 60, 100]);
    midi.chooseOutput('none');
    expect(cc123(out)).toEqual([4]);
    expect(midi.outPort).toBeNull();
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
