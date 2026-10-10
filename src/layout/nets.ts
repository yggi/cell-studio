/**
 * The nets (docs/notes/nets.md): a net's tree as things stand now (netTree), its joins as springs and wheels kept off
 * them (stepNets), where each tap of a bus comes from (taps, hops), and each meter's net of traces (meterNet), costed
 * by what a straight edge runs into (hits, drawnPieces).
 */
import type { GraphModel } from '../engine/graph';
import { segmentsCross, splinePoint } from './geometry';
import { GROUND_PULL, linkPull } from './options';
import { nodeAt, type LayoutState, type MeterTrace, type PhysNode } from './state';

/** A short straight piece of a drawn edge (its spline), with its ends. */
export type Piece = { a: string; b: string; seg: [number, number, number, number] };

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
  // (a tap's sub-net leaves from its bulb on its table: decision 016)
  const at = net.bulbAt;
  const o = owner && at ? { ...owner, x: (owner.x ?? 0) + at.x, y: (owner.y ?? 0) + at.y, radius: at.r } : owner;
  // (a reader may be a product's junction: as drawn)
  const readers = net.taps.flatMap((id) => {
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
  // (each reader's cheapest join so far, and what to)
  const best = left.map((r) => ({ cost: cost(o, r.n), from: o }));
  while (left.length) {
    const k = best.reduce((b, c, i) => (c.cost < best[b].cost ? i : b), 0);
    const [r] = left.splice(k, 1);
    const [{ from }] = best.splice(k, 1);
    out.set(r.id, { from: from.id, to: r.n.id });
    // (a bus has left its owner: only the readers join on)
    left.forEach((q, i) => {
      if (bus && best[i].from === o) best[i] = { cost: Infinity, from: o! };
      const c = cost(r.n, q.n);
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
  for (const { net, tree } of trees) {
    const bus = net.port !== 'step';
    for (const { from, to } of tree.values()) {
      const [a, b] = [s.byId.get(from), s.byId.get(to)];
      if (!a || !b) continue;
      // (from a tap's bulb, not its table's centre: decision 016)
      const off = from === net.owner && net.bulbAt ? net.bulbAt : { x: 0, y: 0 };
      const [dx, dy] = [(b.x ?? 0) - (a.x ?? 0) - off.x, (b.y ?? 0) - (a.y ?? 0) - off.y];
      const l = Math.hypot(dx, dy) || 1;
      // (as d3's link: towards its length, shared by the two ends)
      const rest = s.size * (bus ? o.linkDistance * o.partLength : o.linkDistance);
      const k = (((l - rest) / l) * alpha * o.netPull * (bus ? linkPull({ count: 1 }, o) : GROUND_PULL)) / 2;
      a.vx = (a.vx ?? 0) + dx * k;
      a.vy = (a.vy ?? 0) + dy * k;
      b.vx = (b.vx ?? 0) - dx * k;
      b.vy = (b.vy ?? 0) - dy * k;
    }
  }
}

/**
 * Where each tap of a bus (a table read by several) comes from, for drawing: null, the trunk, out of the owner's
 * wheel; else the reader it comes on from (its node, where it is now). Laid again whenever it's asked for, so it
 * follows a moved cell.
 */
export function taps(s: LayoutState): Map<string, { from: string; x: number; y: number } | null> {
  const out = new Map<string, { from: string; x: number; y: number } | null>();
  for (const net of s.drawnNets) {
    if (net.port === 'step') continue;
    for (const [id, { from }] of netTree(s, net, s.drawnEnds)) {
      if (from === net.owner) {
        out.set(id, null);
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
 * others, like ground on a circuit board — a tree of straight traces between the meter and its cells (a spanning
 * tree, Kruskal's: the shortest first, each costed by what it crosses — drawn edges, wheels it passes, the traces
 * already laid). Worked out from where everything is now; call once the layout is at rest.
 */
export function meterNet(s: LayoutState): readonly MeterTrace[] {
  const drawn = drawnPieces(s, () => false);
  const laid: Piece[] = [];
  const net: MeterTrace[] = [];
  // (a pair a drawn edge already joins: a trace would lie on it)
  const joined = new Set(s.links.map((l) => [l.source, l.target].sort().join('|')));
  // (a meter's net; a tap's, from its bulb on its table, one per tap: decision 016)
  const groups = new Map<string, { meter: string; bulb?: string; at?: { x: number; y: number; r: number } }>();
  for (const g of s.grounds) if (!groups.has(`${g.meter}|${g.bulb ?? ''}`)) groups.set(`${g.meter}|${g.bulb ?? ''}`, { meter: g.meter, bulb: g.bulb, at: g.at });
  for (const { meter, bulb, at: hub } of groups.values()) {
    const ends = [meter, ...new Set(s.grounds.filter((g) => g.meter === meter && g.bulb === bulb).map((g) => g.cell))].filter((id) => s.byId.has(id));
    // (the meter's end: its wheel, or the bulb on it)
    const at = (id: string) => {
      const n = s.byId.get(id)!;
      return hub && id === meter ? { id, x: (n.x ?? 0) + hub.x, y: (n.y ?? 0) + hub.y, radius: hub.r } : n;
    };
    const pairs: { a: string; b: string; len: number; cost: number; checked: boolean }[] = [];
    for (let i = 0; i < ends.length; i++)
      for (let j = i + 1; j < ends.length; j++) {
        const [a, b] = [at(ends[i]), at(ends[j])];
        const len = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
        const hit = hits(s, a.x ?? 0, a.y ?? 0, a.radius, a.id, b.id, drawn);
        pairs.push({ a: a.id, b: b.id, len, cost: len * (1 + 2 * hit) * (joined.has([a.id, b.id].sort().join('|')) ? 3 : 1), checked: false });
      }
    const root = new Map(ends.map((id) => [id, id]));
    const find = (id: string): string => (root.get(id) === id ? id : find(root.get(id)!));
    pairs.sort((p, q) => p.cost - q.cost);
    while (pairs.length) {
      const p = pairs.shift()!;
      if (find(p.a) === find(p.b)) continue;
      if (!p.checked && laid.length) {
        // (the traces laid since it was costed: crossing one costs as much as crossing an edge)
        const a = at(p.a);
        const extra = hits(s, a.x ?? 0, a.y ?? 0, a.radius, p.a, p.b, laid) - hits(s, a.x ?? 0, a.y ?? 0, a.radius, p.a, p.b, []);
        p.checked = true;
        if (extra > 0) {
          p.cost += p.len * 2 * extra;
          pairs.splice(pairs.findIndex((q) => q.cost > p.cost) >>> 0, 0, p);
          continue;
        }
      }
      root.set(find(p.a), find(p.b));
      net.push({ id: `net:${p.a}${bulb ? `@${bulb}` : ''}~${p.b}`, meter, a: p.a, b: p.b, ...(bulb && hub ? { bulb, at: hub } : {}) });
      const [a, b] = [at(p.a), at(p.b)];
      laid.push({ a: p.a, b: p.b, seg: [a.x ?? 0, a.y ?? 0, b.x ?? 0, b.y ?? 0] });
    }
  }
  s.net = net;
  return net;
}
