/**
 * What every phase of the layout reads and moves (LayoutState): the nodes the forces push, the edges as drawn, the
 * pulls set up when a graph comes in, the nets and the meters' traces. ForceLayout (physics.ts) holds one; the start
 * (start.ts, insertion.ts), the forces (forces.ts, aims.ts), the nets (nets.ts) and the placement (placement.ts) are
 * functions of it.
 */
import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';
import type { GraphModel } from '../engine/graph';
import type { LayoutOptions } from './options';
import type { TapeFace } from './aims';

/** A trace of a meter's net (meterNet): between two of its ends, the meter or a cell it steps. */
export interface MeterTrace {
  readonly id: string;
  /** The meter's node id. */
  readonly meter: string;
  readonly a: string;
  readonly b: string;
  /**
   * A tap's sub-net (decision 016): the bulb on the meter's wheel (its table's) it leaves from, `a` its end there, and
   * where that bulb's hub is from the wheel's centre (GraphEdge.bulbAt).
   */
  readonly bulb?: string;
  readonly at?: { readonly x: number; readonly y: number; readonly r: number };
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
  /** Its mass (weights.ts): how much it holds its place and its room. */
  mass?: number;
  /** How far its loom reaches round it (looms.ts), px: part of its room, and of each of its springs' length. */
  loom?: number;
  /** A product's junction (junctions.ts): the voice whose rim it is set on. */
  rides?: string;
}
export interface PhysLink extends SimulationLinkDatum<PhysNode> {
  id: string;
  count: number;
  /** A part or table edge (&ref, over=): shorter, so parts stay with their user. */
  part: boolean;
  /** A belt (a belted cell's step, source: the driven): drawn as two runs over the wheels. */
  belt?: boolean;
  /** A meter's edge (ground): a spring that isn't drawn (its net is). */
  ground?: boolean;
  /** Its strength (weights.ts): how hard it pulls, and what crossing it costs. */
  strength?: number;
  /** A tap of a net (a table read by several): with `netPull`, its pull goes to the net's tree instead. */
  net?: boolean;
  /** A tag's spring to one of its cells (not drawn: no crossings, no bends, no spread). */
  tag?: boolean;
  /** How much of its pull it keeps (a hub's edge into a cluster gives the rest to the cluster's tag: `mux`). */
  keep?: number;
  /** A hub's spring to a cluster's tag, standing for its edges into the cluster (not drawn). */
  muxed?: boolean;
}

/** A drawn edge, by its ends' ids. */
interface DrawnLink {
  id: string;
  source: string;
  target: string;
  belt?: boolean;
  strength?: number;
  /** A product's voice into its junction (`is`): drawn, but no wire to untangle (it is under the voice). */
  is?: boolean;
}

export interface LayoutState {
  opts: LayoutOptions;
  /** The nodes the forces see (while a graph is taken in by insertion, only those taken in so far). */
  byId: Map<string, PhysNode>;
  /** The edges as drawn (not a scope's: it watches): a product's wires at its junction. */
  links: DrawnLink[];
  /** The edges as the forces see them: each product's junction folded into its voice (junctions.ts); else `links`. */
  springs: DrawnLink[];
  /** Each product's junction (junctions.ts): not in the forces, set on its voice's rim after each tick. */
  junctions: Map<string, PhysNode>;
  /** Each junction's angle on its voice's rim, radians. */
  rims: Map<string, number>;
  /** Where the sound card (top) and the meters (bottom) are drawn to, sideways. */
  ends: Map<string, { x: number; y: number }>;
  /** The height of each node's rank in the signal path. */
  rankY: Map<string, number>;
  /** Edges per node (busy nodes push harder). */
  degree: Map<string, number>;
  /** Each node's column, in px (a symmetric first layout, and a gentle pull). */
  colX: Map<string, number>;
  /** Each edge's midpoint (the spline passes through it). */
  bendAt: Map<string, { x: number; y: number }>;
  /** The layout's scale now (1 grown; less while a fresh graph gathers and grows). */
  size: number;
  /** What each note explains (about=): the note and one cell it is about. */
  explains: { note: PhysNode; cell: PhysNode }[];
  /** What each tape's heads connect to: its write source and its read heads' cells, each with its head's offset. */
  faces: TapeFace[];
  /** Each tape's turn, radians: where its write head sits (the heads keep their spacing; the wheel turns). */
  turns: Map<string, number>;
  /** The nets the forces lay (GraphModel.nets, of the graph with its junctions folded: junctions.ts). */
  nets: GraphModel['nets'];
  /** Each of their edges' reader (its flow's end), by edge id: for the nets' branches. */
  edgeEnds: Map<string, string>;
  /** The nets as drawn (GraphModel.nets: a product's wires at its junction), and their edges' readers. */
  drawnNets: GraphModel['nets'];
  drawnEnds: Map<string, string>;
  /** A meter's edges (ground, meters.ts) and which of them are drawn. */
  grounds: { id: string; meter: string; cell: string; bulb?: string; at?: { x: number; y: number; r: number } }[];
  /** Each meter's net, as last worked out (meterNet). */
  net: MeterTrace[];
  /** Meters this layout placed (and holds there): a meter dragged elsewhere isn't placed again. */
  placedMeters: Set<string>;
}

/** Where a node is now. */
export function positionOf(s: LayoutState, id: string): { x: number; y: number } | undefined {
  const p = nodeAt(s, id);
  return p && p.x !== undefined && p.y !== undefined ? { x: p.x, y: p.y } : undefined;
}

/** A node by its id: one the forces lay, or a product's junction. */
export const nodeAt = (s: LayoutState, id: string): PhysNode | undefined => s.byId.get(id) ?? s.junctions.get(id);
