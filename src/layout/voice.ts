/**
 * A voice's node and the envelope that sits on it (docs/ui/graph.md): the voice's wheel, and its own envelope
 * (`env=&(map=adsr …)`, written in place) as a box as wide as the voice on its top, where its sound leaves.
 */
import type { CompileResult } from '../engine/program';

/** A voice's wheel, px across (size= scales it). */
export const VOICE_SIZE = 160;

/** Its envelope's box on its top: as wide as the voice, this much of it high, this far above its rim (px). */
const ENVELOPE_HEIGHT = 0.42;
const ENVELOPE_GAP = 4;

/** The box of a voice's own envelope, the voice `size` px across: its width, height, and its centre above the voice's. */
export function envelopeBox(size: number): { width: number; height: number; above: number } {
  const height = size * ENVELOPE_HEIGHT;
  return { width: size, height, above: size / 2 + ENVELOPE_GAP + height / 2 };
}

/** How far above a voice's centre its sound leaves: the top of its envelope's box (px). */
export const socketOf = (size: number) => {
  const b = envelopeBox(size);
  return b.above + b.height / 2;
};

/** The voice whose own envelope (written in place, a petal of it) a cell is, or null. */
export function envelopeOf(program: CompileResult, cell: string, parent: string | undefined): string | null {
  const voice = parent ? program.cells.get(parent) : undefined;
  return voice?.env === cell && program.cells.get(cell)?.lambda ? voice.name : null;
}

/** A voice's own envelope written in place (a petal on its top), or null. */
export function ownEnvelope(program: CompileResult, voice: string): string | null {
  const env = program.cells.get(voice)?.env;
  return env && program.cells.get(env)?.lambda ? env : null;
}
