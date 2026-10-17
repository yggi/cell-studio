/**
 * What the time view's layers show (ui/TimeView.svelte; docs/notes/scalogram.md), worked out from the notes, the
 * cells and the scalograms: the notes shown of a round, each cell's span on the tower, the structure's lanes, the
 * patterns, the meter, the levels and the boundaries heard. Where they are drawn is layout/timeview.ts; the pictures,
 * layout/timepictures.ts. Pure: no DOM, no colours (a hue at most).
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import type { GraphModel } from '@yggi/cells/engine/graph';
import type { Played } from '@yggi/cells/engine/realize';
import type { Signal } from '@yggi/cells/engine/time/signals';
import { fold, ridges, type Scalogram } from '@yggi/cells/engine/time/wavelet';
import { cones, swells, type Boundary } from '@yggi/cells/engine/time/boundaries';
import type { StructureNode } from '@yggi/cells/engine/time/structure';
import { motifs, multiscale } from '@yggi/cells/engine/time/motifs';
import { alike, foldings, levelsOf, pulseOf } from '@yggi/cells/engine/time/necklace';
import { towerSpans } from './tower';
import { sameLevel, type HeardLevel } from './explained';

/** A clocked cell's span on the tower, in seconds: from its step (how often it moves) to its turn. */
export interface CellSpan {
  readonly name: string;
  readonly step: number;
  readonly turn: number;
}
/** A period the view names: the meter's (beat, bar, section) or a cell's step or turn. */
export interface Named {
  readonly period: number;
  readonly label: string;
}
/** The scalograms of every signal over one window. */
export interface Scalograms {
  readonly window: number;
  readonly periods: readonly number[];
  readonly rows: Partial<Record<Signal, Float32Array[]>>;
  readonly periodic: boolean;
}
/** What the scalogram layer listens to: the three signals mixed, or one alone. */
export type Listening = 'mix' | Signal;
/** The three signals the mix adds as colours. */
export const MIXED = ['envelope', 'change', 'voices'] as const;

/**
 * The notes shown, by when they start: those of the first round (`length` s); with chance (no two rounds alike),
 * every round's, folded onto the one, so what varies shows as more than one note in a place.
 */
export function shownNotes(heard: readonly Played[], length: number, folded: boolean): Played[] {
  const shown = folded ? heard.map((e) => ({ ...e, at: e.at % length })) : heard.filter((e) => e.at < length);
  return shown.sort((a, b) => a.at - b.at);
}

/** The longest note: the drawing looks this far back for notes still sounding at the view's start. */
export const longestOf = (notes: readonly Played[]) => notes.reduce((m, e) => Math.max(m, e.dur), 0);

