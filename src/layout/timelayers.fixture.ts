import { compilePiece } from '../compile';
import { pieceTime, sections } from '@yggi/cells/inspect';
import { codeShifts, eventsBetween, EXAMPLES, plan } from '@yggi/cells';
import { grid, listening, scalograms, sectionsOver, type Signal, SIGNALS } from '@yggi/cells/time';
import { buildGraph } from './drawn';
import { cellSpans, meterCellOf, meterOf, shownNotes } from './timelayers';

/** A piece as the time view takes it in (ui/TimeView.svelte): its length shown, its rounds, the notes listened to. */
export function piece(key: keyof typeof EXAMPLES) {
  const program = compilePiece(EXAMPLES[key].source);
  if (!program.ok) throw new Error(`${key} does not compile`);
  const time = pieceTime(program);
  const heard = listening(time);
  const length = Math.max(4, heard?.cycle ?? heard?.seconds ?? 30);
  const loop = (heard?.rounds ?? 1) > 1;
  const rounds = loop && time?.chance ? (heard?.rounds ?? 1) : 1;
  const listened = rounds > 1 ? Math.max(4, heard?.seconds ?? 30) : length;
  const planned = plan(program, codeShifts(program), new Set(program.off));
  const heardNotes = eventsBetween(planned, 0, listened);
  const notes = shownNotes(heardNotes, length, !!time?.chance && rounds > 1);
  const spans = cellSpans(program, buildGraph(program));
  const written = sectionsOver(sections(program) ?? [], length).filter((s) => s.at > 0 && s.at < length);
  const meter = meterOf(spans, meterCellOf(program), written);
  /** The scalograms as the worker makes them (ui/time.worker.ts). */
  const listenedScal = () => {
    const g = grid(listened, undefined, loop);
    const rows: Partial<Record<Signal, Float32Array[]>> = {};
    for (const [k, s] of Object.entries(scalograms(heardNotes, g, SIGNALS))) rows[k as Signal] = [...s.rows];
    return { window: listened, periods: g.periods, rows, periodic: loop };
  };
  return { program, planned, length, loop, rounds, listened, heardNotes, notes, spans, written, meter, listenedScal };
}
