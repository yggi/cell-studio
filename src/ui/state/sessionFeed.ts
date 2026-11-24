import { codeShifts, type CompileResult, eventsBetween, perform, plan, type Plan, type Played, readerOf, tapeSpeeds } from '@yggi/cells';
import { channelTable, router, type Routes, ticksBetween } from '@yggi/cells/midi';
import { compilePiece } from '../../compile';
import { barSeconds, type Stating } from '../../session/follow';
import { isReadScore } from '../../session/follow-v2';
import { PlayedLog, type PlayedEvent } from '../../session/played';
import type { Lack, Place } from '../../session/sound';
import type { Fed, Feed } from '../../audio/player';
import type { SessionClient } from './session.svelte';

/** How many texts are kept compiled: a section's and the next few. */
const KEPT = 8;
/** How many of the latest lacks are kept, for measuring. */
const LACKS_KEPT = 32;

/** A text compiled: its plan, a bar of its own time (seconds), where MIDI out sends each of its events, and which part each is (its performer's role, #511). */
interface Compiled {
  readonly plan: Plan | null;
  readonly bar: number | null;
  readonly route: ((e: Played) => Routes) | null;
  readonly read: ReturnType<typeof readerOf> | null;
}

/**
 * A followed session's song as the player's feed (#478, rung 3): each stretch the session says to play
 * (`SessionClient.sounding`), from its text's plan, placed on the page's clock. Each text is compiled once, as the app
 * compiles a piece (`compilePiece`), or a version 2 score as it was read with the session's fragments (`follow-v2.ts`,
 * #525), its own voices sounding it, each event as the host's performers play it (cells'
 * default performer, `perform`, #492, #536): its velocity and length with the feel of its bar. It counts what it played,
 * logs each event as played (`log`, as Jambot's `played()` does), and keeps what it couldn't (`lacked`, and how many
 * bars were lacked and how many silent, no text stating them), for measuring.
 */
export class SessionFeed implements Feed {
  /** The notes laid so far, those of them the feel didn't read (none of its parts, or a bar with no frame), and the latest of what couldn't be played. */
  played = 0;
  unread = 0;
  lacked: Lack[] = [];
  /** How many bars were said not to play: lacked, and silent (no text stated them), since the feed began. */
  lacks = 0;
  silent = 0;
  /** Each event played, as the performers play it, on the host's clock. */
  readonly log = new PlayedLog();
  /** Where the last ask got to (null: start where the song is heard). */
  #done: Place | null = null;
  #texts = new Map<string, Compiled>();
  /** The text of the last bar started: a bar whose text is another starts a switch. */
  #lastText: Stating | null = null;

  constructor(readonly session: Pick<SessionClient, 'sounding'>) {}

  next(now: number, horizon: number, beyond = horizon): Fed[] {
    const s = this.session.sounding(this.#done, horizon - now, now, (t) => this.#compiled(t).bar, beyond - now);
    if (!s) {
      this.#done = null;
      return [];
    }
    this.#done = s.done;
    if (s.lacked.length) this.lacked = [...this.lacked, ...s.lacked].slice(-LACKS_KEPT);
    for (const l of s.lacked)
      if (l.silent) this.silent++;
      else this.lacks++;
    return s.slices.map((x) => {
      // (a slice's text has a bar, so it compiled)
      const c = this.#compiled(x.text);
      const p = c.plan!;
      const seconds = c.bar!;
      const at = x.frame && { bar: x.bar, frame: x.frame, start: (x.bar - x.text.bar) * seconds, seconds };
      const log: PlayedEvent[] = [];
      const events = eventsBetween(p, x.from, x.to, true).map((e) => {
        const { event, performance } = at ? perform(e, c.route!, at, c.read!) : { event: e, performance: null };
        if (performance) log.push({ ...performance, seconds: x.at + (e.at - x.from) * x.scale, duration: event.dur * x.scale });
        else this.unread++;
        return event;
      });
      // (the window's own ends, as asked: one stretch's end is the next one's start, bit for bit)
      const window = { from: x.from, to: x.to, events, tapes: tapeSpeeds(p, x.from, x.to + 1e-9), clock: ticksBetween(p, x.from, x.to) };
      this.played += events.length;
      this.log.push(log);
      // (a window from its bar's first moment starts it)
      const begins = Math.abs(x.from - (x.bar - x.text.bar) * seconds) < 1e-9;
      const switched = begins && this.#lastText !== null && x.text !== this.#lastText;
      if (begins) this.#lastText = x.text;
      return { plan: p, window, time: x.at - s.shift, scale: x.scale, ...(begins ? { starts: { bar: x.bar, switched } } : {}) };
    });
  }

  /** A text compiled, once: a version 2 score as read (with the fragments it locks), any other as a piece. */
  #compiled(t: Stating): Compiled {
    const { text } = t;
    let c = this.#texts.get(text);
    if (c) return c;
    const result: CompileResult | null = isReadScore(t) ? t.result : compilePiece(text);
    if (!result) return { plan: null, bar: null, route: null, read: null };
    c = result.ok
      ? { plan: plan(result, codeShifts(result), result.off), bar: barSeconds(result), route: router(result, channelTable(result)), read: readerOf(result) }
      : { plan: null, bar: null, route: null, read: null };
    this.#texts.set(text, c);
    if (this.#texts.size > KEPT) this.#texts.delete(this.#texts.keys().next().value!);
    return c;
  }
}
