// What the smoke test (tools/smoke.mjs) expects a fake MIDI port to receive while a piece plays (#205): the note-ons
// of the piece's notes, worked out from its plan as MIDI out works them out (src/engine/midi.ts), in time order.
import { readFileSync } from 'node:fs';
import { compileSource } from '../src/engine/compile';
import { codeShifts } from '../src/engine/program';
import { eventsBetween, plan } from '../src/engine/realize';
import { channelTable, midiNote, router } from '../src/engine/midi';

/** The note-ons an example's first `seconds` send (channel 1–16, key, start in code seconds), in order. */
export function expectedNoteOns(key: string, seconds: number): { channel: number; note: number; at: number }[] {
  const r = compileSource(readFileSync(new URL(`../examples/${key}.cells`, import.meta.url), 'utf8'));
  const route = router(r, channelTable(r));
  const out: { channel: number; note: number; at: number }[] = [];
  for (const e of eventsBetween(plan(r, codeShifts(r), r.off), 0, seconds, true)) {
    const to = route(e);
    const n = to && midiNote(e, to);
    if (n) out.push({ channel: n.channel, note: n.note, at: n.at });
  }
  return out.sort((a, b) => a.at - b.at || a.channel - b.channel || a.note - b.note);
}
