/**
 * What the MIDI light shows (#262): when a message last came in and when a note last went out, and how bright each
 * still is. Nothing here runs by itself: `hit` stamps the time and tells the light, which draws on the shared
 * ticker (`audio/ticker.ts`) only while a glow remains, so an idle connection costs no frames.
 */

/** How long a flash takes to fade out (ms). */
export const DECAY = 220;

export type Direction = 'in' | 'out';

/** A flash's brightness 0 … 1 at `now`, for a message at `last` (never, or not yet: 0; notes go out ahead of their sound). */
export const glow = (last: number, now: number): number => (now < last ? 0 : Math.max(0, 1 - (now - last) / DECAY));

export class Activity {
  // the moments (ms, `performance.now()`) of the messages not yet faded out, per direction: notes go out ahead of
  // their sound, so several are pending at once
  #times: Record<Direction, number[]> = { in: [], out: [] };
  /** Told on every hit (the light wakes its frame job). */
  onhit: (() => void) | null = null;

  /** A message at `at`: now, or, for a note sent ahead, the moment it sounds. */
  hit(direction: Direction, at: number = performance.now()): void {
    // (a NaN or infinite time would poison `level`: it counts as now)
    if (!Number.isFinite(at)) at = performance.now();
    const times = this.#times[direction];
    // (the ones that have faded out are let go as new ones come: the list is only what is on its way or still lit)
    const now = Math.min(at, performance.now());
    if (times.length && times[0]! + DECAY <= now) this.#times[direction] = times.filter((t) => t + DECAY > now);
    this.#times[direction].push(at);
    this.onhit?.();
  }

  /** Is a flash pending or still fading (the light's frame job runs while so)? */
  busy(now: number = performance.now()): boolean {
    return this.#times.in.some((t) => now < t + DECAY) || this.#times.out.some((t) => now < t + DECAY);
  }

  level(direction: Direction, now: number = performance.now()): number {
    let best = 0;
    for (const t of this.#times[direction]) best = Math.max(best, glow(t, now));
    return best;
  }
}
