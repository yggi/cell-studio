/**
 * Where the golden graph's cells sit: found, not drawn by hand. Straight edges, so a drawing is good when no two edges
 * cross (a meter's net and a note's `about=` links count too), no edge runs through a wheel or a petal, no two wheels
 * touch, no edge's label is hidden under a wheel — and the layered drawing's rows are kept, so it still reads as a flow.
 * Simulated annealing from the layered drawing, seeded: the same graph gives the same places. Run it through
 * `node tools/gallery/golden/place.mjs` when the piece changes; the golden test checks the result with the real layout.
 *
 * A move re-scores only what it touches (the node's edges, its discs, the nets it belongs to): that makes a step cheap
 * enough for millions of them.
 */
import type { GraphModel, GraphNode } from '../../../src/engine/graph';
import { segmentsCross } from '../../../src/layout/geometry';
import { isGround } from '../../../src/layout/meters';
import { PETAL } from '../../../src/ui/flownode';

type Spot = { x: number; y: number };

export interface PlaceOptions {
  /** A cell's room (the layout's own: its wheel and its label). */
  readonly radius: (n: GraphNode) => number;
  /** A cell's wheel as the graph draws it, px: what its petals hang from. */
  readonly size: (n: GraphNode) => number;
  /** Where the cells start (the layered drawing). */
  readonly start: ReadonlyMap<string, Spot>;
  readonly seed?: number;
  /** Annealing steps per restart, and restarts. */
  readonly steps?: number;
  readonly restarts?: number;
  /** Keep going through every restart even after a drawing without faults (the tidiest of them is kept). */
  readonly polish?: boolean;
}

export interface Cost {
  /** Pairs of edges that cross (edges, nets, about links). */
  readonly crossings: number;
  /** Edges through a wheel or a petal that isn't theirs. */
  readonly through: number;
  /** Wheels (or petals) whose rooms touch. */
  readonly touching: number;
  /** Edge labels under a wheel. */
  readonly hidden: number;
}

export interface Placed {
  readonly at: Map<string, Spot>;
  readonly cost: Cost;
}

const WEIGHT = { crossing: 1000, through: 500, touching: 400, hidden: 150, row: 0.2, length: 0.03 };
/** An edge keeps this far (px) from a wheel that isn't its own, beyond the wheel itself. */
const PASS = 14;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Petals hang on the outer side of their cell, fanned (Graph.svelte: petalSlot): where they are, from the cell's. */
export function petalSpots(p: Spot, size: number, n: number): Spot[] {
  const outward = p.x < -20 ? Math.PI : 0;
  return Array.from({ length: n }, (_, i) => {
    const a = outward + (i - (n - 1) / 2) * (n > 3 ? 0.55 : 0.68);
    const d = size / 2 + PETAL / 2 + 2;
    return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
  });
}

interface Edge {
  /** Node indices. */
  a: number;
  b: number;
  label: boolean;
  /** Unique, for marking. */
  id: number;
}

