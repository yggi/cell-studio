/**
 * How the audio context is tuned: the latency hint (how big a buffer the browser asks the device for: bigger
 * is safer against underruns and costs latency) and Tone's look-ahead (how far ahead of the audio clock notes are
 * scheduled: the margin the page has before a note is late). The defaults are the safe ones; for finding out how
 * far they can go on a real device they can be set from the address — `?latency=interactive`, `?latency=0.05`,
 * `?lookahead=0.1` — and are kept until `?latency=off` / `?lookahead=off` (see docs/ui/performance.md).
 */

export type LatencyHint = 'interactive' | 'balanced' | 'playback' | number;

export interface Tuning {
  latencyHint: LatencyHint;
  /** Seconds; null: the player's own (0.3, or 0.12 for a piece with hands). */
  lookAhead: number | null;
}

/**
 * `balanced` (about 55 ms from made to heard on a phone that gave 280 ms with `playback`): measured on an Android phone
 * with the full latency test (docs/ui/performance.md) with no late or left-out notes on the heaviest pieces. `interactive`
 * (25 ms) held too, with a smaller margin; `playback` is the old default, for a device that struggles.
 */
export const DEFAULT_TUNING: Tuning = { latencyHint: 'balanced', lookAhead: null };

const HINTS = ['interactive', 'balanced', 'playback'] as const;

export function parseLatency(v: string | null | undefined): LatencyHint | null {
  if (!v) return null;
  if ((HINTS as readonly string[]).includes(v)) return v as LatencyHint;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : null;
}

export function parseLookAhead(v: string | null | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0.01 && n <= 1 ? n : null;
}

/**
 * The tuning from the address and what was kept: an address value wins and is kept; `off` forgets it. Returns the
 * tuning, and what to keep (null: forget) for each.
 */
export function resolveTuning(
  search: string,
  kept: { latency: string | null; lookahead: string | null },
): { tuning: Tuning; keep: { latency: string | null; lookahead: string | null } } {
  const q = new URLSearchParams(search);
  const pick = (name: 'latency' | 'lookahead', parse: (v: string) => unknown, stored: string | null) => {
    const given = q.get(name);
    if (given === 'off') return null;
    if (given !== null && parse(given) !== null) return given;
    return stored !== null && parse(stored) !== null ? stored : null;
  };
  const latency = pick('latency', parseLatency, kept.latency);
  const lookahead = pick('lookahead', parseLookAhead, kept.lookahead);
  return {
    tuning: { latencyHint: parseLatency(latency) ?? DEFAULT_TUNING.latencyHint, lookAhead: parseLookAhead(lookahead) },
    keep: { latency, lookahead },
  };
}
