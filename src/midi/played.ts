/**
 * Cells' played notes as webmidi's (`OutNote`, yggi/webmidi#3): what MIDI out (`@yggi/webmidi/core` `MidiOut`) sends
 * for one note the voices play, on each place its route sends it. A glide's run (`legatoNotes`) is a run of notes, each
 * held into the next; a kit's member is its drum note; any other note is the key nearest its frequency, the cents it is
 * off that key and its bends. What a note is as MIDI stays the language's (`engine/midi.ts` in `@yggi/cells`): its key
 * and cents (`noteOf`) and velocity (`velocityOf`); the bends, the drum map and the wire are webmidi's.
 */
import { legatoNotes, noteOf, routesOf, velocityOf, type Route, type Routes } from '@yggi/cells/engine/midi';
import type { Played } from '@yggi/cells/engine/realize';
import type { OutNote } from '@yggi/webmidi/core';

/**
 * A played note as the runs MIDI out plays, one for each place `route` sends it (none for a note it leaves out). A
 * pitch no key plays is passed on as it is, and MIDI out sends nothing for it, so a run keeps its notes' places.
 */
export function outRuns(e: Played, route: (e: Played) => Routes): OutNote[][] {
  const notes = legatoNotes(e);
  return routesOf(route(e)).map((to) => notes.map((n) => outNote(n, to)));
}

function outNote(e: Played, to: NonNullable<Route>): OutNote {
  const velocity = velocityOf(e, to.gain);
  if (to.drum !== null) return { at: e.at, duration: e.dur, note: to.drum, velocity, channel: to.channel, drum: true };
  const { note, cents } = noteOf(e.freq);
  return { at: e.at, duration: e.dur, note, velocity, channel: to.channel, cents, bends: e.bends };
}
