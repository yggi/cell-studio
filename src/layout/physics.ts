/**
 * Force-directed layout for the cell graph (d3-force), independent of the
 * renderer. Nodes keep their simulated state across graph edits, so editing
 * code nudges the picture instead of rebuilding it. Depth is a soft radial
 * force: the root grid sits at the centre and cells ring outward along their
 * over= chains — but everything still moves freely.
 */
import { forceX, forceY, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from 'd3-force';
import type { GraphModel, GraphNode } from '../engine/graph';
import { segmentsCross, splinePoint } from './geometry';
import { layered } from './layered';
import { distanceToSegment, drawnCrossings, layoutQuality, type Aim, type LayoutQuality } from './quality';
import { fitTurn, headOffset, tapeHeads, UNTURNED } from './tape';
import { isGround } from './meters';
import { openBelt, pulleys } from './belts';

/** A belt's spring: its length against an edge's, and its pull. */
const BELT_LENGTH = 0.8;
const BELT_PULL = 0.5;

/** A trace of a meter's net (meterNet): between two of its ends, the meter or a cell it steps. */
export interface MeterTrace {
  readonly id: string;
  /** The meter's node id. */
  readonly meter: string;
  readonly a: string;
  readonly b: string;
}

export interface PhysNode extends SimulationNodeDatum {
  id: string;
  depth: number;
  radius: number;
  /** What it is, for the forces between kinds: time (a meter), sound (a voice, a mix, the sound card), or a cell. */
  role?: 'clock' | 'audio' | 'cell' | 'tag';
  /** Its cluster: the first of its own tags (tags= on a cell inside a piece), if any. */
  group?: string;
  /** All its tags (tags= on a cell inside a piece): the clusters drawn round it. */
  tags?: readonly string[];
  /** A turntable (a physical cell): nothing may overlap it. */
  heavy?: boolean;
}
interface PhysLink extends SimulationLinkDatum<PhysNode> {
  id: string;
  count: number;
  /** A part or table edge (&ref, over=): shorter, so parts stay with their user. */
  part: boolean;
  /** A belt (a belted cell's step, source: the driven): drawn as two runs over the wheels. */
  belt?: boolean;
  /** A tag's spring to one of its cells (not drawn: no crossings, no bends, no spread). */
  tag?: boolean;
  /** How much of its pull it keeps (a hub's edge into a cluster gives the rest to the cluster's tag: `mux`). */
  keep?: number;
  /** A hub's spring to a cluster's tag, standing for its edges into the cluster (not drawn). */
  muxed?: boolean;
}

export interface LayoutOptions {
  layerGap: number;
  /** Edge length at rest (px). */
  linkDistance: number;
  /** How much edges contract towards that length (0 none … 1 full). */
  contract: number;
  /** Edge length from a part or table to its user, as a fraction of the length (they stay close). */
  partLength: number;
  /** Node repulsion (negative: push apart). */
  charge: number;
  /** How hard crossing edges push each other apart (gently: edges may cross). */
  uncross: number;
  /** How far node repulsion reaches (px): near field. */
  repelRange: number;
  /** Busy nodes push harder: repulsion × (1 + this × (edges − 1)). */
  degreeRepel: number;
  /** Extra clearance around each node beyond its wheel (room for its label). */
  collidePad: number;
  /** How quickly a bent edge straightens (0 … 1 per tick). */
  straighten: number;
  /** How far an edge keeps off a node's centre, as a fraction of its radius (0: passes straight over). */
  avoid: number;
  /** How strongly the sound card and the meters are drawn up- and down-centre. */
  endPull: number;
  /** How strongly each node is drawn to the height of its rank in the signal path (y only). */
  rankPull: number;
  /** A weak sideways pull of every node towards the centre line (keeps the graph balanced). */
  centre: number;
  /** A gentle sideways pull of every node towards its column (voices by stereo and mix order). */
  columnPull: number;
  /** false = never start the internal timer; drive it with tick() (tests). */
  live: boolean;
  /** The edges at a node spread round it, as far apart as they can (stars, mirror symmetries). */
  spread: number;
  /** Time and sound keep apart: meters push voices, mixes and the sound card away (and they it). */
  kindRepel: number;
  /** Cells with the same tag (tags= inside a piece) draw together; different tags push apart. */
  tagPull: number;
  tagRepel: number;
  /**
   * A hub's edges into a tagged cluster (the meter, a selector, a mix into each of its cells) pull the cluster
   * as one, through its tag, by this much (0: each cell on its own, as drawn; 1: only the cluster) — a multiplexer
   * for the forces: the clusters stay together instead of being drawn into each other at the hubs.
   */
  mux: number;
  /** In the layered start, each tag (two cells or more) laid out as a block of its own (layered.ts); off: one level. */
  clusters: boolean;
  /** Which of the small, fixed nudges each new node gets (0: the app's): other seeds measure a change over several starts. */
  seed: number;
  /**
   * Lay the graph out in layers (rows by signal flow, order without tangles, columns
   * by neighbours: layered.ts) and let the physics only relax it: each node springs
   * to its place, nothing overlaps. Off: the forces alone (the library's cloud).
   */
  layered: boolean;
  radius: (node: GraphNode) => number;
}

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
function forceUncross(strengthOf: () => number) {
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
      for (const n of [p.a, p.b]) {
        n.vx = (n.vx ?? 0) + mx * k * 0.5;
        n.vy = (n.vy ?? 0) + my * k * 0.5;
      }
      for (const n of [q.a, q.b]) {
        n.vx = (n.vx ?? 0) - mx * k * 0.5;
        n.vy = (n.vy ?? 0) - my * k * 0.5;
      }
    }
  };
  force.links = (ls: typeof links) => {
    links = ls;
    return force;
  };
  return force;
}

/**
 * Starting x order for a fresh graph, layer by layer (a layer = a depth): each
 * node goes to the mean position of its neighbours, a few sweeps up and down —
 * the barycentre heuristic, which starts layered drawings with few crossings.
 * Each node sits at its wanted place, pushed apart just enough to keep one slot
 * between neighbours. Returns x in slots.
 */
export function orderLayers(nodes: readonly { id: string; depth: number }[], edges: readonly { source: string; target: string }[], sweeps = 8): Map<string, number> {
  const layers = new Map<number, string[]>();
  for (const n of nodes) layers.set(n.depth, [...(layers.get(n.depth) ?? []), n.id]);
  const x = new Map<string, number>();
  const spread = (ids: string[]) => ids.forEach((id, i) => x.set(id, i - (ids.length - 1) / 2));
  for (const ids of layers.values()) spread(ids);
  const nbrs = new Map<string, string[]>();
  for (const e of edges) {
    if (!x.has(e.source) || !x.has(e.target) || e.source === e.target) continue;
    nbrs.set(e.source, [...(nbrs.get(e.source) ?? []), e.target]);
    nbrs.set(e.target, [...(nbrs.get(e.target) ?? []), e.source]);
  }
  const depths = [...layers.keys()].sort((a, b) => a - b);
  for (let s = 0; s < sweeps; s++)
    for (const d of s % 2 ? [...depths].reverse() : depths) {
      const ids = layers.get(d)!;
      const want = new Map(
        ids.map((id) => [
          id,
          (() => {
            const ns = nbrs.get(id) ?? [];
            return ns.length ? ns.reduce((a, n) => a + x.get(n)!, 0) / ns.length : x.get(id)!;
          })(),
        ]),
      );
      ids.sort((a, b) => want.get(a)! - want.get(b)!);
      // each at its wanted place, pushed apart just enough to keep a slot between neighbours
      const placed = ids.map((id) => want.get(id)!);
      for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + 1);
      // shift back so the layer sits where it wanted to be on average
      const drift = placed.reduce((a, v, k) => a + v - want.get(ids[k])!, 0) / placed.length;
      ids.forEach((id, k) => x.set(id, placed[k] - drift));
    }
  return x;
}

