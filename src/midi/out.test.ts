// The MidiOut cases lifted from yggi/jambot apps/web/src/audio/midi-out.test.ts @ 8cdb6b8, on Cell studio's played notes.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { compileSource } from '../engine/compile';
import { plan, type Played } from '../engine/realize';
import { codeShifts } from '../engine/program';
import { retime, windowAt } from '../engine/schedule';
import { BEND_CENTRE, bendValue, channelTable, legatoNotes, midiNote, router, routesOf, type Route } from '../engine/midi';
import { MidiOut } from './out';
import { fakePort } from './fixtures';
import { DRUM_PRESETS } from './drum-presets';

/** Seconds to milliseconds, one to one, so timestamps in tests read as seconds. */
const toDeviceMs = (seconds: number) => seconds * 1000;

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CC = 0xb0;
const BEND = 0xe0;
const ALL_NOTES_OFF = 123;

/** Voices on channels as Jambot's parts were (lead 1, bass 2, pad and stab 3), and a kit's kick and snare on 10. */
const CHANNELS: Record<string, number> = { lead: 1, bass: 2, pad: 3, stab: 3 };
const DRUMS: Record<string, number> = { bd: 36, rim: 37, sd: 38 };
const route = (e: Played): Route => (e.voice in DRUMS ? { channel: 10, drum: DRUMS[e.voice] } : e.voice in CHANNELS ? { channel: CHANNELS[e.voice], drum: null } : null);

/** A note of a voice at a MIDI key, at `at` for `dur` seconds, full velocity. */
const note = (voice: string, key: number, at: number, dur: number, extra: Partial<Played> = {}): Played => ({
  at,
  dur,
  voice,
  freq: 440 * Math.pow(2, (key - 69) / 12),
  bends: [],
  gains: [1, 1],
  levels: [{ at, level: 1 }],
  ...extra,
});

function made(options: Partial<Parameters<MidiOut['setOptions']>[0]> = {}) {
  const port = fakePort('out', 'Synth');
  const midi = new MidiOut();
  midi.setPort(port, 0, toDeviceMs);
  midi.setRoute(route);
  midi.setOptions({ drums: {}, bendRange: 2, rotate: null, ...options }, 0, toDeviceMs);
  return { midi, sent: port.sent };
}

const allNotesOffChannels = (sent: { data: number[] }[]) => new Set(sent.filter((m) => (m.data[0] & 0xf0) === CC && m.data[1] === ALL_NOTES_OFF).map((m) => m.data[0] & 0x0f));

