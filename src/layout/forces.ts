/**
 * The forces of the layout beyond d3's own (link, charge, collide, x, y), each a step of one tick on the layout's
 * state: crossing edges pushed apart (forceUncross), bent edges straightened and kept off wheels (stepBends), the
 * edges at a node spread round it (stepSpread), time and sound apart (stepKinds), tagged cells in clusters
 * (stepClusters), nothing on a turntable (stepExclusion). The tapes'
 * aims are aims.ts; the nets' springs nets.ts.
 */
import { segmentsCross, splinePoint } from './geometry';
import { nodeAt, type LayoutState, type PhysNode } from './state';

type Seg = { a: { x?: number; y?: number; id: string }; b: { x?: number; y?: number; id: string } };

/** Pairs of edges that cross, ignoring pairs that share a node. */
export function crossingPairs<S extends Seg>(segs: readonly S[]): [S, S][] {
  const out: [S, S][] = [];
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) {
      const p = segs[i];
      const q = segs[j];
      if (p.a.id === q.a.id || p.a.id === q.b.id || p.b.id === q.a.id || p.b.id === q.b.id) continue;
      if (segmentsCross(p.a.x ?? 0, p.a.y ?? 0, p.b.x ?? 0, p.b.y ?? 0, q.a.x ?? 0, q.a.y ?? 0, q.b.x ?? 0, q.b.y ?? 0)) out.push([p, q]);
    }
  return out;
}

/**
 * A force that resists crossings: for every two edges that cross, push them
 * apart along the line between their midpoints (each end gets half).
 */
export function forceUncross(strengthOf: () => number, body: (n: PhysNode) => PhysNode | undefined = (n) => n) {
  let links: { source: PhysNode; target: PhysNode }[] = [];
  const force = (alpha: number) => {
    const strength = strengthOf();
    if (strength <= 0) return;
    const segs = links.map((l) => ({ a: l.source, b: l.target }));
    for (const [p, q] of crossingPairs(segs)) {
      const mx = ((p.a.x ?? 0) + (p.b.x ?? 0)) / 2 - ((q.a.x ?? 0) + (q.b.x ?? 0)) / 2;
      const my = ((p.a.y ?? 0) + (p.b.y ?? 0)) / 2 - ((q.a.y ?? 0) + (q.b.y ?? 0)) / 2;
      const len = Math.hypot(mx, my) || 1;
      const k = (strength * alpha * 30) / len;
      for (const end of [p.a, p.b]) {
        const n = body(end);
        if (!n) continue;
        n.vx = (n.vx ?? 0) + mx * k * 0.5;
        n.vy = (n.vy ?? 0) + my * k * 0.5;
      }
      for (const end of [q.a, q.b]) {
        const n = body(end);
        if (!n) continue;
        n.vx = (n.vx ?? 0) - mx * k * 0.5;
        n.vy = (n.vy ?? 0) - my * k * 0.5;
      }
    }
  };
  force.current = () => links;
  force.links = (ls: typeof links) => {
    links = ls;
    return force;
  };
  return force;
}

/**
 * One step for the edges' midpoints. Each is drawn back towards the straight
 * line between its ends; edges slip freely over nodes, keeping only off a
 * node's centre (to the side they already lean towards) — a small bend.
 */
export function stepBends(s: LayoutState): void {
  // (nothing to bend: no work — the library's cloud draws straight lines)
  if (s.opts.avoid <= 0 && s.opts.straighten <= 0) return;
  const nodes = [...s.byId.values()];
  for (const l of s.links) {
    // (as drawn: a product's wires end at its junction)
    const a = nodeAt(s, l.source);
    const b = nodeAt(s, l.target);
    if (!a || !b || a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined) continue;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const m = s.bendAt.get(l.id) ?? { x: mx, y: my };
    m.x += (mx - m.x) * s.opts.straighten;
    m.y += (my - m.y) * s.opts.straighten;
    // the normal of the straight line, for nodes sitting exactly on it
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    for (const n of nodes) {
      if (n === a || n === b || n.x === undefined || n.y === undefined) continue;
      // edges slip freely over nodes; they only keep off the centre (avoid × radius)
      const clear = n.radius * (n.role === 'tag' ? 1.1 : s.opts.avoid); // (off a tag's name entirely)
      if (clear <= 0) continue;
      for (const t of [0.25, 0.5, 0.75]) {
        const p = splinePoint(a.x, a.y, m.x, m.y, b.x, b.y, t);
        const dx = p.x - n.x;
        const dy = p.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d >= clear) continue;
        // slip: away from the node, or (dead centre) to the side the bend already leans
        let ux = dx / (d || 1);
        let uy = dy / (d || 1);
        if (d < 1e-3) {
          const side = Math.sign((m.x - mx) * nx + (m.y - my) * ny) || 1;
          ux = nx * side;
          uy = ny * side;
        }
        const push = (clear - d) * (t === 0.5 ? 0.6 : 0.35);
        m.x += ux * push;
        m.y += uy * push;
      }
    }
    s.bendAt.set(l.id, m);
  }
}

/**
 * The edges at a node spread round it, as far apart as they can: for each node, its neighbours
 * sorted by angle; where two sit closer than an even share of the circle, both are turned apart
 * (tangentially, around the node) — stars and mirror symmetries come of it.
 */
