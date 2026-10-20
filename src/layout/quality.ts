/**
 * How good a graph's layout is, in numbers (#27): crossings as drawn, the room it takes, how long its
 * edges are, overlaps, and how well its tagged clusters keep apart. Pure: positions in, numbers out.
 * The examples are the benchmark: `physics.library.test.ts` measures each one and compares the library
 * with `quality.baseline.json` (docs/testing.md).
 */
import { crossingCost } from './weights';
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
  /** The node it is part of (a product's junction: its voice). */
  readonly of?: string;
}

/** An edge as drawn: a spline from a to b through its bend (the straight midpoint if none). */
export interface DrawnEdge {
  readonly a: string;
  readonly b: string;
  readonly mid?: { readonly x: number; readonly y: number };
  /**
   * A belt: its runs as drawn, straight and above the wheels. Nothing hides them, so each run counts on its own (a
   * belt crosses twice) against every edge, and against every wheel it passes over but its own two.
   */
  readonly runs?: readonly (readonly [number, number, number, number])[];
  /** Its strength (weights.ts): what crossing it costs (1 when not given). */
  readonly weight?: number;
  /** Its kind (its band: values, sound, time): two of one kind crossing cost more (weights.ts: crossingCost). */
  readonly kind?: string;
  /** Where it leaves from, when not `a`'s centre: a bulb on a wheel (a section's sub-net, decision 016); `a` then names the bulb. */
  readonly from?: { readonly x: number; readonly y: number };
  /** Drawn as these straight pieces (a loom's strand, sectionloom.ts), not a spline from `a` to `b`. */
  readonly path?: readonly (readonly [number, number, number, number])[];
  /** Its loom (a selector's, sectionloom.ts): two strands of one loom are laid side by side there, so never cross. */
  readonly loom?: string;
}

export interface LayoutQuality {
  /** Cells laid out (tag names not counted). */
  readonly cells: number;
  /** Pairs of edges that cross as drawn (see drawnCrossings). */
  readonly crossings: number;
  /** The crossings weighed by what they cross (weights.ts: crossingCost): the two edges' strengths, more for two of one kind. */
  readonly cost: number;
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
  /** Edges that run under a wheel they don't meet, once for each such wheel (see edgesUnder). */
  readonly under: number;
}

/** A node that should sit in a direction from another (a tape's read head's cell, from the tape), radians. */
export interface Aim {
  readonly from: string;
  readonly to: string;
  readonly angle: number;
}

/** How far the point (px, py) is from the segment (x1, y1)–(x2, y2). */
export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const [dx, dy] = [x2 - x1, y2 - y1];
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Crossings as drawn: each edge's spline in short pieces, ignoring pieces hidden under a node's disc
 * (edges are drawn beneath the wheels). Pairs of edges that share a node don't count. A belt is drawn above the
 * wheels: each of its runs counts, against the edges and against each wheel it passes over.
 */
export function drawnCrossings(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[]): number {
  return crossingsOf(nodes, edges).count;
}

