/**
 * A selector's loom (the tower layout, docs/notes/tower-strip.md): what a table of taps steps (decision 016) leaves its
 * taps not as a tree of traces but as one horizontal loom over the table: each tap a lane of its own, its strand up from
 * its bulb to its lane, along it to each cell it steps, and straight up (or down) to it. Its strands cross each other
 * only inside the loom, where it is laid cleanly: those crossings don't count (quality.ts: `loom`).
 */

/** A point, and a wheel: its centre and radius. */
interface At {
  readonly x: number;
  readonly y: number;
}
interface Wheel extends At {
  readonly r: number;
}

/** A cell the table's source (the bus it is stepped by) goes on to out of the loom: from its lane, straight up. */
export type LoomReader = Wheel & { readonly id: string; readonly rise?: boolean };

/** The height of a loom's lane k (0 the source's, the lowest; the taps' from 1). */
export const loomLane = (table: Wheel, k: number) => table.y - table.r - CLEAR - k * LANE;

/** One tap of a table: its bulb's name, where its bulb is, and the cells it steps. */
export interface LoomTap {
  readonly bulb: string;
  readonly from: At;
  readonly to: readonly (Wheel & { readonly id: string })[];
}

/** A strand of a loom: from a tap's bulb to one cell it steps, as straight pieces and as a path. */
export interface LoomStrand {
  readonly bulb: string;
  /** Its tap's place among the table's (0 the first): its section's colour; -1, the source's lane. */
  readonly tap: number;
  readonly to: string;
  readonly pieces: readonly (readonly [number, number, number, number])[];
  readonly d: string;
}

/** The first lane's distance over the table's top, and a lane's height (px). */
const CLEAR = 26;
const LANE = 9;
/** How round a strand's corners are (px). */
const ROUND = 8;

/**
 * The loom of a table (its wheel) and its taps, in their order: a strand for each tap and cell it steps. Its lowest
 * lane is its source's: a strand out of the table's centre along it to each reader the bus goes on to (`readers`),
 * its riser drawn as the bus's own edge (`d` stops at the lane; `pieces` go on up, to be counted).
 */
export function tapLoom(table: Wheel, taps: readonly LoomTap[], readers: readonly LoomReader[] = []): LoomStrand[] {
  const strand = (bulb: string, tap: number, from: At, lane: number, c: Wheel & { id: string }, riser: boolean) => {
    // (to its cell's bottom when it sits over the lane, else its top)
    const end = c.y < lane ? c.y + c.r : c.y - c.r;
    const pts: At[] = [from, { x: from.x, y: lane }, { x: c.x, y: lane }, { x: c.x, y: end }];
    const pieces = pts.slice(1).map((q, i) => [pts[i].x, pts[i].y, q.x, q.y] as const);
    return { bulb, tap, to: c.id, pieces, d: rounded(riser ? pts : pts.slice(0, 3)) };
  };
  return [
    ...readers.map((c) => strand('', -1, table, loomLane(table, 0), c, !!c.rise)),
    ...taps.flatMap((t, k) => t.to.map((c) => strand(t.bulb, k, t.from, loomLane(table, k + 1), c, true))),
  ];
}

/** A polyline with its corners rounded (a quarter of a circle, at most ROUND, as the turns allow). */
function rounded(pts: readonly At[]): string {
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [p, q, n] = [pts[i - 1], pts[i], pts[i + 1]];
    const r = Math.min(ROUND, Math.hypot(q.x - p.x, q.y - p.y) / 2, Math.hypot(n.x - q.x, n.y - q.y) / 2);
    const a = toward(q, p, r);
    const b = toward(q, n, r);
    d += ` L${a.x.toFixed(1)},${a.y.toFixed(1)} Q${q.x.toFixed(1)},${q.y.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
}

const toward = (from: At, to: At, r: number): At => {
  const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: from.x + ((to.x - from.x) / l) * r, y: from.y + ((to.y - from.y) / l) * r };
};
