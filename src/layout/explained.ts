/**
 * What is heard against what is written (#416): the time view's two sides kept apart and matched both ways, so their
 * overlaps and their gaps show. A fully folded piece has no gaps: every structure heard in the output is explained by
 * the cells, and every cell leaves a trace in the output. Two axes so far, each matched both ways:
 *
 * - levels (time scales): the scalogram's ridges against each cell's step and turn, the beat, the bar and the
 *   sections' length, within a semitone of period; a written level the scalogram can't hold (shorter than its shortest
 *   period, longer than a sixth of its window) is out of range, not a gap;
 * - moments (when): the boundaries heard against the sections written; a splice explains a boundary heard on it, but
 *   one not heard is no gap (boundaries are listened for at the sections' scale, not every braid's turn).
 *
 * Pure: no DOM, no colours.
 */
import type { CellSpan, Named } from './timelayers';

/** A level written: a period (s) and what writes it (the meter's name first, else the cells', `name step`/`name turn`). */
export interface WrittenLevel {
  readonly period: number;
  readonly label: string;
  readonly by: readonly string[];
}
/** A level heard: a ridge of the scalogram, its strength against the strongest (0 … 1). */
export interface HeardLevel {
  readonly period: number;
  readonly strength: number;
}
/** One axis matched both ways: what both have, what only the output has (unexplained), what only the cells have (unheard). */
export interface Explained<H, W> {
  readonly both: readonly { readonly heard: H; readonly written: W }[];
  readonly heardOnly: readonly H[];
  readonly writtenOnly: readonly W[];
}
/** How folded an axis is, each way: the share of what is heard that the cells explain, of what is written that is heard. */
export interface Folded {
  readonly explained: number;
  readonly heardOf: number;
  readonly heard: number;
  readonly written: number;
}

/** Two periods one level: within a semitone of each other. */
export const sameLevel = (a: number, b: number) => Math.abs(Math.log2(a / b)) < 1 / 12;

/** The levels written: the meter's lines and each cell's step and turn, those within a semitone of each other one level. */
export function writtenLevels(meter: readonly Named[], spans: readonly CellSpan[]): WrittenLevel[] {
  const out: { period: number; label: string; by: string[] }[] = [];
  const add = (period: number, by: string, named: boolean) => {
    if (!(period > 0) || !Number.isFinite(period)) return;
    const had = out.find((l) => sameLevel(l.period, period));
    if (!had) return void out.push({ period, label: by, by: [by] });
    if (!had.by.includes(by)) had.by.push(by);
    if (named && !meter.some((m) => m.label === had.label)) had.label = by;
  };
  for (const m of meter) add(m.period, m.label, true);
  for (const c of spans) {
    add(c.step, `${c.name} step`, false);
    if (c.turn > c.step * 1.01) add(c.turn, `${c.name} turn`, false);
  }
  return out.sort((a, b) => a.period - b.period);
}

/**
 * The levels matched: each heard one with the written level within a semitone of it (the nearest), and each written
 * level in `range` (s, the scalogram's shortest period to the longest it can hear) with a heard one. Written levels
 * outside the range are left out: neither heard nor a gap.
 */
export function explainLevels(heard: readonly HeardLevel[], written: readonly WrittenLevel[], range: readonly [number, number]): Explained<HeardLevel, WrittenLevel> {
  const inRange = written.filter((w) => w.period >= range[0] / Math.pow(2, 1 / 12) && w.period <= range[1] * Math.pow(2, 1 / 12));
  const both: { heard: HeardLevel; written: WrittenLevel }[] = [];
  const heardOnly: HeardLevel[] = [];
  for (const h of heard) {
    const near = inRange.filter((w) => sameLevel(w.period, h.period)).sort((a, b) => Math.abs(Math.log(a.period / h.period)) - Math.abs(Math.log(b.period / h.period)));
    if (near[0]) both.push({ heard: h, written: near[0] });
    else heardOnly.push(h);
  }
  return { both, heardOnly, writtenOnly: inRange.filter((w) => !both.some((b) => b.written === w)) };
}

/** A moment written: where a section starts, or a braid turns to its next spliced cell. */
export interface WrittenMoment {
  readonly at: number;
  readonly kind: 'section' | 'splice';
  readonly label?: string;
}

/**
 * The moments matched within `near` (s): each boundary heard with the written moment nearest it (a section before a
 * splice), and each section with a boundary heard. A splice not heard is no gap.
 */
export function explainMoments<H extends { readonly at: number }>(heard: readonly H[], written: readonly WrittenMoment[], near: number): Explained<H, WrittenMoment> {
  const both: { heard: H; written: WrittenMoment }[] = [];
  const heardOnly: H[] = [];
  for (const h of heard) {
    const close = written.filter((w) => Math.abs(w.at - h.at) <= near);
    const w = close.find((x) => x.kind === 'section') ?? close.sort((a, b) => Math.abs(a.at - h.at) - Math.abs(b.at - h.at))[0];
    if (w) both.push({ heard: h, written: w });
    else heardOnly.push(h);
  }
  return { both, heardOnly, writtenOnly: written.filter((w) => w.kind === 'section' && !both.some((b) => b.written === w)) };
}

/** How folded an axis is (1 each way: no gaps). The written side counts what can be a gap (`writtenOnly` and the matched). */
export function folded<H, W>(x: Explained<H, W>): Folded {
  const heard = x.both.length + x.heardOnly.length;
  const matched = new Set(x.both.map((b) => b.written));
  const written = matched.size + x.writtenOnly.length;
  return { explained: x.both.length, heard, heardOf: matched.size, written };
}
