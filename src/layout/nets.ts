/**
 * The nets (docs/notes/nets.md): a net's tree as things stand now (netTree), its joins as springs and wheels kept off
 * them (stepNets), where each tap of a bus comes from (taps, hops), and each meter's net of traces (meterNet), costed
 * by what a straight edge runs into (hits, drawnPieces).
 */
import type { GraphModel } from '@yggi/cells/engine/graph';
import { segmentsCross, splinePoint } from './geometry';
import { GROUND_PULL, linkPull } from './options';
import { nodeAt, type LayoutState, type MeterTrace, type PhysNode } from './state';
import { UNTURNED } from './tape';
import { loomLane } from './taploom';

/**
 * (the tower layout, tapLoom) Each selector drawn as a loom (taploom.ts), by its table's id: its wheel as the loom
 * reads it, its source's lane and the loom's span (its bulbs and the cells its taps step).
 */
export function loomsOf(s: LayoutState): Map<string, Loom> {
  const out = new Map<string, Loom>();
  if (!s.opts.tapLoom) return out;
  const bulbs = new Map<string, Set<string>>();
  for (const g of s.grounds) {
    if (!g.bulb || !g.at) continue;
    const [t, c] = [s.byId.get(g.meter), s.byId.get(g.cell)];
    if (t?.x === undefined || t.y === undefined) continue;
    const w = { x: t.x, y: t.y, r: t.radius * 0.7 };
    const l = out.get(g.meter) ?? { ...w, lane: loomLane(w, 0), top: 0, x0: t.x, x1: t.x };
    for (const x of [t.x + g.at.x, c?.x ?? t.x]) [l.x0, l.x1] = [Math.min(l.x0, x), Math.max(l.x1, x)];
    bulbs.set(g.meter, (bulbs.get(g.meter) ?? new Set()).add(g.bulb));
    out.set(g.meter, l);
  }
  for (const [id, l] of out) l.top = loomLane(l, bulbs.get(id)!.size);
  return out;
}

/** A selector's loom as the forces see it: its table's wheel, its source's lane, its top lane, its span. */
interface Loom {
  x: number;
  y: number;
  r: number;
  /** The source's lane (the lowest) and the top lane, the graph's y. */
  lane: number;
  top: number;
  x0: number;
  x1: number;
}

/** Does the straight segment a–b pass through a loom's band (from its top lane to its table's top, over its span)? */
function throughLoom(l: Loom, ax: number, ay: number, bx: number, by: number): boolean {
  for (let k = 1; k < 8; k++) {
    const [x, y] = [ax + ((bx - ax) * k) / 8, ay + ((by - ay) * k) / 8];
    if (x > l.x0 && x < l.x1 && y > l.top && y < l.y - l.r) return true;
  }
  return false;
}

/** A short straight piece of a drawn edge (its spline), with its ends. */
export type Piece = { a: string; b: string; seg: [number, number, number, number] };

/**
 * Where a net's bulb is from its owner's centre, as the layout has turned the owner: a read head's turns with its
 * tape (decision 021; GraphEdge.bulbAt is it unturned), a tap's stays on its table.
 */
function bulbOf(s: LayoutState, net: GraphModel['nets'][number]): { x: number; y: number; r: number } | undefined {
  const at = net.bulbAt;
  const turn = s.turns.get(net.owner);
  if (!at || turn === undefined) return at;
  const by = turn - (UNTURNED * Math.PI) / 180;
  const [c, sn] = [Math.cos(by), Math.sin(by)];
  return { x: at.x * c - at.y * sn, y: at.x * sn + at.y * c, r: at.r };
}

/**
 * A net's tree as things stand now, a ratsnest (as KiCad shows one, and lays again as a part moves): the readers
 * are its junctions — it comes into a cell and flares out of it to the next — each joined to the one nearest it
 * already joined, a join through a wheel costing as much again for each wheel. A bus (a table's, a melody's) leaves
 * its owner once, to the reader nearest it; a meter's ground joins it wherever it is nearest. Sound branches from its
 * owner to each reader (a star): a voice into two mixes doesn't pass through the one to the other; so do taps at a
 * delay (a canon's copies, a tape's heads), each delay counted from the owner. By tap (edge id): the node it comes
 * from, and its reader. `ends`: each tap's reader (the forces' nets by default; the drawn ones' for drawing).
 */
