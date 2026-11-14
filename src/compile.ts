/**
 * A piece's text compiled as Cell studio compiles it: its `use` lines (cells decision 054) read from the library
 * this app holds, the seed library of its cells pin (`resolveSeed`: each fragment's current version), and its
 * lockfile's hashes where its file has one (`locked`). Cells resolves nothing itself; every compile of a piece the
 * person opened, saved or wrote goes through here, so a piece with `* from gm_kit` opens, draws and plays.
 */
import { compileSource } from '@yggi/cells/engine/compile';
import { takeIn } from '@yggi/cells/engine/takein';
import { hasFrom } from '@yggi/cells/engine/use';
import type { CompileResult, Env, Locked } from '@yggi/cells/engine/program';
import { resolveSeed } from '@yggi/cells/repository/library';

export const compilePiece = (text: string, env?: Env, locked?: readonly Locked[]): CompileResult =>
  compileSource(text, env, { resolve: resolveSeed, ...(locked?.length ? { locked } : {}) });

/**
 * The text with a given cell's line written in, the piece's own (cells' `takeIn`, #480, #610): before an edit of a
 * cell a `from` line gave, its line becomes the piece's, and the `from` line stops asking for it. The text as it is
 * where an edit reaches the cell already (the piece's own cell, the head of a `from` line that takes one head) or
 * where no line of the piece's can stand for it (a template's copy's own cell, one head among several).
 */
export function ownLine(text: string, name: string, locked?: readonly Locked[]): string {
  if (!hasFrom(text)) return text;
  const r = takeIn(text, name, { resolve: resolveSeed, ...(locked?.length ? { locked } : {}) });
  return 'text' in r ? r.text : text;
}