describe('MidiOut', () => {
  it('sends nothing before a port is set', () => {
    const midi = new MidiOut();
    midi.setRoute(route);
    midi.play(note('lead', 60, 0, 1), toDeviceMs);
    midi.advance(10, toDeviceMs);
  });

  it("sends a note on at its start, on its voice's channel, and a kit's member on 10 at its drum note", () => {
    const { midi, sent } = made();
    midi.play(note('bass', 43, 1, 0.5), toDeviceMs);
    midi.play(note('bd', 99, 1, 0.1), toDeviceMs);
    expect(sent).toEqual([
      { data: [NOTE_ON | 1, 43, 127], timestamp: 1000 },
      { data: [NOTE_ON | 9, 36, 127], timestamp: 1000 },
    ]);
  });

  it('sends nothing for a note its route leaves out', () => {
    const { midi, sent } = made();
    midi.play(note('nobody', 60, 0, 1), toDeviceMs);
    expect(sent).toEqual([]);
  });

  it('releases a note once its length has passed, and not before', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 72, 0, 1), toDeviceMs);
    midi.advance(0.9, toDeviceMs);
    expect(sent.some((m) => m.data[0] === NOTE_OFF)).toBe(false);
    midi.advance(1, toDeviceMs);
    expect(sent.at(-1)).toEqual({ data: [NOTE_OFF | 0, 72, 0], timestamp: 1000 });
  });

  it('keeps a pad sounding through a stab on the same key, and releases only once both are done', () => {
    const { midi, sent } = made();
    midi.play(note('pad', 60, 0, 2, { gains: [0.6, 0.6] }), toDeviceMs);
    midi.play(note('stab', 60, 1, 0.1), toDeviceMs);
    midi.advance(1.1, toDeviceMs);
    // the stab's own release is due, but the pad still holds the key: no note-off yet
    midi.advance(2, toDeviceMs);
    expect(sent).toEqual([
      { data: [NOTE_ON | 2, 60, 98], timestamp: 0 }, // the pad's attack
      { data: [NOTE_OFF | 2, 60, 0], timestamp: 1000 }, // retrigger: off then on, not a stray cut
      { data: [NOTE_ON | 2, 60, 127], timestamp: 1000 }, // the stab's attack
      { data: [NOTE_OFF | 2, 60, 0], timestamp: 2000 }, // the pad's true end, once nothing else holds it
    ]);
  });

  it('retriggers when a note starts while another already holds it, off then on', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 64, 0, 2), toDeviceMs);
    sent.length = 0;
    midi.play(note('lead', 64, 0.5, 0.5), toDeviceMs);
    expect(sent).toEqual([
      { data: [NOTE_OFF | 0, 64, 0], timestamp: 500 },
      { data: [NOTE_ON | 0, 64, 127], timestamp: 500 },
    ]);
  });

  it('releases a note before the same key starts again where it ends, so every note-on has its own note-off', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 64, 0, 1), toDeviceMs);
    midi.play(note('lead', 64, 1, 1), toDeviceMs);
    midi.advance(2, toDeviceMs);
    expect(sent.map((m) => [m.data[0], m.timestamp])).toEqual([
      [NOTE_ON, 0],
      [NOTE_OFF, 1000],
      [NOTE_ON, 1000],
      [NOTE_OFF, 2000],
    ]);
  });

  it('releases a key struck twice at once only once (two voices on one channel, a chord doubled)', () => {
    const { midi, sent } = made();
    midi.play(note('pad', 60, 0, 1), toDeviceMs);
    midi.play(note('stab', 60, 0, 1), toDeviceMs);
    midi.advance(1, toDeviceMs);
    expect(sent.map((m) => m.data[0])).toEqual([NOTE_ON | 2, NOTE_OFF | 2, NOTE_ON | 2, NOTE_OFF | 2]);
  });

  it("remaps a drum note through the device's map, at the output only, its release too", () => {
    const { midi, sent } = made({ drums: DRUM_PRESETS['Novation Circuit'] });
    midi.play(note('bd', 0, 0, 0.1), toDeviceMs);
    midi.play(note('lead', 36, 0, 0.1), toDeviceMs); // (the same number on a voice: not a drum)
    midi.advance(0.1, toDeviceMs);
    expect(sent.map((m) => m.data)).toEqual([
      [NOTE_ON | 9, 60, 127],
      [NOTE_ON | 0, 36, 127],
      [NOTE_OFF | 9, 60, 0],
      [NOTE_OFF | 0, 36, 0],
    ]);
  });

  it('lets two drums mapped to the same pad retrigger, off then on, as any shared note does', () => {
    const { midi, sent } = made({ drums: DRUM_PRESETS['Novation Circuit'] });
    midi.play(note('rim', 0, 0, 1), toDeviceMs);
    sent.length = 0;
    midi.play(note('sd', 0, 0.2, 1), toDeviceMs);
    expect(sent).toEqual([
      { data: [NOTE_OFF | 9, 62, 0], timestamp: 200 },
      { data: [NOTE_ON | 9, 62, 127], timestamp: 200 },
    ]);
  });

  it('silences the old port when the port changes, not the new one, and forgets what it held', () => {
    const { midi, sent } = made();
    const b = fakePort('b', 'Other');
    midi.play(note('lead', 60, 0, 100), toDeviceMs);
    midi.play(note('bd', 0, 0, 0.1), toDeviceMs);
    midi.setPort(b, 5, toDeviceMs);
    expect(allNotesOffChannels(sent)).toEqual(new Set([0, 9]));
    expect(sent.filter((m) => m.data[1] === ALL_NOTES_OFF).every((m) => m.timestamp === 5000)).toBe(true);
    expect(b.sent).toEqual([]);
    // playing again after the switch never sends a leftover release for the old note
    midi.play(note('lead', 60, 6, 0.1), toDeviceMs);
    midi.advance(7, toDeviceMs);
    expect(b.sent.filter((m) => m.data[0] === NOTE_OFF).length).toBe(1);
  });

  it('takes a new routing from the next note on, silencing nothing', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 60, 0, 10), toDeviceMs);
    midi.setRoute((e) => (e.voice === 'lead' ? { channel: 5, drum: null } : null));
    midi.play(note('lead', 62, 1, 1), toDeviceMs);
    expect(sent.map((m) => m.data)).toEqual([
      [NOTE_ON | 0, 60, 127],
      [NOTE_ON | 4, 62, 127],
    ]);
  });

  it('stops: all notes off on every channel in use now, a note-off for each note held, and nothing after; then nothing is held', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 60, 0, 10), toDeviceMs);
    midi.play(note('bass', 40, 0.4, 10), toDeviceMs);
    midi.panic(0.1, toDeviceMs);
    expect(sent.slice(2)).toEqual([
      { data: [CC | 0, ALL_NOTES_OFF, 0], timestamp: 100 },
      { data: [CC | 1, ALL_NOTES_OFF, 0], timestamp: 100 },
      { data: [NOTE_OFF | 0, 60, 0], timestamp: 100 },
      { data: [NOTE_OFF | 1, 40, 0], timestamp: 400 },
    ]);
    sent.length = 0;
    midi.advance(20, toDeviceMs);
    expect(sent).toEqual([]);
  });

  it('keeps which channel is free longest from window to window, under the same rotation', () => {
    const { midi, sent } = made({ rotate: [2, 3] });
    midi.play(note('lead', 60, 0, 2), toDeviceMs);
    midi.setOptions({ drums: {}, bendRange: 2, rotate: [2, 3] }, 0.25, toDeviceMs);
    midi.play(note('lead', 64, 0.5, 2), toDeviceMs);
    expect(sent.map((m) => (m.data[0] & 0x0f) + 1)).toEqual([2, 3]);
  });

  it('clamps a timestamp before now to zero, rather than sending it late', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 60, 0, 1), (s) => s * 1000 - 5000);
    expect(sent[0].timestamp).toBe(0);
  });

  it('survives a port that throws mid-send (unplugged)', () => {
    const midi = new MidiOut();
    midi.setPort(
      {
        send: () =>
          void (() => {
            throw new Error('gone');
          })(),
      },
      0,
      toDeviceMs,
    );
    midi.setRoute(route);
    expect(() => {
      midi.play(note('lead', 60, 0, 1), toDeviceMs);
      midi.advance(2, toDeviceMs);
      midi.panic(2, toDeviceMs);
    }).not.toThrow();
  });
});

