/**
 * MIDI learn, the pure part: which knob a message comes from, where a free() is (its cell and what it sets, which an
 * edit elsewhere doesn't move), what a knob or a pad makes of it (through the control's own scale: `free.ts`), and soft
 * takeover. The state that uses it is `state/learn.svelte.ts`; the page is docs/ui/midi.md.
 */
import type { FreeSpec } from '@yggi/cells/engine/ast';
import { freeAt, freePosition, freeSteps } from './free';

/** A knob, fader or pad: a control change or a note, on a channel (0–15); and the controller it was learned from (its input's name), where known. */
export interface Knob {
  readonly kind: 'cc' | 'note';
  readonly channel: number;
  readonly number: number;
  readonly from?: string;
}

/** A message from a knob (a control change) or a pad (a note-on), with its value (0–127); anything else is null. */
export function knobOf(data: ArrayLike<number>): (Knob & { value: number }) | null {
  if (data.length < 3) return null;
  const [status, number, value] = [data[0]!, data[1]!, data[2]!]; // (length checked above)
  const channel = status & 0x0f;
  if ((status & 0xf0) === 0xb0) return { kind: 'cc', channel, number, value };
  if ((status & 0xf0) === 0x90 && value > 0) return { kind: 'note', channel, number, value };
  return null;
}

export const sameKnob = (a: Knob, b: Knob) => a.kind === b.kind && a.channel === b.channel && a.number === b.number;

/** A knob in words: "CC 7", "note 36", on a channel other than the first "CC 7 ch 2". */
export const knobName = (k: Knob) => `${k.kind === 'cc' ? 'CC' : 'note'} ${k.number}${k.channel ? ` ch ${k.channel + 1}` : ''}`;

type Cells = ReadonlyMap<string, { readonly name: string; readonly frees: readonly FreeSpec[] }>;

const what = (f: FreeSpec) => (f.key === 'param' ? `param:${f.param ?? ''}` : f.key);

/**
 * Where a free() is: its cell and what it sets ("bar/step", "fx/param:lpf"; a second of the same in one cell "…#1").
 * Not its place in reading order, which an edit above it moves. The free() is found by where it's written; '' if it isn't.
 */
export function freePlace(cells: Cells, spec: Pick<FreeSpec, 'span'>): string {
  for (const c of cells.values()) {
    const i = c.frees.findIndex((f) => f.span.line === spec.span.line && f.span.col === spec.span.col);
    if (i < 0) continue;
    const f = c.frees[i]!;
    const nth = c.frees.slice(0, i).filter((g) => what(g) === what(f)).length;
    return `${c.name}/${what(f)}${nth ? `#${nth}` : ''}`;
  }
  return '';
}

/** The free() at a place (`freePlace`), as the code is now. */
export function freeAtPlace(cells: Cells, place: string): FreeSpec | undefined {
  const slash = place.indexOf('/');
  const c = cells.get(place.slice(0, slash));
  return c?.frees.find((f) => freePlace(cells, f) === place);
}

/**
 * A pad's value: the pad learned picks the first choice (or step), the ones above it the next ones
 * (a keypad's sixteen keys on sixteen pads). A pad below or past the end picks nothing.
 */
export function padValue(f: FreeSpec, learned: number, note: number): number | null {
  const i = note - learned;
  const steps = freeSteps(f);
  return i < 0 || i > steps ? null : freeAt(f, i / steps);
}

/** Soft takeover: where the knob was last (0..1, null before it moved), and the value it set last (null if none yet). */
export interface Takeover {
  readonly knob: number | null;
  readonly set: number | null;
}

export const LOOSE: Takeover = { knob: null, set: null };

/**
 * A knob turned to `at` (0..1) on a control whose value is `now`: the value it moves it to, or null while the knob
 * hasn't caught it. It holds the value once it set it last (and nothing else moved it since), once it passes through
 * the value or lands within a knob's step of it; until then the value stays (nothing jumps) and the knob's place is
 * the gap to show.
 */
export function takeover(f: FreeSpec, state: Takeover, at: number, now: number): { value: number | null; state: Takeover } {
  const here = freePosition(f, now);
  const held = state.set !== null && state.set === now;
  const passed = state.knob !== null && (state.knob - here) * (at - here) <= 0;
  if (held || passed || Math.abs(at - here) <= 1 / 127) {
    const value = freeAt(f, at);
    return { value, state: { knob: at, set: value } };
  }
  return { value: null, state: { knob: at, set: state.set } };
}

/** What this browser keeps: the knobs learned, by piece title and free() place, and whether moves are sent back. */
export interface Learned {
  readonly echo: boolean;
  readonly pieces: Readonly<Record<string, Readonly<Record<string, Knob>>>>;
}

const NOTHING_LEARNED: Learned = { echo: false, pieces: {} };

const isKnob = (k: unknown): k is Knob => {
  const o = k as Partial<Knob> | null;
  return !!o && (o.kind === 'cc' || o.kind === 'note') && Number.isInteger(o.channel) && Number.isInteger(o.number);
};

/** What was kept, read back: junk (or nothing) is nothing learned, a junk binding is dropped. */
export function readLearned(text: string | null): Learned {
  try {
    const o = JSON.parse(text ?? 'null') as Partial<Learned> | null;
    if (!o || typeof o !== 'object') return NOTHING_LEARNED;
    const pieces: Record<string, Record<string, Knob>> = {};
    for (const [title, places] of Object.entries(o.pieces ?? {})) {
      const kept = Object.entries(places ?? {}).filter(([, k]) => isKnob(k));
      if (kept.length)
        pieces[title] = Object.fromEntries(
          kept.map(([p, k]) => [p, { kind: k.kind, channel: k.channel, number: k.number, ...(typeof k.from === 'string' ? { from: k.from } : {}) }]),
        );
    }
    return { echo: o.echo === true, pieces };
  } catch {
    return NOTHING_LEARNED;
  }
}
