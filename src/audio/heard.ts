/**
 * What is on the screen should be what is heard (#67). The audio clock says when a sample is *made*; the speaker
 * plays it later (the output latency: 24–56 ms on a phone with a small buffer, 280 ms with a large one). The
 * pictures are drawn from the position of what is heard now: the made position, held back by this lag.
 */

/** The longest lag taken to be real (a reading beyond it is a glitch). */
export const MAX_LAG = 0.6;
/** A change bigger than this is a different device (headphones plugged in), not jitter: take it at once. */
const JUMP = 0.1;

/**
 * The lag to hold the pictures back by, in seconds. `reading` is what the output timestamp says now (it jitters by a
 * few ms, so it is smoothed into `prev`), `fallback` the browser's own output latency for a browser without a timestamp.
 */
export function heardLag(prev: number | null, reading: number | null, fallback: number | null): number {
  const raw = reading ?? prev ?? fallback ?? 0;
  const next = Math.min(MAX_LAG, Math.max(0, raw));
  if (prev === null || Math.abs(next - prev) > JUMP) return next;
  return prev + 0.2 * (next - prev);
}