describe('MidiOut: bends', () => {
  const at19 = (k: number) => 440 * Math.pow(2, k / 19);

  it('a 12-EDO piece sends no bend at all', () => {
    const { midi, sent } = made();
    for (let i = 0; i < 12; i++) midi.play(note('lead', 60 + i, i * 0.5, 0.4), toDeviceMs);
    midi.advance(10, toDeviceMs);
    expect(sent.some((m) => (m.data[0] & 0xf0) === BEND)).toBe(false);
  });

  it('a microtonal note sends its bend just before its note-on, and the next note on a key puts it back', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 0, 0, 0.4, { freq: at19(1) }), toDeviceMs);
    midi.play(note('lead', 69, 0.5, 0.4), toDeviceMs);
    expect(sent.slice(0, 2).map((m) => m.data[0])).toEqual([BEND, NOTE_ON]);
    const value = (m: { data: number[] }) => m.data[1] | (m.data[2] << 7);
    expect(value(sent[0])).toBe(bendValue((69 + 12 / 19 - 70) * 100));
    const back = sent.filter((m) => (m.data[0] & 0xf0) === BEND)[1];
    expect([value(back), back.timestamp]).toEqual([BEND_CENTRE, 500]);
  });

  it("sends a note's bends only up to the horizon, so a stop leaves none after it", () => {
    const { midi, sent } = made();
    midi.play(
      note('lead', 69, 0, 4, {
        bends: [
          { at: 1, cents: 100 },
          { at: 3, cents: 0 },
        ],
      }),
      toDeviceMs,
    );
    midi.advance(0.5, toDeviceMs);
    expect(sent.filter((m) => (m.data[0] & 0xf0) === BEND)).toEqual([]);
    midi.advance(1.5, toDeviceMs);
    expect(sent.filter((m) => (m.data[0] & 0xf0) === BEND).map((m) => m.timestamp)).toEqual([1000]);
    midi.panic(1.6, toDeviceMs);
    // (the bend is put back at the stop, and the one at 3 s never goes)
    expect(sent.filter((m) => (m.data[0] & 0xf0) === BEND).map((m) => m.timestamp)).toEqual([1000, 1600]);
  });

  it('warns once when notes with different bends overlap on one channel; rotation gives each its own', () => {
    let clashes = 0;
    const { midi, sent } = made();
    midi.onClash = () => clashes++;
    midi.play(note('lead', 0, 0, 1, { freq: at19(0) }), toDeviceMs);
    midi.play(note('lead', 0, 0.5, 1, { freq: at19(1) }), toDeviceMs);
    midi.play(note('lead', 0, 0.6, 1, { freq: at19(2) }), toDeviceMs);
    expect(clashes).toBe(1);
    expect(new Set(sent.map((m) => m.data[0] & 0x0f))).toEqual(new Set([0]));

    const r = made({ rotate: [2, 3, 4] });
    r.midi.onClash = () => clashes++;
    for (const [i, k] of [0, 1, 2].entries()) r.midi.play(note('lead', 0, i * 0.5, 1.2, { freq: at19(k) }), toDeviceMs);
    expect(clashes).toBe(1);
    expect(r.sent.filter((m) => (m.data[0] & 0xf0) === NOTE_ON).map((m) => (m.data[0] & 0x0f) + 1)).toEqual([2, 3, 4]);
  });
});