/**
 * Each node's height in the signal path, from time (0, the meter) up to sound
 * (the sound card). Edges that carry the flow go up one rank: a step driver
 * sits under the played cell it drives, a melody under its voice, a voice under
 * its mix, a mix under the sound card (longest path). A modulator sits just
 * under what it feeds. Parts and tables — reached by &refs and over=, stepped
 * or not — sit half a row under whatever uses them (parts of parts half as far
 * again), so they cluster under it instead of widening its row.
 */
export function flowRanks(model: { nodes: readonly { id: string }[]; edges: readonly { source: string; target: string; kind: string }[] }): Map<string, number> {
  const sinks = new Set(model.nodes.filter((n) => endOf(n as GraphNode) === 'top').map((n) => n.id));
  // played cells: the terms of the mixes (melodies, modulators) and every part they splice
  const played = new Set(model.edges.filter((e) => e.kind === 'out').map((e) => e.source));
  for (let grew = true; grew;) {
    grew = false;
    for (const e of model.edges)
      if (e.kind === 'ref' && played.has(e.source) && !played.has(e.target)) {
        played.add(e.target);
        grew = true;
      }
  }
  // what carries sound: mixes (not the sound card), and tables whose entries are all mixes (a selector's
  // parts) — an edge into one of those is flow (sound goes up it), not a part hanging under its user
  const cellOf = new Map(model.nodes.map((n) => [n.id, (n as { cell?: { mix?: unknown; sink?: boolean } }).cell]));
  const sounding = new Set(model.nodes.filter((n) => cellOf.get(n.id)?.mix && !cellOf.get(n.id)?.sink).map((n) => n.id));
  for (const n of model.nodes) {
    const entries = model.edges.filter((e) => e.source === n.id && e.kind === 'ref');
    if (entries.length && entries.every((e) => sounding.has(e.target))) sounding.add(n.id);
  }
  // up: [lower, higher]
  const up: [string, string][] = [];
  for (const e of model.edges) {
    if (e.source === e.target) continue;
    // sound going up: a part mix into its table, the table into its selector, the selector into the sound card
    if ((e.kind === 'ref' || e.kind === 'over') && sounding.has(e.target)) {
      up.push([e.target, e.source]);
      continue;
    }
    // a step driver sits under what it drives — when that's played; a stepped table hangs beside its readers
    if (e.kind === 'step' && played.has(e.source)) up.push([e.target, e.source]);
    else if (e.kind === 'out' || e.kind === 'mix') up.push([e.source, e.target]);
    else if (e.kind === 'ref' && sinks.has(e.source)) up.push([e.target, e.source]); // the sound card's channels
  }
  const inFlow = new Set(up.flat());
  const rank = new Map<string, number>();
  for (const id of inFlow) rank.set(id, 0);
  // longest path (bounded: a loop can't run away)
  for (let i = 0; i < model.nodes.length; i++) {
    let changed = false;
    for (const [lo, hi] of up)
      if (rank.get(hi)! < rank.get(lo)! + 1) {
        rank.set(hi, rank.get(lo)! + 1);
        changed = true;
      }
    if (!changed) break;
  }
  // a source that drives nothing (a modulator like &vibrato) sits just under what it feeds, not at the bottom
  const drivers = new Set(model.edges.filter((e) => e.kind === 'step').map((e) => e.target));
  const fed = new Map<string, string[]>();
  for (const [lo, hi] of up) fed.set(lo, [...(fed.get(lo) ?? []), hi]);
  const hasBelow = new Set(up.map(([, hi]) => hi));
  for (const [id, his] of fed) if (!hasBelow.has(id) && !drivers.has(id)) rank.set(id, Math.max(0, Math.min(...his.map((h) => rank.get(h)!)) - 1));
  // parts and tables: just under whatever uses them — half a row, between it and the meter
  // (parts of parts half as far again), so they cluster under their user rather than widen its row
  for (let i = 0; i < model.nodes.length; i++) {
    let changed = false;
    for (const e of model.edges) {
      if ((e.kind !== 'ref' && e.kind !== 'over') || sinks.has(e.source)) continue;
      if (rank.has(e.source) && !rank.has(e.target)) {
        const r = rank.get(e.source)!;
        rank.set(e.target, inFlow.has(e.source) ? r - 0.5 : r - (r - Math.floor(r - 1e-9)) / 2);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // a part or table sits under every one of its users, not just the first one met: half a row at least
  // (so a table read by a melody and by that melody's motifs goes under the motifs, not beside them)
  for (let i = 0; i < model.nodes.length; i++) {
    let changed = false;
    for (const e of model.edges) {
      if ((e.kind !== 'ref' && e.kind !== 'over') || sinks.has(e.source) || inFlow.has(e.target) || sounding.has(e.target)) continue;
      const user = rank.get(e.source);
      const part = rank.get(e.target);
      // what it's made of (&refs) half a row under; what it's tuned by (over=) a row under: tuning beneath content
      const gap = e.kind === 'over' ? 1 : 0.5;
      if (user === undefined || part === undefined || part <= user - gap + 1e-9) continue;
      rank.set(e.target, user - gap);
      changed = true;
    }
    if (!changed) break;
  }
  // (a meter has no row of its own at the bottom: its edges are ground, and it's placed last — placeMeters)
  // notes (label= alone) sit at the top, by the sound card; anything else left (unused cells) at the bottom
  const top = Math.max(0, ...rank.values());
  for (const n of model.nodes) if (!rank.has(n.id)) rank.set(n.id, (n as { cell?: { note?: boolean } }).cell?.note ? top : 0);
  return rank;
}

/**
 * Columns, for a symmetric first layout. Voices first: by stereo position
 * (left … right); voices at the same place go by the order the mix names them,
 * the first in the middle, then alternately left and right. Every other cell
 * sits at the mean column of the voices it feeds (a motif under its player;
 * the meter, the mix and the sound card in the middle). Centred on 0.
 */
export function columns(model: {
  nodes: readonly { id: string; kind: string; pan?: number; order?: number; petalOf?: string }[];
  edges: readonly { source: string; target: string; kind: string }[];
}): Map<string, number> {
  const nodes = model.nodes.filter((n) => !n.petalOf);
  // what sounds: voices, and instruments (whose voices are petals)
  const voices = nodes.filter((n) => n.pan !== undefined);
  const col = new Map<string, number>();
  if (voices.length === 0) return col;
  // left, middle (alternating by order), right
  const side = (n: (typeof voices)[number]) => ((n.pan ?? 0) < -0.05 ? -1 : (n.pan ?? 0) > 0.05 ? 1 : 0);
  const byPan = (a: (typeof voices)[number], b: (typeof voices)[number]) => (a.pan ?? 0) - (b.pan ?? 0) || (a.order ?? 0) - (b.order ?? 0);
  const left = voices.filter((n) => side(n) < 0).sort(byPan);
  const right = voices.filter((n) => side(n) > 0).sort(byPan);
  const mid = voices.filter((n) => side(n) === 0).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const middle: typeof voices = [];
  mid.forEach((n, i) => (i % 2 === 1 ? middle.unshift(n) : middle.push(n))); // 0 centre, 1 left, 2 right, …
  const row = [...left, ...middle, ...right];
  // centre on the first-named middle voice when there is one, else on the middle of the row
  const anchor = mid.length ? row.indexOf(mid[0]) : (row.length - 1) / 2;
  row.forEach((n, i) => col.set(n.id, i - anchor));
  // who feeds whom: a part feeds what splices it, a table what reads it, a driver what it steps; a melody its voice
  const consumers = new Map<string, string[]>();
  const add = (from: string, to: string) => consumers.set(from, [...(consumers.get(from) ?? []), to]);
  for (const e of model.edges) {
    if (e.kind === 'ref' || e.kind === 'over' || e.kind === 'step') add(e.target, e.source);
    else if (e.kind === 'out') add(e.source, e.target);
  }
  const served = (id: string, seen = new Set<string>()): string[] => {
    if (col.has(id) && voices.some((v) => v.id === id)) return [id];
    if (seen.has(id)) return [];
    seen.add(id);
    return [...new Set((consumers.get(id) ?? []).flatMap((c) => served(c, seen)))];
  };
  for (const n of nodes) {
    if (col.has(n.id)) continue;
    const vs = served(n.id);
    // mixes and sound cards (and anything feeding no voice) sit in the middle of what they hear
    const hears = model.edges.filter((e) => e.kind === 'mix' && e.target === n.id).map((e) => e.source);
    const from = vs.length ? vs : hears.filter((h) => col.has(h));
    col.set(n.id, from.length ? from.reduce((a, v) => a + col.get(v)!, 0) / from.length : 0);
  }
  return col;
}

// The layered drawing is where a graph starts (and a light pull back to it: rankPull, columnPull — less
// order than a grid); then balanced forces give it its own shape: edges contract, nodes repel and keep
// room for their labels, edges spread round each node (stars, symmetries), time and sound keep apart,
// tagged cells cluster; edges straighten a little and keep well off nodes.
export const DEFAULT_LAYOUT: LayoutOptions = {
  // (uncross and contract: measured over the examples, docs/notes/27-layout.md — stronger untangling and softer
  // springs cross a quarter less than 0.3 / 0.9, for about 6 % more room)
  uncross: 0.6,
  repelRange: 380,
  degreeRepel: 0.08,
  collidePad: 34, // (room for the label under each node)
  straighten: 0.15,
  avoid: 0.6,
  contract: 0.75,
  partLength: 0.8,
  endPull: 0,
  rankPull: 0.05,
  centre: 0.004,
  columnPull: 0.035,
  layerGap: 130,
  linkDistance: 120,
  charge: -320,
  live: true,
  layered: true,
  spread: 0.5,
  kindRepel: 0.6,
  tagPull: 0.2,
  tagRepel: 1.5,
  mux: 0.8,
  clusters: true,
  seed: 0,
  radius: (n) => roomFor(n),
};

/**
 * A node's room: the wheel itself (size= scales it), and what hangs under it — its label, as wide as
 * it is, and its free() controls (sliders, a text field, a keypad's rows) — so nothing settles on them.
 */
function roomFor(n: GraphNode): number {
  const cell = (n as { cell?: { size?: number; label?: string | null; frees?: readonly { key: string; labels?: readonly string[] }[] } }).cell;
  const base = (n.kind === 'voice' ? 64 : n.depth === 0 ? 92 : 68) * (cell?.size ?? 1);
  const label = cell?.label ? Math.min(220, cell.label.length * 5.5) / 2 : 0;
  // (its free() values: pills under it, a row or two)
  const pills = cell?.frees?.length ?? 0;
  const controls = pills ? 24 * Math.ceil(pills / 3) : 0;
  return Math.max(base, label) + (controls ? 10 + controls * 0.55 : 0);
}

/** The layout before layers: the forces alone, every one on (each still an option; their tests use this). */
export const FORCES_ALONE: Partial<LayoutOptions> = {
  layered: false,
  uncross: 0.5,
  repelRange: 340,
  degreeRepel: 0.15,
  collidePad: 26,
  straighten: 0.25,
  avoid: 0.3,
  contract: 0.6,
  endPull: 0.04,
  rankPull: 0.08,
  centre: 0.01,
  columnPull: 0,
  charge: -260,
};

export interface GraphDiff {
  added: number;
  removed: number;
  total: number;
  structural: boolean;
}

/** Small deterministic hash so new nodes always spawn in the same place. */
function jitter(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) / 0xffffffff - 0.5) * 40;
}

export class ForceLayout {
  private links: { id: string; source: string; target: string; belt?: boolean }[] = [];
  /** Where the sound card (top) and the meters (bottom) are drawn to, sideways. */
  private ends = new Map<string, { x: number; y: number }>();
  /** The height of each node's rank in the signal path. */
  private rankY = new Map<string, number>();
  /** Edges per node (busy nodes push harder). */
  private degree = new Map<string, number>();
  /** Each node's column, in px (a symmetric first layout, and a gentle pull). */
  private colX = new Map<string, number>();
  /** Each edge's midpoint (the spline passes through it). */
  private bendAt = new Map<string, { x: number; y: number }>();
  private opts: LayoutOptions;
  private readonly sim: Simulation<PhysNode, PhysLink>;
  private readonly byId = new Map<string, PhysNode>();
  private settleListeners: (() => void)[] = [];

  constructor(onTick: () => void = () => {}, opts: Partial<LayoutOptions> = {}) {
    this.opts = { ...DEFAULT_LAYOUT, ...opts };
    const o = this.opts;
    this.sim = forceSimulation<PhysNode, PhysLink>([])
      .alphaMin(0.01)
      .velocityDecay(0.45)
      // every edge contracts a little
      // every edge contracts a little
      .force(
        'link',
        forceLink<PhysNode, PhysLink>([]).id((d) => d.id),
      )
      // every node repels a little, near field only: neighbours, not the whole graph
      .force('charge', forceManyBody<PhysNode>())
      // nodes don't overlap, labels included (this isn't tension: it only acts on contact)
      .force('collide', forceCollide<PhysNode>().strength(0.95).iterations(2))
      .force('uncross', forceUncross(() => this.opts.uncross) as never)
      // the sound card drifts up-centre, the meter down-centre (a slight pull, not a pin); all else gently centred
      .force(
        'endsX',
        forceX<PhysNode>((d) => this.ends.get(d.id)?.x ?? this.colX.get(d.id) ?? 0),
      )
      // every node drifts to the height of its rank in the signal path (y only: x stays free)
      .force(
        'rankY',
        forceY<PhysNode>((d) => this.rankY.get(d.id) ?? 0),
      )
      // edges' midpoints: drawn back to the straight line, slipping off any node they would rest on
      .force('bends', () => this.stepBends())
      // the edges at a node spread round it; time and sound apart; tagged cells in clusters
      .force('spread', (alpha: number) => this.stepSpread(alpha))
      .force('kinds', (alpha: number) => this.stepKinds(alpha))
      .force('clusters', (alpha: number) => this.stepClusters(alpha))
      // a note drifts towards the cells it explains (and only it: they don't feel it)
      .force('about', (alpha: number) => this.stepAbout(alpha))
      // a tape turns so its heads face what they connect to, and those turn round it towards their heads
      .force('aims', (alpha: number) => this.stepAims(alpha))
      // turntables: nothing overlaps them — a node that would is set at their edge
      .force('exclusion', () => this.stepExclusion())
      .on('tick', onTick)
      .on('end', () => this.settleListeners.forEach((f) => f()));
    this.applyOptions();
    if (!o.live) this.sim.stop();
  }

  /** What each note explains (about=): the note and one cell it is about. */
  private explains: { note: PhysNode; cell: PhysNode }[] = [];
  /** What each tape's heads connect to: its write source and its read heads' cells, each with its head's offset. */
  private faces: TapeFace[] = [];
  /** Each tape's turn, radians: where its write head sits (the heads keep their spacing; the wheel turns). */
  private turns = new Map<string, number>();

  /** Each tape turned to face its heads towards what they connect to (busy cells count more: they move less). */
  private fitTurns(at: (id: string) => { x: number; y: number } | undefined): Map<string, number> {
    const turns = new Map<string, number>();
    const byTape = new Map<string, TapeFace[]>();
    for (const f of this.faces) (byTape.get(f.tape) ?? byTape.set(f.tape, []).get(f.tape)!).push(f);
    for (const [tape, fs] of byTape) {
      const t = at(tape);
      if (!t) continue;
      const turn = fitTurn(
        fs.flatMap((f) => {
          const c = at(f.to);
          return c ? [{ angle: Math.atan2(c.y - t.y, c.x - t.x), offset: f.offset, weight: this.degree.get(f.to) ?? 1 }] : [];
        }),
      );
      turns.set(tape, turn ?? this.turns.get(tape) ?? (UNTURNED * Math.PI) / 180);
    }
    return turns;
  }

  /** Where each head's cell should be, seen from its tape (radians), with the tapes as they're turned now. */
  private aims(): Aim[] {
    return this.faces.map((f) => ({ from: f.tape, to: f.to, angle: (this.turns.get(f.tape) ?? 0) + f.offset }));
  }

  /**
   * Each tape turns to face its heads towards what they connect to; then each of those turns round the tape
   * (at the distance it is now) towards its head. The two share that turn, the one with fewer edges moving more.
   */
  private stepAims(alpha: number): void {
    if (!this.faces.length) return;
    this.turns = this.fitTurns((id) => this.position(id));
    for (const { from, to, angle } of this.aims()) {
      const a = this.byId.get(from);
      const b = this.byId.get(to);
      if (!a || !b) continue;
      const len = Math.hypot((b.x ?? 0) - (a.x ?? 0), (b.y ?? 0) - (a.y ?? 0)) || 1;
      const dx = ((a.x ?? 0) + Math.cos(angle) * len - (b.x ?? 0)) * alpha;
      const dy = ((a.y ?? 0) + Math.sin(angle) * len - (b.y ?? 0)) * alpha;
      const [da, db] = [this.degree.get(a.id) ?? 1, this.degree.get(b.id) ?? 1];
      const share = da / (da + db); // (b's part of the turn)
      b.vx = (b.vx ?? 0) + dx * share;
      b.vy = (b.vy ?? 0) + dy * share;
      a.vx = (a.vx ?? 0) - dx * (1 - share);
      a.vy = (a.vy ?? 0) - dy * (1 - share);
    }
  }

  /** A tape's turn, degrees (screen: 0 to the right, clockwise): where its write head is drawn. */
  tapeTurn(id: string): number | undefined {
    const t = this.turns.get(id);
    return t === undefined ? undefined : (t * 180) / Math.PI;
  }

  /** A note is drawn towards the cells it explains, to a short distance from them: they feel nothing, so a note can't pull the music's layout about. */
  private stepAbout(alpha: number): void {
    const byNote = new Map<PhysNode, PhysNode[]>();
    for (const { note, cell } of this.explains) (byNote.get(note) ?? byNote.set(note, []).get(note)!).push(cell);
    for (const [note, cells] of byNote) {
      const cx = cells.reduce((s, c) => s + (c.x ?? 0), 0) / cells.length;
      const cy = cells.reduce((s, c) => s + (c.y ?? 0), 0) / cells.length;
      const dx = cx - (note.x ?? 0);
      const dy = cy - (note.y ?? 0);
      const d = Math.hypot(dx, dy) || 1;
      // (at rest just clear of what it explains: touching, they'd push each other about)
      const rest = note.radius + Math.max(...cells.map((c) => c.radius)) + this.opts.collidePad + 20;
      if (d <= rest) continue;
      const k = (0.3 * alpha * (d - rest)) / d;
      note.vx = (note.vx ?? 0) + dx * k;
      note.vy = (note.vy ?? 0) + dy * k;
    }
  }

  /**
   * The edges at a node spread round it, as far apart as they can: for each node, its neighbours
   * sorted by angle; where two sit closer than an even share of the circle, both are turned apart
   * (tangentially, around the node) — stars and mirror symmetries come of it.
   */
  private stepSpread(alpha: number): void {
    const k = this.opts.spread * alpha;
    if (k <= 0) return;
    const nbrs = new Map<string, PhysNode[]>();
    for (const l of this.links) {
      const a = this.byId.get(l.source);
      const b = this.byId.get(l.target);
      if (!a || !b || a === b) continue;
      (nbrs.get(a.id) ?? nbrs.set(a.id, []).get(a.id)!).push(b);
      (nbrs.get(b.id) ?? nbrs.set(b.id, []).get(b.id)!).push(a);
    }
    for (const [id, ns] of nbrs) {
      if (ns.length < 2) continue;
      const c = this.byId.get(id)!;
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
  private stepExclusion(): void {
    const all = [...this.byId.values()];
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
  private stepKinds(alpha: number): void {
    const k = this.opts.kindRepel * alpha * 900;
    if (k <= 0) return;
    const nodes = [...this.byId.values()];
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
  private stepClusters(alpha: number): void {
    const groups = new Map<string, PhysNode[]>();
    for (const n of this.byId.values()) if (n.group) (groups.get(n.group) ?? groups.set(n.group, []).get(n.group)!).push(n);
    if (groups.size === 0) return;
    const centres = [...groups].map(([g, ns]) => ({ g, ns, x: ns.reduce((a, n) => a + (n.x ?? 0), 0) / ns.length, y: ns.reduce((a, n) => a + (n.y ?? 0), 0) / ns.length }));
    const pull = this.opts.tagPull * alpha;
    for (const c of centres)
      for (const n of c.ns) {
        n.vx = (n.vx ?? 0) + (c.x - (n.x ?? 0)) * pull;
        n.vy = (n.vy ?? 0) + (c.y - (n.y ?? 0)) * pull;
      }
    const push = this.opts.tagRepel * alpha * 60000;
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

  /** The options in force (for the options view). */
  get options(): Readonly<LayoutOptions> {
    return this.opts;
  }

  /** Change forces live (the options view): they apply at once and the layout re-settles. */
  setOptions(next: Partial<LayoutOptions>): void {
    this.opts = { ...this.opts, ...next };
    this.applyOptions();
    this.reheat(0.4);
  }

  private applyOptions(): void {
    const o = this.opts;
    (this.sim.force('link') as ReturnType<typeof forceLink<PhysNode, PhysLink>>)
      // (a belt is drawn over the wheels: short and stiff, so its turntables sit side by side and it crosses little)
      .distance((l) => (l.tag || l.muxed ? o.linkDistance * 1.6 : l.part ? o.linkDistance * o.partLength : l.belt ? o.linkDistance * BELT_LENGTH : o.linkDistance))
      .strength((l) => (l.tag ? 0.12 : l.belt ? BELT_PULL : Math.min(0.2, 0.08 + 0.02 * l.count) * o.contract * (l.muxed ? o.mux : 1 - (1 - (l.keep ?? 1)) * o.mux)));
    // busy nodes push a little harder: more room around hubs, fewer edges squeezed past them
    (this.sim.force('charge') as ReturnType<typeof forceManyBody<PhysNode>>)
      .strength((d) => (d.role === 'tag' ? o.charge * 3 : o.charge * (1 + o.degreeRepel * Math.max(0, (this.degree.get(d.id) ?? 1) - 1))))
      .distanceMax(o.repelRange);
    (this.sim.force('collide') as ReturnType<typeof forceCollide<PhysNode>>).radius((d) => d.radius + o.collidePad);
    // sideways: &bar and &out to their places on the centre line, everything else gently towards it
    // sideways: &bar and &out to the centre line, the rest gently to their columns (else to the centre)
    (this.sim.force('endsX') as ReturnType<typeof forceX<PhysNode>>).strength((d) => (this.ends.has(d.id) ? o.endPull : this.colX.has(d.id) ? o.columnPull : o.centre));
    (this.sim.force('rankY') as ReturnType<typeof forceY<PhysNode>>).strength(o.rankPull);
  }

  /** Forget every position: the next graph is laid out afresh (a piece just opened). */
  forget(): void {
    this.byId.clear();
    this.placedMeters.clear();
    this.net = [];
    this.bendAt.clear();
  }

  /** Merge a new graph in. Existing nodes keep position and velocity. */
  setGraph(model: GraphModel, structural = true): GraphDiff {
    // petals (unnamed cells) hang from their parent: the physics only sees named cells
    model = { ...model, nodes: model.nodes.filter((n) => !(n as { petalOf?: string }).petalOf) };
    const next = new Map<string, PhysNode>();
    let added = 0;
    const parentOf = new Map<string, string>();
    for (const e of model.edges) if (e.kind !== 'about' && !parentOf.has(e.target)) parentOf.set(e.target, e.source);

    // layers by rank in the signal path, from the meter (bottom) up to the sound card (top);
    // a fresh graph starts there, each layer in barycentre order; an edit keeps what's on screen
    const ranks = flowRanks(model);
    const maxRank = Math.max(1, ...ranks.values());
    const half = (maxRank * this.opts.layerGap) / 2;
    const layerY = (rank: number) => half - (rank / maxRank) * 2 * half;
    this.rankY = new Map([...ranks].map(([id, r]) => [id, layerY(r)]));
    // (a meter's edges aren't drawn — its cells wear its ring, meters.ts — so they neither count nor pull)
    const nodeById = new Map(model.nodes.map((n) => [n.id, n]));
    const ground = (e: (typeof model.edges)[number]) => isGround(e, nodeById);
    this.degree = new Map();
    for (const e of model.edges)
      if (e.source !== e.target && e.kind !== 'about' && !ground(e)) for (const id of [e.source, e.target]) this.degree.set(id, (this.degree.get(id) ?? 0) + 1);
    // mostly new (a different example that happens to share &bar, &mix, &out): lay it all out afresh
    const fresh = model.nodes.filter((n) => !this.byId.has(n.id)).length > model.nodes.length / 2;
    if (fresh) this.bendAt.clear(); // a fresh graph: no bends left over from the last one
    // columns: voices by stereo place and mix order, everything else over the voices it feeds
    const cols = columns(model);
    const slot = this.opts.layerGap * 1.1;
    this.colX = new Map([...cols].map(([id, c]) => [id, c * slot]));
    // laid out in layers: each node's place is its home — where a fresh graph starts, and what it springs to
    this.faces = tapeFaces(model);
    let home: Map<string, { x: number; y: number }> | null = null;
    if (this.opts.layered) {
      const byId = new Map(model.nodes.map((n) => [n.id, n]));
      const lay = layered(model, { gapX: this.opts.collidePad * 1.6, gapY: this.opts.layerGap, radius: (id) => this.opts.radius(byId.get(id)!), flat: !this.opts.clusters });
      const ys = [...lay.values()].map((p) => p.y);
      const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
      home = new Map([...lay].map(([id, p]) => [id, { x: p.x, y: p.y - midY }]));
      // each tape turned to face where the layers put what its heads connect to; then each read head's
      // cell starts in its head's direction, just clear of the tape (a write source stays: it's a source of more)
      // (only to place them: the tapes' turns are fitted to where everything is once it's placed, below)
      const homeTurns = this.fitTurns((id) => home!.get(id));
      for (const f of this.faces) {
        const t = home.get(f.tape);
        if (f.write || !t || !home.has(f.to)) continue;
        const angle = (homeTurns.get(f.tape) ?? 0) + f.offset;
        const d = this.opts.radius(byId.get(f.tape)!) + this.opts.radius(byId.get(f.to)!) + this.opts.collidePad;
        home.set(f.to, { x: t.x + Math.cos(angle) * d, y: t.y + Math.sin(angle) * d });
      }
      this.colX = new Map([...home].map(([id, p]) => [id, p.x]));
      this.rankY = new Map([...home].map(([id, p]) => [id, p.y]));
    }
    let ordered =
      fresh && !home
        ? orderLayers(
            model.nodes.map((n) => ({ id: n.id, depth: ranks.get(n.id)! })),
            model.edges.filter((e) => e.kind !== 'about'),
          )
        : null;
    if (fresh && !home && cols.size) {
      // a symmetric start: each node at its column, pushed apart within its row just enough
      ordered = new Map();
      const rows = new Map<number, string[]>();
      for (const n of model.nodes) rows.set(ranks.get(n.id)!, [...(rows.get(ranks.get(n.id)!) ?? []), n.id]);
      for (const ids of rows.values()) {
        ids.sort((a, b) => (cols.get(a) ?? 0) - (cols.get(b) ?? 0));
        const want = ids.map((id) => cols.get(id) ?? 0);
        const placed = [...want];
        for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + 1);
        const drift = placed.reduce((a, v, k) => a + v - want[k], 0) / Math.max(1, placed.length);
        ids.forEach((id, k) => ordered!.set(id, placed[k] - drift));
      }
    }

    model.nodes.forEach((n) => {
      let p = fresh ? undefined : this.byId.get(n.id);
      if (!p) {
        added++;
        const parent = this.byId.get(parentOf.get(n.id) ?? '');
        let x: number, y: number;
        if (home?.has(n.id) && (fresh || !parent)) {
          x = home.get(n.id)!.x;
          y = home.get(n.id)!.y;
        } else if (ordered) {
          x = (ordered.get(n.id) ?? 0) * this.opts.layerGap * 1.1;
          y = this.rankY.get(n.id) ?? 0;
        } else if (parent?.x !== undefined && parent.y !== undefined) {
          // spawn next to the parent
          x = parent.x + this.opts.layerGap * 0.6;
          y = parent.y - this.opts.layerGap * 0.3;
        } else {
          // a new cell on its own: at the origin, between the top and the bottom
          x = 0;
          y = 0;
        }
        // (a little jitter, even from a home in the layers: exactly in line, an edge would run straight through a node)
        p = { id: n.id, depth: n.depth, radius: this.opts.radius(n), x: x + jitter(n.id, 1 + 2 * this.opts.seed), y: y + jitter(n.id, 2 + 2 * this.opts.seed) };
      }
      p.depth = n.depth;
      p.radius = this.opts.radius(n);
      const cell = (n as { cell?: { mix?: unknown; sink?: boolean; note?: boolean; tags?: readonly string[] } }).cell;
      p.role = (n as { isMeter?: boolean }).isMeter ? 'clock' : n.kind === 'voice' || cell?.mix || cell?.sink ? 'audio' : 'cell';
      p.group = cell?.note ? undefined : cell?.tags?.[0];
      p.tags = cell?.note ? undefined : cell?.tags;
      const prm = (cell as { params?: Record<string, unknown> } | undefined)?.params;
      p.heavy = typeof prm?.motor === 'number' || typeof prm?.belt === 'number'; // (a piece's card: its tags are the piece's, not a cluster)
      next.set(n.id, p);
    });

    // a flow from time to sound: the sound card drawn up-centre, the meters down-centre
    // (a fresh graph starts them there; after that it's only a slight pull)
    const outer = half;
    this.ends = new Map();
    // (laid out in layers, the ends are where the layers put them)
    for (const end of home ? [] : (['top', 'bottom'] as const)) {
      const ids = model.nodes.filter((n) => endOf(n) === end).map((n) => n.id);
      ids.forEach((id, i) => {
        const at = { x: (i - (ids.length - 1) / 2) * this.opts.layerGap * 1.2, y: end === 'top' ? -outer : outer };
        this.ends.set(id, at);
        if (ordered) Object.assign(next.get(id)!, at);
      });
    }

    // tags inside the piece: a node each (its name), among its cells — it pushes cells and edges away,
    // and its springs hold its cells round it
    const members = new Map<string, string[]>();
    for (const p of next.values()) if (p.group) (members.get(p.group) ?? members.set(p.group, []).get(p.group)!).push(p.id);
    const tagLinks: PhysLink[] = [];
    for (const [t, ids] of members) {
      const id = `tag:${t}`;
      let p = this.byId.get(id);
      if (!p || fresh) {
        const xs = ids.map((m) => next.get(m)!.x ?? 0);
        const ys = ids.map((m) => next.get(m)!.y ?? 0);
        p = {
          id,
          depth: 0,
          radius: 40 + 13 * t.length,
          x: xs.reduce((a, v) => a + v, 0) / ids.length + jitter(id, 1 + 2 * this.opts.seed),
          y: ys.reduce((a, v) => a + v, 0) / ids.length + jitter(id, 2 + 2 * this.opts.seed),
        };
      }
      p.role = 'tag';
      p.radius = 40 + 13 * t.length;
      next.set(id, p);
      for (const m of ids) tagLinks.push({ id: `${id}~${m}`, source: m, target: id, count: 1, part: false, tag: true });
    }

    const removed = [...this.byId.keys()].filter((id) => !next.has(id)).length;
    this.byId.clear();
    for (const [k, v] of next) this.byId.set(k, v);

    const cellOf = new Map(model.nodes.map((n) => [n.id, n.cell]));
    const links: PhysLink[] = model.edges
      // (a note's links, about=, are not springs: they only draw a note towards what it explains, see stepAbout)
      .filter((e) => e.kind !== 'about' && !ground(e) && next.has(e.source) && next.has(e.target) && e.source !== e.target)
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        count: e.count,
        part: e.kind === 'ref' || e.kind === 'over',
        belt: e.kind === 'step' && typeof cellOf.get(e.source)?.params.belt === 'number',
      }));

    this.sim.nodes([...next.values()]);
    this.faces = this.faces.filter((f) => next.has(f.tape) && next.has(f.to));
    // a meter's edges (ground): kept aside, to be drawn where they cross nothing once the meter is placed
    this.grounds = model.edges.filter((e) => ground(e) && next.has(e.source) && next.has(e.target)).map((e) => ({ id: e.id, meter: e.target, cell: e.source }));
    this.net = this.net.filter((t) => next.has(t.a) && next.has(t.b) && this.grounds.some((g) => g.meter === t.meter));
    for (const id of [...this.placedMeters]) if (!next.has(id)) this.placedMeters.delete(id);
    // the tapes turned to where everything is now (an edit that doesn't move anything doesn't turn them)
    this.turns = this.fitTurns((id) => this.position(id));
    this.explains = model.edges
      .filter((e) => e.kind === 'about' && next.has(e.source) && next.has(e.target))
      .map((e) => ({ note: next.get(e.source)!, cell: next.get(e.target)! }));
    // a hub's edges into a cluster: each keeps part of its pull, the cluster's tag takes the rest, once per hub (`mux`)
    // (none at all when it's off: d3 balances each spring by how many its ends have, so even a slack one would count)
    const muxLinks = new Map<string, PhysLink>();
    for (const l of this.opts.mux > 0 ? links : []) {
      const [a, b] = [next.get(l.source as string)!, next.get(l.target as string)!];
      if (!a.group === !b.group) continue;
      const [hub, cell] = a.group ? [b, a] : [a, b];
      if (hub.role === 'tag' || !next.has(`tag:${cell.group}`)) continue;
      l.keep = 0;
      const id = `${hub.id}=>tag:${cell.group}`;
      const m = muxLinks.get(id) ?? { id, source: hub.id, target: `tag:${cell.group}`, count: 0, part: false, muxed: true };
      m.count += 1;
      muxLinks.set(id, m);
    }
    this.sim.force<ReturnType<typeof forceLink<PhysNode, PhysLink>>>('link')!.links([...links, ...tagLinks, ...muxLinks.values()]);
    // (a scope watches: its edges neither untangle the music's layout nor count as its crossings)
    const scopes = new Set(model.nodes.filter((n) => typeof (n as { cell?: { params?: Record<string, unknown> } }).cell?.params?.scope === 'string').map((n) => n.id));
    const watcher = (id: string) => scopes.has(id);
    const idOf = (x: unknown) => (typeof x === 'object' ? (x as PhysNode).id : (x as string));
    const own = links.filter((l) => !watcher(idOf(l.source)) && !watcher(idOf(l.target)));
    (this.sim.force('uncross') as unknown as ReturnType<typeof forceUncross>).links(
      // forceLink has swapped ids for the node objects by now
      own.map((l) => ({
        source: typeof l.source === 'object' ? (l.source as PhysNode) : next.get(l.source as string)!,
        target: typeof l.target === 'object' ? (l.target as PhysNode) : next.get(l.target as string)!,
      })),
    );

    this.links = own.map((l) => ({
      id: l.id,
      source: typeof l.source === 'object' ? (l.source as PhysNode).id : (l.source as string),
      target: typeof l.target === 'object' ? (l.target as PhysNode).id : (l.target as string),
      belt: l.belt,
    }));
    for (const id of [...this.bendAt.keys()]) if (!this.links.some((l) => l.id === id)) this.bendAt.delete(id);
    if (structural) this.reheat(fresh ? 1 : added > 0 || removed > 0 ? 0.7 : 0.3); // a fresh graph settles from scratch, like a new layout
    // forceX/Y cache their targets: refresh them for the new ends
    this.sim.force(
      'endsX',
      (this.sim.force('endsX') as ReturnType<typeof forceX<PhysNode>>).x((d) => this.ends.get(d.id)?.x ?? this.colX.get(d.id) ?? 0),
    );
    this.applyOptions();
    this.sim.force(
      'rankY',
      (this.sim.force('rankY') as ReturnType<typeof forceY<PhysNode>>).y((d) => this.rankY.get(d.id) ?? 0),
    );
    return { added, removed, total: next.size, structural };
  }

  /**
   * One step for the edges' midpoints. Each is drawn back towards the straight
   * line between its ends; edges slip freely over nodes, keeping only off a
   * node's centre (to the side they already lean towards) — a small bend.
   */
  private stepBends(): void {
    // (nothing to bend: no work — the library's cloud draws straight lines)
    if (this.opts.avoid <= 0 && this.opts.straighten <= 0) return;
    const nodes = [...this.byId.values()];
    for (const l of this.links) {
      const a = this.byId.get(l.source);
      const b = this.byId.get(l.target);
      if (!a || !b || a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const m = this.bendAt.get(l.id) ?? { x: mx, y: my };
      m.x += (mx - m.x) * this.opts.straighten;
      m.y += (my - m.y) * this.opts.straighten;
      // the normal of the straight line, for nodes sitting exactly on it
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      for (const n of nodes) {
        if (n === a || n === b || n.x === undefined || n.y === undefined) continue;
        // edges slip freely over nodes; they only keep off the centre (avoid × radius)
        const clear = n.radius * (n.role === 'tag' ? 1.1 : this.opts.avoid); // (off a tag's name entirely)
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
      this.bendAt.set(l.id, m);
    }
  }

  /** Where everything is now, as quality.ts reads it: the nodes (a tag's name hides edges, but isn't a cell) and the edges as drawn. */
  private placed() {
    const nodes = [...this.byId.values()].map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, r: n.radius, tags: n.tags, label: n.role === 'tag' }));
    const edges = [
      ...this.links.map((l) => ({ a: l.source, b: l.target, mid: this.bendAt.get(l.id) as { x: number; y: number } | undefined, runs: this.beltRuns(l) })),
      // (a meter's net: straight traces)
      ...this.net.map((t) => ({ a: t.a, b: t.b, mid: undefined })),
    ];
    return { nodes, edges };
  }

  /** A belt's two runs as BeltEdge draws them (the outer tangents of its pulleys; their ratio taken as 1). */
  private beltRuns(l: { source: string; target: string; belt?: boolean }): [number, number, number, number][] | undefined {
    if (!l.belt) return undefined;
    const driven = this.byId.get(l.source);
    const driver = this.byId.get(l.target);
    if (!driven || !driver) return undefined;
    const [rDriver, rDriven] = pulleys(driver.radius, driven.radius, 1);
    const runs = openBelt({ x: driver.x ?? 0, y: driver.y ?? 0 }, rDriver, { x: driven.x ?? 0, y: driven.y ?? 0 }, rDriven);
    return runs?.map(([a, b]) => [a.x, a.y, b.x, b.y]);
  }

  /** A meter's edges (ground, meters.ts) and which of them are drawn. */
  private grounds: { id: string; meter: string; cell: string }[] = [];
  /** Each meter's net, as last worked out (meterNet). */
  private net: MeterTrace[] = [];
  /** Meters this layout placed (and holds there): a meter dragged elsewhere isn't placed again. */
  private placedMeters = new Set<string>();

  /** Every drawn edge as short straight pieces (its spline), with its ends: what a meter's edge mustn't cross. */
  private drawnPieces(skip: (a: string, b: string) => boolean): { a: string; b: string; seg: [number, number, number, number] }[] {
    const out: { a: string; b: string; seg: [number, number, number, number] }[] = [];
    for (const l of this.links) {
      if (skip(l.source, l.target)) continue;
      const a = this.byId.get(l.source);
      const b = this.byId.get(l.target);
      if (!a || !b) continue;
      const m = this.bendAt.get(l.id) ?? { x: ((a.x ?? 0) + (b.x ?? 0)) / 2, y: ((a.y ?? 0) + (b.y ?? 0)) / 2 };
      const pts = Array.from({ length: 9 }, (_, k) => splinePoint(a.x ?? 0, a.y ?? 0, m.x, m.y, b.x ?? 0, b.y ?? 0, k / 8));
      for (let k = 0; k < 8; k++) out.push({ a: l.source, b: l.target, seg: [pts[k].x, pts[k].y, pts[k + 1].x, pts[k + 1].y] });
    }
    return out;
  }

  /**
   * What a straight edge from (x, y) — node `from`, of radius r — to node `to` runs into: each drawn edge it crosses
   * counts 1, each wheel it passes through 2 (it would read as an edge to it). `stop`: enough, stop counting.
   */
  private hits(x: number, y: number, r: number, from: string, to: string, pieces: ReturnType<ForceLayout['drawnPieces']>, stop = Infinity): number {
    const c = this.byId.get(to);
    if (!c) return stop;
    const [cx, cy] = [c.x ?? 0, c.y ?? 0];
    const len = Math.hypot(cx - x, cy - y);
    if (len <= r + c.radius) return 0;
    // (the part outside both wheels: an edge is drawn beneath them)
    const [ux, uy] = [(cx - x) / len, (cy - y) / len];
    const [x1, y1, x2, y2] = [x + ux * r, y + uy * r, cx - ux * c.radius, cy - uy * c.radius];
    let n = 0;
    for (const p of pieces) {
      if (p.a === to || p.b === to || p.a === from || p.b === from) continue;
      if (segmentsCross(x1, y1, x2, y2, ...p.seg) && ++n >= stop) return n;
    }
    for (const o of this.byId.values()) {
      if (o.id === to || o.id === from || o.role === 'tag') continue;
      const t = Math.max(0, Math.min(1, (((o.x ?? 0) - x1) * (x2 - x1) + ((o.y ?? 0) - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2 || 1)));
      if (Math.hypot(x1 + t * (x2 - x1) - (o.x ?? 0), y1 + t * (y2 - y1) - (o.y ?? 0)) < o.radius * 0.8 && (n += 2) >= stop) return n;
    }
    return n;
  }

  /**
   * Meters last (#27): each meter that steps cells is put where its net (meterNet) costs least — short traces that
   * cross no drawn edge and pass through no wheel — and held there. Which face of the drawing it sits in, inside a
   * closed cycle or outside it, decides which cells it can reach cleanly, so a face too small for it still counts
   * (crowding costs a little): its wheels are pushed apart to make room (makeRoom). Call after the layout settles.
   */
  placeMeters(): void {
    const meters = [...new Set(this.grounds.map((g) => g.meter))];
    for (const m of meters) {
      const node = this.byId.get(m);
      // (one the user moved stays where they put it)
      if (!node || (node.fx != null && !this.placedMeters.has(m))) continue;
      const cells = [...new Set(this.grounds.filter((g) => g.meter === m).map((g) => g.cell))].filter((id) => this.byId.has(id)).map((id) => this.byId.get(id)!);
      const others = [...this.byId.values()].filter((n) => n.id !== m && n.role !== 'tag');
      if (!others.length || !cells.length) continue;
      const pieces = this.drawnPieces((a, b) => a === m || b === m);
      // what the net would cost between its cells (as meterNet costs it), wherever the meter is
      const joined = new Set(this.links.map((l) => [l.source, l.target].sort().join('|')));
      const between = cells.map((a) =>
        cells.map((b) => {
          if (a === b) return 0;
          const len = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
          return len * (1 + 2 * this.hits(a.x ?? 0, a.y ?? 0, a.radius, a.id, b.id, pieces, 4)) * (joined.has([a.id, b.id].sort().join('|')) ? 3 : 1);
        }),
      );
      // its belts (to the cells it drives through a spring): drawn over the wheels, two runs, so every edge or wheel one
      // would cross counts twice
      const belted = this.links
        .filter((l) => l.belt && l.target === m)
        .map((l) => this.byId.get(l.source))
        .filter((n): n is PhysNode => !!n);
      const beltCost = (x: number, y: number) =>
        belted.reduce((sum, c) => {
          const [cx, cy] = [c.x ?? 0, c.y ?? 0];
          const over = others.filter((o) => o !== c && distanceToSegment(o.x ?? 0, o.y ?? 0, x, y, cx, cy) < o.radius).length;
          return sum + Math.hypot(cx - x, cy - y) * (1 + 4 * (this.hits(x, y, node.radius, m, c.id, pieces, 4) + over));
        }, 0);
      const xs = others.map((n) => n.x ?? 0);
      const ys = others.map((n) => n.y ?? 0);
      const reach = node.radius * 2 + this.opts.collidePad;
      const [x0, x1, y0, y1] = [Math.min(...xs) - reach, Math.max(...xs) + reach, Math.min(...ys) - reach, Math.max(...ys) + reach];
      const step = Math.max(40, Math.max(x1 - x0, y1 - y0) / 40);
      let best: { x: number; y: number; cost: number; crowd: number } | null = null;
      for (let y = y0; y <= y1; y += step)
        for (let x = x0; x <= x1; x += step) {
          // (not on a wheel; nearer than it should be is crowding — room is made for it)
          let crowd = 0;
          let on = false;
          for (const o of others) {
            const d = Math.hypot((o.x ?? 0) - x, (o.y ?? 0) - y);
            if (d < (node.radius + o.radius) * 0.6) on = true;
            crowd += Math.max(0, node.radius + o.radius + this.opts.collidePad - d);
          }
          if (on) continue;
          // the net's cost from here: a spanning tree (Prim's) over the meter and its cells
          const to = cells.map((c) => Math.hypot((c.x ?? 0) - x, (c.y ?? 0) - y) * (1 + 2 * this.hits(x, y, node.radius, m, c.id, pieces, 4)));
          const near = [...to];
          const done = cells.map(() => false);
          let cost = crowd * 2 + beltCost(x, y);
          for (let k = 0; k < cells.length; k++) {
            let i = -1;
            for (let c = 0; c < cells.length; c++) if (!done[c] && (i < 0 || near[c] < near[i])) i = c;
            done[i] = true;
            cost += near[i];
            for (let c = 0; c < cells.length; c++) if (!done[c]) near[c] = Math.min(near[c], between[i][c]);
          }
          if (!best || cost < best.cost) best = { x, y, cost, crowd };
        }
      if (!best) continue;
      node.x = node.fx = best.x;
      node.y = node.fy = best.y;
      node.vx = node.vy = 0;
      this.placedMeters.add(m);
      if (best.crowd > 0) this.makeRoom(m);
    }
    this.meterNet();
  }

  /**
   * Room round a placed meter: wheels closer than they may be are pushed apart, the meter held — a little at a
   * time, so each moves out of the way along where it was (the drawing keeps its faces).
   */
  private makeRoom(meter: string): void {
    const nodes = [...this.byId.values()].filter((n) => n.role !== 'tag');
    const pinned = (n: PhysNode) => n.id === meter || this.placedMeters.has(n.id) || n.fx != null;
    for (let round = 0; round < 60; round++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++)
        for (let j = i + 1; j < nodes.length; j++) {
          const [a, b] = [nodes[i], nodes[j]];
          const [pa, pb] = [pinned(a), pinned(b)];
          if (pa && pb) continue;
          const dx = (b.x ?? 0) - (a.x ?? 0);
          const dy = (b.y ?? 0) - (a.y ?? 0);
          const d = Math.hypot(dx, dy) || 1;
          const short = a.radius + b.radius + this.opts.collidePad - d;
          if (short <= 0.5) continue;
          moved = true;
          const [ux, uy] = [dx / d, dy / d];
          const [sa, sb] = pa ? [0, 1] : pb ? [1, 0] : [0.5, 0.5];
          a.x = (a.x ?? 0) - ux * short * sa * 0.5;
          a.y = (a.y ?? 0) - uy * short * sa * 0.5;
          b.x = (b.x ?? 0) + ux * short * sb * 0.5;
          b.y = (b.y ?? 0) + uy * short * sb * 0.5;
        }
      if (!moved) break;
    }
  }

  /**
   * Each meter's net (#27): every cell a meter steps is joined to it, not each by an edge of its own but through the
   * others, like ground on a circuit board — a tree of straight traces between the meter and its cells (a spanning
   * tree, Kruskal's: the shortest first, each costed by what it crosses — drawn edges, wheels it passes, the traces
   * already laid). Worked out from where everything is now; call once the layout is at rest.
   */
  meterNet(): readonly MeterTrace[] {
    const drawn = this.drawnPieces(() => false);
    const laid: ReturnType<ForceLayout['drawnPieces']> = [];
    const net: MeterTrace[] = [];
    // (a pair a drawn edge already joins: a trace would lie on it)
    const joined = new Set(this.links.map((l) => [l.source, l.target].sort().join('|')));
    for (const meter of [...new Set(this.grounds.map((g) => g.meter))]) {
      const ends = [meter, ...new Set(this.grounds.filter((g) => g.meter === meter).map((g) => g.cell))].filter((id) => this.byId.has(id));
      const at = (id: string) => this.byId.get(id)!;
      const pairs: { a: string; b: string; len: number; cost: number; checked: boolean }[] = [];
      for (let i = 0; i < ends.length; i++)
        for (let j = i + 1; j < ends.length; j++) {
          const [a, b] = [at(ends[i]), at(ends[j])];
          const len = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
          const hit = this.hits(a.x ?? 0, a.y ?? 0, a.radius, a.id, b.id, drawn);
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
          const extra = this.hits(a.x ?? 0, a.y ?? 0, a.radius, p.a, p.b, laid) - this.hits(a.x ?? 0, a.y ?? 0, a.radius, p.a, p.b, []);
          p.checked = true;
          if (extra > 0) {
            p.cost += p.len * 2 * extra;
            pairs.splice(pairs.findIndex((q) => q.cost > p.cost) >>> 0, 0, p);
            continue;
          }
        }
        root.set(find(p.a), find(p.b));
        net.push({ id: `net:${p.a}~${p.b}`, meter, a: p.a, b: p.b });
        const [a, b] = [at(p.a), at(p.b)];
        laid.push({ a: p.a, b: p.b, seg: [a.x ?? 0, a.y ?? 0, b.x ?? 0, b.y ?? 0] });
      }
    }
    this.net = net;
    return net;
  }

  /** Crossings as drawn (quality.ts: drawnCrossings). */
  drawnCrossings(): number {
    const { nodes, edges } = this.placed();
    return drawnCrossings(nodes, edges);
  }

  /** How good the layout is now, in numbers (quality.ts). */
  quality(): LayoutQuality {
    const { nodes, edges } = this.placed();
    return layoutQuality(nodes, edges, this.aims());
  }

  /** The point an edge's spline passes through halfway (its ends' midpoint when straight). */
  bend(id: string): { x: number; y: number } | undefined {
    const m = this.bendAt.get(id);
    return m ? { x: m.x, y: m.y } : undefined;
  }

  /** All bends, for drawing. */
  bends(): Map<string, { x: number; y: number }> {
    return new Map([...this.bendAt].map(([k, v]) => [k, { x: v.x, y: v.y }]));
  }

  reheat(alpha = 0.5): void {
    this.sim.alpha(Math.max(this.sim.alpha(), alpha));
    if (this.opts.live) this.sim.restart();
  }

  /** Run the simulation synchronously (pre-settle before first paint, or tests). */
  tick(n = 1): void {
    this.sim.tick(n);
  }

  position(id: string): { x: number; y: number } | undefined {
    const p = this.byId.get(id);
    return p && p.x !== undefined && p.y !== undefined ? { x: p.x, y: p.y } : undefined;
  }

  get alpha(): number {
    return this.sim.alpha();
  }

  dragStart(id: string, x: number, y: number): void {
    const p = this.byId.get(id);
    if (!p) return;
    p.fx = x;
    p.fy = y;
    this.sim.alphaTarget(0.3);
    if (this.opts.live) this.sim.restart();
  }

  drag(id: string, x: number, y: number): void {
    const p = this.byId.get(id);
    if (!p) return;
    p.fx = x;
    p.fy = y;
  }

  /** Release a dragged node back into the simulation, or keep it pinned. */
  dragEnd(id: string, pin = false): void {
    const p = this.byId.get(id);
    this.sim.alphaTarget(0);
    if (!p || pin) return;
    p.fx = null;
    p.fy = null;
  }

  isPinned(id: string): boolean {
    const p = this.byId.get(id);
    return p?.fx != null;
  }

  unpin(id: string): void {
    const p = this.byId.get(id);
    if (!p) return;
    p.fx = null;
    p.fy = null;
    this.reheat(0.3);
  }

  onSettle(f: () => void): () => void {
    this.settleListeners.push(f);
    return () => (this.settleListeners = this.settleListeners.filter((g) => g !== f));
  }

  destroy(): void {
    this.sim.stop();
    this.sim.on('tick', null).on('end', null);
    this.settleListeners = [];
  }
}

