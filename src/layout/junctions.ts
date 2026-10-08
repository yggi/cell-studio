/**
 * Products' junctions in the layout (engine/graph.ts, docs/notes/nets.md decision 2). A junction weighs nothing: it
 * takes no part in the forces. The layout is worked out on the graph with each junction folded into its voice (what
 * goes into a product goes into the voice, what comes out of it out of the voice: the signal path as it was before
 * junctions), and each junction is then set on its voice's rim, facing the wires that come into it, as a tape's heads
 * ride the tape. So a junction costs the layout nothing, and each product still has its own place: its melody comes in
 * at its dot, and its sound leaves from there.
 */
import { netsOf, type GraphEdge, type GraphModel } from '../engine/graph';
import { edgeId } from '../engine/ids';
import { segmentsCross, splinePoint } from './geometry';
import { hops } from './nets';
import { stepBends } from './forces';
import { nodeAt, type LayoutState, type PhysNode } from './state';

/**
 * The graph with each product's junction folded into its voice: its `is` wire gone, its other wires to and from the
 * voice, one edge for each pair of cells (as an edge's id was before junctions), and the nets worked out again (a
 * voice in two mixes is a net of sound again). The same model when it has no junctions.
 */
export function folded(model: GraphModel): GraphModel {
  const voiceOf = new Map(model.nodes.flatMap((n) => (n.kind === 'junction' ? [[n.id, `cell:${n.voice}`] as const] : [])));
  if (!voiceOf.size) return model;
  const to = (id: string) => voiceOf.get(id) ?? id;
  const through = (e: GraphEdge) => voiceOf.has(e.source) || voiceOf.has(e.target);
  const plain = model.edges.filter((e) => !through(e));
  const seen = new Set(plain.map((e) => e.id));
  // (as the edges came before junctions: the cells' own, then the sounds into their mixes, then what plays them)
  const fold = (es: readonly GraphEdge[]) =>
    es.flatMap((e) => {
      const f = { ...e, source: to(e.source), target: to(e.target), from: to(e.from), to: to(e.to) };
      const key = edgeId(f.source, f.target);
      if (f.source === f.target || seen.has(key)) return [];
      seen.add(key);
      return [f];
    });
  const mixes = model.edges.filter((e) => e.port === 'mix');
  const edges = [
    ...plain.filter((e) => e.port !== 'mix'),
    ...mixes.flatMap((e) => (through(e) ? fold([e]) : [e])),
    ...fold(model.edges.filter((e) => through(e) && e.port !== 'mix' && e.port !== 'is')),
  ];
  const nodes = model.nodes.filter((n) => n.kind !== 'junction');
  return { ...model, nodes, edges, nets: netsOf(nodes, edges) };
}

/** How far out of its voice's room a junction sits, × its own room: a short stub of its `is` wire shows. */
const OUT = 1.2;
/** How much a junction's sound out (to its mix) turns it, beside its terms in (1 each). */
const MIX_PULL = 0.35;

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Off a wheel's name: the arc under it (radians either side of straight down) where its label is drawn. */
const LABEL = 0.8;
const DOWN = Math.PI / 2;
/** An angle on the rim, moved out of the label's arc to its nearer side. */
const offLabel = (a: number) => {
  const d = wrap(a - DOWN);
  return Math.abs(d) >= LABEL ? a : DOWN + (d < 0 ? -LABEL : LABEL);
};

/** A junction for each product, as the layout keeps it: its voice, and its dot's room. */
export function junctionNodes(s: LayoutState, model: GraphModel): Map<string, PhysNode> {
  const out = new Map<string, PhysNode>();
  for (const n of model.nodes) {
    if (n.kind !== 'junction') continue;
    const p = s.junctions.get(n.id) ?? { id: n.id, depth: n.depth, radius: 0 };
    p.radius = s.opts.radius(n);
    p.rides = `cell:${n.voice}`;
    out.set(n.id, p);
  }
  return out;
}

/**
 * Sets each junction on its voice's rim, at the angle its wires pull it to: towards its terms, and a little towards
 * its mix (turning a little at a time, from where it was), a voice's junctions kept apart round the rim, and off the
 * voice's name (under it). Run after
 * every tick; a junction whose voice isn't laid out yet has no place.
 */
