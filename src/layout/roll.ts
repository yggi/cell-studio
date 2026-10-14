/**
 * A braid cell as a piano roll: the helix unrolled (#211). x is the cell's steps (its frame: how many, where its bars and
 * beats fall, from its clock); y is its rows (each entry of the table it reads, over the laps; on a grid, its steps).
 * The notes go both ways: `fromBraid` reads a braid's steps into columns, `toBraid` writes columns back in the short
 * form (holds `x@n`, chords `[a,b]`, rests `~` and `~@n`, runs `x!n`), and `toBraid(fromBraid(b))` is b or its
 * canonical equal. A braid the roll can't show (a generator, a splice, a ratchet, chance …) is reported, not mangled.
 * Pure: `ui/PianoRoll.svelte` draws it and reports pointer and keys. Ideas from Jambot @ 8cdb6b8
 * (`apps/web/src/components/Lane.svelte`, `Contour.svelte`): a step grid in a viewBox, one row per degree.
 */
import type { Braid, FreeSpec, Token } from '@yggi/cells/engine/ast';
import { splitWords } from '@yggi/cells/engine/edit';
import { parse } from '@yggi/cells/engine/parser/index';
import { entries, resolvePitch, semitones } from '@yggi/cells/engine/helix';
import type { CompileResult, ResolvedCell, Shifts, Unit } from '@yggi/cells/engine/program';
import { playedCells } from '@yggi/cells/engine/clocking';
import { kindOf, noteLabel, voiceBase } from './show';

/** Notes that start together and last as long: one step of the braid (a note, or a chord). */
export interface Column {
  /** The step it starts on, 0-based. */
  readonly start: number;
  /** How many steps it lasts (its hold, `@n`). */
  readonly len: number;
  /** Its rows (values: entries of the table it reads), low to high, each once. */
  readonly rows: readonly number[];
}

/** A braid as the roll holds it: its length in steps, and its sounding columns in order (the rest is rests). */
export interface Roll {
  readonly length: number;
  readonly columns: readonly Column[];
}

export type Read = { readonly ok: true; readonly roll: Roll } | { readonly ok: false; readonly problem: string };

const no = (problem: string): Read => ({ ok: false, problem });
const whole = (v: number) => Number.isInteger(v);

/** One step's notes as rows, or why the roll can't hold it. */
function rowsOf(u: Unit | Token): readonly number[] | string {
  const a = u.atom;
  if (a.kind === 'rest') return [];
  if (a.kind === 'ref') return `it splices &${a.name}`;
  if (a.kind === 'choice') return 'a choice ([a|b]) chooses its note';
  if (a.kind === 'mix') return 'it is a mix';
  if (a.kind === 'seq') return 'a subsequence ([a b]) plays inside one step';
  if (a.kind === 'note') {
    if (a.pitched) return 'a note by name is a pitch, not a row';
    if (a.alter) return 'an accidental falls between rows';
    return whole(a.value) ? [a.value] : 'a decimal falls between rows';
  }
  if (a.pitched?.some(Boolean)) return 'a note by name is a pitch, not a row';
  if (a.alters.some((x) => x !== 0)) return 'an accidental falls between rows';
  if (!a.notes.every(whole)) return 'a decimal falls between rows';
  const rows = [...a.notes].sort((x, y) => x - y);
  return rows.some((r, i) => i > 0 && r === rows[i - 1]) ? 'a chord doubles a note' : rows;
}

