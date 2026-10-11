/**
 * A resonator's exciters round its wheel, in one place: each at its turn (the first at the top, then clockwise, evenly),
 * its strand meeting it at `EXCITER_RING` of the wheel's radius (ui/PulseEdge.svelte's loom). A body of tines
 * (`body=tine`, a kalimba: docs/language/physics.md) draws each as a tine: a steel tongue held under a bridge ring on its
 * body, its free end reaching out to its strand. A tine is as long as its pitch says (a cantilever's pitch goes as one
 * over its length squared: an octave up is a tine √2 shorter). Pure geometry, for ui/MaterialNode.svelte.
 */

/** Where an exciter's strand meets it, in parts of its wheel's radius (its pad's centre, its tine's free end). */
export const EXCITER_RING = 1.2;

/** A tine: its turn round the wheel (0 the top, clockwise), its held end's and free end's distance from the centre, its width (px). */
export interface Tine {
  readonly turn: number;
  readonly inner: number;
  readonly outer: number;
  readonly width: number;
}

/** The tines of a body `r` px in radius, one for each exciter (its pitch in semitones), in the exciters' order. */
export function tinePlaces(r: number, pitches: readonly number[]): Tine[] {
  const n = pitches.length;
  if (!n) return [];
  const low = Math.min(...pitches);
  const outer = r * EXCITER_RING;
  const width = Math.min(r * 0.16, ((2 * Math.PI * r) / n) * 0.5);
  return pitches.map((p, i) => ({
    turn: i / n,
    inner: outer - Math.max(r * 0.35, r * 0.7 * Math.pow(2, -(p - low) / 24)),
    outer,
    width,
  }));
}

/** The bridge ring the tines are held under, its radius (px): past every tine's held end. */
export const bridgeOf = (r: number) => r * 0.9;
