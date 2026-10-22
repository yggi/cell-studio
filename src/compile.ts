/**
 * A piece's text compiled as Cell studio compiles it: its `use "id"` lines (cells decision 054) read from the library
 * this app holds, the seed library of its cells pin (`resolveSeed`: each fragment's current version), and its
 * lockfile's hashes where its file has one (`locked`). Cells resolves nothing itself; every compile of a piece the
 * person opened, saved or wrote goes through here, so a piece with `use "core kit"` opens, draws and plays.
 */
import { compileSource } from '@yggi/cells/engine/compile';
import type { CompileResult, Env, Locked } from '@yggi/cells/engine/program';
import { resolveSeed } from '@yggi/cells/repository/library';

export const compilePiece = (text: string, env?: Env, locked?: readonly Locked[]): CompileResult =>
  compileSource(text, env, { resolve: resolveSeed, ...(locked?.length ? { locked } : {}) });
