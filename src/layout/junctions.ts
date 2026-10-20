/**
 * Products' junctions in the layout (engine/graph.ts, docs/notes/nets.md decision 2). A junction weighs nothing: it
 * takes no part in the forces. The layout is worked out on the graph with each junction folded into its voice (what
 * goes into a product goes into the voice, what comes out of it out of the voice: the signal path as it was before
 * junctions), and each junction is then set by its voice: under a voice's wheel, just below its envelope (its notes
 * go up into it, its main input; several side by side), and on the rim of anything else (a kit, a tape), facing the
 * wires that come into it, as a tape's heads ride the tape. So a junction costs the layout nothing, and each product
 * still has its own place: its melody comes in at its meter, and its notes go on into the voice from there.
 */
import { netsOf, type GraphEdge, type GraphModel } from '@yggi/cells/engine/graph';
import { edgeId } from '@yggi/cells/engine/ids';
import { segmentsCross, splinePoint } from './geometry';
import { hops } from './nets';
import { stepBends } from './forces';
import { nodeAt, type LayoutState, type PhysNode } from './state';
import { bodyOf, VOICE_SIZE } from './voice';

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

/** How much a junction's sound out (to its mix) pulls it, beside its terms in (1 each). */
const MIX_PULL = 0.35;
/** The edge from a junction up to its voice, as much of it as shows (px). */
const STUB = 10;
/** Between junctions side by side under one voice (px). */
const SIDE_GAP = 8;
/** Room kept round a junction beyond the rooms of both (px): nothing settles on it. */
const CLEAR = 6;
/** How much of what a node is inside that room it is pushed out each tick (as d3's collide pushes). */
const CLEAR_PUSH = 0.5;

/** A junction for each product, as the layout keeps it: its voice, its dot's room, and how far under its voice it hangs. */
export function junctionNodes(s: LayoutState, model: GraphModel): Map<string, PhysNode> {
  const out = new Map<string, PhysNode>();
  for (const n of model.nodes) {
    if (n.kind !== 'junction') continue;
    const p = s.junctions.get(n.id) ?? { id: n.id, depth: n.depth, radius: 0 };
    p.radius = s.opts.radius(n);
    p.rides = `cell:${n.voice}`;
    // (under its voice's drawing and its name, on a short edge: a voice's wheel reaches down to its envelope's
    // bottom, layout/voice.ts; anything else's room has its name in it)
    const v = model.nodes.find((m) => m.id === p.rides);
    const reach = v?.kind === 'voice' && !v.petalOf ? bodyOf(VOICE_SIZE * (v.cell.size ?? 1)) : v ? s.opts.radius(v) : 0;
    p.below = reach + STUB + p.radius;
    out.set(n.id, p);
  }
  return out;
}

/** A voice's junctions under it, in a row in their order (their place in it, `rims`: 0 the middle). */
function hang(s: LayoutState, v: PhysNode, js: readonly PhysNode[]): void {
  for (const j of js) {
    j.x = (v.x ?? 0) + (s.rims.get(j.id) ?? 0) * (2 * j.radius + SIDE_GAP) * s.size;
    j.y = (v.y ?? 0) + (j.below ?? 0) * s.size;
  }
}

/**
 * Sets each junction under its voice, in a row ordered by where their wires pull them, left to right (the order kept
 * from tick to tick once set). Run after every tick; a junction whose voice isn't laid out yet has no place.
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
  // (where, left to right, each junction's wires come from: the mean x of its terms in, a little its mix)
  const pull = new Map<string, { x: number; w: number }>();
  for (const l of s.links)
    for (const [a, b, w] of [
      [l.target, l.source, 1],
      [l.source, l.target, MIX_PULL],
    ] as const) {
      const j = s.junctions.get(a);
      const o = nodeAt(s, b);
      if (!j || !o || o.id === j.rides || o.x === undefined) continue;
      const p = pull.get(j.id) ?? { x: 0, w: 0 };
      p.x += w * o.x;
      p.w += w;
      pull.set(j.id, p);
    }
  for (const [v, js] of riders) {
    // (in the order their wires come from, so they don't cross under it; as they were where that says nothing)
    const side = (j: PhysNode) => {
      const p = pull.get(j.id);
      return p?.w ? p.x / p.w : (v.x ?? 0) + (s.rims.get(j.id) ?? 0);
    };
    const was = (j: PhysNode) => s.rims.get(j.id) ?? 0;
    [...js].sort((a, b) => side(a) - side(b) || was(a) - was(b)).forEach((j, i) => s.rims.set(j.id, i - (js.length - 1) / 2));
    hang(s, v, js);
  }
}

/**
 * Nothing settles on a junction (it weighs nothing, so the forces don't see it): the junctions set where their voices
 * are now, any other node inside one's room is pushed out of it, as two wheels push each other apart.
 */
