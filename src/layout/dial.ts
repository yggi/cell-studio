/**
 * Dial maths for hand-turned wheels. N segments; segment p is centred at
 * p/N turns. The ring is rotated so the selected segment sits under the
 * pointer at 12 o'clock. Rotations are in degrees, angles in turns.
 */
import { mod } from '@yggi/cells/theory/modes';

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

/** About how wide a character of the wheels' labels is, in em (bold UI figures and letters). */
const EM = 0.6;

/**
 * A label's font size on a wheel: as large as lets `chars` characters fit in `width` px, at most `max`;
 * null when that is under `min` (too small to read: leave it out — the wheel's name says it).
 */
export function fitFont(width: number, chars: number, max: number, min = 7): number | null {
  const fits = width / (Math.max(1, chars) * EM);
  const px = Math.min(max, fits);
  return px >= min ? Math.round(px * 10) / 10 : null;
}

/** The size a wheel's own text tops out at: as at 128 px (17 px), scaled with it, between 9 and 17. */
export const hubMax = (size: number, at128 = 17) => Math.max(9, Math.min(at128, (size * at128) / 128));
