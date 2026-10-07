/**
 * What the layout weighs (docs/notes/nets.md, mass and strength): a node's mass by what it is, an edge's strength by
 * what it carries. A heavy node moves less and holds more room, so the backbones anchor and light cells settle round
 * them; a strong edge pulls harder, and crossing it costs more. One table, read by the forces (start.ts, physics.ts)
 * and the quality count (quality.ts).
 */
import { isTurntable, type GraphEdge, type GraphNode } from '../engine/graph';

/** A node's mass: a turntable (a body) heaviest, then a meter, a net's owner, a sound; a cell 1, a petal light. */
export function massOf(n: GraphNode, ownsNet: boolean): number {
  if (n.petalOf) return 0.5;
  // (a bare node, as the layout's tests make them: a cell)
  if (!n.cell) return 1;
  if (isTurntable(n.cell)) return 3;
  if (n.kind === 'cell' && n.isMeter) return 2.5;
  if (ownsNet) return 2;
  if (n.kind === 'voice' || n.cell.mix || n.cell.sink) return 1.5;
  return 1;
}

/** An edge's strength: a belt strongest (a body), a clock's ticks strong (a backbone), a bus by its width, a note's link weak. */
export function strengthOf(e: GraphEdge): number {
  if (e.belt) return 3;
  if (e.band === 'none') return 0.3;
  if (e.band === 'sync') return 2;
  return e.width > 1 ? 1 + Math.log2(e.width) / 3 : 1;
}
