/**
 * The transport's timeline (Timeline.svelte), its arithmetic: the sections as segments, the segment at a time, the time
 * under a point, a key's target, a press that turns into a drag. Pure, tested (timeline.test.ts).
 */

export type Section = { readonly at: number; readonly label: string };
/** A run of sections with one name (drop · drop): one segment, a tick at each repeat's start. */
export type Segment = { readonly from: number; readonly to: number; readonly label: string; readonly named: boolean; readonly ticks: readonly number[] };

/** A name's width in px, roughly, per character (600 11px) … */
const CHAR_PX = 6.8;
/** … and its padding. */
const NAME_PAD = 16;
/** How far a press on a name moves (px) before it's a drag. */
export const DRAG_PX = 4;
/** ← → move this many seconds. */
const KEY_STEP = 5;
/** Page Up within this many seconds of a segment's start goes to the one before (as a player's "previous"). */
const PAGE_GRACE = 1;

/** The segments over `span` seconds on a track `width` px wide (none when there's nothing to move in). */
export function segmentsOf(sections: readonly Section[] | null, span: number | null, width: number): Segment[] {
  if (!span) return [];
  const list: { from: number; to: number; label: string; ticks: number[] }[] = [];
  // (before the first section: a segment without a name)
  const first = sections?.[0]?.at ?? span;
  if (first > 0) list.push({ from: 0, to: first, label: '', ticks: [] });
  for (const [i, s] of (sections ?? []).entries()) {
    const to = sections![i + 1]?.at ?? span;
    const last = list.at(-1);
    if (i > 0 && last?.label === s.label) {
      last.ticks.push(s.at);
      last.to = to;
    } else list.push({ from: s.at, to, label: s.label, ticks: [] });
  }
  return list.map((g) => ({ ...g, named: !!g.label && ((g.to - g.from) / span) * width > g.label.length * CHAR_PX + NAME_PAD }));
}

/** The segment `t` is in (at a boundary: the one it starts; at the end or past it: the last). */
export function segmentAt(segments: readonly Segment[], t: number): Segment | null {
  return segments.find((s) => s.from <= t + 1e-6 && t < s.to) ?? segments.at(-1) ?? null;
}

/** The time under `x` (px, as a pointer's clientX) on a track at `rect`: clamped to 0 … span. */
export function timeAt(x: number, rect: { readonly left: number; readonly width: number }, span: number): number {
  return Math.max(0, Math.min(1, (x - rect.left) / rect.width)) * span;
}

/** Where a key on the timeline goes (clamped to 0 … span), or null for a key it doesn't take. */
export function keyTarget(key: string, now: number, span: number, segments: readonly Segment[]): number | null {
  const starts = segments.map((s) => s.from);
  const to =
    key === 'ArrowLeft' || key === 'ArrowDown'
      ? now - KEY_STEP
      : key === 'ArrowRight' || key === 'ArrowUp'
        ? now + KEY_STEP
        : key === 'PageUp'
          ? ([...starts].reverse().find((t) => t < now - PAGE_GRACE) ?? 0)
          : key === 'PageDown'
            ? // (in the last segment: the end, as End)
              (starts.find((t) => t > now + 1e-6) ?? span)
            : key === 'Home'
              ? 0
              : key === 'End'
                ? span
                : null;
  return to === null ? null : Math.max(0, Math.min(span, to));
}

/** A press on a name (its section's start, `jump`) still jumps there while it has moved less than DRAG_PX from `x0`;
 * then it's a drag (null). */
export function stillJump(jump: number | null, x0: number, x: number): number | null {
  return jump !== null && Math.abs(x - x0) < DRAG_PX ? jump : null;
}
