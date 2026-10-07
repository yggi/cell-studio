/**
 * Meters as ground (#27): a meter drives almost everything in a piece (`step=&bar`), so its edges would run
 * from one place to every part, crossing all the rest. As in a circuit, where ground isn't drawn as a wire to
 * every part, the graph draws a meter's net instead (layout/physics.ts: meterNet). A belt keeps its belt: a body, drawn.
 */
type Node = { id: string; kind: string; isMeter?: boolean; petalOf?: string; cell?: { name: string; params: Readonly<Record<string, unknown>> } };
type Edge = { source: string; target: string; kind: string; label?: string; belt?: string };

/** An edge to a meter that isn't drawn: a step into a meter, not through a belt. */
export function isGround(e: Edge, byId: ReadonlyMap<string, Node>): boolean {
  return e.kind === 'step' && !e.belt && !!byId.get(e.target)?.isMeter;
}

/** Each meter's place among the piece's meters, in the order they're written. */
export function meterIndex(model: { nodes: readonly Node[] }): Map<string, number> {
  return new Map(model.nodes.filter((n) => n.isMeter && !n.petalOf).map((n, i) => [n.id, i]));
}

/**
 * Where a meter is now on its own wheel: `at`, the segment it's in (its step now), and `turn` (0 … 1, from the top,
 * clockwise), how far round it is within that segment. `beatAt` is where it is in its cycle, in beats
 * (LiveState.beatAt); segments are its wheel's (index: its beat).
 */
export function meterNow(segments: readonly { index: number; t0: number; t1: number }[], beatAt: number): { turn: number; at: number } | null {
  const beat = Math.floor(beatAt + 1e-9);
  const at = segments.findIndex((s) => s.index === beat);
  if (at < 0) return null;
  const s = segments[at];
  return { turn: s.t0 + (beatAt - beat) * (s.t1 - s.t0), at };
}