export function place(model: GraphModel, o: PlaceOptions): Placed {
  const named = model.nodes.filter((n) => !n.petalOf);
  const ids = named.map((n) => n.id);
  const N = ids.length;
  const index = new Map(ids.map((id, i) => [id, i]));
  const byId = new Map(named.map((n) => [n.id, n]));
  const room = named.map((n) => o.radius(n));
  const wheel = named.map((n) => o.size(n) / 2);
  const petals = ids.map(() => 0);
  for (const n of model.nodes) if (n.petalOf) petals[index.get(n.petalOf)!]++;
  const X = ids.map((id) => o.start.get(id)?.x ?? 0);
  const Y = ids.map((id) => o.start.get(id)?.y ?? 0);
  const y0 = [...Y];

  // the edges as drawn: not a meter's own (ground: its net is, below); about links too
  let nextId = 0;
  const fixed: Edge[] = [];
  const incident: Edge[][] = ids.map(() => []);
  for (const e of model.edges) {
    if (isGround(e, byId) || !index.has(e.source) || !index.has(e.target)) continue;
    const edge: Edge = { a: index.get(e.source)!, b: index.get(e.target)!, label: e.kind !== 'about' && !!(e.pick || e.label || e.count > 1), id: nextId++ };
    fixed.push(edge);
    incident[edge.a].push(edge);
    incident[edge.b].push(edge);
  }
  const neighbours = ids.map((_, i) => [...new Set(incident[i].map((e) => (e.a === i ? e.b : e.a)))]);
  // a meter's net: the meter and the cells it steps, joined by the shortest traces (as the net lays itself, without its
  // care for what it crosses)
  const groups: { ends: number[]; net: Edge[] }[] = [];
  const meterOf = new Map<string, number[]>();
  for (const e of model.edges) if (isGround(e, byId)) meterOf.set(e.target, [...(meterOf.get(e.target) ?? []), index.get(e.source)!]);
  const inGroups: number[][] = ids.map(() => []);
  for (const [meter, cells] of meterOf) {
    const ends = [index.get(meter)!, ...cells];
    groups.push({ ends, net: [] });
    for (const i of ends) inGroups[i].push(groups.length - 1);
  }
  const laidNet = (g: number): Edge[] => {
    const { ends } = groups[g];
    const pairs: [number, number, number][] = [];
    for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) pairs.push([Math.hypot(X[ends[i]] - X[ends[j]], Y[ends[i]] - Y[ends[j]]), ends[i], ends[j]]);
    pairs.sort((u, v) => u[0] - v[0]);
    const root = new Map(ends.map((e) => [e, e]));
    const find = (e: number): number => (root.get(e) === e ? e : find(root.get(e)!));
    const net: Edge[] = [];
    for (const [, a, b] of pairs) {
      if (find(a) === find(b)) continue;
      root.set(find(a), find(b));
      net.push({ a, b, label: false, id: nextId++ });
    }
    return net;
  };
  groups.forEach((g, i) => (g.net = laidNet(i)));

  const allEdges = (): Edge[] => [...fixed, ...groups.flatMap((g) => g.net)];
  // (the discs are made once `discAt` exists, below)

  /** A disc of the drawing: a wheel (`k` = -1) or its k-th petal. */
  const discAt = (i: number, k: number) => {
    if (k < 0) return { x: X[i], y: Y[i], r: room[i], reach: wheel[i] + PASS };
    const s = petalSpots({ x: X[i], y: Y[i] }, wheel[i] * 2, petals[i])[k];
    return { x: s.x, y: s.y, r: PETAL / 2 + 8, reach: PETAL / 2 + PASS };
  };
  // (cached: refreshed whenever a wheel moves)
  type Disc = ReturnType<typeof discAt>;
  const discCache: Disc[][] = ids.map(() => []);
  const refresh = (i: number) => {
    discCache[i] = [discAt(i, -1), ...Array.from({ length: petals[i] }, (_, k) => discAt(i, k))];
  };
  const refreshAll = () => ids.forEach((_, i) => refresh(i));
  const discsOf = (i: number) => discCache[i];

  refreshAll();
  const distToSegment = (px: number, py: number, e: Edge) => {
    const [x1, y1, x2, y2] = [X[e.a], Y[e.a], X[e.b], Y[e.b]];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  };
  const shares = (e: Edge, f: Edge) => e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b;
  const crosses = (e: Edge, f: Edge) => {
    const [x1, y1, x2, y2, x3, y3, x4, y4] = [X[e.a], Y[e.a], X[e.b], Y[e.b], X[f.a], Y[f.a], X[f.b], Y[f.b]];
    if (Math.max(x3, x4) < Math.min(x1, x2) || Math.min(x3, x4) > Math.max(x1, x2) || Math.max(y3, y4) < Math.min(y1, y2) || Math.min(y3, y4) > Math.max(y1, y2)) return false;
    return segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4);
  };

  /**
   * The terms of the cost that depend on these nodes, each pair once: every edge of theirs (and of the nets they belong to)
   * against every edge, wheel and petal; their discs against every edge and wheel. What a move changes is in here.
   */
  function terms(nodes: readonly number[]): Cost & { soft: number } {
    const edges = allEdges();
    const mine = new Set<Edge>();
    for (const i of nodes) {
      for (const e of incident[i]) mine.add(e);
      for (const g of inGroups[i]) for (const e of groups[g].net) mine.add(e);
    }
    const owned = new Set(nodes);
    let crossings = 0;
    let through = 0;
    let hidden = 0;
    let touching = 0;
    let soft = 0;
    // each of their edges: against the other edges (a pair of theirs once), and past every wheel that isn't an end of it
    const done = new Set<Edge>();
    for (const e of mine) {
      done.add(e);
      for (const f of edges) if (f !== e && !shares(e, f) && !(done.has(f) && mine.has(f)) && crosses(e, f)) crossings++;
      soft += WEIGHT.length * Math.hypot(X[e.b] - X[e.a], Y[e.b] - Y[e.a]);
      const [mx, my] = [(X[e.a] + X[e.b]) / 2, (Y[e.a] + Y[e.b]) / 2];
      for (let i = 0; i < N; i++) {
        if (i === e.a || i === e.b) continue;
        for (const d of discsOf(i)) if (distToSegment(d.x, d.y, e) < d.reach) through++;
        if (e.label && Math.hypot(X[i] - mx, Y[i] - my) < room[i]) hidden++;
      }
    }
    // each of their discs: against the edges that aren't theirs (theirs were counted above), and against other wheels
    for (const i of nodes) {
      soft += WEIGHT.row * Math.abs(Y[i] - y0[i]);
      for (const e of edges) {
        if (mine.has(e)) continue;
        for (const d of discsOf(i)) if (distToSegment(d.x, d.y, e) < d.reach) through++;
        if (e.label && Math.hypot(X[i] - (X[e.a] + X[e.b]) / 2, Y[i] - (Y[e.a] + Y[e.b]) / 2) < room[i]) hidden++;
      }
      const mineDiscs = discsOf(i);
      for (let j = 0; j < N; j++) {
        if (j === i || (owned.has(j) && j < i)) continue;
        const theirs = discsOf(j);
        for (const d of mineDiscs)
          for (const c of theirs) {
            const gap = d.r + c.r - Math.hypot(d.x - c.x, d.y - c.y);
            if (gap > 0) touching += 1 + gap / 40;
          }
      }
    }
    return { crossings, through, hidden, touching, soft };
  }
  /** What the annealing compares: the faults at the weight of this moment (crossings are cheap early, so the drawing can unfold), and the soft terms. */
  const score = (c: Cost & { soft: number }, ease: number) =>
    c.crossings * WEIGHT.crossing * ease + c.through * WEIGHT.through * ease + c.touching * WEIGHT.touching + c.hidden * WEIGHT.hidden + c.soft;

  /** The whole cost, from scratch (for the record: the annealing only ever compares parts). */
  function whole(): Cost {
    const edges = allEdges();
    let crossings = 0;
    for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) if (!shares(edges[i], edges[j]) && crosses(edges[i], edges[j])) crossings++;
    let through = 0;
    let hidden = 0;
    for (const e of edges) {
      for (let i = 0; i < N; i++) {
        if (i === e.a || i === e.b) continue;
        for (const d of discsOf(i)) if (distToSegment(d.x, d.y, e) < d.reach) through++;
        if (e.label && Math.hypot(X[i] - (X[e.a] + X[e.b]) / 2, Y[i] - (Y[e.a] + Y[e.b]) / 2) < room[i]) hidden++;
      }
    }
    let touching = 0;
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++)
        for (const d of discsOf(i))
          for (const c of discsOf(j)) {
            const gap = d.r + c.r - Math.hypot(d.x - c.x, d.y - c.y);
            if (gap > 0) touching += 1 + gap / 40;
          }
    return { crossings, through, touching, hidden };
  }

  const restarts = o.restarts ?? 2;
  const steps = o.steps ?? 600000;
  let best: { at: Map<string, Spot>; cost: Cost; value: number; soft: number } | null = null;
  const startX = [...X];
  const startY = [...Y];
  for (let r = 0; r < restarts; r++) {
    const rand = rng((o.seed ?? 1) * 7919 + r * 104729);
    for (let i = 0; i < N; i++) {
      X[i] = startX[i];
      Y[i] = startY[i];
    }
    refreshAll();
    groups.forEach((g, i) => (g.net = laidNet(i)));
    const hard = (c: Cost) => c.crossings * WEIGHT.crossing + c.through * WEIGHT.through + c.touching * WEIGHT.touching + c.hidden * WEIGHT.hidden;
    const wholeSoft = () => {
      let soft = 0;
      for (let i = 0; i < N; i++) soft += WEIGHT.row * Math.abs(Y[i] - y0[i]);
      for (const e of allEdges()) soft += WEIGHT.length * Math.hypot(X[e.b] - X[e.a], Y[e.b] - Y[e.a]);
      return soft;
    };
    let current = hard(whole());
    let currentSoft = wholeSoft();
    // (the best: the fewest faults, then the tidiest)
    let record = { x: [...X], y: [...Y], value: current, soft: currentSoft };
    for (let step = 0; step < steps; step++) {
      const k = step / steps;
      const temp = 220 * Math.pow(0.003, k);
      const sigma = 160 * Math.pow(0.06, k) + 8;
      const ease = 0.06 + 0.94 * Math.min(1, k / 0.6);
      const m = Math.floor(rand() * N);
      const moved: number[] = [m];
      if (rand() < 0.1) {
        // swap with a wheel in about the same row
        const near: number[] = [];
        for (let i = 0; i < N; i++) if (i !== m && Math.abs(Y[i] - Y[m]) < 90) near.push(i);
        if (near.length) moved.push(near[Math.floor(rand() * near.length)]);
      }
      const before = terms(moved);
      const old = moved.map((i) => ({ x: X[i], y: Y[i] }));
      const oldNets = groups.map((g) => g.net);
      if (moved.length === 2) {
        X[moved[0]] = old[1].x;
        X[moved[1]] = old[0].x;
      } else if (rand() < 0.25 && neighbours[m].length) {
        // to the middle of its neighbours (what a layered drawing does), a little off
        const ns = neighbours[m];
        const g = () => (rand() - 0.5) * 2;
        X[m] = ns.reduce((t, i) => t + X[i], 0) / ns.length + g() * sigma * 0.5;
        Y[m] = ns.reduce((t, i) => t + Y[i], 0) / ns.length + g() * sigma * 0.3;
      } else {
        const g = () => (rand() + rand() + rand() - 1.5) * 1.6;
        X[m] += g() * sigma;
        Y[m] += g() * sigma * 0.45;
      }
      for (const i of moved) refresh(i);
      for (const i of moved) for (const g of inGroups[i]) groups[g].net = laidNet(g);
      const after = terms(moved);
      const delta = score(after, ease) - score(before, ease);
      if (delta <= 0 || rand() < Math.exp(-delta / temp)) {
        current += hard(after) - hard(before);
        currentSoft += after.soft - before.soft;
        if (current < record.value - 1e-9 || (current < record.value + 1e-9 && currentSoft < record.soft - 1e-9))
          record = { x: [...X], y: [...Y], value: current, soft: currentSoft };
      } else {
        moved.forEach((i, n) => {
          X[i] = old[n].x;
          Y[i] = old[n].y;
          refresh(i);
        });
        groups.forEach((g, i) => (g.net = oldNets[i]));
      }
    }
    for (let i = 0; i < N; i++) {
      X[i] = record.x[i];
      Y[i] = record.y[i];
    }
    refreshAll();
    groups.forEach((g, i) => (g.net = laidNet(i)));
    // (what is kept is measured from scratch, not from the running sums)
    const cost = whole();
    const v = hard(cost);
    const soft = wholeSoft();
    if (!best || v < best.value - 1e-9 || (v < best.value + 1e-9 && soft < best.soft)) best = { at: new Map(ids.map((id, i) => [id, { x: X[i], y: Y[i] }])), cost, value: v, soft };
    if (v < 1e-9 && restarts > 1 && r < restarts - 1 && !o.polish) break;
  }
  return { at: best!.at, cost: best!.cost };
}

/** Whole pixels: a layout that is kept, so a diff shows what moved. */
export function rounded(at: ReadonlyMap<string, Spot>): Map<string, Spot> {
  return new Map([...at].map(([id, p]) => [id, { x: Math.round(p.x), y: Math.round(p.y) }]));
}
