/**
 * A followed song sounded (#478, rung 3): what to play over a stretch of the host's clock. Each bar is played from the
 * text that states it (`follow.ts` `textOf`), the text's own time stretched onto the bar as the host lays it: bar `n`,
 * from its start to the next bar's, is the text's bar `n − text.bar`. So a section's text gives way to the next at a
 * bar's first moment.
 *
 * Where it has got to is kept in the bars' own time (`Place`: a bar and the share of it played), not on the host's
 * clock: each ask plays a bar's text from that share on, half open, so every onset is played once, none doubled or lost
 * at a switch, however the asks fall and whatever the host's clock does meanwhile. A host sends a bar's start only a
 * beat before it (session contract: it composes bar k + 2 on bar k + 1's last beat), so a bar's end is often not known
 * while the bar is played: it is taken to go on as the bars before it went (their glide), until the next bar's start says.
 *
 * What can't be played is said (`Lack`): a bar its text leaves unstated, a text that doesn't compile, a bar no text
 * stated (silent), a bar the host passed without laying, a bar the song knows not to play from its text (`lacks`:
 * version 2's digest check and locked fragments), a bar a version 2 host never told the start of (its conduct), and a
 * stretch the asker came to too late (a page that slept).
 *
 * The texts are either version's (`Stating`): a section text of version 1, a score of version 2.
 */
import type { FeelFrame } from '@yggi/cells';
import type { Followed, Stating } from './follow';
import { textOf } from './follow';
import type { LackedWhy, SectionText } from './protocol';

/** Where playing has got to: a bar of the song, and the share of it played (0 to 1). */
export interface Place {
  readonly bar: number;
  readonly into: number;
}

/** A stretch of a text's own time to play (seconds, half open), and where it falls on the host's clock. */
export interface Slice<T extends Stating = SectionText> {
  readonly text: T;
  /** The song's bar it is part of, and that bar's frame as the performers read it (null where its message gave none). */
  readonly bar: number;
  readonly frame: FeelFrame | null;
  /** The text's own time, from `from` to just before `to`, in seconds. */
  readonly from: number;
  readonly to: number;
  /** Where `from` falls on the host's clock (seconds), and how many of the host's seconds a second of the text takes. */
  readonly at: number;
  readonly scale: number;
}

/**
 * Something not played: a bar, and why in words (a stretch passed late is said of each bar it touches); `kind` is the
 * contract's reason for the host (version 2, minor 2): `silent` where no text states the bar, however it came to that
 * (never stated, passed without laying, a start never told, a text that is empty or doesn't compile), `digest`, `lock`
 * and `late`.
 */
export interface Lack {
  readonly bar: number;
  readonly why: string;
  readonly kind: LackedWhy;
}

export interface Sounding<T extends Stating = SectionText> {
  readonly slices: readonly Slice<T>[];
  /** Where the next ask begins: null to begin where the song is heard then. */
  readonly done: Place | null;
  readonly lacked: readonly Lack[];
}

/** How far behind now an ask may begin, in seconds, before what it passes is said to be late (the clock's jitter). */
const LATE = 0.005;

/**
 * What to play from `done` (null: from `now`) to `horizon` on the host's clock, at `now` on it: `length` gives a bar of
 * a text's own time in seconds (null for a text with none: not compiled, or no meter). On to `beyond`, past `horizon`,
 * through the bars the host has told (their starts and frames sent), and no further: a section's switch laid ahead of
 * the work that holds the page (#513).
 */
