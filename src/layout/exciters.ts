/**
 * A resonator drawn as its body ([resonator-bodies.md](../../docs/notes/resonator-bodies.md)), in one place: the
 * material of its disc, and its exciters round its wheel. Each exciter is at its turn (the first at the top, then
 * clockwise, evenly), drawn as its body's element (a tine, a bar, a pipe, a string …) reaching out to where its strand
 * meets it, `EXCITER_RING` of the wheel's radius (ui/PulseEdge.svelte: a bus through the loom, a single strand straight
 * to it). An element is as long, or as large, as its pitch says: a tine, a bar, a fork's prongs as 1/√f (a cantilever,
 * a free bar: an octave up is √2 shorter), a pipe as 1/f (an octave is half), a cup, a plate, a block as 1/∛f; a string
 * keeps its length and gets thinner. Pure geometry, for ui/MaterialNode.svelte.
 */

/** Where an exciter's strand meets it, in parts of its wheel's radius (its element's free end). */
export const EXCITER_RING = 1.2;

/** What a body's disc is made of (its tokens in app.css: `--body-<material>-…`; brass is the resonator's own). */
export type Material = 'brass' | 'steel' | 'wood' | 'spruce' | 'organ';

const MATERIAL: Readonly<Record<string, Material>> = {
  fork: 'brass',
  bell: 'brass',
  tine: 'steel',
  plate: 'steel',
  spring: 'steel',
  bar: 'wood',
  box: 'wood',
  wire: 'spruce',
  pipe: 'organ',
};

/** A body's material (`body=`); one the table doesn't know is brass. */
export const materialOf = (body: string | undefined): Material => MATERIAL[body ?? ''] ?? 'brass';

/**
 * How a body's element scales: `per` octaves for its length (or size) to halve (2: 1/√f, 1: 1/f, 3: 1/∛f), whether
 * its length stays (`fixed`: only its size or thickness goes with the pitch), its longest and shortest and its width,
 * in parts of the radius.
 */
const SHAPE: Readonly<Record<string, { per: number; fixed?: boolean; longest: number; shortest: number; width: number }>> = {
  tine: { per: 2, longest: 0.7, shortest: 0.35, width: 0.16 },
  bar: { per: 2, longest: 0.75, shortest: 0.4, width: 0.22 },
  fork: { per: 2, longest: 0.7, shortest: 0.4, width: 0.2 },
  pipe: { per: 1, longest: 0.85, shortest: 0.3, width: 0.18 },
  wire: { per: 2, fixed: true, longest: 0.75, shortest: 0.75, width: 0.14 },
  spring: { per: 2, fixed: true, longest: 0.55, shortest: 0.55, width: 0.16 },
  bell: { per: 3, fixed: true, longest: 0.5, shortest: 0.5, width: 0.32 },
  plate: { per: 3, fixed: true, longest: 0.5, shortest: 0.5, width: 0.28 },
  box: { per: 3, fixed: true, longest: 0.45, shortest: 0.45, width: 0.32 },
};

/**
 * An exciter's element: its turn round the wheel (0 the top, clockwise), its held end's and free end's distance from
 * the centre, its width (px), and its scale by its pitch (1 the lowest: a cup's size, a string's thickness).
 */
export interface ExciterPlace {
  readonly turn: number;
  readonly inner: number;
  readonly outer: number;
  readonly width: number;
  readonly scale: number;
}

/** The elements of a body (`body=`) `r` px in radius, one for each exciter (its pitch in semitones), in the exciters' order. */
export function exciterPlaces(body: string, r: number, pitches: readonly number[]): ExciterPlace[] {
  const n = pitches.length;
  if (!n) return [];
  const s = SHAPE[body] ?? SHAPE.tine;
  const low = Math.min(...pitches);
  const outer = r * EXCITER_RING;
  // (side by side round the rim: never wider than half its share of it)
  const width = Math.min(r * s.width, ((2 * Math.PI * r) / n) * 0.5);
  return pitches.map((p, i) => {
    const scale = Math.pow(2, -(p - low) / (12 * s.per));
    return { turn: i / n, inner: outer - (s.fixed ? r * s.longest : Math.max(r * s.shortest, r * s.longest * scale)), outer, width, scale };
  });
}

/** The bridge ring a body of tines is held under, its radius (px): past every tine's held end. */
export const bridgeOf = (r: number) => r * 0.9;
