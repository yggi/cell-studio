/**
 * What the golden graph has to show, as dimensions rather than combinations: every value of every dimension at least
 * once (a spanning set), not every combination of them. A wheel is where it sits (graph or petal), what draws it (a cell,
 * a turntable, a scope, the sun, a spectrum), its mode and show, and a turntable's role; whether a meter steps it (its
 * ring) is not one. An edge is its port (every attribute — fm=, lpf= … — one value), whether it has a label, and the few that are drawn differently: a belt, a
 * tape's head, a meter's net; and what it carries: its band (sync, CV, audio) and whether it is a bus. Which label it has (`×0.4`, `[<<]`, `lpf`) is the edge sheet's to show.
 */
import { type GraphEdge } from '../../../src/engine/graph';
import { buildGraph } from '../../../src/layout/drawn';
import { edgeLabel, isAttribute } from '../../../src/engine/transform';
import { groundsOf } from '../../../src/layout/meters';
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
  const belted = !!e.belt;
  const head = e.port === 'write' || e.port === 'play';
  // (what it carries, docs/notes/nets.md: its band, and whether it is a bus — a table's entries, a chord's notes)
  const bus = e.width < 2 ? 'wire' : e.port === 'over' || e.port === 'map' ? 'table' : e.band === 'audio' ? 'stereo' : 'chord';
  return [
    // (an attribute — fm=, lpf=, couple= … — is one value: which one is the edge sheet's to show)
    `port=${isAttribute(e.port) ? 'attribute' : e.port}`,
    `label=${edgeLabel(e) ? 'pill' : 'bare'}`,
    `band=${e.band}`,
    `bus=${bus}`,
    ...(belted ? ['special=belt'] : []),
    ...(head ? ['special=head'] : []),
  ];
}

export interface Carrier {
  /** A cell (`&name`) or an edge (`a>b`). */
  readonly what: string;
  readonly facets: string[];
}

/** Everything a piece carries: its wheels and its edges, each with its facets. */
export function carriers(piece: Piece): { wheels: Carrier[]; edges: Carrier[] } {
  const model = buildGraph(piece.program);
  const grounds = groundsOf(model);
  return {
    wheels: wheelsOf(piece).map((w) => ({ what: `&${w.name}`, facets: wheelFacets(w.key) })),
    edges: model.edges.map((e) => ({ what: `${e.source.slice(5)}>${e.target.slice(5)}`, facets: edgeFacets(e, piece.program, grounds.has(e.id)) })),
  };
}