/** The first note (by start) at or after `t`, in notes sorted by start. */
export function firstAt(ns: readonly { readonly at: number }[], t: number): number {
  let lo = 0;
  let hi = ns.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((ns[mid]?.at ?? Infinity) < t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Each clocked cell's span on the tower (layout/tower.ts), in seconds. */
export function cellSpans(program: CompileResult, model: GraphModel): CellSpan[] {
  return [...towerSpans(program, model)].flatMap(([id, { at, lo }]) => {
    const node = model.nodes.find((n) => n.id === id);
    return node?.cell && node.kind === 'cell' && Number.isFinite(at) && Number.isFinite(lo) ? [{ name: node.cell.name, step: Math.pow(10, -at), turn: Math.pow(10, -lo) }] : [];
  });
}

/** A structure's node in its lane. */
export type Laned = StructureNode & { readonly lane: number };
/** The structure's nodes (engine/time/structure.ts) by start, each in a lane: nodes of one length (to the semitone of
 * its log) that overlap in time stack under each other, as chords' notes would. */
export function structureLanes(nodes: readonly StructureNode[]): Laned[] {
  const ends = new Map<number, number[]>();
  return [...nodes]
    .sort((a, b) => a.at - b.at || a.depth - b.depth)
    .map((n) => {
      const row = Math.round(12 * Math.log2(Math.max(1e-3, n.to - n.at)));
      const lanes = ends.get(row) ?? [];
      let lane = lanes.findIndex((end) => end <= n.at + 1e-6);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = n.to;
      ends.set(row, lanes);
      return { ...n, lane };
    });
}

/** A family's hue, from its name (a copy is given its base's: its variants read as one phrase). */
export function familyHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return (h * 7) % 360;
}

/**
 * The neutral zone's rows (#440, the graph's voices row in time): each voice heard, ordered by `rank` (then as first
 * heard), and where it sounds — its notes' spans, those that touch or overlap merged. Notes sorted by start.
 */
export function voiceRows(notes: readonly Played[], rank: (voice: string) => number): { voice: string; spans: [number, number][] }[] {
  const rows = new Map<string, [number, number][]>();
  for (const e of notes) {
    const spans = rows.get(e.voice) ?? rows.set(e.voice, []).get(e.voice)!;
    const last = spans[spans.length - 1];
    if (last && e.at <= last[1] + 1e-9) last[1] = Math.max(last[1], e.at + e.dur);
    else spans.push([e.at, e.at + e.dur]);
  }
  const first = [...rows.keys()];
  return first.sort((a, b) => rank(a) - rank(b) || first.indexOf(a) - first.indexOf(b)).map((voice) => ({ voice, spans: rows.get(voice)! }));
}

/** The patterns are looked for over the first ten minutes (of every round) at most. */
const PATTERNS = 600;
/** The patterns: motifs heard at two time scales, and foldings alike at two levels, over the first ten minutes at
 * most; a motif's places folded onto the round shown (`length` s). Null with no notes. */
export function patternsOf(heard: readonly Played[], spans: readonly CellSpan[], listened: number, length: number) {
  if (!heard.length) return null;
  const early = heard.filter((e) => e.at < PATTERNS);
  const within = Math.min(listened, PATTERNS);
  const levels = levelsOf(spans, pulseOf(early.map((e) => e.at)), within);
  const onto = <T extends { at: number; to: number }>(o: T): T => ({ ...o, at: o.at % length, to: (o.at % length) + (o.to - o.at) });
  return {
    motifs: multiscale(motifs(early))
      .slice(0, 4)
      .map((m) => ({ ...m, heard: m.heard.map(onto).filter((o, i, all) => all.findIndex((x) => Math.abs(x.at - o.at) < 1e-3) === i) })),
    folded: alike(foldings(early, levels))
      .filter((g) => g.name.split(' ').length >= 3)
      .slice(0, 3),
  };
}

export type Patterns = NonNullable<ReturnType<typeof patternsOf>>;

/** The sections' usual length: the median gap between them (null with fewer than two). */
export function sectionGap(written: readonly { readonly at: number }[]): number | null {
  if (written.length < 2) return null;
  const gaps = written
    .slice(1)
    .map((b, i) => b.at - (written[i]?.at ?? 0))
    .sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? null;
}

/** A period, short: 0.42 s, 13 s, 4 min. */
export const seconds = (p: number) => (p < 10 ? `${p.toFixed(2)} s` : p < 120 ? `${Math.round(p)} s` : `${Math.round(p / 60)} min`);

/** The meter, as periods across the scalogram: the beat and the bar of the meter that drives the piece (its tempo
 * cell `main`'s step and turn), and the sections' usual length. */
export function meterOf(spans: readonly CellSpan[], main: string | undefined, written: readonly { readonly at: number }[]): Named[] {
  const lines: Named[] = [];
  const span = main === undefined ? undefined : spans.find((x) => x.name === main);
  if (span) {
    lines.push({ period: span.step, label: 'beat' });
    if (span.turn > span.step * 1.01) lines.push({ period: span.turn, label: 'bar' });
  }
  const gap = sectionGap(written);
  if (gap !== null) lines.push({ period: gap, label: 'section' });
  return lines;
}

/** The scalograms of every round folded onto the one shown (`length` s): what the view draws. */
export function foldOnto(listened: Scalograms, length: number): { window: number; periods: readonly number[]; rows: Partial<Record<Signal, Float32Array[]>> } {
  const { window, periods, periodic } = listened;
  const rows: Partial<Record<Signal, Float32Array[]>> = {};
  for (const [k, r] of Object.entries(listened.rows))
    if (r) rows[k as Signal] = fold({ window, periods, rows: r, periodic }, length, Math.round(window / length)).rows as Float32Array[];
  return { window: Math.min(window, length), periods, rows };
}

/**
 * The levels the scalogram hears (`ridges`, of each signal shown, the stronger of two within a semitone), strongest
 * first, `most` at most: the heard side of the levels (layout/explained.ts names each after what writes it, if anything).
 */
export function heardLevelsOf(
  scal: { readonly window: number; readonly periods: readonly number[]; readonly rows: Partial<Record<Signal, Float32Array[]>> },
  signal: Listening,
  periodic: boolean | undefined,
  most = 12,
): HeardLevel[] {
  const chosen: readonly Signal[] = signal === 'mix' ? MIXED : [signal];
  const found = chosen
    .flatMap((k) => {
      const rows = scal.rows[k];
      return rows ? ridges({ window: scal.window, periods: scal.periods, rows, periodic }, most) : [];
    })
    .sort((a, b) => b.strength - a.strength);
  return found.filter((r, i) => !found.slice(0, i).some((q) => sameLevel(q.period, r.period))).slice(0, most);
}

/** The boundaries heard: swells of the three signals at the sections' scale (with no sections, the cones of change),
 * found over every round (`rounds` of them) and folded onto the one shown, one where the rounds agree. */
export function heardMarksOf(listened: Scalograms, written: readonly { readonly at: number }[], rounds: number, length: number): Boundary[] {
  const s = (k: Signal): Scalogram => ({ window: listened.window, periods: listened.periods, rows: listened.rows[k] ?? [] });
  const gap = sectionGap(written);
  const found = gap !== null ? swells([s('envelope'), s('change'), s('voices')], gap).slice(0, 2 * written.length * rounds) : cones(s('change')).slice(0, 12 * rounds);
  const out: Boundary[] = [];
  for (const b of found) {
    const at = b.at % length;
    if (!out.some((x) => Math.abs(x.at - at) <= Math.max(1, length / 200))) out.push({ ...b, at });
  }
  return out;
}
