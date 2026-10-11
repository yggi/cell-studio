/**
 * A gate (#234, the gate node; docs/language/mix.md: a gate), drawn as a level meter (ui/GateMeter.svelte): a bar for
 * each note its trigger sounds now, as tall as its velocity, under the gate's ceiling. Its receivers, the voices it
 * plays, are wheels of their own, their sound wired into it. Pure geometry.
 */
import type { CompileResult } from '../engine/program';
import { wheelGeometry } from './wheel';

/** A gate's trigger, its receivers (the voices in its braid, as read) and its gate= cell, or null: not a gate. */
export function gateOf(result: CompileResult, name: string): { trigger: string; receivers: readonly string[]; open: string | null } | null {
  const c = result.cells.get(name);
  const trigger = c?.params.trigger;
  if (!c || typeof trigger !== 'string') return null;
  const open = c.params.gate;
  return { trigger, receivers: (c.mix ?? []).map((b) => b.voice.name), open: typeof open === 'string' && result.cells.has(open) ? open : null };
}

/** A gate's meter, `size` px across: its well (a square inside the disc) and a bar per note, side by side. */
export interface GateBars {
  readonly x: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  /** How open the gate is now (gate=, 0 … 1): the bars' ceiling. */
  readonly ceiling: number;
  /** Each note's bar: where, how tall its velocity says, and how tall it is under the ceiling (0 … 1). */
  readonly bars: readonly { x: number; width: number; velocity: number; level: number }[];
  /** The y of a level (0 the well's floor, 1 its top). */
  readonly yOf: (v: number) => number;
}

/** Where a gate's bars go for `n` notes at once (a chord), at a velocity and a gate's openness (each 0 … 1). */
export function gateBars(size: number, n: number, velocity: number, open: number): GateBars {
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
  const v = Math.max(0, Math.min(1, velocity));
  const ceiling = Math.max(0, Math.min(1, open));
  return {
    x,
    top,
    width: side,
    height: side,
    ceiling,
    bars: Array.from({ length: n }, (_, i) => ({ x: left + i * (w + gap), width: w, velocity: v, level: Math.min(v, ceiling) })),
    yOf: (l: number) => top + side * (1 - l),
  };
}