export function netTree(s: LayoutState, net: GraphModel['nets'][number], ends = s.edgeEnds): Map<string, { from: string; to: string }> {
  const out = new Map<string, { from: string; to: string }>();
  const owner = s.byId.get(net.owner);
  // (a tap's sub-net leaves from its bulb on its table: decision 016; a read head's, from its bulb on its tape)
  const at = bulbOf(s, net);
  const o = owner && at ? { ...owner, x: (owner.x ?? 0) + at.x, y: (owner.y ?? 0) + at.y, radius: at.r } : owner;
  // (a reader may be a product's junction: as drawn)
  const readers = net.readers.flatMap((id) => {
    const n = nodeAt(s, ends.get(id) ?? '');
    return n && n !== owner ? [{ id, n }] : [];
  });
  if (!o || !readers.length) return out;
  // (the wheels, as plain numbers: this runs every tick, for every pair of a net's ends)
  const ws = [...s.byId.values()].filter((w) => w.role !== 'tag');
  const wx = ws.map((w) => w.x ?? 0);
  const wy = ws.map((w) => w.y ?? 0);
  const wr = ws.map((w) => w.radius * 0.8);
  const cost = (a: PhysNode, b: PhysNode) => {
    const [ax, ay, bx, by] = [a.x ?? 0, a.y ?? 0, b.x ?? 0, b.y ?? 0];
    const [dx, dy] = [bx - ax, by - ay];
    const l2 = dx * dx + dy * dy || 1;
    const [x0, x1, y0, y1] = [Math.min(ax, bx), Math.max(ax, bx), Math.min(ay, by), Math.max(ay, by)];
    let through = 0;
    for (let i = 0; i < ws.length; i++) {
      const [x, y, r] = [wx[i], wy[i], wr[i]];
      if (x < x0 - r || x > x1 + r || y < y0 - r || y > y1 + r || ws[i] === a || ws[i] === b) continue;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      const [px, py] = [ax + t * dx - x, ay + t * dy - y];
      if (px * px + py * py < r * r) through++;
    }
    return Math.max(1, Math.sqrt(l2) - a.radius - b.radius) * (1 + through);
  };
  const bus = net.port !== 'step';
  if (net.band === 'audio' || net.delayed) {
    for (const r of readers) out.set(r.id, { from: o.id, to: r.n.id });
    return out;
  }
  const left = [...readers];
  // (the tower layout, tapLoom: a selector's table passes its bus on only out of its loom's source lane, anywhere
  // along it, straight up to a reader over it)
  const looms = loomsOf(s);
  // (loomRide: a ride on a loom that carries the bus is that much cheaper; a join through one costs ten times over)
  const carriers = readers.flatMap((r) => (looms.has(r.n.id) ? [looms.get(r.n.id)!] : []));
  const crossing = (a: PhysNode, b: PhysNode) => (carriers.some((l) => throughLoom(l, a.x ?? 0, a.y ?? 0, b.x ?? 0, b.y ?? 0)) ? 10 : 1);
  const ride = s.opts.loomRide;
  // (each reader's cheapest join so far, and what to)
  const best = left.map((r) => ({ cost: cost(o, r.n) * crossing(o, r.n), from: o }));
  while (left.length) {
    const k = best.reduce((b, c, i) => (c.cost < best[b].cost ? i : b), 0);
    const [r] = left.splice(k, 1);
    const [{ from }] = best.splice(k, 1);
    out.set(r.id, { from: from.id, to: r.n.id });
    // (a bus has left its owner: only the readers join on)
    left.forEach((q, i) => {
      if (bus && best[i].from === o) best[i] = { cost: Infinity, from: o! };
      const l = looms.get(r.n.id);
      const top = (q.n.y ?? 0) + q.n.radius * 0.7;
      if (l && top >= l.lane) return;
      const c = l ? (l.lane - top + Math.max(0, l.x0 - (q.n.x ?? 0), (q.n.x ?? 0) - l.x1)) * ride : cost(r.n, q.n) * crossing(r.n, q.n);
      if (c < best[i].cost) best[i] = { cost: c, from: r.n };
    });
  }
  return out;
}

