/**
 * A piece's text compiled as Cell studio compiles it: its `from` lines read from the library this app holds, the seed
 * library of its cells pin and the person's own fragments (`setResolver`, which `mine` calls: #626), and its
 * lockfile's hashes where its file has one (`locked`). Cells resolves nothing itself; every compile of a piece the
 * person opened, saved or wrote goes through here, so a piece with `* from gm_kit` opens, draws and plays.
 */
import {
  audition,
  type Audition,
  codeShifts,
  type CompileResult,
  compileSource,
  type Env,
  type Locked,
  plan,
  planOf,
  type Resolve,
  resolveSeed,
  styleAt,
  takeIn,
  windowAt,
} from '@yggi/cells';
import { hasFrom, partOf, partsOf, readFrom } from '@yggi/cells/repository';
import { splitComment } from '@yggi/cells/edit';
import { barSeconds } from './session/follow';
import type { HeardNote } from './layout/preview';

/**
 * How every compile here reads a `from` line: the seed library, until the person's own fragments are read (`mine`, which
 * sets it on each change of its layer: #626). Plain state, not Svelte's: the build's tools compile pieces through here too.
 */
let resolver: Resolve = resolveSeed;
/** Read `from` lines through `resolve` from now on (`mine.svelte.ts`). */
export const setResolver = (resolve: Resolve): void => void (resolver = resolve);
/** How a `from` line is read now: what a caller outside this module hands cells (a cable's patch, #626). */
export const resolveNow: Resolve = (id, hash) => resolver(id, hash);

export const compilePiece = (text: string, env?: Env, locked?: readonly Locked[]): CompileResult =>
  compileSource(text, env, { resolve: resolver, ...(locked?.length ? { locked } : {}) });

/**
 * The text with a given cell's line written in, the piece's own (cells' `takeIn`, #480, #610): before an edit of a
 * cell a `from` line gave, its line becomes the piece's, and the `from` line stops asking for it. The text as it is
 * where an edit reaches the cell already (the piece's own cell, the head of a `from` line that takes one head) or
 * where no line of the piece's can stand for it (a template's copy's own cell, one head among several).
 */
export function ownLine(text: string, name: string, locked?: readonly Locked[]): string {
  if (!hasFrom(text)) return text;
  const r = takeIn(text, name, { resolve: resolver, ...(locked?.length ? { locked } : {}) });
  return 'text' in r ? r.text : text;
}

/**
 * A fragment heard alone (cells' audition, #623): its text, then the lines of a host that stands in for what it lacks
 * (a key, a voice, a meter, a card), each listed with the hole it fills; `why` where it plays nothing alone.
 */
export const auditionOf = (text: string): Audition => audition(text, { resolve: resolver });

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
  const plan = planOf(auditionOf(text).text, undefined, { resolve: resolver });
  return windowAt(plan, 0, seconds).events.flatMap((e) => (e.unheard || !(e.freq > 0) ? [] : [{ at: e.at, dur: e.dur, freq: e.freq }]));
}

/** What a compiled text plays over its first four bars (8 s at most), as a picture reads it, and its bar's length (2 s where it has no meter). */
export function heardOf(result: CompileResult): { readonly notes: HeardNote[]; readonly bar: number } {
  const bar = barSeconds(result) ?? 2;
  const events = windowAt(plan(result, codeShifts(result), result.off), 0, Math.min(8, 4 * bar)).events;
  const notes = events.flatMap((e) =>
    e.unheard || !(e.freq > 0) ? [] : [{ at: e.at, dur: e.dur, freq: e.freq, voice: e.voice, level: Math.max(...e.gains) * (e.levels[0]?.level ?? 1) }],
  );
  return { notes, bar };
}

let styled: { text: string; resolve: unknown; values: readonly number[] | null } | null = null;
/** The style a piece names (its `&style`, where it starts: cells' `styleAt`), or null where it names none; the last text's kept, as its library reads. */
export function styleOfPiece(text: string): readonly number[] | null {
  const resolve = resolver;
  if (styled?.text !== text || styled.resolve !== resolve) styled = { text, resolve, values: styleAt(text, 0, { resolve }) };
  return styled.values;
}