export function placeJunctions(s: LayoutState): void {
  if (!s.junctions.size) return;
  const riders = new Map<PhysNode, PhysNode[]>();
  for (const j of s.junctions.values()) {
    const v = s.byId.get(j.rides ?? '');
    if (!v || v.x === undefined || v.y === undefined) {
      j.x = j.y = undefined;
      continue;
    }
    riders.set(v, [...(riders.get(v) ?? []), j]);
  }
  // the way each junction's wires pull it round the rim (but its voice's own)
  const pull = new Map<string, { x: number; y: number }>();
  for (const l of s.links)
    for (const [a, b, w] of [
      [l.target, l.source, 1],
      [l.source, l.target, MIX_PULL],
    ] as const) {
      const j = s.junctions.get(a);
      const o = s.byId.get(b);
      const v = s.byId.get(j?.rides ?? '');
      if (!j || !v || !o || o === v) continue;
      const d = Math.hypot((o.x ?? 0) - (v.x ?? 0), (o.y ?? 0) - (v.y ?? 0)) || 1;
      const p = pull.get(j.id) ?? { x: 0, y: 0 };
      p.x += (w * ((o.x ?? 0) - (v.x ?? 0))) / d;
      p.y += (w * ((o.y ?? 0) - (v.y ?? 0))) / d;
      pull.set(j.id, p);
    }
  for (const [v, js] of riders) {
    for (const j of js) {
      const p = pull.get(j.id);
      const was = s.rims.get(j.id);
      const want = p && Math.hypot(p.x, p.y) > 1e-3 ? Math.atan2(p.y, p.x) : (was ?? -Math.PI / 2);
      s.rims.set(j.id, was === undefined ? want : was + wrap(want - was) * 0.3);
    }
    // kept apart round the rim: each pair at least the angle their dots take
    const ring = v.radius + js[0].radius * OUT;
    if (js.length > 1) {
      const gap = 2 * Math.asin(Math.min(1, (js[0].radius * 1.4) / ring));
      for (let pass = 0; pass < 6; pass++)
        for (let i = 0; i < js.length; i++)
          for (let k = i + 1; k < js.length; k++) {
            const [a, b] = [s.rims.get(js[i].id)!, s.rims.get(js[k].id)!];
            const d = wrap(b - a);
            if (Math.abs(d) >= gap) continue;
            // (dead level: the later one goes clockwise)
            const sign = d > 0 || (d === 0 && i < k) ? 1 : -1;
            const push = (gap - Math.abs(d)) / 2;
            s.rims.set(js[i].id, a - sign * push);
            s.rims.set(js[k].id, b + sign * push);
          }
    }
    for (const j of js) {
      const a = offLabel(s.rims.get(j.id)!);
      s.rims.set(j.id, a);
      j.x = (v.x ?? 0) + Math.cos(a) * ring * s.size;
      j.y = (v.y ?? 0) + Math.sin(a) * ring * s.size;
    }
  }
}

/** The angles a junction is tried at, round its voice's rim, when the layout is at rest. */
const TRIES = 32;

type Segs = [number, number, number, number][];
type Drawn = { a: string; b: string; segs: Segs };

/**
 * At rest: each junction moved round its voice's rim to where its wires cross least (each edge, belt or meter's trace
 * they cross counts once; under a wheel, nothing shows), of the places off its voice's name and not taken by its voice's other junctions; on a
 * tie, the nearest to where its wires pull it. Two passes, a junction at a time, then a voice's junctions swapped
 * where that crosses less. A drag starts them turning back to their pulls. `runs`: a belt's runs as drawn.
 */