/**
 * Nets in the forces: each join of a net's tree a spring, as strong as the edge it stands for (a meter's as its
 * ground).
 */
export function stepNets(s: LayoutState, alpha: number): void {
  const o = s.opts;
  if (o.netPull <= 0) return;
  // (laid again every tick: measured, it settles better than a tree kept for a few — docs/notes/nets.md; a net at
  // delays is a star, pulled by its edges' own springs: physics.ts)
  const trees = s.nets.filter((net) => !net.delayed).map((net) => ({ net, tree: netTree(s, net) }));
  const looms = loomsOf(s);
  for (const { net, tree } of trees) {
    const bus = net.port !== 'step';
    for (const { from, to } of tree.values()) {
      const [a, b] = [s.byId.get(from), s.byId.get(to)];
      if (!a || !b) continue;
      // (from a tap's bulb, not its table's centre: decision 016)
      const off = (from === net.owner && bulbOf(s, net)) || { x: 0, y: 0 };
      const [dx, dy] = [(b.x ?? 0) - (a.x ?? 0) - off.x, (b.y ?? 0) - (a.y ?? 0) - off.y];
      const l = Math.hypot(dx, dy) || 1;
      // (as d3's link: towards its length, shared by the two ends)
      const rest = s.size * (bus ? o.linkDistance * o.partLength : o.linkDistance);
      const k = (((l - rest) / l) * alpha * o.netPull * (bus ? linkPull({ count: 1 }, o) : GROUND_PULL)) / 2;
      a.vx = (a.vx ?? 0) + dx * k;
      a.vy = (a.vy ?? 0) + dy * k;
      b.vx = (b.vx ?? 0) - dx * k;
      b.vy = (b.vy ?? 0) - dy * k;
      // (flatNets: a net's join between two of its readers wants to lie flat, a bus's or a meter's — not a ride up off
      // a loom)
      if (o.flatNets > 0 && from !== net.owner && !looms.has(from)) {
        const f = dy * o.flatNets * alpha * 0.5;
        a.vy = (a.vy ?? 0) + f;
        b.vy = (b.vy ?? 0) - f;
      }
    }
  }
}

/**
 * Where each tap of a bus (a table read by several) comes from, for drawing: null, the trunk, out of the owner's
 * wheel; else the reader it comes on from (its node, where it is now). Laid again whenever it's asked for, so it
 * follows a moved cell.
 */
export function taps(s: LayoutState): Map<string, { from: string; x: number; y: number; loom?: true } | null> {
  const out = new Map<string, { from: string; x: number; y: number; loom?: true } | null>();
  const looms = loomsOf(s);
  for (const net of s.drawnNets) {
    if (net.port === 'step') continue;
    for (const [id, { from, to }] of netTree(s, net, s.drawnEnds)) {
      if (from === net.owner) {
        out.set(id, null);
        continue;
      }
      // (out of a loom's source lane, under the reader)
      const l = looms.get(from);
      const r = l && nodeAt(s, to);
      if (l && r?.x !== undefined) {
        out.set(id, { from, x: r.x, y: l.lane, loom: true });
        continue;
      }
      // (a tap whose node has gone: not drawn)
      const f = nodeAt(s, from);
      if (f?.x !== undefined) out.set(id, { from, x: f.x, y: f.y ?? 0 });
    }
  }
  return out;
}

/** Each bus's joins that aren't its owner's own edge (a tap coming on from another reader), by tap: what's drawn. */
export function hops(s: LayoutState): Map<string, { from: string; to: string }> {
  const out = new Map<string, { from: string; to: string }>();
  for (const net of s.drawnNets) if (net.port !== 'step') for (const [id, j] of netTree(s, net, s.drawnEnds)) if (j.from !== net.owner) out.set(id, j);
  return out;
}

