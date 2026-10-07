/**
 * Meters as ground (#27): a meter drives almost everything in a piece (`step=&bar`), so its edges would run from one
 * place to every part, crossing all the rest. As in a circuit, where ground isn't drawn as a wire to every part, the
 * graph draws a meter's net instead (GraphModel.nets, the step ones; laid by layout/nets.ts: meterNet). A belt
 * keeps its belt: a body, drawn.
 */
type Node = { id: string; kind: string; isMeter?: boolean; petalOf?: string };

/** The edges to a meter that aren't drawn (its net's taps), by id. */
export function groundsOf(model: { nets?: readonly { port: string; taps: readonly string[] }[] }): Set<string> {
  return new Set((model.nets ?? []).flatMap((n) => (n.port === 'step' ? n.taps : [])));
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

/** What tickLevel reads of a meter (a ResolvedCell). */
interface Ticking {
  readonly leveled: boolean;
  readonly units: readonly { readonly atom: { readonly kind: string; readonly value?: number } }[];
}

/**
 * The level of a meter's tick now (the palette's sync value, ui/palette.ts): 0 the bar's first, 1 a beat, 2 … 3 finer.
 * A meter written as levels (meter(…)) says each step's; any other clock: its first step 0, the rest 1.
 */
export function tickLevel(meter: Ticking | undefined, beatAt: number): number {
  const step = Math.floor(beatAt + 1e-9);
  const n = meter?.leveled ? meter.units.length : 0;
  const atom = n ? meter!.units[((step % n) + n) % n].atom : null;
  if (atom?.kind === 'note' && typeof atom.value === 'number') return Math.max(0, Math.min(3, Math.round(atom.value)));
  return step === 0 ? 0 : 1;
}