export function settleJunctions(s: LayoutState, runs: (l: { source: string; target: string; belt?: boolean }) => Segs | undefined = () => undefined): void {
  if (!s.junctions.size) return;
  placeJunctions(s);
  const discs = [...s.byId.values()].filter((n) => n.role !== 'tag' && n.x !== undefined);
  const hidden = (x: number, y: number) => discs.some((n) => Math.hypot(x - (n.x ?? 0), y - (n.y ?? 0)) < n.radius * s.size);
  /** A drawn line's pieces that show, between two points (straight, or through its bend). */
  const pieces = (a: { x: number; y: number }, b: { x: number; y: number }, m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }): Segs => {
    const pts = Array.from({ length: 9 }, (_, k) => splinePoint(a.x, a.y, m.x, m.y, b.x, b.y, k / 8));
    const out: Segs = [];
    for (let k = 0; k < 8; k++) if (!hidden((pts[k].x + pts[k + 1].x) / 2, (pts[k].y + pts[k + 1].y) / 2)) out.push([pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y]);
    return out;
  };
  const at = (id: string) => {
    const n = nodeAt(s, id);
    return n?.x === undefined ? undefined : { x: n.x, y: n.y ?? 0 };
  };
  // everything drawn that isn't a junction's, once (a bus's hop as drawn: from the reader it comes on from)
  const joins = hops(s);
  const ends = (l: { id: string; source: string; target: string }) => {
    const h = joins.get(l.id);
    return h ? { a: h.from, b: h.to, hop: true } : { a: l.source, b: l.target, hop: false };
  };
  const fixed: Drawn[] = [
    ...s.links.flatMap((l) => {
      if (s.junctions.has(l.source) || s.junctions.has(l.target)) return [];
      const { a, b, hop } = ends(l);
      const [p, q] = [at(a), at(b)];
      if (!p || !q) return [];
      const belt = hop ? undefined : runs(l);
      return [{ a, b, segs: belt ?? pieces(p, q, hop ? undefined : s.bendAt.get(l.id)) }];
    }),
    ...s.net.flatMap((t) => {
      const [p, q] = [at(t.a), at(t.b)];
      return p && q ? [{ a: t.a, b: t.b, segs: pieces(p, q) }] : [];
    }),
  ];
  const wiresOf = new Map<string, { a: string; b: string }[]>();
  for (const l of s.links) {
    const w = ends(l);
    for (const end of new Set([w.a, w.b])) if (s.junctions.has(end)) wiresOf.set(end, [...(wiresOf.get(end) ?? []), w]);
  }
  const placed = [...s.junctions.values()].filter((j) => j.x !== undefined);
  /** A junction's wires as drawn from where it is now. */
  const wires = (j: PhysNode): Drawn[] =>
    (wiresOf.get(j.id) ?? []).flatMap((w) => {
      const [p, q] = [at(w.a), at(w.b)];
      return p && q ? [{ ...w, segs: pieces(p, q) }] : [];
    });
  const meet = (u: Drawn, v: Drawn) => u.a === v.a || u.a === v.b || u.b === v.a || u.b === v.b;
  const crosses = (u: Drawn, v: Drawn) => !meet(u, v) && u.segs.some((p) => v.segs.some((q) => segmentsCross(...p, ...q)));
  /** What everything but these junctions' wires is drawn as. */
  const restOf = (set: readonly PhysNode[]) => [...fixed, ...placed.filter((o) => !set.includes(o)).flatMap(wires)];
  /** How many crossings these junctions' wires make, where they are now: with the rest, and among themselves. */
  const cost = (set: readonly PhysNode[], rest: readonly Drawn[]) => {
    const mine = set.flatMap(wires);
    let n = 0;
    for (let i = 0; i < mine.length; i++) {
      for (const e of rest) if (crosses(mine[i], e)) n++;
      for (let k = i + 1; k < mine.length; k++) if (crosses(mine[i], mine[k])) n++;
    }
    return n;
  };
  const byVoice = new Map<string, PhysNode[]>();
  for (const j of placed) byVoice.set(j.rides!, [...(byVoice.get(j.rides!) ?? []), j]);
  const put = (j: PhysNode, v: PhysNode, ring: number, angle: number) => {
    s.rims.set(j.id, angle);
    j.x = (v.x ?? 0) + Math.cos(angle) * ring;
    j.y = (v.y ?? 0) + Math.sin(angle) * ring;
  };
  for (let pass = 0; pass < 3; pass++)
    for (const [voice, js] of byVoice) {
      const v = s.byId.get(voice)!;
      const ring = (v.radius + js[0].radius * OUT) * s.size;
      const gap = 2 * Math.asin(Math.min(1, (js[0].radius * 1.4 * s.size) / ring));
      if (pass < 2)
        for (const j of js) {
          const pulled = s.rims.get(j.id) ?? 0;
          const rest = restOf([j]);
          let best = { cost: Infinity, angle: pulled };
          for (let k = 0; k < TRIES; k++) {
            // (tried nearest first: on a tie, the nearest to its pull wins)
            const angle = pulled + (Math.PI * 2 * Math.ceil(k / 2) * (k % 2 ? 1 : -1)) / TRIES;
            if (offLabel(angle) !== angle || js.some((o) => o !== j && Math.abs(wrap((s.rims.get(o.id) ?? 0) - angle)) < gap)) continue;
            put(j, v, ring, angle);
            const n = cost([j], rest);
            if (n < best.cost) best = { cost: n, angle };
          }
          put(j, v, ring, best.angle);
        }
      else
        for (let i = 0; i < js.length; i++)
          for (let k = i + 1; k < js.length; k++) {
            const pair = [js[i], js[k]];
            const rest = restOf(pair);
            const [a, b] = [s.rims.get(js[i].id)!, s.rims.get(js[k].id)!];
            const now = cost(pair, rest);
            put(js[i], v, ring, b);
            put(js[k], v, ring, a);
            if (cost(pair, rest) < now) continue;
            put(js[i], v, ring, a);
            put(js[k], v, ring, b);
          }
    }
  // (their wires' bends laid again from where they are now: straight, then off the wheels as the forces would)
  for (const l of s.links) if (s.junctions.has(l.source) || s.junctions.has(l.target)) s.bendAt.delete(l.id);
  for (let k = 0; k < 12; k++) stepBends(s);
}
