/**
 * A piece's text compiled as Cell studio compiles it: its `use` lines (cells decision 054) read from the library
 * this app holds, the seed library of its cells pin (`resolveSeed`: each fragment's current version), and its
 * lockfile's hashes where its file has one (`locked`). Cells resolves nothing itself; every compile of a piece the
 * person opened, saved or wrote goes through here, so a piece with `use * from "core kit"` opens, draws and plays.
 */
import { compileSource } from '@yggi/cells/engine/compile';
import { declLine, splitComment } from '@yggi/cells/engine/edit';
import { expansion, hasUse } from '@yggi/cells/engine/use';
import type { CompileResult, Env, Locked } from '@yggi/cells/engine/program';
import { resolveSeed } from '@yggi/cells/repository/library';

export const compilePiece = (text: string, env?: Env, locked?: readonly Locked[]): CompileResult =>
  compileSource(text, env, { resolve: resolveSeed, ...(locked?.length ? { locked } : {}) });

/**
 * The text with a used cell's line written in it (cells decision 054, #480): the line its fragment gives `&name`,
 * word for word, under the `use` line that gave it (and under the lines the piece already writes in that use's place),
 * so an edit of a used cell rewrites a line of the piece's own, which then overrides the fragment's; deleting it brings
 * the used one back. The text as it is for a cell the piece writes itself, or one no `use` gave.
 */
export function withUsedLine(text: string, name: string, locked?: readonly Locked[]): string {
  if (!hasUse(text) || declLine(text, name) >= 0) return text;
  const x = expansion(text, { resolve: resolveSeed, ...(locked?.length ? { locked } : {}) });
  const by = x.uses.find((u) => u.gave.includes(`&${name}`));
  const all = x.text.split('\n');
  const head = text.split('\n').length;
  const at = declLine(x.text, name);
  if (!by || at < head) return text;
  // (its physical lines: a mix written over several continues while a line ends in + * , or [)
  let end = at;
  while (end + 1 < all.length && /[+*,[]\s*$/.test(splitComment(all[end]!)[0])) end++;
  const lines = text.split('\n');
  // (under its use, and the lines already written in its place there)
  let under = by.span.line;
  const mine = new Set(by.overrode.map((n) => n.slice(1)));
  while (under < lines.length && [...mine].some((n) => declLine(lines[under]!, n) === 0)) under++;
  lines.splice(under, 0, ...all.slice(at, end + 1));
  return lines.join('\n');
}