/** Every drawn edge as short straight pieces (its spline), with its ends: what a meter's edge mustn't cross. */
export function drawnPieces(s: LayoutState, skip: (a: string, b: string) => boolean): Piece[] {
  const out: Piece[] = [];
  const joins = hops(s);
  for (const l of s.links) {
    const h = joins.get(l.id);
    const [source, target] = h ? [h.from, h.to] : [l.source, l.target];
    if (skip(source, target)) continue;
    const a = nodeAt(s, source);
    const b = nodeAt(s, target);
    if (a?.x === undefined || b?.x === undefined) continue;
    const m = (h ? undefined : s.bendAt.get(l.id)) ?? { x: ((a.x ?? 0) + (b.x ?? 0)) / 2, y: ((a.y ?? 0) + (b.y ?? 0)) / 2 };
    const pts = Array.from({ length: 9 }, (_, k) => splinePoint(a.x ?? 0, a.y ?? 0, m.x, m.y, b.x ?? 0, b.y ?? 0, k / 8));
    for (let k = 0; k < 8; k++) out.push({ a: source, b: target, seg: [pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y] });
  }
  return out;
}

/**
 * What a straight edge from (x, y) — node `from`, of radius r — to node `to` runs into: each drawn edge it crosses
 * counts 1, each wheel it passes through 2 (it would read as an edge to it). `stop`: enough, stop counting.
 */
export function hits(s: LayoutState, x: number, y: number, r: number, from: string, to: string, pieces: Piece[], stop = Infinity): number {
  const c = s.byId.get(to);
  if (!c) return stop;
  const [cx, cy] = [c.x ?? 0, c.y ?? 0];
  const len = Math.hypot(cx - x, cy - y);
  if (len <= r + c.radius) return 0;
  // (the part outside both wheels: an edge is drawn beneath them)
  const [ux, uy] = [(cx - x) / len, (cy - y) / len];
  const [x1, y1, x2, y2] = [x + ux * r, y + uy * r, cx - ux * c.radius, cy - uy * c.radius];
  // (its box: a piece wholly to one side of it can't cross it, nor a wheel further off than its room)
  const [lx, hx, ly, hy] = [Math.min(x1, x2), Math.max(x1, x2), Math.min(y1, y2), Math.max(y1, y2)];
  let n = 0;
  for (const p of pieces) {
    const q = p.seg;
    if ((q[0] < lx && q[2] < lx) || (q[0] > hx && q[2] > hx) || (q[1] < ly && q[3] < ly) || (q[1] > hy && q[3] > hy)) continue;
    if (p.a === to || p.b === to || p.a === from || p.b === from) continue;
    if (segmentsCross(x1, y1, x2, y2, q[0], q[1], q[2], q[3]) && ++n >= stop) return n;
  }
  for (const o of s.byId.values()) {
    const [ox, oy, room] = [o.x ?? 0, o.y ?? 0, o.radius + 1];
    if (ox < lx - room || ox > hx + room || oy < ly - room || oy > hy + room) continue;
    if (o.id === to || o.id === from || o.role === 'tag') continue;
    const t = Math.max(0, Math.min(1, (((o.x ?? 0) - x1) * (x2 - x1) + ((o.y ?? 0) - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2 || 1)));
    if (Math.hypot(x1 + t * (x2 - x1) - (o.x ?? 0), y1 + t * (y2 - y1) - (o.y ?? 0)) < o.radius * 0.8 && (n += 2) >= stop) return n;
  }
  return n;
}

/**
 * Each meter's net (#27): every cell a meter steps is joined to it, not each by an edge of its own but through the
 * others, like ground on a circuit board. Laid as every net is (netTree, the owner's appearance aside): a ratsnest,
 * each cell joined to the nearest one already joined, wherever that is (ground: the meter or another of its cells), a
 * join through a wheel costing as much again for each wheel; laid again whenever it is asked for, so it follows a
 * moved cell as a bus does. A tap's sub-net leaves from its bulb on its table (decision 016).
 */
export function meterNet(s: LayoutState): readonly MeterTrace[] {
  const net: MeterTrace[] = [];
  for (const n of s.drawnNets) {
    if (n.port !== 'step' || !s.byId.has(n.owner)) continue;
    const bulb = n.bulb && n.bulbAt ? { bulb: n.bulb, at: n.bulbAt } : {};
    for (const { from, to } of netTree(s, n, s.drawnEnds).values())
      if (s.byId.has(from) && s.byId.has(to)) net.push({ id: `net:${from}${n.bulb ? `@${n.bulb}` : ''}~${to}`, meter: n.owner, a: from, b: to, ...bulb });
  }
  s.net = net;
  return net;
}
