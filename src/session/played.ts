/**
 * What a followed session's feed played, event by event (#492), as Jambot's log keeps a page's (`PlayedLog`,
 * `apps/web/src/played.ts`, given by `window.jambot.played()`): so a probe sets a client's events against its host's.
 * Kept here the latest `PLAYED_KEPT`, each numbered from the first, so a reader that comes back takes only the new.
 */
import type { Performance } from './perform';

/** An event as the feed played it: as the performers play it, and its onset and sounding length on the host's clock (seconds). */
export interface PlayedEvent extends Performance {
  readonly seconds: number;
  readonly duration: number;
}

/** How many events are kept, the latest: Jambot's number, some 15 minutes of its band at full energy. */
export const PLAYED_KEPT = 20_000;

export class PlayedLog {
  #kept: PlayedEvent[] = [];
  #count = 0;

  constructor(readonly keep = PLAYED_KEPT) {}

  push(events: readonly PlayedEvent[]): void {
    this.#kept.push(...events);
    this.#count += events.length;
    if (this.#kept.length > this.keep) this.#kept.splice(0, this.#kept.length - this.keep);
  }

  /** Every event kept numbered `from` on, and the number of the next to come. */
  since(from = 0): { readonly events: PlayedEvent[]; readonly next: number } {
    const first = this.#count - this.#kept.length;
    return { events: this.#kept.slice(Math.max(0, from - first)), next: this.#count };
  }
}
