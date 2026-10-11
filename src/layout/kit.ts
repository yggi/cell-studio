/**
 * A kit's wheel (a table of voices, `&kit &bd &sd &hh`: docs/language/sound.md): one slice per member, and each member
 * that only the kit plays sits on it as a bulb, just outside its own slice (decision 021): where the number that picks it
 * points. Pure geometry, shared by the graph (the room the wheel takes) and the glyph (where it draws them).
 */
import type { CompileResult } from '../engine/program';
import { polar } from './geometry';
import { wheelGeometry } from './wheel';

/** A kit's members (the voices in its braid, in order: 0 the first), or null: not a table of voices (a groove steps). */
export function kitOf(result: CompileResult, name: string): readonly string[] | null {
  const c = result.cells.get(name);
  if (!c?.kit || c.step || typeof c.params.scope === 'string') return null;
  return c.units.flatMap((u) => (u.atom.kind === 'ref' ? [u.atom.name] : []));
}

/**
 * Where a kit's members sit on its wheel, `size` px across: each a small wheel just outside the ring, at the middle of
 * its slice (clockwise from 12 o'clock, as the slices are), centre from the wheel's centre (px) and radius.
 */
export function memberPlaces(size: number, n: number): { x: number; y: number; r: number }[] {
  if (!n) return [];
  const g = wheelGeometry(size);
  // (as big as the slice leaves room for between neighbours, a sixth of the wheel at most)
  const d0 = g.rOuter + 3 * g.k;
  const r = Math.max(8, Math.min(size * 0.17, n > 1 ? (Math.PI * d0) / n - 3 : size * 0.17));
  const d = d0 + r;
  return Array.from({ length: n }, (_, i) => {
    const [x, y] = polar(0, 0, d, (i + 0.5) / n);
    return { x, y, r };
  });
}

/** How far a kit's members reach past its wheel (px), all round: the room the layout leaves it. */
export function kitRoom(size: number, n: number): number {
  return Math.max(0, ...memberPlaces(size, n).map((p) => Math.hypot(p.x, p.y) + p.r - size / 2));
}
