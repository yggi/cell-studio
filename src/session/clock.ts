/**
 * The host's clock, as a client reads it from pings (Cristian's method): a ping stamped with this page's clock, the
 * pong with the host's, says the offset between the two page clocks lies within half its round trip of
 * `host − (sent + received) / 2`. Of the latest pings the one with the shortest round trip is trusted (the latest of
 * equals), and its half round trip is the offset's bound: the session's clock offset, as #478 measures by it.
 *
 * A host's times (a song's start, where a bar starts) are on its output's clock, the moment heard; each pong says that
 * clock less the host's page clock (`heard`). So the host's heard moment, on this page's clock `now`, is
 * `now + offset + heard`: what a client that listens follows (it plays nothing, so its own output doesn't enter).
 * Delay that is always longer one way than the other can't be seen from either end: the offset is then off by half the
 * difference, within the bound.
 */

/** How many of the latest pings the clock is read from. */
export const WINDOW = 16;
/** How many pings it takes before the clock is trusted. */
export const READY = 4;

/** One ping answered, on the two page clocks, in seconds; `heard` the host's output's offset from its page clock. */
export interface Ping {
  readonly sent: number;
  readonly received: number;
  readonly host: number;
  readonly heard: number | null;
}

interface Sample {
  readonly offset: number;
  readonly bound: number;
}

export interface HostClock {
  /** The latest pings' samples, the oldest first. */
  readonly samples: readonly Sample[];
  /** The host's output's offset from its page clock, from the latest pong that had one. */
  readonly heard: number | null;
}

export const NO_CLOCK: HostClock = { samples: [], heard: null };

/** The clock with a ping more; one that came back before it was sent says nothing. */
export function withPing(clock: HostClock, { sent, received, host, heard }: Ping): HostClock {
  const heardNow = heard ?? clock.heard;
  if (!(received >= sent)) return { ...clock, heard: heardNow };
  const sample = { offset: host - (sent + received) / 2, bound: (received - sent) / 2 };
  return { samples: [...clock.samples, sample].slice(-WINDOW), heard: heardNow };
}

/** What the clock says: the host's page clock less this one's, and its bound, once enough pings came; else null. */
export function reading(clock: HostClock): { offset: number; bound: number } | null {
  if (clock.samples.length < READY) return null;
  const best = clock.samples.reduce((a, b) => (b.bound <= a.bound ? b : a));
  return { offset: best.offset, bound: best.bound };
}

/**
 * The host's heard moment, on its output's clock, at `now` on this page's clock (seconds), or null until the clock
 * is trusted. A host whose output isn't paired yet (`heard` null) is read on its page clock.
 */
export function hostHeardAt(clock: HostClock, now: number): number | null {
  const r = reading(clock);
  return r && now + r.offset + (clock.heard ?? 0);
}