describe('MidiOut over every example, window by window as the player plays them', () => {
  const dir = new URL('../../examples/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.cells'));
  const SECONDS = 8;
  const WINDOW = 0.25;

  for (const f of files)
    it(`${f}: a note-on for every note in range, and every note-on has its note-off`, () => {
      const r = compileSource(readFileSync(new URL(f, dir), 'utf8'));
      const p = plan(r, codeShifts(r), r.off);
      const port = fakePort('out', 'Synth');
      const midi = new MidiOut(port);
      const route = router(r, channelTable(r));
      midi.setRoute(route);
      let expected = 0;
      for (let from = 0; from < SECONDS; from += WINDOW) {
        const w = windowAt(p, from, WINDOW);
        for (const e of w.events) {
          const to = routesOf(route(e))[0];
          // (a send isn't heard from itself; a pitch no key reaches isn't sent; a glide's run is its notes, #334)
          if (to) expected += legatoNotes(e).filter((n) => midiNote(n, to)).length;
          midi.play(e, toDeviceMs);
        }
        midi.advance(w.to, toDeviceMs);
      }
      midi.advance(Infinity, toDeviceMs);
      const ons = port.sent.filter((m) => (m.data[0] & 0xf0) === NOTE_ON);
      const offs = port.sent.filter((m) => (m.data[0] & 0xf0) === NOTE_OFF);
      expect(ons.length).toBe(expected);
      // per channel and key: as many offs as ons, never more held than started, and nothing left held
      const held = new Map<string, number>();
      for (const m of port.sent) {
        const k = `${m.data[0] & 0x0f}:${m.data[1]}`;
        if ((m.data[0] & 0xf0) === NOTE_ON) held.set(k, (held.get(k) ?? 0) + 1);
        if ((m.data[0] & 0xf0) === NOTE_OFF) {
          expect(held.get(k), `${k}: an off without an on`).toBeGreaterThan(0);
          held.set(k, held.get(k)! - 1);
        }
      }
      expect(offs.length).toBe(ons.length);
      expect([...held.values()].every((n) => n === 0)).toBe(true);
      // (none in the past)
      expect(port.sent.every((m) => m.timestamp! >= 0)).toBe(true);
    });
});

