/**
 * The looms round the wheels (geometry.ts loomPaths): which buses leave a wheel round it, the band of tracks each takes,
 * and how far out they reach — so the edges draw them in bands, and the layout gives each wheel the room its loom takes.
 */
import type { GraphEdge, GraphModel } from '../engine/graph';

/** The gap between a bus's strands, px. */
export const STRAND_GAP = 4;
/** A bus's least straight run out of a loom, before the next one's (px): room between two looms. */
const RUN = 18;

/** The strands a bus takes round its source's loom: a table's entries (12 at most), a ref's picks (two or more). */
function busStrands(e: GraphEdge): number {
  // (a table read through, over=, or looked up, map=: its entries)
  if (e.port === 'over') return e.width >= 2 ? Math.min(12, e.width) : 0;
  if (e.port !== 'braid') return 0;
  const picks = e.transforms.flatMap((t) => t.flatMap((st) => (st.kind === 'pick' && !st.pick.abs ? [st.pick] : [])));
  return picks.length >= 2 ? picks.length : 0;
}

/**
 * Each bus's band of tracks round its source's wheel (in tracks, from the inside): one loom per wheel, the larger buses
 * inside, a track a strand and one between bands. A table read by several leaves it once (its net: the others come on
 * from a reader), so its edges share a band. And each wheel's tracks in all.
 */
export function loomBands(model: GraphModel): { inner: Map<string, number>; tracks: Map<string, number> } {
  const netOf = new Map((model.nets ?? []).flatMap((n) => n.taps.map((id) => [id, n.id] as const)));
  const groups = new Map<string, Map<string, { n: number; ids: string[] }>>();
  for (const e of model.edges) {
    const n = busStrands(e);
    if (!n) continue;
    const bySource = groups.get(e.from) ?? new Map<string, { n: number; ids: string[] }>();
    groups.set(e.from, bySource);
    const key = netOf.get(e.id) ?? e.id;
    const g = bySource.get(key) ?? { n, ids: [] };
    g.ids.push(e.id);
    bySource.set(key, g);
  }
  const inner = new Map<string, number>();
  const tracks = new Map<string, number>();
  for (const [source, bySource] of groups) {
    let at = 0;
    for (const g of [...bySource.values()].sort((a, b) => b.n - a.n)) {
      for (const id of g.ids) inner.set(id, at);
      at += g.n + 1;
    }
    tracks.set(source, at);
  }
  return { inner, tracks };
}

/** How far a wheel's loom reaches past its taps (px), and a bus's straight run out of it: 0 without one. */
export function loomReach(model: GraphModel): Map<string, number> {
  return new Map([...loomBands(model).tracks].map(([id, t]) => [id, (1.5 + t) * STRAND_GAP + RUN]));
}
