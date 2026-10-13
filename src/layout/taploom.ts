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

/**
 * The height of a loom's lane k, from its selector's hub (the table's centre, at the pill's bottom): 0 the source's,
 * the raw clock's bypass along the pill's bottom, under the hub; the taps' from 1, over the contacts, upwards.
 */
export const loomLane = (table: At, k: number) => (k === 0 ? table.y + BYPASS : table.y - CLEAR - (k - 1) * LANE);

/** Where tap k of n touches its selector: a flat fan of contacts over the hub, in the taps' order, left to right. */
export function loomContact(table: At, k: number, n: number): At {
  const u = n > 1 ? (2 * k) / (n - 1) - 1 : 0;
  return { x: table.x + (k - (n - 1) / 2) * CONTACT, y: table.y - FAN + FAN_DROP * u * u };
}

/**
 * The selector's two ports on the pill's bottom: the meter it steps on (and passes through), and its selection — each
 * where its wire into the hub crosses the pill's edge, from where its source is (`meter`, `select`), or beside the hub.
 */
export function loomPorts(table: At, meter?: At, select?: At): { meter: At; select: At } {
  const y = table.y + BYPASS + PORT_DROP;
  const at = (from: At | undefined, side: number) => {
    const x = from && from.y > y ? table.x + ((from.x - table.x) * (y - table.y)) / (from.y - table.y) : table.x + side * PORT;
    return { x: Math.max(table.x - 4 * PORT, Math.min(table.x + 4 * PORT, x)), y };
  };
  return { meter: at(meter, -1), select: at(select, 1) };
}

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
  /** A join of the tap's net between two cells it steps (`from` the one it comes on from), not a strand out of the pill. */
  readonly join?: string;
}

/** The first lane's distance over the hub, and a lane's height (px). */
const CLEAR = 58;
const LANE = 9;
/** The bypass's distance under the hub, and the ports' under the bypass (px). */
const BYPASS = 26;
const PORT_DROP = 12;
/** The contacts: their spacing, their height over the hub, how much lower the fan's ends sit; the ports' spacing (px). */
const CONTACT = 26;
const FAN = 30;
const FAN_DROP = 8;
const PORT = 16;
/** How round a strand's corners are (px). */
const ROUND = 8;

/**
 * The loom of a table (its wheel) and its taps, in their order: a strand for each tap and cell it steps. Its lowest
 * lane is its source's, under the table: a strand out of the table's bottom along it to each reader the bus goes on to (`readers`),
 * its riser drawn as the bus's own edge (`d` stops at the lane; `pieces` go on up, to be counted).
 */
export function tapLoom(table: Wheel, taps: readonly LoomTap[], readers: readonly LoomReader[] = [], meter: At = loomPorts(table).meter): LoomStrand[] {
  const strand = (bulb: string, tap: number, from: At, lane: number, c: Wheel & { id: string }, riser: boolean) => {
    // (to its cell's bottom when it sits over the lane, else its top)
    const end = c.y < lane ? c.y + c.r : c.y - c.r;
    const pts: At[] = [from, { x: from.x, y: lane }, { x: c.x, y: lane }, { x: c.x, y: end }];
    const pieces = pts.slice(1).map((q, i) => [pts[i].x, pts[i].y, q.x, q.y] as const);
    return { bulb, tap, to: c.id, pieces, d: rounded(riser ? pts : pts.slice(0, 3)) };
  };
  return [
    // (the source's: in at the meter's port, up to the bypass, along it and straight up to its reader)
    ...readers.map((c) => strand('', -1, meter, loomLane(table, 0), c, !!c.rise)),
    ...taps.flatMap((t, k) => {
      if (!t.to.length) return [];
      // (a tap's net: one strand out of the pill, to its lowest cell; the others join on from the nearest already
      // reached, straight, as a meter's net is laid — one net between its cells, not a riser each)
      const lane = loomLane(table, k + 1);
      const entry = t.to.reduce((p, c) => (c.y > p.y + 1e-6 || (Math.abs(c.y - p.y) <= 1e-6 && Math.abs(c.x - t.from.x) < Math.abs(p.x - t.from.x)) ? c : p));
      const reached = [entry];
      const out: LoomStrand[] = [strand(t.bulb, k, t.from, lane, entry, true)];
      const left = t.to.filter((c) => c !== entry);
      while (left.length) {
        let best = { i: 0, from: reached[0], d: Infinity };
        left.forEach((c, i) => reached.forEach((r) => Math.hypot(c.x - r.x, c.y - r.y) < best.d && (best = { i, from: r, d: Math.hypot(c.x - r.x, c.y - r.y) })));
        const [c] = left.splice(best.i, 1);
        const a = best.from;
        out.push({ bulb: t.bulb, tap: k, to: c.id, join: a.id, pieces: [[a.x, a.y, c.x, c.y]], d: rounded([a, c]) });
        reached.push(c);
      }
      return out;
    }),
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

/** What an edge needs of a selector drawn as a pill to meet it: the pill, its ports, and who comes in at them. */
export interface PillEnds {
  readonly pill: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };
  readonly ports: { readonly meter: At; readonly select: At };
  readonly feeds: { readonly meter?: string; readonly select?: string };
}

/**
 * Where an edge from `other` (its node id, and where its end is) meets a selector drawn as a pill: its meter and its
 * chooser at their ports, anything else on the pill's outline, at the point nearest it — never at the table's centre,
 * which nothing draws.
 */
export function pillAnchor(l: PillEnds, other: string, from: At): At {
  if (other === l.feeds.select) return l.ports.select;
  if (other === l.feeds.meter) return l.ports.meter;
  // (the outline: a stadium, its straight part from x0 + r to x1 - r, r half its height)
  const r = (l.pill.y1 - l.pill.y0) / 2;
  const q = { x: Math.max(l.pill.x0 + r, Math.min(l.pill.x1 - r, from.x)), y: l.pill.y0 + r };
  const d = Math.hypot(from.x - q.x, from.y - q.y);
  return d ? { x: q.x + ((from.x - q.x) / d) * r, y: q.y + ((from.y - q.y) / d) * r } : { x: q.x, y: l.pill.y0 };
}
