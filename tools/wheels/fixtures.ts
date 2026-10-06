/**
 * Which wheels the harness shows: the first of each kind across the examples (a live one if any is), named
 * as `tools/wheels.mjs` names them from the page (`data-wheel`, `data-mode`, `data-show`, and where it sits).
 */
import { codeShifts, compileSource, type CompileResult, type Shifts } from '../../src/engine/compile';
import { buildGraph } from '../../src/engine/graph';
import { liveAt, type LiveState } from '../../src/engine/live';
import { ORDER } from '../../src/engine/order';
import { PRESETS } from '../../src/engine/presets';
import { routing, type Routing } from '../../src/engine/routing';
import { cellView } from '../../src/layout/cellview';
import { effectiveShow } from '../../src/layout/show';
import { flowNodeOf } from '../../src/ui/flownode';
import type { FlowNode } from '../../src/ui/types';

export interface Piece {
  readonly key: string;
  readonly title: string;
  readonly program: CompileResult;
  readonly shifts: Shifts;
  readonly routed: Routing;
  readonly live: LiveState;
}
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
  const v = cellView(p, n.data.name, shifts, isMeter);
  return [where, 'cell', isMeter ? 'meter' : v.mode, v.show].filter(Boolean).join(':');
}

export function fixtures(seconds: number, only: readonly string[]): Fixture[] {
  const kinds = new Map<string, Fixture>();
  for (const key of ORDER) {
    const source = PRESETS[key].source;
    const title = /title="([^"]*)"/.exec(source)?.[1] ?? key;
    if (only.length && !only.some((w) => `${key} ${title}`.toLowerCase().includes(w.toLowerCase()))) continue;
    const program = compileSource(source);
    if (!program.ok) continue;
    const shifts = codeShifts(program);
    const muted = new Set<string>();
    const piece: Piece = { key, title, program, shifts, routed: routing(program, muted), live: liveAt(program, shifts, muted, seconds) };
    for (const g of buildGraph(program).nodes) {
      if (g.cell.note) continue;
      const node = flowNodeOf(g, { x: 0, y: 0 }, false);
      const kind = kindOf(program, node, shifts);
      const live = piece.live.nodes.has(g.id);
      const had = kinds.get(kind);
      const pieces = had?.pieces ?? new Set<string>();
      pieces.add(key);
      if (!had || (live && !had.live)) kinds.set(kind, { key: kind, piece, node, live, pieces });
    }
  }
  return [...kinds.values()].sort((a, b) => a.key.localeCompare(b.key));
}
