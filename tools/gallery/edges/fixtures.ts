/**
 * Which edges the sheet shows: the first of each kind across the examples (one that is live at the moment, if any is),
 * where a kind is what the edge looks like — its kind, the parameter it feeds, the shape of its label and pick —
 * so a new way to write an edge turns up here by itself. Beside them, the edges that aren't in the model: a meter's net.
 */
import { buildGraph, type GraphEdge } from '../../../src/engine/graph';
import { groundsOf, meterIndex } from '../../../src/layout/meters';
import type { Piece } from '../pieces';

export interface EdgeFixture {
  /** The kind, as a tile is named: `edge:out:fm`, `edge:step:div-n`. */
  readonly key: string;
  readonly piece: Piece;
  readonly edge: GraphEdge;
  /** Live at the moment shown (written edges: `live.edges`). */
  readonly live: boolean;
  /** The examples that have this kind. */
  readonly pieces: Set<string>;
  /** Drawn as the meter's net (the trace between two cells it steps), not from the model. */
  readonly meter?: { readonly name: string; readonly index: number };
}

const WORDS: Record<string, string> = { '×': ' times ', '÷': ' div ', '+': ' plus ', '−': ' minus ', '⟳': ' cycle ', '^': ' up ', '·': ' ' };
/** `×0.4` → `times-n`: the shape of a label or a pick, as a word (digits are all one `n`; a tile name has no symbols). */
const shape = (s: string) =>
  s
    .replace(/<</g, ' back ')
    .replace(/>>/g, ' fwd ')
    .replace(/[×÷+−⟳^·]/g, (c) => WORDS[c])
    .replace(/[\d.]+/g, 'n')
    .replace(/[^\w]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

/** What kind of edge: an `out` whose pick is a word feeds a parameter (`fm`, `lpf`, `write` …: the pick is its name). */
export function edgeKind(e: GraphEdge): string {
  const param = e.kind === 'out' && /^[a-z]+$/.test(e.pick) ? e.pick : '';
  return ['edge', e.kind, param, e.label && shape(e.label), !param && e.pick && `pick-${shape(e.pick)}`, e.count > 1 && 'count'].filter(Boolean).join(':');
}

/** The first of each kind of edge across these pieces (a live one if any is), and a meter's net if one has a meter. */
export function edgeFixtures(list: readonly Piece[]): EdgeFixture[] {
  const kinds = new Map<string, EdgeFixture>();
  let meter: EdgeFixture | undefined;
  for (const piece of list) {
    const model = buildGraph(piece.program);
    const grounds = groundsOf(model);
    for (const e of model.edges) {
      // (a meter's own step edges aren't drawn: its net is)
      if (grounds.has(e.id)) {
        const index = meterIndex(model).get(e.target);
        const had = meter;
        if (!had && index !== undefined)
          meter = { key: 'edge:meter:net', piece, edge: e, live: false, pieces: new Set([piece.key]), meter: { name: e.target.slice('cell:'.length), index } };
        else if (had) had.pieces.add(piece.key);
        continue;
      }
      const key = edgeKind(e);
      const live = piece.live.edges.has(e.id);
      const had = kinds.get(key);
      const having = had?.pieces ?? new Set<string>();
      having.add(piece.key);
      if (!had || (live && !had.live)) kinds.set(key, { key, piece, edge: e, live, pieces: having });
    }
  }
  return [...kinds.values(), ...(meter ? [meter] : [])].sort((a, b) => a.key.localeCompare(b.key));
}
