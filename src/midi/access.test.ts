// Lifted from yggi/jambot apps/web/src/midi/access.test.ts @ 8cdb6b8.
import { afterEach, describe, expect, it } from 'vitest';
import { MidiAccess } from './access';
import { fakeAccess, fakeInput, fakePort, installMidi, uninstallMidi } from './fixtures';
import { parseMidiMessage } from './surfaces';
import type { ParsedNote } from './surfaces';

afterEach(uninstallMidi);

const connected = async (on: Parameters<typeof MidiAccess.connect>[0] = {}) => {
  const midi = await MidiAccess.connect(on);
  if (typeof midi === 'string') throw new Error(midi);
  return midi;
};

describe('MidiAccess', () => {
  it('says in words that there is no Web MIDI, when the browser has none', async () => {
    expect(await MidiAccess.connect()).toContain('no Web MIDI');
  });

  it('says a blocked request is blocked, rather than throwing', async () => {
    installMidi(new DOMException('nope', 'SecurityError'));
    expect(await MidiAccess.connect()).toMatch(/^MIDI access was blocked here \(SecurityError\)/);
  });

  it('lists the ports Web MIDI gives, and finds an output by id', async () => {
    const out = fakePort('out-1', 'Synth');
    installMidi(fakeAccess([fakeInput('in-1', 'Keys')], [out]));
    const midi = await connected();
    expect(midi.inputs).toEqual([{ id: 'in-1', name: 'Keys' }]);
    expect(midi.outputs).toEqual([{ id: 'out-1', name: 'Synth' }]);
    expect(midi.outputPort('out-1')).toBe(out);
    expect(midi.outputPort('missing')).toBeNull();
  });

  it('delivers notes only from the input listened to, or from all of them', async () => {
    const keys = fakeInput('in-1', 'Keys');
    const pads = fakeInput('in-2', 'Pads');
    installMidi(fakeAccess([keys, pads]));
    const notes: [number, string][] = [];
    const midi = await connected({ onNote: (n, source) => notes.push([n.note, source]) });
    expect(keys.onmidimessage).toBeNull(); // nothing is listened to yet

    midi.listen('in-1');
    keys.play([0x90, 60, 100]);
    pads.play([0x90, 36, 100]);
    expect(notes).toEqual([[60, 'Keys']]);

    midi.listen('all');
    pads.play([0x90, 36, 100]);
    expect(notes).toEqual([
      [60, 'Keys'],
      [36, 'Pads'],
    ]);

    midi.listen('none');
    expect(keys.onmidimessage).toBeNull();
    expect(pads.onmidimessage).toBeNull();
  });

  it('hands on every message raw (a CC too), and the time the port saw it', async () => {
    const keys = fakeInput('in-1', 'Keys');
    installMidi(fakeAccess([keys]));
    const raw: [number[], string, number][] = [];
    const notes: ParsedNote[] = [];
    const midi = await connected({ onMessage: (data, source, t) => raw.push([[...data], source, t]), onNote: (n) => notes.push(n) });
    midi.listen('all');
    keys.play([0xb0, 1, 64], 1000.5);
    keys.play([0x90, 60, 100], 1234.5);
    expect(raw).toEqual([
      [[0xb0, 1, 64], 'Keys', 1000.5],
      [[0x90, 60, 100], 'Keys', 1234.5],
    ]);
    expect(notes).toEqual([{ on: true, note: 60, velocity: 100, channel: 0, timeStamp: 1234.5 }]);
  });

  it('listens anew and says so when the ports change (a replugged port is a fresh object)', async () => {
    const keys = fakeInput('in-1', 'Keys');
    const access = fakeAccess([keys]);
    installMidi(access);
    let changes = 0;
    const midi = await connected({ onChange: () => changes++ });
    midi.listen('in-1');
    const again = fakeInput('in-1', 'Keys');
    access.inputs.set('in-1', again);
    access.change();
    expect(again.onmidimessage).not.toBeNull();
    expect(changes).toBe(1);
    midi.refresh();
    expect(changes).toBe(2);
  });
});

describe('parseMidiMessage', () => {
  it('reads a note-on with velocity 0 as a note-off, on every channel', () => {
    for (let c = 0; c < 16; c++) {
      expect(parseMidiMessage([0x90 | c, 60, 100])).toMatchObject({ on: true, note: 60, velocity: 100, channel: c });
      expect(parseMidiMessage([0x90 | c, 60, 0])).toMatchObject({ on: false, note: 60, velocity: 0, channel: c });
      expect(parseMidiMessage([0x80 | c, 60, 64])).toMatchObject({ on: false, note: 60, velocity: 0, channel: c });
    }
  });

  it('reads nothing else as a note', () => {
    expect(parseMidiMessage([0xb0, 123, 0])).toBeNull();
    expect(parseMidiMessage([0xf8])).toBeNull();
    expect(parseMidiMessage([])).toBeNull();
  });
});
