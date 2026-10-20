/**
 * What the layout weighs (docs/notes/nets.md, mass and strength): a node's mass by what it is, an edge's strength by
 * what it carries. A heavy node moves less and holds more room, so the backbones anchor and light cells settle round
 * them; a strong edge pulls harder, and crossing it costs more. One table, read by the forces (start.ts, physics.ts)
 * and the quality count (quality.ts).
 */
import { isMidiCard } from '@yggi/cells/engine/program';
import { isTurntable, type GraphEdge, type GraphNode } from '@yggi/cells/engine/graph';

/** A node's mass: a turntable (a body) heaviest, then a meter, a net's owner, a sound; a cell 1, a petal light, a junction nothing. */
export function massOf(n: GraphNode, ownsNet: boolean): number {
  if (n.petalOf) return 0.5;
  // (a product's junction weighs nothing: it takes no part in the forces, it hangs under its voice, junctions.ts)
  if (n.kind === 'junction') return 0;
  // (a bare node, as the layout's tests make them: a cell)
  if (!n.cell) return 1;
  if (isTurntable(n.cell)) return 3;
  if (n.kind === 'cell' && n.isMeter) return 2.5;
  if (ownsNet) return 2;
  if (n.kind === 'voice' || n.cell.mix || n.cell.sink || isMidiCard(n.cell)) return 1.5;
  return 1;
}

/** An edge's strength: a belt strongest (a body), a clock's ticks strong (a backbone), a bus of values by its width, a note's link weak. */
export function strengthOf(e: GraphEdge): number {
  if (e.belt) return 3;
  if (e.band === 'none') return 0.3;
  if (e.band === 'sync') return 2;
  // (sound weighs as one wire: a stereo pair into the sound card is two channels, not more to keep together)
  return e.band === 'cv' && e.width > 1 ? 1 + Math.log2(e.width) / 3 : 1;
}

/** What a crossing of the same kind costs over one of two kinds (two braids, two sound wires, two nets: hard to follow apart). */
export const SAME_KIND = 2;

/**
 * What crossing two edges costs: their strengths' product, more when they are of one kind (`band`: values, sound,
 * time). Read by the count (quality.ts) and by the force that pushes crossings apart (forces.ts), so the layout works
 * hardest where the measure says a crossing hurts most.
 */
export function crossingCost(p: { readonly w: number; readonly kind?: string }, q: { readonly w: number; readonly kind?: string }): number {
  return p.w * q.w * (p.kind !== undefined && p.kind === q.kind ? SAME_KIND : 1);
}
