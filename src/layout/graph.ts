// Lifted from yggi/cells src/engine/graph.ts @ 3be9219 (v0.30.0): the graph's drawing, the view lives in Cell studio (cells
// decision 086, #650 step 3). cells keeps the written graph (`writtenGraph`: every cell and every written link, with
// what each carries) and its nets (`netsOf`); what is drawn of it is here: a cell's ring (`depth`), a petal, a bulb and
// where it sits, a belt between two turntables, the alias of an edge drawn under another, and the graph's key.
/**
 * The graph as the workbench draws it, built on cells' written graph. A node's depth grows outward from the roots: a cell
 * sits one ring beyond the table it reads through and the cells it splices in; voices sit beyond what they play, a mix
 * beyond its voices, a product's junction where its voice sits.
 */
import { cellId, netsOf, stepEdgeId, writtenGraph, type GraphEdge as WrittenEdge, type GraphNode as WrittenNode, type WrittenGraph as Written } from '@yggi/cells/inspect';
import type { CompileResult, ResolvedCell } from '@yggi/cells';

/** What the drawing adds to a node: its ring, the cell it hangs from as a petal, the room its bulbs take. */
interface DrawnNode {
  readonly depth: number;
  readonly petalOf?: string;
  /**
   * A braid's bulbs (#221), at its size in the graph: how far they reach past its wheel (px, the layout's room for
   * them), and below it (where its name goes).
   */
  readonly reach?: { readonly room: number; readonly below: number };
}
type Drawn<N> = N extends { readonly kind: 'junction' } ? Omit<N, 'depth'> & { readonly depth: number } : Omit<N, keyof DrawnNode> & DrawnNode;
/** A node as drawn: cells' written node, with its ring, and where it hangs or how far its bulbs reach. */
export type GraphNode = Drawn<WrittenNode>;

/** Where a bulb's hub is from its wheel's centre (px, the wheel at its size in the graph), and its disc's radius. */
type BulbAt = { readonly x: number; readonly y: number; readonly r: number };
/** An edge as drawn: cells' written edge, and how it is drawn. */
export type GraphEdge = Omit<WrittenEdge, 'belt' | 'bulb' | 'bulbAt'> & {
  /**
   * A step drawn as a belt between two turntables: `spring` when the driven cell says `belt=` (it lags and swings),
   * `rigid` when both are turntables anyway (a tape on its motor's capstan).
   */
  readonly belt?: 'spring' | 'rigid';
  /** The bulb on its source's wheel it leaves from (a cell's name): a section drawn on its table (decision 016), what it plays. */
  readonly bulb?: string;
  readonly bulbAt?: BulbAt;
};

/** A net as drawn: cells' net (a cell read through one port by several, a meter by what it steps), and the bulb it leaves from. */
export type GraphNet = Omit<ReturnType<typeof netsOf>[number], 'bulb' | 'bulbAt'> & {
  /** The bulb on the owner's wheel it leaves from (GraphEdge.bulb): a section's sub-net, from its place on its table. */
  readonly bulb?: string;
  readonly bulbAt?: BulbAt;
};

/** The graph as drawn. */
export interface GraphModel {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly nets: readonly GraphNet[];
  /**
   * An edge drawn under another id (through a petal: to its parent), by its own id; undefined: not drawn (hidden, or a
   * written pair drawn through a product's junction: its wires say so, `routes`).
   */
  readonly alias: ReadonlyMap<string, string | undefined>;
  /**
   * The cells drawn as bulbs on another's track, by name: each to the cell that splices it (#221). A cell spliced into
   * one braid only, and read nowhere else, has no node of its own; its edges are drawn from that braid.
   */
  readonly bulbs: ReadonlyMap<string, string>;
}

/** cells' written graph, each node at its ring and each step between turntables a belt: what every drawing starts from. */
export interface WrittenGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly through: Written['through'];
}

/** A cell drawn as a turntable: a motor, a belted cell, a tape, a resonator's body. */
export const isTurntable = (c: ResolvedCell) =>
  typeof c.params.motor === 'number' || typeof c.params.belt === 'number' || typeof c.params.write === 'string' || typeof c.params.body === 'string';

