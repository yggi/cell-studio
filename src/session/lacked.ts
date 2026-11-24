/**
 * The bars a follower didn't play, said to its host (#698: session version 2, minor 2): `{ kind: 'lacked', bar, why,
 * text }`, one per bar however often the follower lacks it, so a host counts each miss once by client and a soak's bound
 * (0) reads that count. A host of minor 1 ignores the kind; one of version 1 has none, so only a host of version 2 is sent it.
 *
 * Two bounds, chosen here (the issue leaves them to the pull request):
 * - at most `PER_SECOND` (8) messages a second, the rest queued: a rejoin or a long silent stretch can lack many bars at
 *   once, and a host's reader of a client shouldn't be flooded by one (a bar takes seconds, so 8 a second is far above
 *   the steady rate of one);
 * - a queued bar more than `BACK` (16) bars behind the newest one lacked is dropped unsent: a late join reports the last
 *   sixteen bars it missed, no more (a soak's bound is a count over the playing song, not the history before the join).
 */
import type { Lack } from './sound';
import type { ClientMessage } from './protocol';

export const PER_SECOND = 8;
export const BACK = 16;
/** How many bars said are remembered, so that one lacked again isn't said again. */
const REMEMBERED = 512;

export class Lacked {
  readonly #said = new Set<number>();
  #queue: Lack[] = [];
  #newest = -Infinity;
  /** When (seconds) each message sent in the last second was. */
  #sent: number[] = [];

  /** Queue what a feed lacked: a bar not said before, or queued. */
  add(lacks: readonly Lack[]): void {
    for (const l of lacks) {
      if (this.#said.has(l.bar)) continue;
      this.#said.add(l.bar);
      this.#queue.push(l);
      this.#newest = Math.max(this.#newest, l.bar);
    }
    // (the oldest are forgotten: a set keeps its insertion order)
    for (const bar of this.#said) {
      if (this.#said.size <= REMEMBERED) break;
      this.#said.delete(bar);
    }
  }

  /** What to send at `now` (seconds): the queued bars, within the bounds, oldest first. */
  take(now: number): ClientMessage[] {
    this.#queue = this.#queue.filter((l) => l.bar >= this.#newest - BACK);
    this.#sent = this.#sent.filter((t) => t > now - 1);
    const room = Math.max(0, PER_SECOND - this.#sent.length);
    const out = this.#queue.splice(0, room);
    for (let i = 0; i < out.length; i++) this.#sent.push(now);
    return out.map((l) => ({ kind: 'lacked', bar: l.bar, why: l.kind, text: `bar ${l.bar}: ${l.why}` }));
  }

  /** Whether something waits for the rate to allow it. */
  get waiting(): boolean {
    return this.#queue.length > 0;
  }
}