export function soundingOf<T extends Stating>(f: Followed<T>, done: Place | null, horizon: number, now: number, length: (text: T) => number | null, beyond = horizon): Sounding<T> {
  const slices: Slice<T>[] = [];
  const lacked: Lack[] = [];
  const known = [...f.starts.keys()].sort((a, b) => a - b);
  const last = known.at(-1);
  /** Whether the host passed a bar without laying it: a later bar's start is known, its isn't. */
  const passed = (n: number) => !f.starts.has(n) && last !== undefined && n < last;
  /** Where a bar starts on the host's clock: as sent, or where the bar before it ends. */
  const startOf = (n: number, depth = 0): number | null => {
    const s = f.starts.get(n);
    if (s !== undefined) return s;
    if (depth > 1 || passed(n)) return null;
    const before = startOf(n - 1, depth + 1);
    const l = before === null ? null : lengthOf(n - 1, before);
    return before === null || l === null ? null : before + l;
  };
  /**
   * How long a bar starting at `s` lasts: to the next bar's start; else as the bars before it go, the change from the
   * one before that carried on (a glide), or as long as the one before it; else its text's own bar.
   */
  const lengthOf = (n: number, s: number): number | null => {
    const next = f.starts.get(n + 1);
    if (next !== undefined && next > s) return next - s;
    const before = f.starts.get(n - 1);
    if (before !== undefined && s > before) {
      const earlier = f.starts.get(n - 2);
      const glide = earlier !== undefined && before > earlier ? 2 * (s - before) - (before - earlier) : 0;
      return glide > 0 ? glide : s - before;
    }
    const text = textOf(f.texts, n);
    return text ? length(text) : null;
  };
  /** The place heard at `at`: the last bar known to start by then, and how far into it. */
  const placeAt = (at: number): Place | null => {
    let n: number | null = null;
    for (const b of known) if (f.starts.get(b)! <= at) n = b;
    // (before the song's first bar, or past every bar known: on from the next one known, or nowhere yet)
    if (n === null) return known[0] !== undefined ? { bar: known[0], into: 0 } : null;
    for (let m = n; m <= n + 2; m++) {
      const s = startOf(m);
      const l = s === null ? null : lengthOf(m, s);
      if (s === null || l === null) return null;
      if (at < s + l) return { bar: m, into: Math.max(0, (at - s) / l) };
    }
    return null;
  };

  let place = done ?? placeAt(now);
  const over = (p: Place) => f.finale !== null && p.bar > f.finale;
  if (place && !over(place)) {
    const s = startOf(place.bar);
    const l = s === null ? null : lengthOf(place.bar, s);
    const at = s === null || l === null ? null : s + place.into * l;
    if (at !== null && at < now - LATE) {
      const why = `late by ${Math.round((now - at) * 1000)} ms`;
      const to = placeAt(now);
      // (a bar whose start wasn't told was waited on, not come to late: the loop says so of it)
      for (let bar = place.bar; bar <= (to?.bar ?? place.bar); bar++) if (!f.told || f.starts.has(bar)) lacked.push({ bar, why, kind: 'late' });
      place = to;
    }
  }
  while (place) {
    const { bar } = place;
    if (over(place)) break;
    if (passed(bar)) {
      lacked.push({ bar, why: 'the host passed it without laying it', kind: 'silent' });
      place = { bar: bar + 1, into: 0 };
      continue;
    }
    const s = startOf(bar);
    const l = s === null ? null : lengthOf(bar, s);
    if (s === null || l === null || !(l > 0)) break;
    const at = s + place.into * l;
    const until = f.starts.has(bar) ? Math.max(horizon, beyond) : horizon;
    if (at >= until) break;
    const text = textOf(f.texts, bar);
    // (a bar whose start was only guessed waits for its own where the song says so; begun without it, it is lacked)
    const untold = f.told && !f.starts.has(bar);
    const known = untold ? null : (f.lacks?.get(bar) ?? null);
    const seconds = text && text.unstated === null && text.text && !untold && known === null ? length(text) : null;
    if (!text || seconds === null || !(seconds > 0)) {
      // (a text, or a bar's start, may yet come for a bar not begun: it waits for one)
      if ((!text || untold) && now < s) break;
      lacked.push(
        !text
          ? { bar, why: 'no text stated it', kind: 'silent' }
          : untold
            ? { bar, why: 'the host never told where it starts', kind: 'silent' }
            : known
              ? { bar, why: known.text, kind: known.kind }
              : { bar, why: text.unstated ?? (text.text ? 'its text has no bar to play (it does not compile, or has no meter)' : 'its text is empty'), kind: 'silent' },
      );
      place = { bar: bar + 1, into: 0 };
      continue;
    }
    const into = Math.min(1, (until - s) / l);
    const k = (bar - text.bar) * seconds;
    slices.push({ text, bar, frame: f.frames.get(bar) ?? null, from: k + place.into * seconds, to: k + into * seconds, at, scale: l / seconds });
    place = into < 1 ? { bar, into } : { bar: bar + 1, into: 0 };
  }
  return { slices, done: place, lacked };
}

/** `soundingOf` a song of version 1's section texts: its type named, so a caller's loop over asks needs none. */
export const sounding = (f: Followed, done: Place | null, horizon: number, now: number, length: (text: SectionText) => number | null, beyond = horizon): Sounding =>
  soundingOf(f, done, horizon, now, length, beyond);
