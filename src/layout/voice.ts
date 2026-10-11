/**
 * A voice's wheel, one shape (docs/ui/graph.md): its waveform's disc, its envelope a cap fused on its top (its own,
 * written in place or named; none written: a square one, on at once and off at once), and its other modifiers written in
 * place (`pitch=&(…)`, `lpf=… * &(…)`) as chips fused on its lower rim. Its sound leaves from the top of the cap.
 */
import type { CompileResult } from '../engine/program';

/** A voice's disc, px across (size= scales it). */
export const VOICE_SIZE = 160;

/** The cap's height and how far it reaches into the disc, as parts of the disc's size. */
const CAP = 0.42;
const OVERLAP = 0.12;

/** A voice's envelope cap, its disc `size` px across: as wide as the disc, its top and bottom above the disc's centre (px). */
export function envelopeBox(size: number): { width: number; height: number; top: number; bottom: number } {
  const height = size * CAP;
  const bottom = size / 2 - size * OVERLAP;
  return { width: size * 0.92, height, top: bottom + height, bottom };
}

/** How far above a voice's centre its sound leaves: the top of its envelope's cap (px). */
export const socketOf = (size: number) => envelopeBox(size).top;

/** Where a voice's modifier chips sit (turns from 12 o'clock, clockwise), on its lower rim either side of its name. */
const CHIP_TURNS = [0.36, 0.64, 0.29, 0.71];

/** A voice's modifier chips, its disc `size` px across: each one's centre from the disc's and its radius (px). */
export function chipPlaces(size: number, n: number): { x: number; y: number; r: number }[] {
  const r = size * 0.15;
  const d = size / 2 + r * 0.25;
  return CHIP_TURNS.slice(0, n).map((t) => ({ x: Math.sin(t * 2 * Math.PI) * d, y: -Math.cos(t * 2 * Math.PI) * d, r }));
}

/** The unnamed cells written on a voice's line other than its envelope (its modifiers: pitch=, lpf= … shapes), in order. */
export function modifiersOf(program: CompileResult, voice: string): string[] {
  const v = program.cells.get(voice);
  if (!v) return [];
  return [...program.cells.values()].filter((c) => c.lambda && c.name !== v.env && new RegExp(`^λ${v.span.line}_`).test(c.name)).map((c) => c.name);
}
