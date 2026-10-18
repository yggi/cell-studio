/**
 * Which edges the sheet shows: the first of each kind across the examples (one that is live at the moment, if any is),
 * where a kind is what the edge looks like — the port it is read through, the shape of the transforms written on it —
 * so a new way to write an edge turns up here by itself. Beside them, the edges that aren't in the model: a meter's net.
 */
import { type GraphEdge } from '@yggi/cells/engine/graph';
import { buildGraph } from '../../../src/layout/drawn';
import type { Transform } from '@yggi/cells/engine/transform';
import { groundsOf, meterIndex } from '../../../src/layout/meters';
import type { Piece } from '../pieces';
import type { CompileResult } from '@yggi/cells/engine/program';

export interface EdgeFixture {
  /** The kind, as a tile is named: `edge:fm`, `edge:step:div`. */
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

/** A transform's shape, as a word: what its steps do, not by how much (`[<<2]` → `delay`, `÷2 · belt` → `div-belt`). */
const shape = (t: Transform) =>
  t
    .map((s) => {
      switch (s.kind) {
        case 'delay':
          return s.unit === 'step' ? 'delay' : 'delay-s';
        case 'transpose':
          return s.unit === 'grid' ? 'up' : 'semitones';
        case 'rate':
          return [s.whole && 'loop', s.per === 'cycle' && 'cycle', ...s.by.map((r) => (r.op === '×' ? 'times' : 'div')), s.belt !== undefined && 'belt'].filter(Boolean).join('-');
        default:
          return s.kind;
      }
    })
    .filter(Boolean)
    .join('-');

/** The ports that always carry sound: on any other, sound (a mix spliced in, a tape of sound) is drawn as a kind of its own. */
const SOUND_PORTS = new Set(['mix', 'fm', 'excite', 'couple']);

/**
 * What kind of edge: the port it is read through, whether it carries sound where the port may carry values too (a ref,
 * a tape's write= or play=), what an over= reads where it is drawn otherwise (a kit, a groove's hits; a table of taps, a
 * selection), the shapes of the transforms written on it, whether it counts (`×n` slots).
 */
export function edgeKind(e: GraphEdge, program: CompileResult): string {
  const sound = e.band === 'audio' && !SOUND_PORTS.has(e.port) && 'sound';
  const table = e.port === 'over' ? e.from.slice('cell:'.length) : '';
  const read = table && (program.cells.get(table)?.kit ? 'kit' : [...(program.sections?.values() ?? [])].includes(table) ? 'taps' : false);
  return ['edge', e.port, sound, read, ...new Set(e.transforms.map(shape).filter(Boolean)), e.count > 1 && 'count'].filter(Boolean).join(':');
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
      const key = edgeKind(e, piece.program);
      const live = piece.live.edges.has(e.id);
      const had = kinds.get(key);
      const having = had?.pieces ?? new Set<string>();
      having.add(piece.key);
      if (!had || (live && !had.live)) kinds.set(key, { key, piece, edge: e, live, pieces: having });
    }
  }
  return [...kinds.values(), ...(meter ? [meter] : [])].sort((a, b) => a.key.localeCompare(b.key));
}