/** The crossings as drawn, counted and weighed. */
function crossingsOf(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[]): { count: number; cost: number } {
  const at = new Map(nodes.map((n) => [n.id, n]));
  const hidden = (x: number, y: number) => nodes.some((n) => Math.hypot(x - n.x, y - n.y) < n.r);
  const curves = edges.flatMap((e) => {
    // (a path is drawn as it is: its ends needn't be nodes, a loom's strand leaves a bulb)
    if (e.path)
      return [
        {
          a: e.a,
          b: e.b,
          pieces: e.path.filter((p) => !hidden((p[0] + p[2]) / 2, (p[1] + p[3]) / 2)) as [number, number, number, number][],
          belt: false,
          w: e.weight ?? 1,
          kind: e.kind,
          loom: e.loom,
        },
      ];
    const a = e.from ?? at.get(e.a);
    const b = at.get(e.b);
    if (!a || !b) return [];
    if (e.runs)
      return e.runs.map((r) => ({
        a: e.a,
        b: e.b,
        pieces: [r as [number, number, number, number]],
        belt: true,
        w: e.weight ?? 1,
        kind: e.kind,
        loom: undefined as string | undefined,
      }));
    const m = e.mid ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const pts = Array.from({ length: 17 }, (_, k) => splinePoint(a.x, a.y, m.x, m.y, b.x, b.y, k / 16));
    const pieces: [number, number, number, number][] = [];
    for (let k = 0; k < 16; k++) {
      const [p, q] = [pts[k], pts[k + 1]];
      if (!hidden((p.x + q.x) / 2, (p.y + q.y) / 2)) pieces.push([p.x, p.y, q.x, q.y]);
    }
    return [{ a: e.a, b: e.b, pieces, belt: false, w: e.weight ?? 1, kind: e.kind, loom: undefined as string | undefined }];
  });
  let n = 0;
  let cost = 0;
  // (a belt over a wheel: the wheel weighs as an edge would)
  for (const c of curves)
    if (c.belt)
      for (const w of nodes)
        if (!w.label && w.id !== c.a && w.id !== c.b && c.pieces.some((u) => distanceToSegment(w.x, w.y, u[0], u[1], u[2], u[3]) < w.r)) {
          n++;
          cost += c.w;
        }
  for (let i = 0; i < curves.length; i++)
    for (let j = i + 1; j < curves.length; j++) {
      const [p, q] = [curves[i], curves[j]];
      if (p.a === q.a || p.a === q.b || p.b === q.a || p.b === q.b) continue;
      // (two strands of one loom are laid side by side there: not a crossing)
      if (p.loom && p.loom === q.loom) continue;
      if (p.pieces.some((u) => q.pieces.some((v) => segmentsCross(u[0], u[1], u[2], u[3], v[0], v[1], v[2], v[3])))) {
        n++;
        cost += crossingCost(p, q);
      }
    }
  return { count: n, cost: Math.round(cost * 10) / 10 };
}

/** How much of a wheel's room an edge may pass through before it runs under the wheel: its disc, not its name. */
const UNDER = 0.7;

/**
 * Edges that run under a wheel they don't meet (drawn beneath it, they seem to go into it): each pair of an edge and a
 * wheel its line passes within the wheel's disc of, the wheel neither of its ends nor part of one (a junction and its
 * voice). A belt's runs over wheels are counted with the crossings; a tag's name isn't a wheel.
 */
function edgesUnder(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[]): number {
  const at = new Map(nodes.map((n) => [n.id, n]));
  const wheels = nodes.filter((n) => !n.label || n.of);
  let n = 0;
  for (const e of edges) {
    if (e.runs) continue;
    const pieces = piecesOf(e, at);
    if (!pieces.length) continue;
    // (a strand that leaves a bulb on a wheel, `table@bulb`, leaves that wheel)
    const [a, b] = [e.a.split('@')[0], e.b.split('@')[0]];
    const ends = new Set([a, b, at.get(a)?.of, at.get(b)?.of].filter(Boolean));
    for (const w of wheels) {
      if (ends.has(w.id) || (w.of && ends.has(w.of))) continue;
      if (pieces.some((u) => distanceToSegment(w.x, w.y, u[0], u[1], u[2], u[3]) < w.r * UNDER)) n++;
    }
  }
  return n;
}

/** An edge's line in short straight pieces, as drawn (its path, else its spline through its bend), none hidden. */
function piecesOf(e: DrawnEdge, at: ReadonlyMap<string, PlacedNode>): [number, number, number, number][] {
  if (e.path) return e.path as [number, number, number, number][];
  const a = e.from ?? at.get(e.a);
  const b = at.get(e.b);
  if (!a || !b) return [];
  const m = e.mid ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const pts = Array.from({ length: 17 }, (_, k) => splinePoint(a.x, a.y, m.x, m.y, b.x, b.y, k / 16));
  return pts.slice(1).map((q, k) => [pts[k].x, pts[k].y, q.x, q.y]);
}

/** Every number of LayoutQuality for one layout. Cluster discs are the graph's own (clusterDisc, pad 90, at least 120). */
export function layoutQuality(nodes: readonly PlacedNode[], edges: readonly DrawnEdge[], aims: readonly Aim[] = []): LayoutQuality {
  const cells = nodes.filter((n) => !n.label);
  const crossed = crossingsOf(nodes, edges);
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
    crossings: crossed.count,
    cost: crossed.cost,
    width: Math.round(width),
    height: Math.round(height),
    edge: Math.round(lengths.length ? lengths.reduce((s, v) => s + v, 0) / lengths.length : 0),
    overlap: Math.max(0, Math.round(overlap)),
    clusters,
    intruders,
    aim: Math.round(off.length ? off.reduce((s, v) => s + v, 0) / off.length : 0),
    under: edgesUnder(nodes, edges),
  };
}
