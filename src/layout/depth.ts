/**
 * A cable's depth (#598): the range a moving parameter's cells scale (`lpf=400..1600 * &lfo`), read off the cell's line
 * and set again with its cells kept, through cells' `attrValue` and `setAttr` (yggi/cells#470). A cable patched into a
 * fixed parameter opens at zero depth (`lpf=800..800 * &lfo`, cells decision 067 §4); its two ends moved apart, it is
 * heard. Each end a slider in the cell's sheet (ui/sheet/Depths.svelte), one line rewritten a move.
 */
import { ATTRIBUTES, canonicalParam } from '@yggi/cells/engine/attributes';
import { attrValue, declLine, setAttr, splitComment } from '@yggi/cells/engine/edit';

/** How a range's ends run on a slider: a frequency over 20 Hz to 20 kHz on a log scale, else a linear span. */
export interface Span {
  readonly min: number;
  readonly max: number;
  readonly scale: 'log' | 'linear';
}

/** A moving parameter's range and the cells that scale it, as written. */
export interface Depth {
  readonly key: string;
  readonly lo: number;
  readonly hi: number;
  readonly factors: readonly string[];
  readonly span: Span;
}

const RANGE = /^(-?\d*\.?\d+)\.\.(-?\d*\.?\d+)$/;

/**
 * A slider's span for a parameter (by our name: cutoff is lpf). A frequency (cells' attribute table, `hz`): 20 Hz to
 * 20 kHz, log; a resonance (`lpq`, `hpq`, `bpq`): 0 to 30; a send or a share (`room`, `delay`, and any other): 0 to 1,
 * widened to take a range written past it.
 */
export function spanOf(key: string, lo: number, hi: number): Span {
  const k = canonicalParam(key);
  if (ATTRIBUTES[k]?.hz) return { min: 20, max: 20000, scale: 'log' };
  const top = /q$/.test(k) ? 30 : 1;
  return { min: Math.min(0, lo, hi), max: Math.max(top, lo, hi), scale: 'linear' };
}

/** &cell's moving parameters with a range scaled by cells (`lpf=70..4800 * &eg`), in the order written. */
export function depthsOf(source: string, cell: string): Depth[] {
  const i = declLine(source, cell);
  if (i < 0) return [];
  const code = splitComment(source.split('\n')[i]!)[0];
  const out: Depth[] = [];
  for (const m of code.matchAll(/(?:^|\s)([a-z][a-zA-Z]*)=/g)) {
    const key = m[1]!;
    if (!ATTRIBUTES[canonicalParam(key)]?.moves) continue;
    const v = attrValue(code, key);
    const r = v && RANGE.exec(v.base);
    if (!v || !r || !v.factors.length) continue;
    const lo = Number(r[1]);
    const hi = Number(r[2]);
    out.push({ key, lo, hi, factors: v.factors, span: spanOf(key, lo, hi) });
  }
  return out;
}

/** A number as the text writes one: a frequency whole, else to two places, its leading zero dropped (`.25`). */
export function formatEnd(n: number, span: Span): string {
  const x = span.scale === 'log' ? Math.round(n) : Math.round(n * 100) / 100;
  return String(x).replace(/^(-?)0\./, '$1.');
}

/** &cell's `key=` with its range set to lo..hi, its cells kept (`lpf=400..1600 * &lfo`): one line rewritten. */
export function setDepth(source: string, cell: string, d: Depth, lo: number, hi: number): string {
  return setAttr(source, cell, d.key, [`${formatEnd(lo, d.span)}..${formatEnd(hi, d.span)}`, ...d.factors].join(' * '));
}

/** Where a value sits on a slider, 0…1, by its span's scale. */
export function positionOf(v: number, span: Span): number {
  if (span.scale === 'log') return Math.log(Math.max(span.min, v) / span.min) / Math.log(span.max / span.min);
  return (v - span.min) / (span.max - span.min || 1);
}

/** The value at a place on a slider, 0…1, by its span's scale. */
export function valueAt(t: number, span: Span): number {
  const u = Math.min(1, Math.max(0, t));
  return span.scale === 'log' ? span.min * Math.pow(span.max / span.min, u) : span.min + u * (span.max - span.min);
}
