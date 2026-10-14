/**
 * What draws each node of the graph, in one place: a turntable (a motor, a tape, a belted cell, a resonator), a voice,
 * a plugin's wheel, a gate's meter (a product's junction a small one), a signal's wave or spectrum, or a cell's glyph.
 * The flow's node types (ui/flownode.ts) and a cell node's glyph (ui/CellNode.svelte) both read it.
 */
import { isTurntable, type GraphNode } from '@yggi/cells/engine/graph';
import type { CompileResult } from '@yggi/cells/engine/program';
import { pluginOf } from './show';
import { kitOf } from './kit';

/** What a cell's own node draws: a gate's meter, a drum kit, a wave (a mix, a sound tape's read head), the sound card's spectrum, its glyph. */
export type Glyph = 'gate' | 'kit' | 'wave' | 'spectrum' | 'glyph';
export type Wheel = 'junction' | 'resonator' | 'motor' | 'tape' | 'belt' | 'voice' | 'plugin' | Glyph;

/** A read head of a sound tape: what it plays back is sound. */
export const soundHeadOf = (program: CompileResult, name: string): boolean => {
  const play = program.cells.get(name)?.params.play;
  return typeof play === 'string' && program.tapes.some((t) => t.name === play);
};

/** What a cell's node draws (a cell, not a voice, a turntable or a plugin's). */
export function glyphOf(program: CompileResult, name: string): Glyph {
  const c = program.cells.get(name);
  if (!c) return 'glyph';
  if (c.gate) return 'gate';
  if (kitOf(program, name)) return 'kit';
  if (soundHeadOf(program, name) || (c.mix && !c.sink)) return 'wave';
  if (c.sink) return 'spectrum';
  return 'glyph';
}

/** What draws a node. Without the piece, a cell's own drawing isn't known yet: its glyph. */
export function wheelOf(g: GraphNode, program?: CompileResult): Wheel {
  if (g.kind === 'junction') return 'junction';
  if (g.petalOf) return g.kind === 'voice' ? 'voice' : program ? glyphOf(program, g.cell.name) : 'glyph';
  // (a resonator is a voice too — but a body: a turntable, struck and damped and bowed by hand)
  if (typeof g.cell.params.body === 'string' && (g.kind === 'voice' || isTurntable(g.cell))) return 'resonator';
  if (g.kind === 'voice') return 'voice';
  if (program && pluginOf(program, g.cell.name)) return 'plugin';
  if (isTurntable(g.cell)) return typeof g.cell.params.motor === 'number' ? 'motor' : typeof g.cell.params.write === 'string' ? 'tape' : 'belt';
  return program ? glyphOf(program, g.cell.name) : 'glyph';
}
