/**
 * Dial maths for hand-turned wheels. N segments; segment p is centred at
 * p/N turns. The ring is rotated so the selected segment sits under the
 * pointer at 12 o'clock. Rotations are in degrees, angles in turns.
 */
import { mod } from '../theory/modes';

/** Ring rotation (degrees) that puts segment p at the top. */
export const rotationFor = (p: number, n: number) => (-p / n) * 360;

/** The equivalent of rotationFor(p) closest to `current`, so snapping never spins the long way. */
export function nearestRotation(current: number, p: number, n: number): number {
  const base = rotationFor(p, n);
  return base + 360 * Math.round((current - base) / 360);
}

/** Which segment is at the top for a given ring rotation. */
export const segmentAtTop = (rotation: number, n: number) => mod(Math.round((-rotation / 360) * n), n);

/** Which segment is under a pointer at screen angle `turn` (0 = top, clockwise). */
export const segmentAt = (turn: number, rotation: number, n: number) => mod(Math.round((turn - rotation / 360) * n), n);

/** Screen angle in turns of point (x, y) around centre (cx, cy). */
export function angleOf(x: number, y: number, cx: number, cy: number): number {
  return mod(Math.atan2(x - cx, -(y - cy)) / (Math.PI * 2), 1);
}

/** Signed shortest difference b − a between two angles in turns, in (−0.5, 0.5]. */
export function turnDelta(a: number, b: number): number {
  const d = mod(b - a, 1);
  return d > 0.5 ? d - 1 : d;
}
