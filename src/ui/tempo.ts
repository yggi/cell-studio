/**
 * The transport's tempo (Tempo.svelte), its arithmetic: a drag on the number, a key on it. Pure, tested (tempo.test.ts).
 */

type Range = { readonly value: number; readonly lo: number; readonly hi: number };

/** How far a drag moves (px) before it changes the tempo (less: a press, which opens the slider). */
const DRAG_PX = 4;
/** A drag this long (px) crosses the whole range. */
const RANGE_PX = 240;
/** A key's step: this part of the range. */
const STEPS = 100;

const clamp = (t: Range, v: number) => Math.max(t.lo, Math.min(t.hi, v));

/** The slider's step. */
export const stepOf = (t: Range) => (t.hi - t.lo) / STEPS;

/** A drag from where it started (`v0`) by dx, dy px (right or up: faster): the new value, clamped, or null while it's
 * still a press (moved less than DRAG_PX, and not yet a drag). */
export function dragged(t: Range, v0: number, dx: number, dy: number, dragging: boolean): number | null {
  const d = dx - dy;
  if (!dragging && Math.abs(d) < DRAG_PX) return null;
  return clamp(t, v0 + (d * (t.hi - t.lo)) / RANGE_PX);
}

/** A key on the number: ↑ → a step faster, ↓ ← a step slower (clamped); Escape closes the slider when it's open;
 * null for a key it doesn't take. */
export function keyed(t: Range, key: string, open: boolean): number | 'close' | null {
  if (key === 'ArrowUp' || key === 'ArrowRight') return clamp(t, t.value + stepOf(t));
  if (key === 'ArrowDown' || key === 'ArrowLeft') return clamp(t, t.value - stepOf(t));
  return key === 'Escape' && open ? 'close' : null;
}
