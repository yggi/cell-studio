/**
 * What the golden graph has to show, as dimensions rather than combinations: every value of every dimension at least
 * once (a spanning set), not every combination of them. A wheel is where it sits (graph or petal), what draws it (a cell,
 * a turntable, a scope, the sun, a spectrum), its mode and show, and a turntable's role; whether a meter steps it (its
 * ring) is not one. An edge is its kind, whether it has a label, and the few that are drawn differently: a belt, a
 * tape's head, a meter's net. Which label it has (`×0.4`, `[<<]`, `lpf`) is the edge sheet's to show.
 */
import { buildGraph, type GraphEdge } from '../../../src/engine/graph';
import { isGround } from '../../../src/layout/meters';
import type { CompileResult } from '../../../src/engine/program';
import type { Piece } from '../pieces';
import { wheelsOf } from '../wheels/fixtures';

/** The facets of a wheel's kind (`graph:cell:braid:notes:ring` → where=graph, kind=cell, mode=braid, show=notes). */
export function wheelFacets(key: string): string[] {
  const [where, kind, ...rest] = key.split(':');
  const out = [`where=${where}`, `kind=${kind}`];
  if (kind === 'cell') {
    const [mode, show] = rest.filter((p) => p !== 'ring');
    out.push(`mode=${mode}`);
    if (show) out.push(`show=${show}`);
  } else if (kind === 'material') out.push(`role=${rest[0]}`);
  return out;
}

/** The facets of an edge of a program. */
export function edgeFacets(e: GraphEdge, program: CompileResult, ground: boolean): string[] {
  if (ground) return ['kind=net'];
  const belted = e.kind === 'step' && typeof program.cells.get(e.source.slice('cell:'.length))?.params.belt === 'number';
  const head = e.kind === 'out' && (e.pick === 'write' || e.pick === 'play');
  return [`kind=${e.kind}`, `label=${e.count > 1 || e.pick || e.label ? 'pill' : 'bare'}`, ...(belted ? ['special=belt'] : []), ...(head ? ['special=head'] : [])];
}

export interface Carrier {
  /** A cell (`&name`) or an edge (`a>b`). */
  readonly what: string;
  readonly facets: string[];
}

/** Everything a piece carries: its wheels and its edges, each with its facets. */
export function carriers(piece: Piece): { wheels: Carrier[]; edges: Carrier[] } {
  const model = buildGraph(piece.program);
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  return {
    wheels: wheelsOf(piece).map((w) => ({ what: `&${w.name}`, facets: wheelFacets(w.key) })),
    edges: model.edges.map((e) => ({ what: `${e.source.slice(5)}>${e.target.slice(5)}`, facets: edgeFacets(e, piece.program, isGround(e, byId)) })),
  };
}
