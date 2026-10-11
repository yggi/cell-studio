/**
 * What travels along a wire while a piece plays (docs/notes/edge-styles.md §2): the wire is a delay line at one visual
 * speed, so what is `s` px along it is what its source sent `s / speed` seconds ago. Pure: the steps a cell sent, read
 * from its clock's own time map (exact through swing, agogic bars and a tempo that moves), and where they are on a
 * wire now. The drawing is the UI's (EdgePayload.svelte).
 */
import type { CompileResult, Shifts } from '../engine/program';
import { clocking } from '../engine/clocking';
import { stepsOf } from '../engine/flatten';
import { tickLevel } from './meters';

const mod = (a: number, n: number) => ((a % n) + n) % n;

// (a cell's steps, once per program: stepsOf flattens its braid, and the payload asks for it every frame)
const periods = new WeakMap<CompileResult, Map<string, number>>();
function periodOf(result: CompileResult, cell: string): number {
  let byCell = periods.get(result);
  if (!byCell) periods.set(result, (byCell = new Map()));
  let n = byCell.get(cell);
  if (n === undefined) byCell.set(cell, (n = Math.max(1, stepsOf(result, cell, null))));
  return n;
}

/** A step a cell sent: when it left (seconds), its place in the cell's braid (0 … steps), and its count from the start. */
export interface Sent {
  readonly at: number;
  readonly local: number;
  readonly index: number;
}

/** The clock a cell steps by (a clock's own cell steps by itself), and how many of its steps make one of the clock's. */
function clockOf(result: CompileResult, cell: string): { clock: string; rate: number } | null {
  const c = result.cells.get(cell);
  if (c?.clock) return { clock: c.clock, rate: c.rate };
  return result.clocks.has(cell) ? { clock: cell, rate: 1 } : null;
}

/**
 * The steps `cell` sent between `now - span` and `now`, newest first (the one under way at `now - span` included, so a
 * wire is filled to its end); none before the piece's start. At most `max`: a fast cell on a long wire is cut there.
 */
export function sentSince(result: CompileResult, statics: Shifts, cell: string, now: number, span: number, max = 64): Sent[] {
  const k = clockOf(result, cell);
  if (!k || !(now >= 0) || !(span > 0)) return [];
  const map = clocking(result, statics, now).map(k.clock);
  const period = periodOf(result, cell);
  const out: Sent[] = [];
  for (let j = Math.floor(map.stepAt(now) * k.rate + 1e-9); j >= 0 && out.length < max; j--) {
    const at = map.q(j / k.rate);
    if (!Number.isFinite(at)) break;
    out.push({ at, local: mod(j, period), index: j });
    if (at <= now - span) break;
  }
  return out;
}

/** A stretch of a wire carrying one step: from `from` to `to` px along it (from its source), and the step. */
export interface Run {
  readonly from: number;
  readonly to: number;
  readonly step: Sent;
  /** Its front: the step's start is on the wire (not cut off at the source's end of it): a gate, a tick. */
  readonly onset: boolean;
}

/**
 * Where the steps sent are on a wire `length` px long now, at `speed` px a second: each from where the next one began
 * (or the source) out to where it began. A wire is filled only as far as the piece has played.
 */
export function runsOn(sent: readonly Sent[], now: number, length: number, speed: number): Run[] {
  const out: Run[] = [];
  let from = 0;
  for (const s of sent) {
    if (from >= length) break;
    const front = (now - s.at) * speed;
    const to = Math.min(length, front);
    if (to > from) out.push({ from, to, step: s, onset: front <= length });
    from = Math.max(from, to);
  }
  return out;
}

/** A clock's tick as it travels: how far along the wire it is, and its level (0 the bar's first, 1 a beat … 3). */
export interface Tick {
  readonly at: number;
  readonly level: number;
}

/**
 * A clock's ticks on a wire: the steps of the cell it drives (or of the clock itself), each at its place along the
 * wire and at its driver's level at the time it left (`tickLevel`: the bar's first, a beat, finer).
 */
export function ticksOn(result: CompileResult, statics: Shifts, driver: string, stepped: string, now: number, length: number, speed: number): Tick[] {
  const k = clockOf(result, driver);
  const map = k ? clocking(result, statics, now).map(k.clock) : null;
  const meter = result.cells.get(driver);
  return sentSince(result, statics, stepped, now, length / speed, 256).flatMap((s) => {
    const at = (now - s.at) * speed;
    if (at > length) return [];
    const beat = map ? mod(map.stepAt(Math.max(0, s.at)) * (k?.rate ?? 1), map.beats) : 0;
    return [{ at, level: tickLevel(meter, beat) }];
  });
}