/** A braid's steps (parsed tokens, or a compiled cell's units) as columns: each copy of `x!n` its own, `x@n` n long. */
export function fromBraid(braid: Braid | readonly (Unit | Token)[]): Read {
  let units: readonly (Unit | Token)[];
  if ('kind' in braid) {
    if (braid.kind === 'blank') return { ok: true, roll: { length: 0, columns: [] } };
    if (braid.kind !== 'list') return no(`it is made by ${braid.kind}()`);
    if (braid.perBeat !== undefined) return no('it is a meter, written as levels');
    units = braid.tokens;
  } else units = braid;
  const columns: Column[] = [];
  let t = 0;
  for (const u of units) {
    if (u.subdivide > 1) return no(`a ratchet (*${u.subdivide}) plays inside one step`);
    if (u.chance !== undefined) return no('a step left to chance (?)');
    const rows = rowsOf(u);
    if (typeof rows === 'string') return no(rows);
    for (let k = 0; k < u.repeat; k++) {
      if (rows.length) columns.push({ start: t, len: u.elongate, rows });
      t += u.elongate;
    }
  }
  return { ok: true, roll: { length: t, columns } };
}

/** A braid as written (its words, as `edit.declWords` gives them): a generator by name is reported, the rest read. */
/**
 * A braid left free (`free(0 2 4 ~)`, #210) as the roll edits it: its free() and its steps as they play (a take held,
 * else as written). The roll's edits are held in its place, as a take is, until Keep. Null: the braid isn't left free.
 */
export function freeBraidOf(result: CompileResult, name: string): { readonly spec: FreeSpec; readonly words: string[] } | null {
  const spec = result.cells.get(name)?.frees.find((f) => f.key === 'braid');
  return spec?.braid === undefined ? null : { spec, words: splitWords(spec.braid) };
}

