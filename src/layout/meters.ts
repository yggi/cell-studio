/**
 * Meters as ground (#27): a meter drives almost everything in a piece (`step=&bar`), so its edges would run
 * from one place to every part, crossing all the rest. As in a circuit, where ground isn't drawn as a wire to
 * every part, the graph leaves those edges out: each cell a meter steps wears a ring in that meter's colour (its
 * rate on it), and the layout doesn't pull on them either. A belted cell keeps its belt: that's a body, drawn.
 */
type Node = { id: string; kind: string; isMeter?: boolean; petalOf?: string; cell?: { name: string; params: Readonly<Record<string, unknown>> } };
type Edge = { source: string; target: string; kind: string; label?: string };

/** An edge to a meter that isn't drawn: a step into a meter, not through a belt. */
export function isGround(e: Edge, byId: ReadonlyMap<string, Node>): boolean {
  if (e.kind !== 'step' || !byId.get(e.target)?.isMeter) return false;
  return typeof byId.get(e.source)?.cell?.params.belt !== 'number';
}

export interface MeterRing {
  /** Which meter: its place among the piece's meters, in the order they're written (its colour). */
  readonly meter: number;
  /** Its name: the ring is its wheel's segments, turning as it turns. */
  readonly name: string;
  /** The rate against it, as the edge said it (÷2, ×8, loop ×16; '' at its own rate). */
  readonly rate: string;
}

/** Each meter's place among the piece's meters, in the order they're written. */
export function meterIndex(model: { nodes: readonly Node[] }): Map<string, number> {
  return new Map(model.nodes.filter((n) => n.isMeter && !n.petalOf).map((n, i) => [n.id, i]));
}

/** The ring each cell wears: the meter that steps it, and at what rate. */
export function meterRings(model: { nodes: readonly Node[]; edges: readonly Edge[] }): Map<string, MeterRing> {
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const index = meterIndex(model);
  const rings = new Map<string, MeterRing>();
  for (const e of model.edges)
    if (isGround(e, byId)) rings.set(e.source, { meter: index.get(e.target) ?? 0, name: byId.get(e.target)?.cell?.name ?? '', rate: e.label ?? '' });
  return rings;
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
