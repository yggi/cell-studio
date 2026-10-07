/**
 * Which wheels the harness shows: the first of each kind across the examples (a live one if any is), named
 * as `tools/gallery/real.mjs` names them from the page (`data-wheel`, `data-mode`, `data-show`, and where it sits).
 */
import { buildGraph } from '../../../src/engine/graph';
import { cellView } from '../../../src/layout/cellview';
import { effectiveShow } from '../../../src/layout/show';
import { flowNodeOf } from '../../../src/ui/flownode';
import { meterIndex } from '../../../src/layout/meters';
import type { FlowNode } from '../../../src/ui/types';
import type { CompileResult, Shifts } from '../../../src/engine/program';
import type { Piece } from '../pieces';

export interface Fixture {
  /** The kind, as the slow sheet names it: where it sits, its component, mode and show. */
  readonly key: string;
  readonly piece: Piece;
  readonly node: FlowNode;
  /** Live at the moment shown. */
  readonly live: boolean;
  /** The examples that have this kind. */
  readonly pieces: Set<string>;
}

function kindOf(p: CompileResult, n: FlowNode, shifts: Shifts): string {
  const where = 'petal' in n.data && n.data.petal ? 'petal' : 'graph';
  const cell = p.cells.get(n.data.name)!;
  if (n.type === 'material') return `${where}:material:${n.data.role}`;
  if (n.type === 'scope' || n.type === 'sun') return `${where}:${n.type}`;
  if (n.type === 'voice') return `${where}:${effectiveShow(p, n.data.name).show === 'wave' ? 'wave' : 'spectrum'}`;
  if (cell.mix || cell.sink) return `${where}:spectrum`;
  const isMeter = 'isMeter' in n.data && n.data.isMeter;
  const v = cellView(p, n.data.name, shifts, isMeter)!;
  // (a cell a meter steps wears that meter's ring: a kind of its own)
  const ringed = 'ring' in n.data && n.data.ring ? 'ring' : '';
  return [where, 'cell', isMeter ? 'meter' : v.mode, v.show, ringed].filter(Boolean).join(':');
}

/** Every wheel of a piece, with its kind (not the notes: they are cards). */
export function wheelsOf(piece: Piece): { name: string; key: string; node: FlowNode; live: boolean }[] {
  const model = buildGraph(piece.program);
  const meters = { index: meterIndex(model) };
  return model.nodes
    .filter((g) => !g.cell.note)
    .map((g) => {
      const node = flowNodeOf(g, { x: 0, y: 0 }, false, undefined, meters);
      return { name: g.cell.name, key: kindOf(piece.program, node, piece.shifts), node, live: piece.live.nodes.has(g.id) };
    });
}

/** The first of each kind of wheel across these pieces (a live one if any is). */
export function fixtures(list: readonly Piece[]): Fixture[] {
  const kinds = new Map<string, Fixture>();
  for (const piece of list) {
    for (const { key: kind, node, live } of wheelsOf(piece)) {
      const had = kinds.get(kind);
      const having = had?.pieces ?? new Set<string>();
      having.add(piece.key);
      if (!had || (live && !had.live)) kinds.set(kind, { key: kind, piece, node, live, pieces: having });
    }
  }
  return [...kinds.values()].sort((a, b) => a.key.localeCompare(b.key));
}