export function readBraid(words: readonly string[]): Read {
  const made = words.find((w) => /^[a-z]+\(/.test(w));
  if (made) return no(`it is made by ${made.replace(/\(.*$/s, '()')}`);
  if (words.length === 0) return fromBraid({ kind: 'blank' });
  const r = parse(`&roll ${words.join(' ')}`);
  const err = r.diagnostics.find((d) => d.severity === 'error');
  if (err || r.cells.length !== 1) return no(err ? err.message : 'it does not read as one braid');
  return fromBraid(r.cells[0].braid);
}

/** A column's step as written: `4`, `[0,2,4]`, with its hold (`@n`). */
const tokenOf = (c: Column) => (c.rows.length === 1 ? String(c.rows[0]) : `[${c.rows.join(',')}]`) + (c.len > 1 ? `@${c.len}` : '');

/** The roll as a braid's words, short: each column a step (`x@n` held, `[a,b]` a chord), a gap a rest (`~`, `~@n`), a run `x!n` (never longer). */
export function toBraid(roll: Roll): string[] {
  const raw: string[] = [];
  let t = 0;
  for (const c of [...roll.columns].sort((a, b) => a.start - b.start)) {
    for (; t < c.start; t++) raw.push('~');
    raw.push(tokenOf(c));
    t = c.start + c.len;
  }
  for (; t < roll.length; t++) raw.push('~');
  const out: string[] = [];
  for (let i = 0; i < raw.length;) {
    let k = 1;
    while (i + k < raw.length && raw[i + k] === raw[i]) k++;
    // (a rest held, as the examples write it: ~@4; a step again, as Shorten counts it: 0!4)
    const run = raw[i] === '~' ? `~@${k}` : `${raw[i]}!${k}`;
    if (k > 1 && run.length <= k * raw[i].length + k - 1) out.push(run);
    else for (let j = 0; j < k; j++) out.push(raw[i]);
    i += k;
  }
  return out;
}

// ------------------------------------------------------------------ edits (each a new roll)

/** The column sounding at a step (started there or held over it), if any. */
export function columnAt(roll: Roll, step: number): Column | null {
  return roll.columns.find((c) => c.start <= step && step < c.start + c.len) ?? null;
}

const sorted = (columns: Column[], length: number): Roll => {
  const cs = columns.filter((c) => c.rows.length > 0 && c.len > 0).sort((a, b) => a.start - b.start);
  const end = cs.reduce((m, c) => Math.max(m, c.start + c.len), 0);
  return { length: Math.max(length, end), columns: cs };
};

/**
 * A tap at (step, row): a note sounding there goes (from its chord; a chord's last note leaves rests); else one is added —
 * to the chord starting there, or as a step of its own, cutting short a note held over it (a braid plays one column at a time).
 */
export function toggle(roll: Roll, step: number, row: number): Roll {
  if (step < 0) return roll;
  const at = columnAt(roll, step);
  if (at?.rows.includes(row)) return remove(roll, step, row);
  if (at && at.start === step) return sorted([...roll.columns.filter((c) => c !== at), { ...at, rows: [...at.rows, row].sort((a, b) => a - b) }], roll.length);
  const rest = roll.columns.filter((c) => c !== at);
  if (at) rest.push({ ...at, len: step - at.start });
  return sorted([...rest, { start: step, len: 1, rows: [row] }], roll.length);
}

/** The note at (step, row) taken away; the steps it held stay, as rests. */
export function remove(roll: Roll, step: number, row: number): Roll {
  const at = columnAt(roll, step);
  if (!at?.rows.includes(row)) return roll;
  return sorted([...roll.columns.filter((c) => c !== at), { ...at, rows: at.rows.filter((r) => r !== row) }], roll.length);
}

/** How long the column starting at `start` may be: up to the next column (lengthening never eats a note). */
export function room(roll: Roll, start: number): number {
  const next = roll.columns.find((c) => c.start > start);
  return next ? next.start - start : Infinity;
}

/** The column starting at `start` held for `len` steps (1 at least, up to the next column); past the end, the braid grows. */
export function resize(roll: Roll, start: number, len: number): Roll {
  const at = roll.columns.find((c) => c.start === start);
  if (!at) return roll;
  const n = Math.max(1, Math.min(Math.round(len), room(roll, start)));
  return sorted([...roll.columns.filter((c) => c !== at), { ...at, len: n }], roll.length);
}

// ------------------------------------------------------------------ the frame (x) and the rows (y)

/** The roll's x: the braid's steps, the steps drawn (whole bars, room to grow past the end), and its bars and beats. */
export interface Frame {
  /** The braid's length in steps (where it comes round). */
  readonly length: number;
  /** Steps drawn: past the length, room to write on (whole bars when it has them). */
  readonly steps: number;
  /** The cell's steps in a bar of its meter, and in a beat; null where it has none (or they don't fall on its steps). */
  readonly bar: number | null;
  readonly beat: number | null;
}

const steady = (x: number) => (Number.isFinite(x) && x >= 1 && Math.abs(x - Math.round(x)) < 1e-9 ? Math.round(x) : null);

/**
 * A cell's frame: a step of its clock is `rate` of its steps, so a bar of its meter (the clock's steps, a meter's
 * entries) is that many times as many, and a beat the meter's `beat=` as many. A cell that is its own clock has
 * only beats (its `beat=`, when more than 1).
 */
export function frameOf(result: CompileResult, name: string, length: number): Frame {
  const c = result.cells.get(name);
  const clock = c?.clock ? result.cells.get(c.clock) : null;
  let bar: number | null = null;
  let beat: number | null = null;
  if (c && clock && clock.name !== name && clock.steps > 0) {
    bar = steady(clock.steps * c.rate);
    beat = steady(clock.beat * c.rate);
  } else if (c && c.beat > 1) beat = c.beat;
  if (bar !== null && beat !== null && bar % beat !== 0) beat = null;
  const unit = bar ?? (beat ?? 1) * 4;
  const steps = Math.max(unit, Math.ceil((length + 1) / unit) * unit);
  return { length, steps, bar, beat };
}

/** One row of the roll: a value of the cell (an entry of its table, over the laps), and what it sounds. */
export interface Row {
  readonly value: number;
  /** Where it falls on its grid, the grid, and its steps there (for colour); null when it reads a kit. */
  readonly root: string | null;
  readonly position: number;
  /** Which entry of the lap (0 the first: a tonic, a C), and which lap. */
  readonly index: number;
  readonly lap: number;
  /** Its name: a note (`C4`), a place on another grid (`7`), or a kit's voice (`&bd`). */
  readonly label: string;
  /** A chromatic grid's black key (C♯, E♭ …): drawn darker. */
  readonly black: boolean;
}

/** The table a cell's numbers index (over=, else what it's shown through), and its entries per lap. */
export function tableOf(result: CompileResult, name: string): { table: ResolvedCell | null; perLap: number } {
  const c = result.cells.get(name);
  const table = c ? (result.cells.get(c.over ?? c.context) ?? null) : null;
  if (!table) return { table: null, perLap: 12 };
  if (table.root) return { table, perLap: Math.max(1, table.cycle) };
  if (table.kit) return { table, perLap: Math.max(1, table.units.length) };
  return { table, perLap: Math.max(1, entries(result, table.name, 0).length) };
}

const BLACK = [1, 3, 6, 8, 10];

/** The rows from lo to hi (values, inclusive), low to high, resolved through the cell's tables at these shifts. */
export function rowsFor(result: CompileResult, name: string, shifts: Shifts, lo: number, hi: number): Row[] {
  const { table, perLap } = tableOf(result, name);
  const base = voiceBase(result, name);
  const out: Row[] = [];
  for (let v = lo; v <= hi; v++) {
    const lap = Math.floor(v / perLap);
    const index = v - lap * perLap;
    if (table?.kit) {
      const a = table.units[index]?.atom;
      out.push({ value: v, root: null, position: v, index, lap, label: a?.kind === 'ref' ? `&${a.name}` : String(v), black: false });
      continue;
    }
    try {
      const r = resolvePitch(result, name, v, 0, shifts);
      const grid = result.cells.get(r.root);
      const semis = semitones(result, r.root, r.position);
      const twelve = grid?.cycle === 12 && (grid.map?.kind !== 'edo' || grid.map.period === 2) && grid.map?.kind !== 'ratios';
      const label = twelve ? (noteLabel('notes', { semis, value: v, alter: 0, lap: perLap }, base, 0) ?? String(v)) : String(Math.round(r.position));
      const pc = (((Math.round(r.position) % 12) + 12) % 12) as number;
      out.push({ value: v, root: r.root, position: r.position, index, lap, label, black: twelve && perLap === 12 && BLACK.includes(pc) });
    } catch {
      out.push({ value: v, root: null, position: v, index, lap, label: String(v), black: false });
    }
  }
  return out;
}

/** The most rows the roll draws (a few laps: each row is a lane and a key), and so the widest a braid's notes may spread. */
export const MAX_ROWS = 128;

/** The lowest and the highest note of a roll (0 and 0 with none). */
function extent(roll: Roll): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of roll.columns)
    for (const r of c.rows) {
      if (r < lo) lo = r;
      if (r > hi) hi = r;
    }
  return lo > hi ? [0, 0] : [lo, hi];
}

