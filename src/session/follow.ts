/**
 * Where a host's song stands, as a client that listens follows it (#478): the bars the host sent say where each
 * starts on its clock, the section texts say which text states each bar, and the two give, at any moment on the
 * host's clock, the bar heard, how far into it, the text that states it, and where that is in the text's own time.
 *
 * A text states bars `bar` … `bar + foreseen.length − 1`; a later one may state some of them again (a bar composed
 * otherwise than foreseen has its section written again from it), so the text of a bar is the one told last of those
 * that start at it or before. The text's time runs at its first bar's tempo (its frame's), so a bar of it is a fixed
 * length (`barSeconds`) where the host's may glide: the place in the text is bar for bar, the fraction kept.
 */
import { clocking, EPS } from '@yggi/cells/engine/clocking';
import { mainMeter } from '@yggi/cells/engine/midiclock';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { frameOf, type FeelFrame } from './feel';
import type { SectionText, SentBar } from './protocol';

/** What a client keeps of a song: where each bar laid starts on the host's clock, what the feel reads of it, and the texts told, in the order told. */
export interface Followed {
  readonly starts: ReadonlyMap<number, number>;
  /** Each bar's frame, as the performers read it (`feel.ts`): none for a bar whose message lacks what the feel reads. */
  readonly frames: ReadonlyMap<number, FeelFrame>;
  readonly texts: readonly SectionText[];
  /** The song's last bar, once the host composed its finale. */
  readonly finale: number | null;
}

export const NOTHING_FOLLOWED: Followed = { starts: new Map(), frames: new Map(), texts: [], finale: null };

/** The number of a bar the host sent, as it wrote it (`bar.bar`); null where it has none. */
const barNumber = (sent: SentBar): number | null => (Number.isInteger(sent.bar.bar) ? (sent.bar.bar as number) : null);

/** How many bars behind the one heard are kept: a text or a start older than that is dropped (a 10-minute session would otherwise keep every one). */
const KEPT_BEHIND = 16;

/** A song followed further: a bar sent (one passed without laying, `start` null, has no start to keep). */
export function withBar(f: Followed, sent: SentBar): Followed {
  const bar = barNumber(sent);
  if (bar === null || sent.start === null) return f;
  const frame = frameOf(sent);
  return { ...f, starts: new Map(f.starts).set(bar, sent.start), frames: frame ? new Map(f.frames).set(bar, frame) : f.frames };
}

/**
 * Whether what was followed of a song reaches a welcome's bars (a rejoin's, #482): it knows the start of the bar before
 * their first, the one playing as the welcome was sent, which the welcome no longer sends, so it carries on beneath them.
 */
export function reaches(f: Followed, bars: readonly SentBar[]): boolean {
  const numbers = bars.map(barNumber).filter((b) => b !== null);
  return numbers.length > 0 && f.starts.has(Math.min(...numbers) - 1);
}

/** A song followed further: a text told. */
export const withText = (f: Followed, text: SectionText): Followed => ({ ...f, texts: [...f.texts, text] });

/** The text that states a bar: the one told last of those that start at it or before and reach it; null where none does. */
export function textOf(texts: readonly SectionText[], bar: number): SectionText | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i]!;
    if (t.bar <= bar && bar < t.bar + Math.max(1, t.foreseen.length)) return t;
  }
  return null;
}

/** Where the song stands at a moment: the bar heard and how far into it (0 to 1), or before its first bar (`bar` the first, `into` 0). */
export interface Place {
  readonly bar: number;
  readonly into: number;
  /** Whether the first bar known hasn't started yet: the count-in, or a song joined before its bars came. */
  readonly before: boolean;
}

/** The bar heard at `at` on the host's clock, from the bars' starts; null before any bar is known. */
export function placeAt(starts: ReadonlyMap<number, number>, at: number): Place | null {
  if (!starts.size) return null;
  const bars = [...starts.keys()].sort((a, b) => a - b);
  const first = bars[0]!;
  if (at < starts.get(first)!) return { bar: first, into: 0, before: true };
  let bar = first;
  for (const b of bars) if (starts.get(b)! <= at) bar = b;
  const start = starts.get(bar)!;
  // (the next bar's start, sent a bar or two ahead; else the bar's length as the one before it took)
  const next = starts.get(bar + 1);
  const before = starts.get(bar - 1);
  const length = next !== undefined ? next - start : before !== undefined ? start - before : null;
  const into = length && length > 0 ? Math.min(1, Math.max(0, (at - start) / length)) : 0;
  return { bar, into, before: false };
}

/** The text heard at `at`, and where in its own time (bars from its first, and the fraction): the text of the bar heard, or before the song the first one told for it. */
export function heardAt(f: Followed, at: number): { text: SectionText; bars: number; place: Place } | null {
  const place = placeAt(f.starts, at);
  if (!place) return null;
  const text = textOf(f.texts, place.bar) ?? (place.before ? (f.texts.find((t) => t.bar >= place.bar) ?? null) : null);
  if (!text) return null;
  const bars = place.before ? 0 : place.bar - text.bar + place.into;
  return { text, bars: Math.max(0, bars), place };
}

/**
 * When, on the host's clock, the text heard next gives way to another: the start of the first bar after the one heard
 * at `at` that another text states; null where none is known yet.
 */
export function nextTextAt(f: Followed, at: number): number | null {
  const place = placeAt(f.starts, at);
  if (!place) return null;
  const now = textOf(f.texts, place.bar);
  const after = [...f.starts.keys()].filter((b) => b > place.bar).sort((a, b) => a - b);
  for (const b of after) if (textOf(f.texts, b) !== now) return f.starts.get(b)!;
  return null;
}

/** What is kept of a song once a bar is heard: the starts, frames and texts of the last `KEPT_BEHIND` bars and on. */
export function pruned(f: Followed, heard: number): Followed {
  const from = heard - KEPT_BEHIND;
  if (![...f.starts.keys()].some((b) => b < from) && !f.texts.some((t) => t.bar + t.foreseen.length <= from)) return f;
  return {
    ...f,
    starts: new Map([...f.starts].filter(([b]) => b >= from)),
    frames: new Map([...f.frames].filter(([b]) => b >= from)),
    texts: f.texts.filter((t) => t.bar + t.foreseen.length > from),
  };
}

/**
 * A bar of a text's own time, in seconds: its main meter's bar (the meter its first played cell steps by, `mainMeter`),
 * through that meter's time map; null where the text has none, or isn't compiled.
 */
export function barSeconds(result: CompileResult): number | null {
  if (!result.ok) return null;
  const meter = mainMeter(result);
  const cell = meter && result.cells.get(meter.cell);
  if (!meter || !cell?.clock) return null;
  const steps = cell.meter?.levels.length ?? cell.steps;
  if (!steps) return null;
  const tm = clocking(result, codeShifts(result)).map(cell.clock);
  const s = tm.q(steps) - tm.q(0);
  return Number.isFinite(s) && s > EPS ? s : null;
}
