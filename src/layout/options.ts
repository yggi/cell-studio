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
  /** How much a node's mass (weights.ts) scales its repulsion: 0 none, 1 full. */
  massRepel: number;
  /**
   * Nets in the forces (docs/notes/nets.md): a net's springs run along its tree as it's laid now (netTree) instead of
   * from its owner to every reader (`netPull`, 0 off, 1 on).
   */
  netPull: number;
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
  /**
   * Heights held (by node id, the graph's y): the tower layout's (`towerlayout.ts: towerHeights`); a node it names
   * moves only sideways, dragged too. Unset: every node is free.
   */
  heights?: ReadonlyMap<string, number>;
  /** (the tower layout, held.ts) The heights the sound wires run along (the graph's y): free nodes kept off them by `rowClear`. */
  wireRows?: readonly number[];
  /** (held.ts) How hard a free node is pushed off a sound wire's row (0: off). */
  rowClear: number;
  /** (held.ts) How hard two nodes, one of them held, overlapping are pushed apart sideways (0: off; d3's collision alone). */
  sideCollide: number;
  layerGap: number;
  /** Edge length at rest (px). */
  linkDistance: number;
  /** How much edges contract towards that length (0 none … 1 full). */
  contract: number;
  /** Edge length from a part or table to its user, as a fraction of the length (they stay close). */
  partLength: number;
  /** Node repulsion (negative: push apart). */
  charge: number;
  /** How hard crossing edges push each other apart, each pair as hard as its crossing costs (weights.ts: crossingCost). */
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
  radius: (node: GraphNode) => number;
}

// The layered drawing is where a graph starts (and a light pull back to it: rankPull, columnPull — less
// order than a grid); then balanced forces give it its own shape: edges contract, nodes repel and keep
// room for their labels, edges spread round each node (stars, symmetries), time and sound keep apart,
// tagged cells cluster; edges straighten a little and keep well off nodes.
export const DEFAULT_LAYOUT: LayoutOptions = {
  // (measured over the library, docs/notes/nets.md: mass as repulsion 89 → 83 crossings; as inertia or as stiffness it
  // made it worse, and both were removed)
  massRepel: 1,
  // (measured over the library at six seeds, docs/notes/nets.md: the trees' springs 103 → 82 crossings, with voices' and
  // mixes' nets 75)
  netPull: 1,
  // (tried again with the nets' springs, docs/notes/nets.md: over six seeds 80 → 63 crossings, its cost 127 → 90; the
  // meter is laid out with its cells by its net's springs, then put where its net costs least)
  placeLast: 1,
  // (each row's order: both the sweeps and insertion then the sweeps tried, the one that crosses less kept; over six
  // seeds 63 → 47 crossings, cost 90 → 65, for 2–3 times the layout's time when a piece opens: docs/notes/nets.md)
  rowOrder: 3,
  trial: 120,
  rowOrders: new Map(),
  // (uncross and contract: measured over the examples, docs/notes/27-layout.md — stronger untangling and softer
  // springs cross a quarter less than 0.3 / 0.9, for about 6 % more room; uncross 1 with each pair pushed by its cost,
  // over eight seeds: 58 → 52 crossings, cost 183 → 161, for 3.5 % more room, docs/notes/forces.md)
  uncross: 1,
  repelRange: 380,
  degreeRepel: 0.08,
  collidePad: 34, // (room for the label under each node)
  straighten: 0.15,
  avoid: 0.6,
  contract: 0.75,
  partLength: 0.8,
  rankPull: 0.05,
  upPull: 0,
  rowClear: 0,
  sideCollide: 0,
  centre: 0.004,
  columnPull: 0.035,
  layerGap: 130,
  linkDistance: 120,
  charge: -320,
  live: true,
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
 * The tower layout's forces (docs/notes/tower-strip.md): heights are held (`heights`), so the pulls to rows and columns,
 * the spread and the kinds' and tags' pushes are off; what is left keeps nodes apart and draws what is joined together,
 * sideways. Rows in one order (no trials), and meters stay where the forces put them.
 */
export const TOWER_LAYOUT: Partial<LayoutOptions> = {
  rankPull: 0,
  columnPull: 0,
  upPull: 0,
  spread: 0,
  kindRepel: 0,
  tagPull: 0,
  tagRepel: 0,
  mux: 0,
  clusters: false,
  rowOrder: 0,
  placeLast: 0,
  rowClear: 0.5,
  sideCollide: 1,
};

/**
 * A node's room: the wheel itself (size= scales it), and what hangs under it — its label, as wide as
 * it is, and its free() controls (sliders, a text field, a keypad's rows) — so nothing settles on them.
 */
function roomFor(n: GraphNode): number {
  // (a product's junction: a dot, junctions.ts)
  if (n.kind === 'junction') return JUNCTION_ROOM;
  const cell = (n as { cell?: { size?: number; label?: string | null; frees?: readonly { key: string; labels?: readonly string[] }[] } }).cell;
  // (a voice: its wheel, 160 px across, layout/voice.ts; its envelope's box rides on its top, where its sound leaves)
  // (a drum kit: its pieces inside a wheel of 168 px, ui/KitGlyph.svelte)
  const kit = !!(n as { cell?: { kit?: boolean; step?: unknown } }).cell?.kit && !(n as { cell?: { step?: unknown } }).cell?.step;
  const base = (n.kind === 'voice' ? 86 : kit ? 86 : n.depth === 0 ? 92 : 68) * (cell?.size ?? 1);
  const label = cell?.label ? Math.min(220, cell.label.length * 5.5) / 2 : 0;
  // (its free() values: pills under it, a row or two)
  const pills = cell?.frees?.length ?? 0;
  const controls = pills ? 24 * Math.ceil(pills / 3) : 0;
  return Math.max(base, label) + (controls ? 10 + controls * 0.55 : 0);
}

/** A product's junction's room, a radius (engine/graph.ts, junctions.ts): a small gate meter on its voice's rim, twice this across (#234). */
export const JUNCTION_ROOM = 16;

/** An edge's spring, as strong as it is (a net's tree takes the same, netTree). */
export function linkPull(l: { count: number; keep?: number; muxed?: boolean; strength?: number }, o: LayoutOptions): number {
  return Math.min(0.2, 0.08 + 0.02 * l.count) * o.contract * (l.muxed ? o.mux : 1 - (1 - (l.keep ?? 1)) * o.mux);
}
