/**
 * A meter's wheel as one drawing of tempo, meter and swing (#701; `docs/notes/701-meter-wheel.md`): its pulses, its beats and
 * its swing, each placed on the turn where it is played, from the compiled meter alone (`ResolvedCell.meter`, and the clock's
 * `swung` where the swung level is the pulses' own). Pure: the component draws it (`ui/MeterWheel.svelte`), a text for the
 * hub and the hand come from `hubLabel` and the live state.
 *
 * - A **pulse** is a step of the meter, its `level` the sync level (0 the bar's first, then finer), drawn as tall as it is strong.
 * - A **beat** is a group of pulses (6/8: two of three; 2+2+3: three), an arc outside them.
 * - **Swing** is the meter's `swing=` level's pairs, each a long arc and a short one at the share they play; a group of the
 *   bar's pulses that doesn't divide into pairs stays even (decision 071); none without `swing=`.
 *
 * A meter written as a scan (`scan(1 1 1 1)`), or with no levels, has no such wheel: null, and the cell's own wheel is drawn.
 */
import type { CompileResult } from '@yggi/cells';
import { selects } from '@yggi/cells/inspect';
import { clockCell } from './meters';
import { swungTurn } from './cellview';

interface Span {
  readonly t0: number;
  readonly t1: number;
}

export interface MeterWheel {
  /** Each pulse where it is played (turns), and its sync level (0 the bar's first). */
  readonly pulses: readonly (Span & { readonly level: number })[];
  /** Each beat where it is played, from its first pulse to its last's end. */
  readonly beats: readonly (Span & { readonly first: number; readonly pulses: number })[];
  /** The swing, null without `swing=`: its pairs (a long arc to `split`, a short one from it) and the groups that stay even. */
  readonly swing: {
    readonly pairs: readonly (Span & { readonly split: number })[];
    readonly even: readonly Span[];
    readonly share: number;
  } | null;
}

/** The wheel of meter `name`, or null for one the wheel doesn't draw. */
export function meterWheel(result: CompileResult, name: string): MeterWheel | null {
  const c = result.cells.get(name);
  const m = c?.meter;
  if (!c || !m || m.written !== 'meter') return null;
  const n = m.levels.length;
  if (n === 0 || n !== c.steps) return null;
  const swung = result.clocks.get(name)?.swung;
  const placed = swung?.length === n ? swung : null;
  /** A position in pulses (fractional inside a pulse) as a turn: where it is played. */
  const turnOf = (x: number) => (placed ? swungTurn(placed, x / n) : x / n);
  const pulses = m.levels.map((level, i) => ({ t0: turnOf(i), t1: turnOf(i + 1), level }));
  // (beats that don't add up to the bar's pulses: each pulse its own)
  const groups = m.beats.reduce((a, b) => a + b, 0) === n ? [...m.beats] : Array.from({ length: n }, () => 1);
  let at = 0;
  const beats = groups.map((g) => {
    const first = at;
    at += g;
    return { t0: turnOf(first), t1: turnOf(at), first, pulses: g };
  });
  const sw = m.swing?.[0];
  if (!sw) return { pulses, beats, swing: null };
  // (a pair spans two steps of the swung level: `whole` its note, `unit` the pulse's; so 8n on quarters is one pair a pulse,
  // on eighths one a pair of pulses, 16n on quarters two a pulse)
  const span = 2 * sw.whole * m.unit;
  const pairs: (Span & { split: number })[] = [];
  const even: Span[] = [];
  for (const b of beats) {
    const per = span >= 1 ? b.pulses / span : b.pulses / span;
    if (!Number.isInteger(Math.round(per * 1e6) / 1e6) || per < 1) {
      for (let i = b.first; i < b.first + b.pulses; i++) even.push({ t0: turnOf(i), t1: turnOf(i + 1) });
      continue;
    }
    const k = Math.round(per);
    for (let j = 0; j < k; j++) {
      const t0 = turnOf(b.first + (j * b.pulses) / k);
      const t1 = turnOf(b.first + ((j + 1) * b.pulses) / k);
      pairs.push({ t0, t1, split: t0 + (t1 - t0) * sw.share });
    }
  }
  return { pulses, beats, swing: { pairs, even, share: sw.share } };
}

/**
 * The section a meter's selector is in now, where it is in one: a selector this meter steps (its clock the meter's or a tap of
 * it) that picks exactly one of its table's sections (`entries`: the live state's picks), as k of n; null while it picks none
 * or several (the clock's own white), or steps no selector. The table is the one of the piece's sections that the picks fit.
 */
export function selectorSection(result: CompileResult, meter: string, picks: (selector: string) => ReadonlySet<number> | undefined): { k: number; n: number } | null {
  const sections = result.sections;
  if (!sections?.size) return null;
  for (const c of result.cells.values()) {
    if (!c.clock || !selects(result, c.name) || clockCell(result, c.clock)?.cell !== meter) continue;
    const entries = picks(c.name);
    if (!entries || entries.size !== 1) continue;
    const k = [...entries][0]!;
    const counts = new Map<string, number>();
    for (const table of sections.values()) counts.set(table, (counts.get(table) ?? 0) + 1);
    const n = Math.max(0, ...[...counts.values()].filter((count) => count > k));
    if (n > 1) return { k, n };
  }
  return null;
}

/** A pulse's height by sync level, of the room it has (0 the bar's first: all of it). */
export const PULSE_HEIGHT = [1, 0.7, 0.46, 0.3] as const;