export function stepClearJunctions(s: LayoutState): void {
  if (!s.junctions.size) return;
  placeJunctions(s);
  for (const j of s.junctions.values()) {
    if (j.x === undefined || j.y === undefined) continue;
    for (const n of s.byId.values()) {
      if (n.id === j.rides || n.role === 'tag' || n.x === undefined || n.y === undefined) continue;
      const min = (j.radius + n.radius + CLEAR) * s.size;
      const [dx, dy] = [n.x - j.x, n.y - j.y];
      const d = Math.hypot(dx, dy);
      if (d >= min) continue;
      // (dead on it: aside, the way it lies of the voice; pushed, not set there, so it moves as calmly as anything does)
      const [ux, uy] = d > 1e-6 ? [dx / d, dy / d] : [n.x >= (s.byId.get(j.rides ?? '')?.x ?? 0) ? 1 : -1, 0];
      n.vx = (n.vx ?? 0) + ux * (min - d) * CLEAR_PUSH;
      n.vy = (n.vy ?? 0) + uy * (min - d) * CLEAR_PUSH;
    }
  }
}

type Segs = [number, number, number, number][];
/** A line as drawn: its ends, its pieces that show, and their box (min x, min y, max x, max y). */
type Drawn = { a: string; b: string; segs: Segs; box: readonly [number, number, number, number] };

/** The box round a line's pieces. */
const boxOf = (segs: Segs): Drawn['box'] => {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [ax, ay, bx, by] of segs) {
    x0 = Math.min(x0, ax, bx);
    y0 = Math.min(y0, ay, by);
    x1 = Math.max(x1, ax, bx);
    y1 = Math.max(y1, ay, by);
  }
  return [x0, y0, x1, y1];
};
/** Lines whose boxes don't meet can't cross (segmentsCross counts a crossing strictly inside both pieces only). */
const apart = (u: Drawn, v: Drawn) => u.box[2] < v.box[0] || v.box[2] < u.box[0] || u.box[3] < v.box[1] || v.box[3] < u.box[1];

/**
 * At rest: a voice's junctions, in their row under it, swapped pair by pair where their wires cross less (each edge,
 * belt or meter's trace they cross counts once; under a wheel, nothing shows). `runs`: a belt's runs as drawn.
 */
