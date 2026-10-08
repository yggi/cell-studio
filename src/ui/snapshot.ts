/**
 * What the graph draws, as one value: a piece's program, its graph (nodes, edges, nets), its shifts and its routing.
 * `Graph.svelte` hands its components this one snapshot and swaps it whole when the piece changes
 * (`GraphLayout.sync`), so a node or an edge is never drawn against another piece's program (#144).
 */
import type { GraphModel } from '../engine/graph';
import type { CompileResult, Shifts } from '../engine/program';
import type { Routing } from '../engine/routing';

export interface GraphSnapshot {
  readonly program: CompileResult;
  readonly model: GraphModel;
  readonly shifts: Shifts;
  readonly muted: ReadonlySet<string>;
  /** What can sound (engine/routing.ts). */
  readonly routed: Routing;
}

const nameOf = (id: string) => id.slice('cell:'.length);

/**
 * The snapshot of a program and its graph. The one place that drops what the program doesn't have: a node whose cell
 * isn't in it, an edge whose ends (or the table it reads, its `from`) aren't, and those edges from their nets. Built
 * from one program (`buildGraph`) it drops nothing.
 */
export function snapshotOf(program: CompileResult, model: GraphModel, shifts: Shifts, muted: ReadonlySet<string>, routed: Routing): GraphSnapshot {
  // (a product's junction: while its mix and its voice are)
  const nodes = model.nodes.filter((n) => (n.kind === 'junction' ? program.cells.has(n.mix) && program.cells.has(n.voice) : program.cells.has(n.cell.name)));
  const junctions = new Set(nodes.flatMap((n) => (n.kind === 'junction' ? [n.id] : [])));
  const has = (id: string) => junctions.has(id) || program.cells.has(nameOf(id));
  const edges = model.edges.filter((e) => has(e.from) && has(e.to) && has(e.source) && has(e.target));
  if (nodes.length === model.nodes.length && edges.length === model.edges.length) return { program, model, shifts, muted, routed };
  const kept = new Set(edges.map((e) => e.id));
  const nets = model.nets.map((n) => ({ ...n, taps: n.taps.filter((id) => kept.has(id)) })).filter((n) => n.taps.length);
  return { program, model: { ...model, nodes, edges, nets }, shifts, muted, routed };
}