/** Whether a key sounds at `t` seconds on a device that plays what was sent in timestamp order (at one moment, in the order sent). */
function sounding(sent: { data: number[]; timestamp?: number }[], channel: number, key: number, t: number): boolean {
  let on = false;
  for (const { data } of inOrder(sent, t)) {
    if ((data[0] & 0x0f) !== channel) continue;
    const kind = data[0] & 0xf0;
    if (kind === NOTE_ON && data[1] === key) on = true;
    else if ((kind === NOTE_OFF && data[1] === key) || (kind === CC && data[1] === ALL_NOTES_OFF)) on = false;
  }
  return on;
}

/** The bend a channel is at, at `t` seconds, played as `sounding` plays the notes. */
function bendAt(sent: { data: number[]; timestamp?: number }[], channel: number, t: number): number {
  let bend = BEND_CENTRE;
  for (const { data } of inOrder(sent, t)) if (data[0] === (BEND | channel)) bend = data[1] | (data[2] << 7);
  return bend;
}

const inOrder = (sent: { data: number[]; timestamp?: number }[], t: number) =>
  sent
    .map((m, i) => ({ ...m, i }))
    .filter((m) => m.timestamp! <= t * 1000 + 1e-6)
    .sort((a, b) => a.timestamp! - b.timestamp! || a.i - b.i);

describe('MidiOut over every example, through a seek within the look-ahead', () => {
  const dir = new URL('../../examples/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.cells'));
  const WINDOW = 0.25;

  for (const f of files)
    it(`${f}: no note sent after the seek is cut, and nothing is left sounding`, () => {
      const r = compileSource(readFileSync(new URL(f, dir), 'utf8'));
      const p = plan(r, codeShifts(r), r.off);
      const port = fakePort('out', 'Synth');
      const midi = new MidiOut(port);
      const route = router(r, channelTable(r));
      midi.setRoute(route);
      const run = (from: number, to: number, shift: number, played: Played[]) => {
        for (let t = from; t < to; t += WINDOW) {
          const w = windowAt(p, t, WINDOW);
          for (const e of w.events) {
            const moved = retime({ from: 0, to: 0, events: [e], tapes: [] }, shift, 1).events[0]!;
            if (played) played.push(moved);
            midi.play(moved, toDeviceMs);
          }
          midi.advance(w.to + shift, toDeviceMs);
        }
      };
      // played to 4 s, sent ahead to 4 s while the clock is at 3.6 s; then a seek back to 2 s, from 3.65 s
      run(0, 4, 0, []);
      midi.panic(3.6, toDeviceMs);
      const after: Played[] = [];
      run(2, 6, 1.65, after);
      midi.advance(Infinity, toDeviceMs);
      for (const e of after.flatMap(legatoNotes)) {
        const to = routesOf(route(e))[0];
        const n = to && midiNote(e, to);
        if (!n || n.end - n.at < 0.002) continue;
        expect(sounding(port.sent, (n.channel - 1) & 15, to.drum ?? n.note, (n.at + n.end) / 2), `${e.voice} at ${e.at}`).toBe(true);
      }
      const keys = new Set(port.sent.filter((m) => (m.data[0] & 0xf0) === NOTE_ON).map((m) => [m.data[0] & 0x0f, m.data[1]].join()));
      for (const k of keys) expect(sounding(port.sent, ...(k.split(',').map(Number) as [number, number]), Infinity), k).toBe(false);
    });
});

