/**
 * A host's text played as its performers play it (#492, part of #478 rung 3): each of cells' events in a bar read as
 * Jambot's host reads it (`playSection`, `section-play.ts`), given the feel (`feel.ts`), and said as played.
 *
 * - **Its part and role** are read off the output cells names it by (`readingOf`, the feel contract's minor 1).
 * - **Its note and velocity** are what cells' MIDI out sends of it, on the host's channels (1 the lead, 2 the bass, 3
 *   the pad and the stab, 10 the drums): the velocity MIDI rounds from its level, the note a drum's or its key.
 * - **Its step and length** are its onset and end in the bar's steps through the swing undone (`writtenAt`): the step
 *   rounded, the length from the onset to the end.
 *
 * The feel moves its velocity and length, never its onset: its level is scaled so that MIDI's velocity is the feel's,
 * and it ends where the host ends it, at its step plus the feel's length, through the swing.
 */
import { midiNote, routesOf, type Routes } from '@yggi/cells/engine/midi';
import type { Played } from '@yggi/cells/engine/realize';
import { played, readingOf, type FeelFrame } from './feel';
import { swungAt, writtenAt } from './swing';

/** The channels a host's text sends its parts on: the lead, the bass, the pad and stab, the drums. */
const CHANNELS: ReadonlySet<number> = new Set([1, 2, 3, 10]);

/** A bar in its text's own time: the song's bar, its frame, and where it starts and how long it lasts (seconds). */
export interface TextBar {
  readonly bar: number;
  readonly frame: FeelFrame;
  readonly start: number;
  readonly seconds: number;
}

/** An event as the performers play it, as Jambot's log says one (`PlayedEvent`): its bar, part, drum role, step, note, velocity and length in steps. */
export interface Performance {
  readonly bar: number;
  readonly part: string;
  readonly role?: string;
  readonly step: number;
  readonly note: number;
  readonly velocity: number;
  readonly length: number;
}

/**
 * One of cells' events in a bar as the performers play it, and what it is as played; the event as it is, and no
 * performance, where it is none of the feel's (no part or role it reads, a drone, sent on none of the host's channels).
 */
export function perform(e: Played, route: (e: Played) => Routes, at: TextBar): { event: Played; performance: Performance | null } {
  const reading = readingOf(e.output);
  const r = routesOf(route(e)).find((x) => CHANNELS.has(x.channel));
  const sent = r && midiNote(e, r);
  if (!reading || e.held || !sent) return { event: e, performance: null };
  const { frame } = at;
  const groups = frame.groups;
  const swing = [frame.swing];
  const steps = 2 * groups.reduce((a, b) => a + b, 0);
  const stepsOf = (seconds: number) => ((seconds - at.start) / at.seconds) * steps;
  const onset = writtenAt(stepsOf(e.at), groups, swing);
  const step = Math.round(onset);
  const length = writtenAt(stepsOf(e.at + Math.max(0, e.dur)), groups, swing) - onset;
  const p = played(frame, { ...reading, step, note: sent.note, velocity: sent.velocity, length });
  // (MIDI's velocity is 127 √(level × gain): the level scaled so it is the feel's)
  const amp = (e.levels[0]?.level ?? 1) * Math.abs(r.gain ?? Math.max(Math.abs(e.gains[0]), Math.abs(e.gains[1])));
  const k = amp > 0 ? (p.velocity / 127) ** 2 / amp : 1;
  const levels = e.levels.length ? e.levels.map((l) => ({ ...l, level: l.level * k })) : [{ at: e.at, level: k }];
  const end = at.start + (swungAt(step + p.length, groups, swing) / steps) * at.seconds;
  const dur = end > e.at ? end - e.at : e.dur;
  return { event: { ...e, levels, dur }, performance: { bar: at.bar, ...reading, step, note: sent.note, velocity: p.velocity, length: p.length } };
}
