/**
 * One geometry for every wheel (#106): where its hub ends, its rim, its disc, its playhead, as a function of its
 * size. A cell's glyph, a spectrum, a waveform and the braid's token wheel are drawn from these, so that side by
 * side (a voice next to its melody, a cell's sheet) they line up. As at 128 px and up; a smaller wheel's marks
 * scale with it (#105).
 */

/** The hub's edge (the ring's inner radius), as a share of the wheel's size. */
export const HUB = 0.24;
/** The border between a ring's segments (in the disc's colour): `BORDER` in coarse.ts, which tapers it on merged segments. */
export { BORDER } from './coarse';

export interface WheelGeometry {
  /** The centre (x = y). */
  readonly c: number;
  /** A smaller wheel's marks scale by this (1 at 128 px and up). */
  readonly k: number;
  /** Room round the rim for ticks, the playhead's tip, a notch. */
  readonly margin: number;
  /** The ring: from rInner (the hub's edge) to rOuter. */
  readonly rInner: number;
  readonly rOuter: number;
  /** The hub's disc, a little inside the ring. */
  readonly rHub: number;
  /** The wheel's own disc, behind everything. */
  readonly rDisc: number;
  /** The playhead: from inside the hub's edge to the rim's margin; its stroke. */
  readonly hand: { readonly r0: number; readonly r1: number; readonly width: number };
  /** A tick on the rim: from, to; its stroke. */
  readonly tick: { readonly r0: number; readonly r1: number; readonly width: number };
}

export function wheelGeometry(size: number): WheelGeometry {
  const c = size / 2;
  const k = Math.min(1, size / 128);
  const margin = Math.min(7, size * 0.055);
  const rInner = size * HUB;
  const rOuter = c - margin;
  return {
    c,
    k,
    margin,
    rInner,
    rOuter,
    rHub: rInner - 3 * k,
    rDisc: c - 1,
    hand: { r0: rInner - 3 * k, r1: rOuter + margin - 1, width: Math.max(1.2, 2.5 * k) },
    tick: { r0: rOuter + 1.5 * k, r1: rOuter + 5 * k, width: Math.max(1, 1.5 * k) },
  };
}