/**
 * Why the roll can't hold these notes, if it can't: they spread over more than MAX_ROWS rows (`&a 0 5000`), or one lies more
 * than that outside its table's first lap (`&a 1000000000`). Either would be thousands of rows to draw.
 */
export function tooWide(roll: Roll, perLap: number): string | null {
  const [lo, hi] = extent(roll);
  return hi - lo + 1 > MAX_ROWS || lo < -MAX_ROWS || hi > perLap + MAX_ROWS ? 'a note far outside its table' : null;
}

/**
 * The rows to draw: the first lap and the step that closes it (tonic to octave), widened to every note, and by `more` laps
 * below and above; at most MAX_ROWS, a window round the notes (laps asked for past it are left out, from the top).
 */
export function rowRange(roll: Roll, perLap: number, kit: boolean, more: { below: number; above: number } = { below: 0, above: 0 }): [number, number] {
  const [low, high] = extent(roll);
  let lo = Math.min(0, low) - more.below * perLap;
  let hi = Math.max(kit ? perLap - 1 : perLap, high) + more.above * perLap;
  if (hi - lo + 1 > MAX_ROWS) {
    hi = Math.max(high, Math.min(hi, lo + MAX_ROWS - 1));
    lo = hi - MAX_ROWS + 1;
  }
  return [lo, hi];
}

