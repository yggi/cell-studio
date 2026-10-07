/** The examples as the gallery's sheets use them: compiled, in the live state of a moment (`liveAt`). */
import { compileSource } from '../../src/engine/compile';
import { codeShifts, type CompileResult, type Shifts } from '../../src/engine/program';
import { liveAt, type LiveState } from '../../src/engine/live';
import { ORDER } from '../../src/engine/order';
import { PRESETS } from '../../src/engine/presets';
import { routing, type Routing } from '../../src/engine/routing';

export interface Piece {
  readonly key: string;
  readonly title: string;
  readonly program: CompileResult;
  readonly shifts: Shifts;
  readonly routed: Routing;
  readonly live: LiveState;
}

/** A source as a piece, in the live state of a moment; null when it doesn't compile. */
export function pieceOf(key: string, source: string, seconds: number): Piece | null {
  const title = /title="([^"]*)"/.exec(source)?.[1] ?? key;
  const program = compileSource(source);
  if (!program.ok) return null;
  const shifts = codeShifts(program);
  const muted = new Set<string>();
  return { key, title, program, shifts, routed: routing(program, muted), live: liveAt(program, shifts, muted, seconds) };
}

/** Every example that compiles (or those whose key or title has one of the words in `only`), in the library's order. */
export function pieces(seconds: number, only: readonly string[]): Piece[] {
  const out: Piece[] = [];
  for (const key of ORDER) {
    const source = PRESETS[key].source;
    const title = /title="([^"]*)"/.exec(source)?.[1] ?? key;
    if (only.length && !only.some((w) => `${key} ${title}`.toLowerCase().includes(w.toLowerCase()))) continue;
    const piece = pieceOf(key, source, seconds);
    if (piece) out.push(piece);
  }
  return out;
}
