/**
 * How good a graph's layout is, in numbers (#27): crossings as drawn, the room it takes, how long its
 * edges are, overlaps, and how well its tagged clusters keep apart. Pure: positions in, numbers out.
 * The examples are the benchmark: `physics.library.test.ts` measures each one and compares the library
 * with `quality.baseline.json` (docs/testing.md).
 */
import { clusterDisc } from './clusters';
import { segmentsCross, splinePoint } from './geometry';

/** A node as laid out: its centre, its room (radius) and the tags it carries (none for a tag's own name). */
export interface PlacedNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly tags?: readonly string[];
  /** Hides the edges under it, but isn't a cell (a tag's name): not counted in room, overlaps or clusters. */
  readonly label?: boolean;
}

/** An edge as drawn: a spline from a to b through its bend (the straight midpoint if none). */
export interface DrawnEdge {
  readonly a: string;
  readonly b: string;
  readonly mid?: { readonly x: number; readonly y: number };
}

export interface LayoutQuality {
  /** Cells laid out (tag names not counted). */
  readonly cells: number;
  /** Pairs of edges that cross as drawn (see drawnCrossings). */
  readonly crossings: number;
  /** The bounding box of the cells' rooms, px. */
  readonly width: number;
  readonly height: number;
  /** Mean edge length (straight, centre to centre), px. */
  readonly edge: number;
  /** The deepest overlap of two cells' rooms, px (0: none touch). */
  readonly overlap: number;
  /** Pairs of tag clusters whose discs (as the graph draws them) overlap. */
  readonly clusters: number;
  /** Cells inside the disc of a tag they don't carry. */
  readonly intruders: number;
  /** How far, on average, a node is turned away from where it should sit (a tape's read head's cell from its head), degrees; 0 when none. */
  readonly aim: number;
}

/** A node that should sit in a direction from another (a tape's read head's cell, from the tape), radians. */
export interface Aim {
  readonly from: string;
  readonly to: string;
  readonly angle: number;
}

/**
 * Crossings as drawn: each edge's spline in short pieces, ignoring pieces hidden under a node's disc
 * (edges are drawn beneath the wheels). Pairs of edges that share a node don't count.
 */
export function drawnCrossings(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[]): number {
  return drawnCrossingPairs(nodes, edges).length;
}

/** The pairs of edges that cross as drawn (drawnCrossings counts them). */
export function drawnCrossingPairs(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[]): [DrawnEdge, DrawnEdge][] {
  const at = new Map(nodes.map((n) => [n.id, n]));
  const hidden = (x: number, y: number) => nodes.some((n) => Math.hypot(x - n.x, y - n.y) < n.r);
  const curves = edges.flatMap((e) => {
    const a = at.get(e.a);
    const b = at.get(e.b);
    if (!a || !b) return [];
    const m = e.mid ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const pts = Array.from({ length: 17 }, (_, k) => splinePoint(a.x, a.y, m.x, m.y, b.x, b.y, k / 16));
    const pieces: [number, number, number, number][] = [];
    for (let k = 0; k < 16; k++) {
      const [p, q] = [pts[k], pts[k + 1]];
      if (!hidden((p.x + q.x) / 2, (p.y + q.y) / 2)) pieces.push([p.x, p.y, q.x, q.y]);
    }
    return [{ edge: e, pieces }];
  });
  const out: [DrawnEdge, DrawnEdge][] = [];
  for (let i = 0; i < curves.length; i++)
    for (let j = i + 1; j < curves.length; j++) {
      const [p, q] = [curves[i], curves[j]];
      if (p.edge.a === q.edge.a || p.edge.a === q.edge.b || p.edge.b === q.edge.a || p.edge.b === q.edge.b) continue;
      if (p.pieces.some((u) => q.pieces.some((v) => segmentsCross(u[0], u[1], u[2], u[3], v[0], v[1], v[2], v[3])))) out.push([p.edge, q.edge]);
    }
  return out;
}

/** Every number of LayoutQuality for one layout. Cluster discs are the graph's own (clusterDisc, pad 90, at least 120). */
export function layoutQuality(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[], aims: readonly Aim[] = []): LayoutQuality {
  const cells = nodes.filter((n) => !n.label);
  const at = new Map(cells.map((n) => [n.id, n]));
  const box = (f: (n: PlacedNode) => number) => (cells.length ? Math.max(...cells.map(f)) : 0);
  const width = cells.length ? box((n) => n.x + n.r) + box((n) => -(n.x - n.r)) : 0;
  const height = cells.length ? box((n) => n.y + n.r) + box((n) => -(n.y - n.r)) : 0;
  const lengths = edges.flatMap((e) => {
    const a = at.get(e.a);
    const b = at.get(e.b);
    return a && b && a !== b ? [Math.hypot(a.x - b.x, a.y - b.y)] : [];
  });
  let overlap = 0;
  for (let i = 0; i < cells.length; i++)
    for (let j = i + 1; j < cells.length; j++) {
      const [a, b] = [cells[i], cells[j]];
      overlap = Math.max(overlap, a.r + b.r - Math.hypot(a.x - b.x, a.y - b.y));
    }
  const byTag = new Map<string, PlacedNode[]>();
  for (const n of cells) for (const t of n.tags ?? []) (byTag.get(t) ?? byTag.set(t, []).get(t)!).push(n);
  const discs = [...byTag].map(([tag, ms]) => ({ tag, ...clusterDisc(ms, 90, 120) }));
  let clusters = 0;
  for (let i = 0; i < discs.length; i++)
    for (let j = i + 1; j < discs.length; j++) {
      const [p, q] = [discs[i], discs[j]];
      // (two tags on the same cells are one cluster drawn twice, not two that overlap)
      const shared = byTag.get(p.tag)!.some((n) => n.tags!.includes(q.tag));
      if (!shared && Math.hypot(p.x - q.x, p.y - q.y) < p.r + q.r) clusters++;
    }
  const intruders = cells.filter((n) => discs.some((d) => !n.tags?.includes(d.tag) && Math.hypot(n.x - d.x, n.y - d.y) < d.r)).length;
  const off = aims.flatMap(({ from, to, angle }) => {
    const a = at.get(from);
    const b = at.get(to);
    if (!a || !b) return [];
    const d = Math.atan2(b.y - a.y, b.x - a.x) - angle;
    return [Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * (180 / Math.PI)];
  });
  return {
    cells: cells.length,
    crossings: drawnCrossings(nodes, edges),
    width: Math.round(width),
    height: Math.round(height),
    edge: Math.round(lengths.length ? lengths.reduce((s, v) => s + v, 0) / lengths.length : 0),
    overlap: Math.max(0, Math.round(overlap)),
    clusters,
    intruders,
    aim: Math.round(off.length ? off.reduce((s, v) => s + v, 0) / off.length : 0),
  };
}
