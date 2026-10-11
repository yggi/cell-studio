/**
 * A gate (#234, the gate node; docs/language/mix.md: a gate), drawn as a level meter (ui/GateMeter.svelte): a bar for
 * each note it plays now, as tall as its level. The voices it plays are wheels of their own, its notes wired to them.
 * Pure geometry.
 */
import type { CompileResult } from '../engine/program';
import { wheelGeometry } from './wheel';

/** What a gate's meter draws: whose notes it plays, its level streams and its gain; null: not a gate. */
export function gateOf(result: CompileResult, name: string): { trigger: string; levels: readonly string[]; gain: number } | null {
  const g = result.cells.get(name)?.gate;
  if (!g) return null;
  return { trigger: g.notes, levels: g.levels.map((l) => l.name).filter((l) => result.cells.has(l)), gain: g.gain };
}

/** A gate's meter, `size` px across: its track (a tall rounded well inside the disc) and a bar per note, side by side. */
export interface GateBars {
  readonly x: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** The track's corner radius. */
  readonly round: number;
  /** Each note's bar: where, and how tall (its level, 0 … 1). */
  readonly bars: readonly { x: number; width: number; level: number }[];
  /** The y of a level (0 the track's floor, 1 its top). */
  readonly yOf: (v: number) => number;
  /** The levels marked on the track's side (quarters), none when it is too small to read them. */
  readonly ticks: readonly number[];
}

/** Where a gate's bars go for `n` notes at once (a chord), at a level (0 … 1). */
export function gateBars(size: number, n: number, level: number): GateBars {
  const g = wheelGeometry(size);
  // (a tall track inside the ring: its corners just inside the rim)
  const height = g.rOuter * 1.42;
  const width = g.rOuter * 0.9;
  const x = g.c - width / 2;
  const top = g.c - height / 2;
  const pad = Math.max(1.5, width * 0.12);
  // (the bars of a chord centred side by side, a third of the track's width each at most)
  const gap = n > 1 ? Math.max(1, width * 0.06) : 0;
  const w = n ? Math.min(width * 0.36, (width - 2 * pad - gap * (n - 1)) / n) : 0;
  const left = g.c - (n * w + (n - 1) * gap) / 2;
  const l = Math.max(0, Math.min(1, level));
  const floor = top + height - pad;
  const span = height - 2 * pad;
  return {
    x,
    top,
    width,
    height,
    round: Math.min(width / 2, Math.max(2, size / 16)),
    bars: Array.from({ length: n }, (_, i) => ({ x: left + i * (w + gap), width: w, level: l })),
    yOf: (v: number) => floor - span * v,
    ticks: size >= 64 ? [0.25, 0.5, 0.75, 1] : [],
  };
}
