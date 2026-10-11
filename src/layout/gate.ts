/**
 * A gate (#234, the gate node; docs/language/mix.md: a gate), drawn as a level meter (ui/GateMeter.svelte): a bar for
 * each note its trigger sounds now, as tall as its velocity, under the gate's ceiling. Its receivers, the voices it
 * plays, are wheels of their own, their sound wired into it. Pure geometry.
 */
import type { CompileResult } from '../engine/program';
import { wheelGeometry } from './wheel';

/** What a gate's meter draws: whose notes it plays, its level streams and its gain; null: not a gate. */
export function gateOf(result: CompileResult, name: string): { trigger: string; levels: readonly string[]; gain: number } | null {
  const g = result.cells.get(name)?.gate;
  if (!g) return null;
  return { trigger: g.notes, levels: g.levels.map((l) => l.name).filter((l) => result.cells.has(l)), gain: g.gain };
}

/** A gate's meter, `size` px across: its well (a square inside the disc) and a bar per note, side by side. */
export interface GateBars {
  readonly x: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** Each note's bar: where, and how tall (its level, 0 … 1). */
  readonly bars: readonly { x: number; width: number; level: number }[];
  /** The y of a level (0 the well's floor, 1 its top). */
  readonly yOf: (v: number) => number;
}

/** Where a gate's bars go for `n` notes at once (a chord), at a level (0 … 1). */
export function gateBars(size: number, n: number, level: number): GateBars {
  const g = wheelGeometry(size);
  // (the largest square in the ring, a little in from its rim)
  const side = (g.rOuter - 2 * g.k) * Math.SQRT2;
  const x = g.c - side / 2;
  const top = g.c - side / 2;
  // (a bar a quarter of the well at most, the bars of a chord centred side by side)
  const gap = n > 1 ? Math.max(1, side * 0.05) : 0;
  const pad = side * 0.1;
  const w = n ? Math.min(side * 0.25, (side - 2 * pad - gap * (n - 1)) / n) : 0;
  const left = g.c - (n * w + (n - 1) * gap) / 2;
  const l = Math.max(0, Math.min(1, level));
  return {
    x,
    top,
    width: side,
    height: side,
    bars: Array.from({ length: n }, (_, i) => ({ x: left + i * (w + gap), width: w, level: l })),
    yOf: (v: number) => top + side * (1 - v),
  };
}
