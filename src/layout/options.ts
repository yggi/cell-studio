/**
 * The layout's options (LayoutOptions): every force's strength and every phase's switch, with the defaults the app
 * lays out with (DEFAULT_LAYOUT, each measured over the library: docs/notes/nets.md) and the springs' strengths that
 * more than one phase reads. What a node and an edge weigh is weights.ts.
 */
import type { GraphNode } from '../engine/graph';

/** A belt's spring: its length against an edge's, and its pull. */
export const BELT_LENGTH = 0.8;
export const BELT_PULL = 0.5;
/** A meter's pull on each cell it steps (ground: not drawn): a meter settles among them. */
export const GROUND_PULL = 0.15;

export interface LayoutOptions {
  /**
   * Grown, as the library is (layout/library.ts): a fresh graph starts small — its nodes at `growStart` of their size,
   * its edges as short — while its edges contract it into its groups, then grows to full size. 0: laid out at full size.
   */
  grow: number;
  growStart: number;
  /** The growing, in ticks: gathering small, then growing to full size; and whether the start is drawn in too. */
  growGather: number;
  growTicks: number;
  growShrink: number;
  /** How much a node's mass (weights.ts) scales its repulsion, its inertia, and an edge's strength its spring: 0 none, 1 full. */
  massRepel: number;
  inertia: number;
  strengthPull: number;
  /**
   * Nets in the forces (docs/notes/nets.md): a net's springs run along its tree as it's laid now (netTree) instead of
   * from its owner to every reader (`netPull`, 0 off, 1 on); and a wheel lying on a net's join is pushed off it, the
   * join's ends the other way (`netClear`, its strength).
   */
  netPull: number;
  netClear: number;
  /**
   * Meters placed last (#27, retired once, back with the nets): once the layout has settled — the meter among its
   * cells, held by its net's springs — each meter is put where its net costs least and held there (placeMeters). 0 off.
   */
  placeLast: number;
  /**
   * How the layered start orders each row (layered.ts: LayeredOptions.rowOrder): 0 sweeps, 1 insertion then sweeps,
   * 2 insertion; 3 both 0 and 1 tried on a fresh graph, the one that crosses less kept (rowOrderFor).
   */
  rowOrder: number;
  /**
   * With `rowOrder` 3 (both), a fresh graph is laid out twice first, its rows by the sweeps and by insertion then the
   * sweeps, each for this many ticks, and starts from the rows that crossed less.
   */
  trial: number;
  /**
   * The rows' order already chosen for a graph (rowOrder 3), by its shape (rowsKey): the examples', worked out when
   * the app is built (tools/examples-index.ts), so one opens without the trials.
   */
  rowOrders: ReadonlyMap<string, number>;
  /**
   * The rows, given (by node id, higher nearer the top) instead of the signal path's: the frequency tower's
   * (`tower.ts: towerRanks`), a probe (docs/notes/multiscale.md). A node it doesn't name keeps its rank in the flow.
   */
  ranks?: ReadonlyMap<string, number>;
  /** Laid out by insertion (startInsertion): a fresh graph taken in one cell at a time from its drains, over this many ticks. 0: from the layered start. */
  insert: number;
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
  /** Probe (outputs at 12 o'clock, docs/notes/outputs-top.md): each reader pulled above what it reads (0: off). */
  upPull: number;
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

// The layered drawing is where a graph starts (and a light pull back to it: rankPull, columnPull — less
// order than a grid); then balanced forces give it its own shape: edges contract, nodes repel and keep
// room for their labels, edges spread round each node (stars, symmetries), time and sound keep apart,
// tagged cells cluster; edges straighten a little and keep well off nodes.
export const DEFAULT_LAYOUT: LayoutOptions = {
  // (grown as the library is, measured over the examples: 102–111 crossings against 83, though the golden graph's 11
  // fall to 4–6: off — docs/notes/nets.md)
  grow: 0,
  growStart: 0.15,
  growGather: 120,
  growTicks: 220,
  growShrink: 1,
  // (measured over the library, docs/notes/nets.md: mass as repulsion 89 → 83 crossings; inertia and strength as
  // stiffness made it worse as tried, so they are off: strength weighs only what a crossing costs)
  massRepel: 1,
  inertia: 0,
  strengthPull: 0,
  // (measured over the library at six seeds, docs/notes/nets.md: the trees' springs 103 → 82 crossings, with voices' and mixes' nets 75; keeping wheels
  // off the joins made it worse, the trees' costs already keep them off: so it is off)
  netPull: 1,
  netClear: 0,
  // (tried again with the nets' springs, docs/notes/nets.md: over six seeds 80 → 63 crossings, its cost 127 → 90; the
  // meter is laid out with its cells by its net's springs, then put where its net costs least)
  placeLast: 1,
  // (by insertion, from the drains, measured over the library, docs/notes/nets.md: 63 → 98–114 crossings, worse in
  // nearly every piece, though fewer cells in a foreign cluster: off)
  insert: 0,
  // (each row's order: both the sweeps and insertion then the sweeps tried, the one that crosses less kept; over six
  // seeds 63 → 47 crossings, cost 90 → 65, for 2–3 times the layout's time when a piece opens: docs/notes/nets.md)
  rowOrder: 3,
  trial: 120,
  rowOrders: new Map(),
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
  upPull: 0,
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
  // (a product's junction: a dot, junctions.ts)
  if (n.kind === 'junction') return JUNCTION_ROOM;
  const cell = (n as { cell?: { size?: number; label?: string | null; frees?: readonly { key: string; labels?: readonly string[] }[] } }).cell;
  const base = (n.kind === 'voice' ? 64 : n.depth === 0 ? 92 : 68) * (cell?.size ?? 1);
  const label = cell?.label ? Math.min(220, cell.label.length * 5.5) / 2 : 0;
  // (its free() values: pills under it, a row or two)
  const pills = cell?.frees?.length ?? 0;
  const controls = pills ? 24 * Math.ceil(pills / 3) : 0;
  return Math.max(base, label) + (controls ? 10 + controls * 0.55 : 0);
}

/** A product's junction's room (engine/graph.ts, junctions.ts): a dot where its wires meet. */
export const JUNCTION_ROOM = 14;

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

/** An edge's spring, as strong as it is (a net's tree takes the same, netTree). */
export function linkPull(l: { count: number; keep?: number; muxed?: boolean; strength?: number }, o: LayoutOptions): number {
  return Math.min(0.2, 0.08 + 0.02 * l.count) * o.contract * (l.muxed ? o.mux : 1 - (1 - (l.keep ?? 1)) * o.mux) * (1 + o.strengthPull * ((l.strength ?? 1) - 1));
}
