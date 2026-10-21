/**
 * Which wheels turn while a piece plays, and which shifts a wheel is drawn with: one motion per wheel. A played cell (a
 * braid an out plays, and every cell it splices: its bulbs) shows where it is by its hand, so its ring stays at its
 * written `shift=`; a stepped table shows where it is by turning its ring. A table that is also played (cells #167) is
 * drawn as played, its hand on the entry sounding, while what reads through it sees it turned, as the sound does.
 *
 * cells' `shiftsAt` (the live state's `shifts`) turns a stepped table, and a played cell only when a line reads through it
 * (`readThrough`, cells v0.8.0, #203); its notes read a played cell's own shift as written (`playing`). This is the same
 * split for the drawing, which only a played cell that is also read through still needs.
 */
import type { CompileResult, Shifts } from '@yggi/cells/engine/program';
import { playedCells } from '@yggi/cells/engine/clocking';
import { isPicked } from '@yggi/cells/engine/helix';

interface Turning {
  readonly played: ReadonlySet<string>;
  /** By wheel: the played cells its own drawing reads as written (itself and what it splices). */
  readonly still: Map<string, ReadonlySet<string>>;
}

const cache = new WeakMap<CompileResult, Turning>();
const turningOf = (program: CompileResult): Turning => {
  let t = cache.get(program);
  if (!t) cache.set(program, (t = { played: playedCells(program), still: new Map() }));
  return t;
};

/** The played cells a wheel's own drawing holds at their written shift: none for a cell nothing plays; else it and what it splices. */
function stillOf(program: CompileResult, name: string): ReadonlySet<string> {
  const t = turningOf(program);
  let s = t.still.get(name);
  if (s) return s;
  const out = new Set<string>();
  const walk = (n: string) => {
    if (out.has(n) || !t.played.has(n)) return;
    out.add(n);
    const c = program.cells.get(n);
    for (const k of c?.children.keys() ?? []) {
      // (a cell only picked from is a table read, turning under its picks: as playedCells has it)
      const refs = c!.units.flatMap((u) => (u.atom.kind === 'ref' && u.atom.name === k ? [u.atom] : []));
      if (!refs.length || !refs.every((r) => isPicked(program, k, r.pick))) walk(k);
    }
  };
  walk(name);
  t.still.set(name, (s = out));
  return s;
}

/**
 * The shifts the wheel of `name` is drawn with, from `now` (the live state's: its tables and what is read through turned) and `statics`
 * (as written): a played cell and what it splices as written, every table it reads through as it stands now.
 */
export function drawnShifts(program: CompileResult, statics: Shifts, now: Shifts, name: string): Shifts {
  if (now === statics) return now;
  const still = stillOf(program, name);
  return still.size ? (n) => (still.has(n) ? statics(n) : now(n)) : now;
}

/**
 * The cells whose turning changes what the graph draws (a key over their shifts redraws it): the stepped tables, less
 * the cells that are only played (their moving shift is a playhead, drawn by the hand); a played table that a line
 * reads through (`over=`) stays, its readers see it turn.
 */
export function turningCells(program: CompileResult): string[] {
  const { played } = turningOf(program);
  const read = new Set<string>();
  for (const c of program.cells.values()) if (c.over) read.add(c.over);
  return [...program.cells.values()].filter((c) => c.step && !c.voice && (!played.has(c.name) || read.has(c.name))).map((c) => c.name);
}
