/**
 * A piece's text compiled as Cell studio compiles it: its `use` lines (cells decision 054) read from the library
 * this app holds, the seed library of its cells pin (`resolveSeed`: each fragment's current version), and its
 * lockfile's hashes where its file has one (`locked`). Cells resolves nothing itself; every compile of a piece the
 * person opened, saved or wrote goes through here, so a piece with `* from gm_kit` opens, draws and plays.
 */
import { compileSource } from '@yggi/cells/engine/compile';
import { takeIn } from '@yggi/cells/engine/takein';
import { audition, type Audition } from '@yggi/cells/repository/audition';
import { hasFrom, partOf, partsOf } from '@yggi/cells/engine/use';
import { splitComment } from '@yggi/cells/engine/edit';
import { readFrom } from '@yggi/cells/engine/parser/use';
import { planOf } from '@yggi/cells/engine/host';
import { windowAt } from '@yggi/cells/engine/schedule';
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

/**
 * A fragment heard alone (cells' audition, #623): its text, then the lines of a host that stands in for what it lacks
 * (a key, a voice, a meter, a card), each listed with the hole it fills; `why` where it plays nothing alone.
 */
export const auditionOf = (text: string): Audition => audition(text, { resolve: resolveSeed });

/** A part a document gives (cells decision 082): its heads, its signature line, and its text as heard in the document. */
export interface DocumentPart {
  /** Its heads, bare (`twinkle`): the first is what a line takes it by. */
  readonly heads: readonly string[];
  /** Its signature line, as written (`&twinkle from &key`). */
  readonly signature: string;
  /** Its main parameter (`&key`), or null. */
  readonly main: string | null;
  /** The part (its signature and what its heads read), then the document's own line for its main parameter, where it
   * has one: what plays when it is heard in the document, over the document's key rather than a host's stand-in. */
  readonly heard: string;
}

const fromOf = (raw: string) => readFrom(splitComment(raw)[0].trim());

/** The parts a document gives, in the order written; none for a text of one signature (a template) or none (#623). */
export function documentParts(text: string): DocumentPart[] {
  const heads = partsOf(text);
  if (heads.length < 2) return [];
  const lines = text.split('\n');
  return heads.flatMap((names) => {
    const part = partOf(text, names[0]!);
    const signature = lines.find((l) => {
      const f = fromOf(l);
      return f?.kind === 'signature' && f.names[0] === `&${names[0]}`;
    });
    if (part === null || signature === undefined) return [];
    const f = fromOf(signature);
    const main = f?.kind === 'signature' ? f.main : null;
    // (the document's line for it: a cell of that name, or a from line that takes it; never another signature)
    const own = main
      ? lines.find((l) => {
          const g = fromOf(l);
          if (g?.kind === 'signature') return false;
          if (g?.kind === 'use') return g.names?.includes(main) ?? false;
          return new RegExp(`^\\s*${main}(?![A-Za-z0-9_])`).test(l);
        })
      : undefined;
    return [{ heads: names, signature: signature.trim(), main, heard: own ? `${part}\n${own.trim()}` : part }];
  });
}

/** What a text plays heard alone over its first `seconds`, as notes (start and length in seconds, frequency), for a picture. */
export function notesOf(text: string, seconds = 8): { readonly at: number; readonly dur: number; readonly freq: number }[] {
  const plan = planOf(auditionOf(text).text, undefined, { resolve: resolveSeed });
  return windowAt(plan, 0, seconds).events.flatMap((e) => (e.unheard || !(e.freq > 0) ? [] : [{ at: e.at, dur: e.dur, freq: e.freq }]));
}