export function settleJunctions(s: LayoutState, runs: (l: { source: string; target: string; belt?: boolean }) => Segs | undefined = () => undefined): void {
  if (!s.junctions.size) return;
  placeJunctions(s);
  const discs = [...s.byId.values()].filter((n) => n.role !== 'tag' && n.x !== undefined).map((n) => ({ x: n.x ?? 0, y: n.y ?? 0, r: n.radius * s.size }));
  // (a point further off than a disc's radius along either axis isn't under it: the distance only for the others)
  const hidden = (x: number, y: number) => discs.some((d) => Math.abs(x - d.x) < d.r && Math.abs(y - d.y) < d.r && Math.hypot(x - d.x, y - d.y) < d.r);
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
      const segs = belt ?? pieces(p, q, hop ? undefined : s.bendAt.get(l.id));
      return [{ a, b, segs, box: boxOf(segs) }];
    }),
    ...s.net.flatMap((t) => {
      const [p, q] = [at(t.a), at(t.b)];
      if (!p || !q) return [];
      const segs = pieces(p, q);
      return [{ a: t.a, b: t.b, segs, box: boxOf(segs) }];
    }),
  ];
  const wiresOf = new Map<string, { a: string; b: string }[]>();
  for (const l of s.links) {
    const w = ends(l);
    for (const end of new Set([w.a, w.b])) if (s.junctions.has(end)) wiresOf.set(end, [...(wiresOf.get(end) ?? []), w]);
  }
  const placed = [...s.junctions.values()].filter((j) => j.x !== undefined);
  /** Each wire as last drawn, and from where: drawn again only when an end has moved. */
  const drawn = new Map<{ a: string; b: string }, { p: { x: number; y: number }; q: { x: number; y: number }; line: Drawn }>();
  /** A junction's wires as drawn from where it is now. */
  const wires = (j: PhysNode): Drawn[] =>
    (wiresOf.get(j.id) ?? []).flatMap((w) => {
      const [p, q] = [at(w.a), at(w.b)];
      if (!p || !q) return [];
      const was = drawn.get(w);
      if (was && was.p.x === p.x && was.p.y === p.y && was.q.x === q.x && was.q.y === q.y) return [was.line];
      const segs = pieces(p, q);
      const line = { ...w, segs, box: boxOf(segs) };
      drawn.set(w, { p, q, line });
      return [line];
    });
  const meet = (u: Drawn, v: Drawn) => u.a === v.a || u.a === v.b || u.b === v.a || u.b === v.b;
  const crosses = (u: Drawn, v: Drawn) => !meet(u, v) && !apart(u, v) && u.segs.some((p) => v.segs.some((q) => segmentsCross(p[0], p[1], p[2], p[3], q[0], q[1], q[2], q[3])));
  /**
   * What everything but these junctions' wires is drawn as, near enough to cross them: wherever in their rows they are
   * tried, their wires (straight) stay in the box round their voices (`ring` out) and their wires' other ends.
   */
  const restOf = (set: readonly PhysNode[], ring: number) => {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const j of set) {
      const v = s.byId.get(j.rides!)!;
      const [vx, vy] = [v.x ?? 0, v.y ?? 0];
      [x0, y0, x1, y1] = [Math.min(x0, vx - ring), Math.min(y0, vy - ring), Math.max(x1, vx + ring), Math.max(y1, vy + ring)];
      for (const w of wiresOf.get(j.id) ?? [])
        for (const end of [w.a, w.b]) {
          const p = end === j.id ? undefined : at(end);
          if (p) [x0, y0, x1, y1] = [Math.min(x0, p.x), Math.min(y0, p.y), Math.max(x1, p.x), Math.max(y1, p.y)];
        }
    }
    // (a pixel to spare: a sampled point may stray past its ends by a rounding)
    const near: Drawn = { a: '', b: '', segs: [], box: [x0 - 1, y0 - 1, x1 + 1, y1 + 1] };
    return [...fixed, ...placed.filter((o) => !set.includes(o)).flatMap(wires)].filter((e) => !apart(e, near));
  };
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
  for (const [voice, js] of byVoice) {
    const v = s.byId.get(voice)!;
    // (where their wires can reach, wherever in the row they are)
    const reach = (v.radius + (js[0].below ?? 0) + js.length * (2 * js[0].radius + SIDE_GAP)) * s.size;
    // (a pass swaps each pair once; again while a pass found a better order)
    let better = true;
    for (let pass = 0; better && pass < 4; pass++) {
      better = false;
      for (let i = 0; i < js.length; i++)
        for (let k = i + 1; k < js.length; k++) {
          const pair = [js[i], js[k]];
          const rest = restOf(pair, reach);
          const [a, b] = [s.rims.get(js[i].id)!, s.rims.get(js[k].id)!];
          const now = cost(pair, rest);
          s.rims.set(js[i].id, b);
          s.rims.set(js[k].id, a);
          hang(s, v, pair);
          if (cost(pair, rest) < now) {
            better = true;
            continue;
          }
          s.rims.set(js[i].id, a);
          s.rims.set(js[k].id, b);
          hang(s, v, pair);
        }
    }
  }
  // (their wires' bends laid again from where they are now: straight, then off the wheels as the forces would)
  for (const l of s.links) if (s.junctions.has(l.source) || s.junctions.has(l.target)) s.bendAt.delete(l.id);
  for (let k = 0; k < 12; k++) stepBends(s);
}
