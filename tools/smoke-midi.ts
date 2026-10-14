// What the smoke test (tools/smoke.mjs) expects a fake MIDI port to receive while a piece plays (#205): the note-ons
// of the piece's notes, worked out from its plan as MIDI out works them out (src/engine/midi.ts), in time order; and
// the MIDI clock's ticks (#206, src/engine/midiclock.ts).
import { readFileSync } from 'node:fs';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { channelTable, midiNote, router, routesOf } from '@yggi/cells/engine/midi';
import { ticksBetween } from '@yggi/cells/engine/midiclock';

/** The note-ons an example's first `seconds` send (channel 1–16, key, start in code seconds), in order. */
export function expectedNoteOns(key: string, seconds: number): { channel: number; note: number; at: number }[] {
  const r = compileSource(readFileSync(new URL(`../node_modules/@yggi/cells/examples/${key}.cells`, import.meta.url), 'utf8'));
  const route = router(r, channelTable(r));
  const out: { channel: number; note: number; at: number }[] = [];
  for (const e of eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds, true)) {
    // (a piece's MIDI cards can send a note on several channels, or slots: slot 1, the default output, is the one played into)
    for (const to of routesOf(route(e))) {
      const n = (to.port ?? 1) === 1 ? midiNote(e, to) : null;
      if (n) out.push({ channel: n.channel, note: n.note, at: n.at });
    }
  }
  return out.sort((a, b) => a.at - b.at || a.channel - b.channel || a.note - b.note);
}

/** When an example's MIDI clock ticks fall in its first `seconds` (code seconds), from tick 0. */
export function expectedTicks(key: string, seconds: number): number[] {
  const r = compileSource(readFileSync(new URL(`../node_modules/@yggi/cells/examples/${key}.cells`, import.meta.url), 'utf8'));
  return [...(ticksBetween(plan(r, codeShifts(r), r.off), 0, seconds)?.at ?? [])];
}
