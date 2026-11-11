/**
 * Which wheels turn while a piece plays, and which shifts a wheel is drawn with: one motion per wheel. A played cell (a
 * braid an out plays, and every cell it splices: its bulbs) shows where it is by its hand, so its ring stays at its
 * written `shift=`; a stepped table shows where it is by turning its ring. A table that is also played (cells #167) is
 * drawn as played, its hand on the entry sounding, while what reads through it sees it turned, as the sound does.
 *
 * cells' `shiftsAt` (the live state's `shifts`) turns a stepped table, and a played cell only when a line reads through it
 * (`readThrough`, cells v0.8.0, #203); its notes read a played cell's own shift as written (`playing`). So the drawing
 * holds back only what `shiftsAt` turns and the wheel shows by its hand: a played cell that is also read through (#475).
 */
import type { CompileResult, Shifts } from '@yggi/cells/engine/program';
import { playedCells, readThrough } from '@yggi/cells/engine/clocking';
import { isPicked } from '@yggi/cells/engine/helix';

interface Turning {
  readonly played: ReadonlySet<string>;
  /** What a line reads through (cells' `readThrough`): the cells `shiftsAt` turns, played or not. */
  readonly read: ReadonlySet<string>;
  /** By wheel: the played cells its own drawing reads as written (itself and what it splices) that `shiftsAt` turns. */
  readonly still: Map<string, ReadonlySet<string>>;
}

const cache = new WeakMap<CompileResult, Turning>();
const turningOf = (program: CompileResult): Turning => {
  let t = cache.get(program);
  if (!t) cache.set(program, (t = { played: playedCells(program), read: readThrough(program), still: new Map() }));
  return t;
};

/**
 * The played cells a wheel's own drawing holds at their written shift: none for a cell nothing plays; else it and what it
 * splices, those a line reads through (the rest `shiftsAt` holds there already).
 */
function stillOf(program: CompileResult, name: string): ReadonlySet<string> {
  const t = turningOf(program);
  let s = t.still.get(name);
  if (s) return s;
  const seen = new Set<string>();
  const out = new Set<string>();
  const walk = (n: string) => {
    if (seen.has(n) || !t.played.has(n)) return;
    seen.add(n);
    if (t.read.has(n)) out.add(n);
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
 * reads through (cells' `readThrough`: an `over=`, the table a cell is shown through, a relative pick `&k[0]`) stays,
 * its readers see it turn.
 */
export function turningCells(program: CompileResult): string[] {
  const { played, read } = turningOf(program);
  return [...program.cells.values()].filter((c) => c.step && !c.voice && (!played.has(c.name) || read.has(c.name))).map((c) => c.name);
}

/**
 * The turning cells (turningCells) whose turn can change what is drawn for `name`: its wheel, its edges, its label.
 * Reached through every cell its compiled cell names (its splices, `over=`, its parameters' cells, a label's `&x`, any
 * field that names one), and theirs, itself among them — generous, so that a view keyed by their shifts alone
 * (`turnKey`) is never stale; a cell nothing turning reaches has none, and is drawn once. Kept with the program.
 */
export function turnsSeen(program: CompileResult, name: string): readonly string[] {
  let by = seenCache.get(program);
  if (!by) seenCache.set(program, (by = { turning: new Set(turningCells(program)), named: new Map(), seen: new Map() }));
  const had = by.seen.get(name);
  if (had) return had;
  const out: string[] = [];
  const visited = new Set<string>();
  const stack = [name];
  while (stack.length) {
    const n = stack.pop()!;
    if (visited.has(n)) continue;
    visited.add(n);
    if (by.turning.has(n)) out.push(n);
    for (const m of namedBy(program, by.named, n)) if (!visited.has(m)) stack.push(m);
  }
  out.sort();
  by.seen.set(name, out);
  return out;
}

/** A key over the shifts now of what `names` see turn (turnsSeen): it changes only when something they show turns. */
export function turnKey(program: CompileResult, now: Shifts, names: readonly (string | null | undefined)[]): string {
  let key = '';
  for (const name of names) if (name) for (const n of turnsSeen(program, name)) key += `${n}:${now(n)} `;
  return key;
}

const seenCache = new WeakMap<CompileResult, { turning: ReadonlySet<string>; named: Map<string, readonly string[]>; seen: Map<string, readonly string[]> }>();

/** The cells a cell's compiled form names anywhere (strings that are cells' names, or `&name` in a text), not itself. */
function namedBy(program: CompileResult, named: Map<string, readonly string[]>, name: string): readonly string[] {
  const had = named.get(name);
  if (had) return had;
  const found = new Set<string>();
  const seen = new Set<unknown>();
  const visit = (v: unknown, depth: number) => {
    if (typeof v === 'string') {
      if (program.cells.has(v)) found.add(v);
      else if (v.includes('&')) for (const m of v.matchAll(/&([A-Za-z_][\w]*)/g)) if (program.cells.has(m[1]!)) found.add(m[1]!);
      return;
    }
    if (!v || typeof v !== 'object' || depth > 6 || seen.has(v)) return;
    seen.add(v);
    if (v instanceof Map) {
      for (const [k, x] of v) {
        visit(k, depth + 1);
        visit(x, depth + 1);
      }
    } else if (v instanceof Set || Array.isArray(v)) for (const x of v) visit(x, depth + 1);
    else for (const x of Object.values(v)) visit(x, depth + 1);
  };
  visit(program.cells.get(name), 0);
  found.delete(name);
  const out = [...found];
  named.set(name, out);
  return out;
}
