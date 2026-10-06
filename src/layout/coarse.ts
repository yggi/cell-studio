/**
 * Coarser segments for long braids. A braid of ~1,000 steps is drawn on a wheel 100–200 px across, where a
 * step is a third of a degree, well under a pixel: it can't be seen, but each is a reactive `<path>` that is
 * rewritten whenever a table turns (issue #41). Past a cap, neighbouring segments are merged into buckets of
 * at most 1/cap of a turn (160 → 2.25°), so the wheel has ~cap segments, whatever the piece.
 *
 * Pure: segments in, segments out; no DOM.
 */
import type { Fill, Segment } from './cellview';

/**
 * Most segments a braid is drawn with before neighbours are merged; a merged one spans ≤ 1/160 turn (2.25°).
 * 160 and not 128 because the longest braid of the examples that is *not* the Prelude has 145 segments
 * (`&roll` in hypercell): those stay exactly as they are.
 */
export const MAX_SEGMENTS = 160;

const EPS = 1e-9;

const isRest = (s: Segment) => s.bands.every((f) => f.kind === 'rest');
/** show=levels: the tallest bar of a segment (0 for anything that isn't a level). */
const level = (s: Segment) => s.bands.reduce((m, f: Fill) => (f.kind === 'level' ? Math.max(m, f.v) : m), 0);

/** One bucket → one segment: the union of the times, drawn as one of its members (see `coarsen`). */
function merge(group: readonly Segment[]): Segment {
  if (group.length === 1) return group[0];
  let pick = group.find((s) => !isRest(s)) ?? group[0];
  // levels: the highest bar wins (the first, among equals) — a bar's height is what the picture shows
  if (group.some((s) => s.bands.some((f) => f.kind === 'level'))) for (const s of group) if (!isRest(s) && level(s) > level(pick)) pick = s;
  return {
    t0: Math.min(...group.map((s) => s.t0)),
    t1: Math.max(...group.map((s) => s.t1)),
    index: group[0].index,
    // the bands (and so a chord's band structure), and the notes that name them, are the picked step's own
    bands: pick.bands,
    notes: pick.notes,
  };
}

/**
 * At most about `cap` segments: when there are more, neighbours are merged into buckets spanning at most
 * 1/cap of a turn. Under the cap the very same array comes back (nothing about a short wheel changes).
 *
 * - A bucket starts at a segment and takes the following ones while they end within 1/cap of its start. A
 *   segment longer than that is never merged (it stays as it is), so long notes keep their length and labels.
 * - A merged segment spans the union of its members' times (`t0` of the first, `t1` of the last), so
 *   the playhead test `t0 <= t < t1` still finds it.
 * - It is drawn as its first non-rest member: its colour, its alteration stripe, and its bands as they are
 *   (a chord stays a chord, with that chord's number of bands; bands are never mixed across members, so the
 *   count is always one a plain segment has). It's a rest only when every member is. Most steps of a long
 *   braid are rests, and a note must not be painted over by the rest next to it.
 * - show=levels: the member with the tallest bar, so the bucket's bar is the loudest level in it.
 * - Its `index` is its first member's, its `notes` those of the member drawn.
 */
export function coarsen(segments: readonly Segment[], cap: number = MAX_SEGMENTS): readonly Segment[] {
  if (segments.length <= cap) return segments;
  const width = 1 / cap;
  const out: Segment[] = [];
  let group: Segment[] = [];
  let from = 0;
  const flush = () => {
    if (group.length) out.push(merge(group));
    group = [];
  };
  for (const s of segments) {
    if (s.t1 - s.t0 > width + EPS) {
      flush();
      out.push(s);
      continue;
    }
    if (group.length && s.t1 > from + width + EPS) flush();
    if (!group.length) from = s.t0;
    group.push(s);
  }
  flush();
  return out;
}

/** The border (px) between segments: 1.5 for a plain wheel. */
export const BORDER = 1.5;

/**
 * The border of a segment `span` turns wide on a wheel that was coarsened. The border is the disc's colour and
 * would eat most of a merged segment (2.25° is ~3 px at the rim), so it tapers: none under 2.5°, growing
 * linearly to the full border at 6°. Long steps, which stay as they are, keep their border.
 */
export function border(span: number): number {
  return BORDER * Math.max(0, Math.min(1, (span * 360 - 2.5) / 3.5));
}