/** Where a node is drawn to: the sound card up-centre, meters down-centre. */
function endOf(n: GraphNode): 'top' | 'bottom' | null {
  if (n.cell?.sink) return 'top';
  if (n.kind === 'cell' && n.isMeter) return 'bottom';
  return null;
}

/** How many edge pairs cross in the current layout (for tests and tuning). */
export function countCrossings(layout: ForceLayout, model: GraphModel): number {
  const segs = model.edges
    .filter((e) => e.source !== e.target && layout.position(e.source) && layout.position(e.target))
    .map((e) => ({ a: { id: e.source, ...layout.position(e.source)! }, b: { id: e.target, ...layout.position(e.target)! } }));
  return crossingPairs(segs).length;
}

/** What a tape's head connects to (its write source, or a read head's cell) and how far round from the write head that head sits (radians). */
export interface TapeFace {
  readonly tape: string;
  readonly to: string;
  readonly offset: number;
  readonly write: boolean;
}

/** Every tape's heads and what they connect to (layout/tape.ts). */
export function tapeFaces(model: GraphModel): TapeFace[] {
  // (hand-made graphs, in tests, may have nodes without a cell)
  const cells = model.nodes.flatMap((n) => ((n as { cell?: GraphNode['cell'] }).cell ? [n.cell] : [])); // (as the tape draws its heads: every cell, petals too)
  const byName = new Map(model.nodes.filter((n) => !n.petalOf && (n as { cell?: unknown }).cell).map((n) => [n.cell.name, n]));
  const faces: TapeFace[] = [];
  for (const tape of byName.values()) {
    const write = tape.cell.params.write;
    if (typeof write !== 'string') continue;
    const src = byName.get(write);
    if (src) faces.push({ tape: tape.id, to: src.id, offset: 0, write: true });
    const { heads, length } = tapeHeads(tape.cell, cells);
    for (const h of heads) {
      const n = byName.get(h.name);
      if (n) faces.push({ tape: tape.id, to: n.id, offset: (headOffset(h.at, length) * Math.PI) / 180, write: false });
    }
  }
  return faces;
}