// ------------------------------------------------------------------ which cells, and their ghosts

/** What makes a cell something other than notes, whatever its braid: a tape, a tape's read head, a law, a scope, a motor, a resonator. */
const NOT_NOTES = ['write', 'play', 'law', 'scope', 'motor', 'body'];
/** Steps a second from which a braid is a waveform (`step=8k`), not a melody. */
const AUDIO_RATE = 50;

/** Does another cell refer to this one through an attribute (step=, map=, write=, play=, a clocked or moving parameter …)? */
function referred(result: CompileResult, name: string): boolean {
  for (const x of result.cells.values()) {
    if (x.name === name) continue;
    if (x.step?.driver === name || (x.map?.kind === 'table' && x.map.table === name)) return true;
    if (Object.values(x.params).includes(name)) return true;
    if (Object.values(x.paramClocks).some((s) => s.driver === name)) return true;
    if (Object.values(x.paramCells).some((p) => p.factors.includes(name))) return true;
  }
  return false;
}

/**
 * Does the sheet show a roll for this cell? A braid (a melody, a bass, chords) on a single line: not a voice, a mix, a
 * meter, a table, a curve; not a tape, its heads, a law or a scope (their braid isn't notes); not a clock or a table an
 * attribute reads that nothing plays (a tap of the bar, a reel, map=&curve); not a waveform at audio rate. A blank cell
 * rolls only when something plays it as a melody (it plays its table): a blank tape or head is no melody to write into.
 */
export function rolls(result: CompileResult, name: string): boolean {
  const c = result.cells.get(name);
  if (!c || c.lambda || c.map || (c.braid !== 'list' && c.braid !== 'blank')) return false;
  if (NOT_NOTES.some((k) => c.params[k] !== undefined)) return false;
  if (result.tapes.some((t) => t.name === name || t.heads.some((h) => h.head === name))) return false;
  if (kindOf(result, name) !== 'braid') return false;
  const perSecond = c.clock ? (result.clocks.get(c.clock)?.perSecond ?? 0) * c.rate : 0;
  if (perSecond >= AUDIO_RATE) return false;
  const played = playedCells(result).has(name);
  if (c.braid === 'blank') return played;
  return played || !referred(result, name);
}

/** A dim note under the roll: what else plays the same table on the same clock, in this cell's steps. */
export interface Ghost {
  readonly start: number;
  readonly len: number;
  readonly row: number;
  readonly from: string;
}

/**
 * What else plays through the same table (its values are the same rows) on the same clock: their notes in this cell's
 * steps (a step of theirs is rate/rate of these), repeated round their own length across the steps drawn.
 */
export function ghostsOf(result: CompileResult, name: string, steps: number): Ghost[] {
  const c = result.cells.get(name);
  if (!c?.clock || !c.rate) return [];
  const table = c.over ?? c.context;
  const played = playedCells(result);
  const out: Ghost[] = [];
  for (const o of result.cells.values()) {
    if (o.name === name || !played.has(o.name) || o.clock !== c.clock || !o.rate || (o.over ?? o.context) !== table) continue;
    if (o.voice || o.mix || o.sink || o.root || o.map || o.braid !== 'list') continue;
    const read = fromBraid(o.units);
    if (!read.ok || read.roll.length === 0) continue;
    const f = c.rate / o.rate;
    const lap = read.roll.length * f;
    for (let at = 0; at < steps && out.length < 2000; at += lap)
      for (const col of read.roll.columns) {
        const start = at + col.start * f;
        if (start >= steps) break;
        for (const row of col.rows) out.push({ start, len: col.len * f, row, from: o.name });
      }
  }
  return out;
}
