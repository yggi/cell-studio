/** A step's level, x%n (braid.ts, and a drum's in a groove's chord: mix.ts). */
import type { LineScanner } from './scanner';

/** x%n's level: a whole number is a percent, a number with a point a fraction (%50 = %.5, %150 = %1.5). */
export function parseLevel(s: LineScanner): number {
  const at = s.i;
  const n = s.match(/[0-9]*\.[0-9]+|[0-9]+/y);
  if (n === null) return s.fail('A level after %: a percent (%50) or a fraction (%.5)', at, 1);
  return n.includes('.') ? parseFloat(n) : parseInt(n, 10) / 100;
}
