/**
 * A gate's wheel (#234, the gate node; docs/language/mix.md: a gate): its trigger's notes round its ring, and its
 * receivers, the voices it plays, as small wheels fanned over its top, where its sound leaves. Pure geometry, shared by
 * the graph (the room the wheel takes) and the glyph (where it draws them).
 */
import type { CompileResult } from '../engine/program';
import { wheelGeometry } from './wheel';

/** A gate's trigger and its receivers (the voices in its braid, as read), or null: not a gate. */
export function gateOf(result: CompileResult, name: string): { trigger: string; receivers: readonly string[] } | null {
  const c = result.cells.get(name);
  const trigger = c?.params.trigger;
  if (!c || typeof trigger !== 'string') return null;
  return { trigger, receivers: (c.mix ?? []).map((b) => b.voice.name) };
}

/**
 * Where a gate's receivers sit on its wheel, `size` px across: each a small wheel just outside the ring, fanned over the
 * top (a fifth of a turn between neighbours at most), centre from the wheel's centre (px) and radius.
 */
export function receiverPlaces(size: number, n: number): { x: number; y: number; r: number }[] {
  if (!n) return [];
  const g = wheelGeometry(size);
  const r = Math.max(8, size * (n > 3 ? 0.13 : 0.17));
  const d = g.rOuter + r + 3 * g.k;
  // (neighbours just apart on that circle, a fifth of a turn at most)
  const step = Math.min(0.2, (2 * r + 6) / (2 * Math.PI * d));
  return Array.from({ length: n }, (_, i) => {
    const turn = (i - (n - 1) / 2) * step;
    return { x: d * Math.sin(turn * 2 * Math.PI), y: -d * Math.cos(turn * 2 * Math.PI), r };
  });
}

/** How far a gate's receivers reach past its wheel (px): the room the layout leaves it. */
export function gateRoom(size: number, n: number): number {
  return Math.max(0, ...receiverPlaces(size, n).map((p) => Math.hypot(p.x, p.y) + p.r - size / 2));
}
