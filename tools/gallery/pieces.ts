/** The examples as the gallery's sheets use them: compiled, in the live state of a moment (`liveAt`). */
import { codeShifts, type CompileResult, type Shifts } from '@yggi/cells/engine/program';
import { liveAt, type LiveState } from '@yggi/cells/engine/live';
import { ORDER } from '@yggi/cells/engine/order';
import { PRESETS } from '@yggi/cells/engine/presets';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { compilePiece } from '../../src/compile';
import { textOf } from '../../src/library';
import { routing, type Routing } from '@yggi/cells/engine/routing';

export interface Piece {
  readonly key: string;
  readonly title: string;
  readonly source: string;
  readonly program: CompileResult;
  readonly shifts: Shifts;
  readonly routed: Routing;
  readonly live: LiveState;
}

/** A source (a text, or a piece file: its cells block) as a piece, in the live state of a moment; null when it doesn't compile. */
export function pieceOf(key: string, given: string, seconds: number, title = pieceMeta(given)?.title ?? key): Piece | null {
  const source = textOf(given);
  // (its `use` lines read from the app's library, as the app compiles a piece)
  const program = compilePiece(source);
  if (!program.ok) return null;
  const shifts = codeShifts(program);
  const muted = new Set<string>();
  return { key, title, source, program, shifts, routed: routing(program, muted), live: liveAt(program, shifts, muted, seconds) };
}

/** Every example that compiles (or those whose key or title has one of the words in `only`), in the library's order. */
export function pieces(seconds: number, only: readonly string[]): Piece[] {
  const out: Piece[] = [];
  for (const key of ORDER) {
    const { source, file } = PRESETS[key];
    // (an example's title is its file's frontmatter's: decision 047)
    const title = pieceMeta(file)?.title ?? key;
    if (only.length && !only.some((w) => `${key} ${title}`.toLowerCase().includes(w.toLowerCase()))) continue;
    const piece = pieceOf(key, source, seconds, title);
    if (piece) out.push(piece);
  }
  return out;
}