describe('MidiOut: playing on through a change', () => {
  it('keeps every note held through a new routing, and sends its note-off (a recompile while playing)', () => {
    const { midi, sent } = made();
    // (sent ahead: struck at 1.2 s while the clock is at 1 s)
    midi.play(note('lead', 69, 1.2, 0.5), toDeviceMs);
    midi.setRoute((e) => route(e));
    midi.advance(10, toDeviceMs);
    expect(sent.map((m) => [m.data[0], m.data[1], m.timestamp])).toEqual([
      [NOTE_ON, 69, 1200],
      [NOTE_OFF, 69, 1700],
    ]);
  });

  it('silences at a moment: All notes off then, and a note-off for every note still held, one struck ahead at its start', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 60, 0.5, 10), toDeviceMs);
    midi.play(note('bass', 40, 1.4, 1), toDeviceMs);
    midi.panic(1.2, toDeviceMs);
    expect(sent.slice(2)).toEqual([
      { data: [CC | 0, ALL_NOTES_OFF, 0], timestamp: 1200 },
      { data: [CC | 1, ALL_NOTES_OFF, 0], timestamp: 1200 },
      { data: [NOTE_OFF | 0, 60, 0], timestamp: 1200 },
      { data: [NOTE_OFF | 1, 40, 0], timestamp: 1400 },
    ]);
    expect(sounding(sent, 1, 40, 1.5)).toBe(false);
    sent.length = 0;
    midi.advance(20, toDeviceMs);
    expect(sent).toEqual([]);
  });

  it('a resume just after a stop is not cut: nothing is sent past the stop to silence it', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 60, 1, 5), toDeviceMs);
    midi.panic(1.2, toDeviceMs);
    midi.play(note('lead', 60, 1.3, 2), toDeviceMs);
    midi.advance(10, toDeviceMs);
    expect([1.25, 1.31, 1.8, 2.5, 3.29, 3.31].map((t) => sounding(sent, 0, 60, t))).toEqual([false, true, true, true, true, false]);
  });

  it('a seek within the look-ahead: a note struck ahead before the stop retriggers one sent since, and never cuts it', () => {
    const { midi, sent } = made();
    midi.play(note('lead', 60, 1.4, 1), toDeviceMs);
    midi.panic(1.2, toDeviceMs);
    midi.play(note('lead', 60, 1.3, 2), toDeviceMs);
    midi.advance(10, toDeviceMs);
    expect([1.31, 1.4, 1.5, 3.29, 3.31].map((t) => sounding(sent, 0, 60, t))).toEqual([true, true, true, true, false]);
    // with nothing after it, the note struck ahead is let go at its start
    const alone = made();
    alone.midi.play(note('lead', 60, 1.4, 1), toDeviceMs);
    alone.midi.panic(1.2, toDeviceMs);
    expect([1.39, 1.41].map((t) => sounding(alone.sent, 0, 60, t))).toEqual([false, false]);
  });

  it('keeps each key in order when the clock jumps between two sends: a note-off never lands before its note-on', () => {
    const { midi, sent } = made();
    const later = (s: number) => s * 1000 - 10; // (the clocks jumped: the same moment, 10 ms earlier on the page)
    midi.play(note('lead', 60, 1, 0.005), toDeviceMs);
    midi.advance(2, later);
    midi.play(note('bass', 40, 3, 1), toDeviceMs);
    midi.panic(2.5, later);
    expect([sounding(sent, 0, 60, 10), sounding(sent, 1, 40, 10)]).toEqual([false, false]);
    expect(sent.filter((m) => m.data[1] === 60).map((m) => m.timestamp)).toEqual([1000, 1000]);
  });

  it('puts a bend back after one sent ahead, and a note sent since keeps its own bend over it', () => {
    const at19 = (k: number) => 440 * Math.pow(2, k / 19);
    const { midi, sent } = made();
    midi.play(note('lead', 0, 1.4, 1, { freq: at19(1) }), toDeviceMs);
    midi.panic(1.2, toDeviceMs);
    expect(bendAt(sent, 0, 2)).toBe(BEND_CENTRE);
    const since = note('lead', 0, 1.3, 2, { freq: at19(3) });
    const bend = midiNote(since, { channel: 1, drum: null })!.bend;
    expect(bend).not.toBe(BEND_CENTRE);
    midi.play(since, toDeviceMs);
    midi.advance(10, toDeviceMs);
    expect([1.35, 1.41, 3].map((t) => bendAt(sent, 0, t))).toEqual([bend, bend, bend]);
  });
});
