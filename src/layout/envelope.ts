/**
 * An envelope as its wheel draws it (CellGlyph, show=adsr): its curve's stretches (attack, decay, a hold drawn for the
 * sustain, release), the curve as drawn and its values named on it, and where a note is on it now, for the lines that
 * cross on the curve while it plays.
 */
import { adsrOf, type CompileResult, type Shifts } from '@yggi/cells/engine/program';
import { lastNoteAt } from '@yggi/cells/engine/values';
import { envelopeNames } from './wheel';

interface Adsr {
  readonly attack: number;
  readonly decay: number;
  readonly sustain: number;
  readonly release: number;
}

/** The curve's stretches along its time axis: the sustain drawn as a hold of its own length. */
export function envelopeAxis(e: Adsr): { attack: number; decay: number; hold: number; release: number; total: number } {
  const hold = Math.max(0.15, (e.attack + e.decay + e.release) * 0.4);
  return { attack: e.attack, decay: e.decay, hold, release: e.release, total: e.attack + e.decay + hold + e.release || 1 };
}

/** The level of a held note `t` seconds after its onset (0 … 1). */
const held = (e: Adsr, t: number) =>
  t < e.attack ? t / Math.max(1e-9, e.attack) : t < e.attack + e.decay ? 1 - ((1 - e.sustain) * (t - e.attack)) / Math.max(1e-9, e.decay) : e.sustain;

/**
 * Where a note is on the curve now: `since` its onset and `length` long (seconds). Its time on the drawn axis (the
 * sustain's progress through the hold, the release after the note's end) and its level; null when it has rung out.
 */
export function envelopeAt(e: Adsr, since: number, length: number): { t: number; level: number } | null {
  const a = envelopeAxis(e);
  if (since < 0) return null;
  if (since < length) {
    if (since < e.attack + e.decay) return { t: since, level: held(e, since) };
    const through = (since - e.attack - e.decay) / Math.max(1e-9, length - e.attack - e.decay);
    return { t: e.attack + e.decay + Math.min(1, through) * a.hold, level: e.sustain };
  }
  const r = since - length;
  if (r >= e.release) return null;
  const from = held(e, length);
  return { t: e.attack + e.decay + a.hold + r, level: from * (1 - r / Math.max(1e-9, e.release)) };
}

/** A voice's envelope as written (env=&…, a map=adsr cell); null: none, or not an ADSR. */
export function envelopeOf(result: CompileResult, voice: string): Adsr | null {
  const name = result.cells.get(voice)?.env;
  const cell = name ? result.cells.get(name) : undefined;
  return cell ? adsrOf(cell) : null;
}

/** The cells whose notes an envelope shapes: whatever plays a voice it is the env= of, or a product it shapes. */
export function envelopeNotes(result: CompileResult, envelope: string): string[] {
  return [...new Set(result.outputs.filter((o) => !o.drone && (result.cells.get(o.voice)?.env === envelope || o.envelopeCell === envelope)).map((o) => o.cell))];
}

/** The cells that play a voice. */
export function voiceNotes(result: CompileResult, voice: string): string[] {
  return [...new Set(result.outputs.filter((o) => o.voice === voice && !o.drone).map((o) => o.cell))];
}

/** Of the notes these cells sound at real second t (or sounded last), the latest to begin; null: none. */
export function latestNoteAt(result: CompileResult, statics: Shifts, cells: readonly string[], t: number): { since: number; length: number } | null {
  const notes = cells.flatMap((n) => lastNoteAt(result, statics, n, t) ?? []);
  return notes.length ? notes.reduce((a, b) => (b.since < a.since ? b : a)) : null;
}

/** A point of the drawn curve. */
type XY = readonly [number, number];
/** The drawn curve's five points: its start, the peak, the end of its fall, the end of its hold, its end. */
type EnvelopeCurve = readonly [XY, XY, XY, XY, XY];

/** The curve across a wheel (centre c, rim rOuter): rising, falling, holding, releasing, 1.5 rims wide, 0.9 tall. */
export function envelopeCurve(e: Adsr, c: number, rOuter: number): EnvelopeCurve {
  const { hold, total } = envelopeAxis(e);
  const w = rOuter * 1.5;
  const h = rOuter * 0.9;
  const x0 = c - w / 2;
  const y0 = c + h / 2;
  const X = (t: number) => x0 + (t / total) * w;
  return [
    [X(0), y0],
    [X(e.attack), y0 - h],
    [X(e.attack + e.decay), y0 - h * e.sustain],
    [X(e.attack + e.decay + hold), y0 - h * e.sustain],
    [X(total), y0],
  ];
}

/** The curve as a polyline's points. */
export const curvePoints = (curve: EnvelopeCurve) => curve.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Where the lines cross on the drawn curve for a note `since` its onset and `length` long (`envelopeAt`): x its time
 * now, y its level now, across the curve's box (x0 … x1, top … bottom); null when it has rung out.
 */
export function envelopeCrossing(
  curve: EnvelopeCurve,
  e: Adsr,
  note: { readonly since: number; readonly length: number },
): { x: number; y: number; x0: number; x1: number; top: number; bottom: number } | null {
  const at = envelopeAt(e, note.since, note.length);
  if (!at) return null;
  const { total } = envelopeAxis(e);
  const [x0, x1] = [curve[0][0], curve[4][0]];
  const [y0, y1] = [curve[0][1], curve[1][1]];
  return { x: x0 + (at.t / total) * (x1 - x0), y: y0 + at.level * (y1 - y0), x0, x1, top: y1, bottom: y0 };
}

/**
 * Its values named on their stretches of the curve (#107), in a font `f` px: attack by the peak, decay along its fall,
 * sustain under its hold, release by its end.
 */
export function envelopeLabels(curve: EnvelopeCurve, e: Adsr, f: number): { x: number; y: number; text: string; anchor: 'start' | 'middle' | 'end' }[] {
  const n = envelopeNames(e);
  const [, peak, fall, held, end] = curve;
  return [
    { x: peak[0] + f * 0.3, y: peak[1] - f * 0.5, text: n.a, anchor: 'start' },
    { x: (peak[0] + fall[0]) / 2 + f * 0.6, y: (peak[1] + fall[1]) / 2 - f * 0.4, text: n.d, anchor: 'start' },
    { x: (fall[0] + held[0]) / 2, y: fall[1] + f * 1.2, text: n.s, anchor: 'middle' },
    { x: end[0], y: Math.min(held[1], end[1]) - f * 0.8, text: n.r, anchor: 'end' },
  ];
}
