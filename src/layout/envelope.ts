/**
 * An envelope as its wheel draws it (CellGlyph, show=adsr): its curve's stretches (attack, decay, a hold drawn for the
 * sustain, release), and where a note is on it now, for the lines that cross on the curve while it plays.
 */
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
