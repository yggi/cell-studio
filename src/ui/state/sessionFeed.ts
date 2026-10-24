import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan, type Plan } from '@yggi/cells/engine/realize';
import { tapeSpeeds } from '@yggi/cells/engine/schedule';
import { ticksBetween } from '@yggi/cells/engine/midiclock';
import { compilePiece } from '../../compile';
import { barSeconds } from '../../session/follow';
import type { Lack, Place } from '../../session/sound';
import type { Fed, Feed } from '../../audio/player';
import type { SessionClient } from './session.svelte';

/** How many texts are kept compiled: a section's and the next few. */
const KEPT = 8;
/** How many of the latest lacks are kept, for measuring. */
const LACKS_KEPT = 32;

/**
 * A followed session's song as the player's feed (#478, rung 3): each stretch the session says to play
 * (`SessionClient.sounding`), from its text's plan, placed on the page's clock. Each text is compiled once, as the app
 * compiles a piece (`compilePiece`), and played as written: its own voices, with no performer's feel yet. It counts
 * what it played and keeps what it couldn't (`lacked`), for measuring.
 */
export class SessionFeed implements Feed {
  /** The notes laid so far, and the latest of what couldn't be played. */
  played = 0;
  lacked: Lack[] = [];
  /** Where the last ask got to (null: start where the song is heard). */
  #done: Place | null = null;
  #texts = new Map<string, { plan: Plan | null; bar: number | null }>();

  constructor(readonly session: Pick<SessionClient, 'sounding'>) {}

  next(now: number, horizon: number): Fed[] {
    const s = this.session.sounding(this.#done, horizon - now, now, (t) => this.#compiled(t.text).bar);
    if (!s) {
      this.#done = null;
      return [];
    }
    this.#done = s.done;
    if (s.lacked.length) this.lacked = [...this.lacked, ...s.lacked].slice(-LACKS_KEPT);
    return s.slices.map((x) => {
      // (a slice's text has a bar, so it compiled)
      const p = this.#compiled(x.text.text).plan!;
      // (the window's own ends, as asked: one stretch's end is the next one's start, bit for bit)
      const window = { from: x.from, to: x.to, events: eventsBetween(p, x.from, x.to, true), tapes: tapeSpeeds(p, x.from, x.to + 1e-9), clock: ticksBetween(p, x.from, x.to) };
      this.played += window.events.length;
      return { plan: p, window, time: x.at - s.shift, scale: x.scale };
    });
  }

  #compiled(text: string): { plan: Plan | null; bar: number | null } {
    let c = this.#texts.get(text);
    if (c) return c;
    const result = compilePiece(text);
    c = result.ok ? { plan: plan(result, codeShifts(result), result.off), bar: barSeconds(result) } : { plan: null, bar: null };
    this.#texts.set(text, c);
    if (this.#texts.size > KEPT) this.#texts.delete(this.#texts.keys().next().value!);
    return c;
  }
}