export function stepSpread(s: LayoutState, alpha: number): void {
  const k = s.opts.spread * alpha;
  if (k <= 0) return;
  const nbrs = new Map<string, PhysNode[]>();
  for (const l of s.springs) {
    const a = s.byId.get(l.source);
    const b = s.byId.get(l.target);
    if (!a || !b || a === b) continue;
    (nbrs.get(a.id) ?? nbrs.set(a.id, []).get(a.id)!).push(b);
    (nbrs.get(b.id) ?? nbrs.set(b.id, []).get(b.id)!).push(a);
  }
  for (const [id, ns] of nbrs) {
    if (ns.length < 2) continue;
    const c = s.byId.get(id)!;
    const at = ns.map((n) => ({ n, a: Math.atan2((n.y ?? 0) - (c.y ?? 0), (n.x ?? 0) - (c.x ?? 0)), r: Math.hypot((n.x ?? 0) - (c.x ?? 0), (n.y ?? 0) - (c.y ?? 0)) || 1 }));
    at.sort((p, q) => p.a - q.a);
    const even = (2 * Math.PI) / at.length;
    for (let i = 0; i < at.length; i++) {
      const p = at[i];
      const q = at[(i + 1) % at.length];
      let gap = q.a - p.a;
      if (gap <= 0) gap += 2 * Math.PI;
      if (gap >= even) continue;
      const push = ((even - gap) / even) * k * 6; // px a tick, at full strength
      // p turns back (clockwise), q forward: tangents to the circle round c
      p.n.vx = (p.n.vx ?? 0) + Math.sin(p.a) * push;
      p.n.vy = (p.n.vy ?? 0) - Math.cos(p.a) * push;
      q.n.vx = (q.n.vx ?? 0) - Math.sin(q.a) * push;
      q.n.vy = (q.n.vy ?? 0) + Math.cos(q.a) * push;
    }
  }
}

/** Nothing overlaps a turntable: a node inside its reach is put back at its edge. */
export function stepExclusion(s: LayoutState): void {
  const all = [...s.byId.values()];
  const heavy = all.filter((n) => n.heavy);
  if (!heavy.length) return;
  for (const h of heavy)
    for (const n of all) {
      if (n === h) continue;
      const min = h.radius * 1.15 + n.radius + 24;
      const dx = (n.x ?? 0) - (h.x ?? 0);
      const dy = (n.y ?? 0) - (h.y ?? 0);
      const d = Math.hypot(dx, dy) || 1;
      if (d >= min) continue;
      // (two turntables both pinned: leave them be)
      if (n.heavy && n.fx != null && h.fx != null) continue;
      n.x = (h.x ?? 0) + (dx / d) * min;
      n.y = (h.y ?? 0) + (dy / d) * min;
      n.vx = 0;
      n.vy = 0;
    }
}

/** Time and sound keep apart: a meter and a voice, mix or sound card push each other (1/distance). */
export function stepKinds(s: LayoutState, alpha: number): void {
  const k = s.opts.kindRepel * alpha * 900;
  if (k <= 0) return;
  const nodes = [...s.byId.values()];
  const clocks = nodes.filter((n) => n.role === 'clock');
  const audio = nodes.filter((n) => n.role === 'audio');
  for (const a of clocks)
    for (const b of audio) {
      const dx = (b.x ?? 0) - (a.x ?? 0);
      const dy = (b.y ?? 0) - (a.y ?? 0);
      const d2 = Math.max(400, dx * dx + dy * dy);
      const f = k / d2;
      a.vx = (a.vx ?? 0) - dx * f;
      a.vy = (a.vy ?? 0) - dy * f;
      b.vx = (b.vx ?? 0) + dx * f;
      b.vy = (b.vy ?? 0) + dy * f;
    }
}

/** Tagged cells cluster: each pulled to its cluster's centre; clusters' centres push apart. */
export function stepClusters(s: LayoutState, alpha: number): void {
  const groups = new Map<string, PhysNode[]>();
  for (const n of s.byId.values()) if (n.group) (groups.get(n.group) ?? groups.set(n.group, []).get(n.group)!).push(n);
  if (groups.size === 0) return;
  const centres = [...groups].map(([g, ns]) => ({ g, ns, x: ns.reduce((a, n) => a + (n.x ?? 0), 0) / ns.length, y: ns.reduce((a, n) => a + (n.y ?? 0), 0) / ns.length }));
  const pull = s.opts.tagPull * alpha;
  for (const c of centres)
    for (const n of c.ns) {
      n.vx = (n.vx ?? 0) + (c.x - (n.x ?? 0)) * pull;
      n.vy = (n.vy ?? 0) + (c.y - (n.y ?? 0)) * pull;
    }
  const push = s.opts.tagRepel * alpha * 60000;
  for (let i = 0; i < centres.length; i++)
    for (let j = i + 1; j < centres.length; j++) {
      const a = centres[i];
      const b = centres[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = Math.max(900, dx * dx + dy * dy);
      const f = push / d2 / Math.sqrt(d2);
      for (const n of a.ns) {
        n.vx = (n.vx ?? 0) - (dx * f) / a.ns.length;
        n.vy = (n.vy ?? 0) - (dy * f) / a.ns.length;
      }
      for (const n of b.ns) {
        n.vx = (n.vx ?? 0) + (dx * f) / b.ns.length;
        n.vy = (n.vy ?? 0) + (dy * f) / b.ns.length;
      }
    }
}
