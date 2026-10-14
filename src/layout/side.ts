/**
 * What sits beside the graph, not in it: the margin. A note (a cell that is only a label) and a scope (an oscilloscope:
 * scope=) are read beside the music, not laid among it, so their links (about=, a scope's channels) cross nothing: a
 * note is marked on the cells it explains by its number, a scope on the cells it watches by its channel's colour
 * (docs/ui/graph.md: the margin). The layout lays out the graph without them (`sideless`).
 */
import type { GraphModel, GraphNode } from '@yggi/cells/engine/graph';

/** A note or a scope: it goes in the margin. */
export const isSide = (n: GraphNode): boolean => !!n.cell && (!!n.cell.note || typeof n.cell.params.scope === 'string');

/** The graph without its margin: no note or scope, and no edge or net tap to one. */
export function sideless(model: GraphModel): GraphModel {
  const side = new Set(model.nodes.filter(isSide).map((n) => n.id));
  if (!side.size) return model;
  const edges = model.edges.filter((e) => !side.has(e.source) && !side.has(e.target));
  const kept = new Set(edges.map((e) => e.id));
  const nets = model.nets.flatMap((n) => {
    if (side.has(n.owner)) return [];
    const taps = n.taps.filter((t) => kept.has(t));
    return taps.length ? [{ ...n, taps }] : [];
  });
  return { ...model, nodes: model.nodes.filter((n) => !side.has(n.id)), edges, nets };
}

/** The margin's entries: each note and scope, numbered in the order the piece writes them, and the cells each is about. */
export function sideEntries(model: GraphModel): { id: string; name: string; kind: 'note' | 'scope'; mark: number; about: string[] }[] {
  let k = 0;
  return model.nodes
    .filter(isSide)
    .sort((a, b) => (a.cell!.span?.line ?? 0) - (b.cell!.span?.line ?? 0))
    .map((n) => {
      const scope = !n.cell!.note;
      // (a note: what its about= names; a scope: what it watches, its edges either way)
      const about = model.edges
        .filter((e) => (scope ? (e.source === n.id || e.target === n.id) && e.port !== 'about' : e.source === n.id && e.port === 'about'))
        .map((e) => (e.source === n.id ? e.target : e.source));
      return { id: n.id, name: n.cell!.name, kind: scope ? 'scope' : 'note', mark: scope ? 0 : ++k, about: [...new Set(about)] };
    });
}
