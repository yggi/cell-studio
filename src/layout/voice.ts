/**
 * A voice's wheel, one shape (docs/ui/graph.md): its waveform's disc on top, its envelope in a band under it (its own,
 * written in place or named; none written: a square one, on at once and off at once), the two one smooth outline, the
 * convex hull of the disc and the band (round on top, flat underneath), and its other modifiers written in place
 * (`pitch=&(…)`, `lpf=… * &(…)`) as chips fused on its upper shoulders. Its sound leaves from the top of the disc; what
 * plays it comes in from below, into its envelope; what else feeds it (a filter's cell, a pitch, FM) from the side.
 */
import type { CompileResult } from '@yggi/cells/engine/program';

/** A voice's disc, px across (size= scales it). */
export const VOICE_SIZE = 160;

/** The envelope's band, as parts of the disc's size: its top and bottom below the disc's centre, its width. */
const BAND_TOP = 0.38;
const BAND_BOTTOM = 0.8;
const BAND_WIDTH = 0.88;
/** The band's corners' radius, as a part of the disc's size. */
const CORNER = 0.09;

/** A voice's envelope band, its disc `size` px across: its width, its top and bottom below the disc's centre (px). */
export function envelopeBox(size: number): { width: number; height: number; top: number; bottom: number } {
  return { width: size * BAND_WIDTH, height: size * (BAND_BOTTOM - BAND_TOP), top: size * BAND_TOP, bottom: size * BAND_BOTTOM };
}

/** How far above a voice's centre its sound leaves: the top of its disc (px). */
export const socketOf = (size: number) => size / 2;

/** How far below a voice's centre its outline reaches: the envelope band's flat bottom (px). */
export const bottomOf = (size: number) => size * BAND_BOTTOM;

/** A wheel's name under it, as every node's: how far it reaches below what it names (px). */
export const NAME_PLATE = 30;

/** How far below a voice's centre its drawing reaches: its envelope band, then its name (px). */
export const bodyOf = (size: number) => bottomOf(size) + NAME_PLATE;

/**
 * A voice's outline as an SVG path, in its node's box (`size` px square, its centre the disc's): the disc's arc over the
 * top, straight down each side to the band's rounded corners, flat along the bottom — the hull of the disc and the band.
 */
export function voiceOutline(size: number): string {
  const c = size / 2;
  const R = c - 1;
  const r = size * CORNER;
  // (the right corner's centre, from the disc's)
  const a = (size * BAND_WIDTH) / 2 - r;
  const b = size * BAND_BOTTOM - r;
  // the outer tangent from the disc to the corner: its normal, turned off the line between their centres
  const n = Math.atan2(b, a) - Math.acos((R - r) / Math.hypot(a, b));
  const [cos, sin] = [Math.cos(n), Math.sin(n)];
  const f = (v: number) => v.toFixed(2);
  const pt = (x: number, y: number) => `${f(c + x)} ${f(c + y)}`;
  // (over the top, from the left tangent round to the right one: more than half the disc when it meets below its middle)
  const large = n > 0 ? 1 : 0;
  return [
    `M ${pt(-R * cos, R * sin)}`,
    `A ${f(R)} ${f(R)} 0 ${large} 1 ${pt(R * cos, R * sin)}`,
    `L ${pt(a + r * cos, b + r * sin)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${pt(a, b + r)}`,
    `L ${pt(-a, b + r)}`,
    `A ${f(r)} ${f(r)} 0 0 1 ${pt(-a - r * cos, b + r * sin)}`,
    'Z',
  ].join(' ');
}

/** Where a voice's modifier chips sit (turns from 12 o'clock, clockwise), on its upper shoulders either side of its socket. */
const CHIP_TURNS = [0.12, 0.88, 0.2, 0.8];

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

/**
 * A wire into a voice's side (PulseEdge draws it, the layout counts it): its last control point's distance out from
 * where it meets the flank (px), `across` the distance it comes across.
 */
export const sideTurn = (across: number) => Math.max(30, 0.6 * Math.abs(across));

/** The ports that play a voice or shape its notes, which come in from below, into its envelope; any other feeds it from the side. */
const FROM_BELOW = new Set(['voice', 'is', 'env', 'midi', 'mix', 'braid', 'step', 'about', 'base']);

/** Whether a wire into a voice comes in from the side (a filter's cell, a pitch, FM …) rather than from below. */
export const entersFromSide = (e: { readonly port: string; readonly notes?: string }) => !e.notes && !FROM_BELOW.has(e.port);
