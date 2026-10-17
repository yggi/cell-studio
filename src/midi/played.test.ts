// The cases of MidiOut that are Cell studio's, cells' played notes through `outRuns` (lifted from this repository's
// src/midi/out.test.ts @ 04e24d2, where they ran on its own MidiOut); the rest of those cases are webmidi's, on its note
// (`src/core/out.test.ts` there).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { compileSource } from '@yggi/cells/engine/compile';
import { plan, type Played } from '@yggi/cells/engine/realize';
import { codeShifts } from '@yggi/cells/engine/program';
import { retime, windowAt } from '@yggi/cells/engine/schedule';
import { channelTable, legatoNotes, midiNote, router, routesOf, type Route, type Routes } from '@yggi/cells/engine/midi';
import { MidiOut } from '@yggi/webmidi/core';
import { fakePort } from '@yggi/webmidi/testing';
import { outRuns } from './played';

/** Seconds to milliseconds, one to one, so timestamps in tests read as seconds. */
const toDeviceMs = (seconds: number) => seconds * 1000;

const NOTE_ON = 0x90;
const NOTE_OFF = 0x80;
const CC = 0xb0;
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

/** A played note sent as Cell studio sends it: its runs (`outRuns`), one for each place its route sends it. */
const send = (midi: MidiOut, e: Played, to: (e: Played) => Routes = route) => {
  for (const run of outRuns(e, to)) midi.play(run, toDeviceMs);
};

function made() {
  const port = fakePort('out', 'Synth');
  const midi = new MidiOut(port);
  midi.setOptions({ drums: {}, bendRange: 2, rotate: null }, 0, toDeviceMs);
  return { midi, sent: port.sent };
}

describe('MidiOut on played notes', () => {
  it("sends a note on at its start, on its voice's channel, and a kit's member on 10 at its drum note", () => {
    const { midi, sent } = made();
    send(midi, note('bass', 43, 1, 0.5));
    send(midi, note('bd', 99, 1, 0.1));
    expect(sent).toEqual([
      { data: [NOTE_ON | 1, 43, 127], timestamp: 1000 },
      { data: [NOTE_ON | 9, 36, 127], timestamp: 1000 },
    ]);
  });

  it('sends nothing for a note its route leaves out', () => {
    const { midi, sent } = made();
    send(midi, note('nobody', 60, 0, 1));
    expect(sent).toEqual([]);
  });
});

describe('MidiOut over every example, window by window as the player plays them', () => {
  const dir = new URL('../../node_modules/@yggi/cells/examples/', import.meta.url);
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
      let expected = 0;
      for (let from = 0; from < SECONDS; from += WINDOW) {
        const w = windowAt(p, from, WINDOW);
        for (const e of w.events) {
          const to = routesOf(route(e))[0];
          // (a send isn't heard from itself; a pitch no key reaches isn't sent; a glide's run is its notes, #334)
          if (to) expected += legatoNotes(e).filter((n) => midiNote(n, to)).length;
          send(midi, e, route);
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

const inOrder = (sent: { data: number[]; timestamp?: number }[], t: number) =>
  sent
    .map((m, i) => ({ ...m, i }))
    .filter((m) => m.timestamp! <= t * 1000 + 1e-6)
    .sort((a, b) => a.timestamp! - b.timestamp! || a.i - b.i);

describe('MidiOut over every example, through a seek within the look-ahead', () => {
  const dir = new URL('../../node_modules/@yggi/cells/examples/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.cells'));
  const WINDOW = 0.25;

  for (const f of files)
    it(`${f}: no note sent after the seek is cut, and nothing is left sounding`, () => {
      const r = compileSource(readFileSync(new URL(f, dir), 'utf8'));
      const p = plan(r, codeShifts(r), r.off);
      const port = fakePort('out', 'Synth');
      const midi = new MidiOut(port);
      const route = router(r, channelTable(r));
      const run = (from: number, to: number, shift: number, played: Played[]) => {
        for (let t = from; t < to; t += WINDOW) {
          const w = windowAt(p, t, WINDOW);
          for (const e of w.events) {
            const moved = retime({ from: 0, to: 0, events: [e], tapes: [] }, shift, 1).events[0]!;
            if (played) played.push(moved);
            send(midi, moved, route);
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
