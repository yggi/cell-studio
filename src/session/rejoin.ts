/**
 * When a client whose link dropped tries again, and when it stops (#482): venue Wi-Fi drops links, and a drop is no
 * leaving. A client that was seated tries to come back with the welcome's `resume` token, which a host honours for the
 * contract's `resumeSeconds` (300): back within them it is seated as the same player; later, as a new one.
 *
 * It tries quickly at first and steadily after (Jambot's delays, `packages/session/src/reconnect.ts`), for
 * `REJOIN.window` seconds of trying: twice `resumeSeconds`, so a link down past the seat's keeping still comes back,
 * as a new player. A lobby that answers and refuses (no such session, its host away, full) is no outage of the link:
 * refused on every try for `REJOIN.refusedFor` seconds, the session is taken for ended. What ends a session at once
 * (the host closing it, or refusing the join) never reaches this policy. Pure: the caller keeps the timers.
 */

import { LIMITS } from './protocol';

export const REJOIN = {
  /** Seconds before the first, second, … try after the link dropped or a try failed; the last repeats. */
  delays: [0.25, 0.5, 1, 2, 4],
  /** How long, in seconds, one outage is tried for: twice the contract's `resumeSeconds` (300). */
  window: 2 * LIMITS.resumeSeconds,
  /**
   * How long, in seconds, a lobby may refuse every try before the session is taken for ended: the lobby holds a
   * session whose host's link dropped for `lobbyGraceSeconds` (30), refusing joins meanwhile, and a Jambot host
   * reloaded takes its session up again, its seats kept (its snapshot); 90 s is that grace and a minute for a person
   * to reload the host.
   */
  refusedFor: LIMITS.lobbyGraceSeconds + 60,
} as const;

/** One outage: when it began, how many tries failed, and since when every try was refused by the lobby (null: the last wasn't). */
export interface Outage {
  readonly since: number;
  readonly tries: number;
  readonly refusedSince: number | null;
}

export type Retry = { readonly wait: number } | { readonly giveUp: string };

/** The link dropped at `now` (seconds). */
export const outage = (now: number): Outage => ({ since: now, tries: 0, refusedSince: null });

/** A try failed at `now`: refused by a lobby that answered (`refused`), or the link not made or no welcome. */
export const failed = (o: Outage, now: number, refused: boolean): Outage => ({
  since: o.since,
  tries: o.tries + 1,
  refusedSince: refused ? (o.refusedSince ?? now) : null,
});

/** What to do at `now`: wait so many seconds, then try; or stop, and why. */
export function retry(o: Outage, now: number): Retry {
  if (o.refusedSince !== null && now - o.refusedSince >= REJOIN.refusedFor) return { giveUp: 'The session ended while the link was down.' };
  if (now - o.since >= REJOIN.window) return { giveUp: `The link stayed down for ${Math.round(REJOIN.window / 60)} minutes.` };
  const delay = REJOIN.delays[Math.min(o.tries, REJOIN.delays.length - 1)]!;
  // (the last try falls on the window's end, not after it)
  return { wait: Math.max(0, Math.min(delay, REJOIN.window - (now - o.since))) };
}
