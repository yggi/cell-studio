/**
 * Meters as ground (#27): a meter drives almost everything in a piece (`step=&bar`), so its edges would run from one
 * place to every part, crossing all the rest. As in a circuit, where ground isn't drawn as a wire to every part, the
 * graph draws a meter's net instead (GraphModel.nets, the step ones; laid by layout/nets.ts: meterNet). A belt
 * keeps its belt: a body, drawn.
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import { noteValue, tapShare, type Meter, type SwingLevel } from '@yggi/cells/engine/meter';

type Node = { id: string; kind: string; isMeter?: boolean; petalOf?: string };

/** The edges to a meter that aren't drawn (its net's taps), by id. */
export function groundsOf(model: { nets?: readonly { port: string; readers: readonly string[] }[] }): Set<string> {
  return new Set((model.nets ?? []).flatMap((n) => (n.port === 'step' ? n.readers : [])));
}

/** Each meter's place among the piece's meters, in the order they're written. */
export function meterIndex(model: { nodes: readonly Node[] }): Map<string, number> {
  return new Map(model.nodes.filter((n) => n.isMeter && !n.petalOf).map((n, i) => [n.id, i]));
}

/**
 * Where a meter is now on its own wheel: `at`, the segment it's in (its step now), and `turn` (0 … 1, from the top,
 * clockwise), how far round it is within that segment. `beatAt` is where it is in its cycle, in beats
 * (LiveState.beatAt); segments are its wheel's (index: its beat).
 */
export function meterNow(segments: readonly { index: number; t0: number; t1: number }[], beatAt: number): { turn: number; at: number } | null {
  const beat = Math.floor(beatAt + 1e-9);
  const at = segments.findIndex((s) => s.index === beat);
  if (at < 0) return null;
  const s = segments[at];
  return { turn: s.t0 + (beatAt - beat) * (s.t1 - s.t0), at };
}

/**
 * The cell a clock counts in, and how many of the clock's steps make one of that cell's: a clock's own cell, 1; a tap
 * of a meter (`step=16n`, decision 040: the clock `bar:16n`), the meter, and the tap's steps a step of the meter (4 on
 * a bar of four quarters, ¼ for `1m`). A view that measures a cell against its meter reads the meter through this,
 * never `cells.get(c.clock)`.
 */
export function clockCell(result: CompileResult, clock: string): { cell: string; perStep: number } | null {
  const k = result.clocks.get(clock);
  if (!k) return null;
  return { cell: k.cell, perStep: k.tap ? k.tap.positions.length / k.tap.lap : 1 };
}

/** What tickLevel reads of a meter (a ResolvedCell). */
interface Ticking {
  readonly meter: { readonly written: 'meter' | 'scan' } | null;
  readonly units: readonly { readonly atom: { readonly kind: string; readonly value?: number } }[];
}

/**
 * The level of a meter's tick now (the palette's sync value, ui/palette.ts): 0 the bar's first, 1 a beat, 2 … 3 finer.
 * A meter written as levels (meter(…)) says each step's; any other clock: its first step 0, the rest 1.
 */
export function tickLevel(meter: Ticking | undefined, beatAt: number): number {
  const step = Math.floor(beatAt + 1e-9);
  const n = meter?.meter?.written === 'meter' ? meter.units.length : 0;
  const atom = n ? meter!.units[((step % n) + n) % n].atom : null;
  if (atom?.kind === 'note' && typeof atom.value === 'number') return Math.max(0, Math.min(3, Math.round(atom.value)));
  return step === 0 ? 0 : 1;
}

/** A share as the app writes one: two places, no leading zero (`.67`, `1.5`). */
const shareText = (x: number) => String(+x.toFixed(2)).replace(/^0\./, '.');

/** A meter's levels, short, as `swing=` and `legato=` write them by level: `8n .67`, `8n .6, 16n .55`; null with none. */
export function levelsText(levels: readonly SwingLevel[] | undefined): string | null {
  return levels?.length ? levels.map((l) => `${l.level} ${shareText(l.share)}`).join(', ') : null;
}

/** A tap's step in whole notes (`16n` 1/16, `pulse`, `beat` its longest, `1m` the bar), its chain dividing it, as `tapShare` reads it. */
function tapWhole(m: Meter, tap: string, ratio: number): number | null {
  const pulses = tap === 'pulse' ? 1 : tap === 'beat' ? Math.max(...m.beats) : tap === '1m' ? m.pulses : null;
  const whole = pulses !== null ? pulses / m.unit : noteValue(tap);
  return whole && ratio > 0 ? whole / ratio : null;
}

/** A stepped cell's tap of a meter: the meter, the tap as written, its chain as a ratio; null for any other step. */
function tapOf(result: CompileResult, name: string): { meter: Meter; meterName: string; tap: string; ratio: number } | null {
  const step = result.cells.get(name)?.step;
  const meter = step?.tap ? result.cells.get(step.driver)?.meter : null;
  if (!step?.tap || !meter) return null;
  return { meter, meterName: step.driver, tap: step.tap, ratio: step.chain.reduce((r, x) => (x.op === '×' ? r * x.n : r / x.n), 1) };
}

/**
 * The levels of its meter's swing that move a tap's steps (cells v0.4.0: `swing=8n:.67` on the meter): a level the tap's
 * step divides into a whole number of times, so the second of each pair is one of its steps (`8n` and `16n` under
 * swung eighths; not `4n`, nor `8t`, which stays even).
 */
export function tapSwing(result: CompileResult, name: string): SwingLevel[] {
  const t = tapOf(result, name);
  const whole = t ? tapWhole(t.meter, t.tap, t.ratio) : null;
  if (!t || !whole) return [];
  return (t.meter.swing ?? []).filter((l) => {
    const k = l.whole / whole;
    return k >= 1 - 1e-9 && Math.abs(k - Math.round(k)) < 1e-9;
  });
}

/**
 * The share of its held length each of a line's notes sounds (`legato=`, cells v0.4.0): its own (a number, or a free()'s
 * held value), else its meter's for its tap's level (`legato=16n:.5` on the meter: `from` names the meter), else 1.
 * Null when it changes from note to note (a cell of shares, read at each onset).
 */
export function lineShare(result: CompileResult, name: string): { share: number; from: string | null } | null {
  const c = result.cells.get(name);
  if (!c) return null;
  if (c.paramCells.legato) return null;
  if (typeof c.params.legato === 'number') return { share: c.params.legato, from: null };
  const t = tapOf(result, name);
  if (t?.meter.legato?.length) return { share: tapShare(t.meter, t.tap, t.ratio), from: t.meterName };
  return { share: 1, from: null };
}