/** A step's belt, if it is one (GraphEdge.belt). */
function beltOf(driven: ResolvedCell, driver: ResolvedCell | undefined): 'spring' | 'rigid' | undefined {
  if (typeof driven.params.belt === 'number') return 'spring';
  return driver && isTurntable(driven) && isTurntable(driver) ? 'rigid' : undefined;
}

/** Each cell's ring, outward from the roots (a guard of 64 against a loop). */
function depthsOf(result: CompileResult): (name: string) => number {
  const depth = new Map<string, number>();
  const playedBy = new Map<string, string[]>();
  // (an output played off a tape comes from its read head, not the tape's source; a drone plays its voice alone)
  for (const o of result.outputs) if (!o.drone) playedBy.set(o.voice, [...(playedBy.get(o.voice) ?? []), o.tape ? o.tape.head : o.cell]);
  const depthOf = (name: string, guard = 0): number => {
    const hit = depth.get(name);
    if (hit !== undefined) return hit;
    const c = result.cells.get(name);
    let d = 1;
    if (c && guard < 64) {
      if (c.root) d = 0;
      else if (c.mix) {
        for (const b of c.mix) d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
      } else if (c.chords) {
        // (a MIDI card: past what it sends, as a sound card is past what it hears)
        for (const b of c.chords.flatMap((x) => x ?? [])) d = Math.max(d, depthOf(b.voice.name, guard + 1) + 1);
        for (const k of c.children.keys()) d = Math.max(d, depthOf(k, guard + 1) + 1);
      } else if (c.voice || c.kit) {
        for (const p of playedBy.get(name) ?? []) d = Math.max(d, depthOf(p, guard + 1) + 1);
        for (const o of result.outputs)
          if (o.voice === name) {
            for (const m of [...o.mods, ...o.levels]) d = Math.max(d, depthOf(m.cell, guard + 1) + 1);
            if (o.envelopeCell) d = Math.max(d, depthOf(o.envelopeCell, guard + 1) + 1);
          }
        for (const k of c.children.keys()) d = Math.max(d, depthOf(k, guard + 1) + 1);
      } else {
        d = depthOf(c.over ?? c.context, guard + 1) + 1;
        for (const k of c.children.keys()) d = Math.max(d, depthOf(k, guard + 1) + 1);
      }
    }
    depth.set(name, d);
    return d;
  };
  return depthOf;
}

/**
 * cells' written graph as drawing starts from it: each node at its ring (a junction at its voice's), each step between
 * turntables, or through a `belt=`, a belt. `card`: with the built-in card, as `writtenGraph` gives it.
 */
export function drawnWritten(result: CompileResult, options: { readonly card?: boolean } = {}): WrittenGraph {
  const written = writtenGraph(result, options);
  const depthOf = depthsOf(result);
  const belts = new Map<string, 'spring' | 'rigid'>();
  for (const c of result.cells.values()) {
    const belt = c.step ? beltOf(c, result.cells.get(c.step.driver)) : undefined;
    if (belt && c.step) belts.set(stepEdgeId(cellId(c.name), cellId(c.step.driver)), belt);
  }
  const nodes = written.nodes.map((n): GraphNode => (n.kind === 'junction' ? { ...n, depth: depthOf(n.voice) } : ({ ...n, depth: depthOf(n.cell.name) } as GraphNode)));
  const edges = written.edges.map((e): GraphEdge => {
    const { belt: _, ...rest } = e as WrittenEdge & { belt?: unknown };
    const belt = belts.get(e.id);
    return belt ? { ...rest, belt } : rest;
  });
  return { nodes, edges, through: written.through };
}

/** The nets of a graph as drawn (cells' `netsOf`), each with the bulb its readers leave from. */
export const drawnNets = (nodes: readonly GraphNode[], edges: readonly GraphEdge[]): GraphNet[] =>
  netsOf(nodes as readonly WrittenNode[], edges as readonly WrittenEdge[]) as GraphNet[];

/** Changes only when the set of nodes or edges changes — not when contents do. */
export function structureKey(model: Pick<GraphModel, 'nodes' | 'edges'>): string {
  return [...model.nodes.map((n) => n.id).sort(), '|', ...model.edges.map((e) => e.id).sort()].join(' ');
}
