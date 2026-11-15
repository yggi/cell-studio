/**
 * What the code view shows of a piece's references to fragments (#624, rung S3 of #621): each `from` id as a link (cells'
 * `references`), a fragment's card on hover (its facet, signature, first line of prose, what it takes, how many pieces
 * take it), and a given name's chain (the compile's `origins`: the fragment that defines it, each line that took it on).
 * Pure: the editor paints and places it.
 */
import { references, type Reference } from '@yggi/cells/engine/references';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { catalogue, type CatalogueEntry } from '@yggi/cells/repository/catalogue';
import type { CompileResult } from '@yggi/cells/engine/program';
import { splitComment } from '@yggi/cells/engine/edit';
import { readFrom } from '@yggi/cells/engine/parser/use';

/** The facets the library names, in the order its entries first name them: the order a facet's colour is read in. */
export const FACETS: readonly string[] = [...new Set(catalogue().flatMap((e) => e.facets))];

let taken: Map<string, number> | undefined;
/** How many pieces (examples) and fragments take each id, counted once, the first time it is asked. */
function takenBy(id: string): number {
  if (!taken) {
    taken = new Map();
    const texts = [...Object.values(EXAMPLES).map((e) => e.source), ...catalogue().map((e) => e.text)];
    for (const t of texts) for (const ref of new Set(references(t).map((r) => r.id))) taken.set(ref, (taken.get(ref) ?? 0) + 1);
  }
  return taken.get(id) ?? 0;
}

/** A fragment as its hover card shows it; null for an id the library doesn't hold. */
export interface FragmentCard {
  readonly id: string;
  readonly facets: readonly string[];
  /** Its signature line as written, or null for a collection. */
  readonly signature: string | null;
  /** The first line of its prose, or null. */
  readonly prose: string | null;
  /** The ids it takes from. */
  readonly takes: readonly string[];
  /** How many pieces and fragments of the library take it. */
  readonly takenBy: number;
}

const entry = (id: string): CatalogueEntry | undefined => catalogue().find((e) => e.id === id);

export function fragmentCard(id: string): FragmentCard | null {
  const e = entry(id);
  if (!e) return null;
  const signature = e.text.split('\n').find((l) => readFrom(splitComment(l)[0].trim())?.kind === 'signature') ?? null;
  const prose =
    e.prose
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith('#') && !l.startsWith('```')) ?? null;
  return { id, facets: e.facets, signature: signature?.trim() ?? null, prose, takes: e.takes, takenBy: takenBy(id) };
}

/** A `from` line's id where it is written, with its fragment's first facet (null where the library doesn't hold it). */
export interface Link {
  readonly line: number;
  /** 0-based, within the line. */
  readonly from: number;
  readonly to: number;
  readonly id: string;
  readonly facet: string | null;
  readonly ref: Reference;
}

/** Every reference of a text, as a link to paint (#624). */
export function linksOf(text: string): Link[] {
  return references(text).map((ref) => ({
    line: ref.span.line,
    from: ref.span.col - 1,
    to: ref.span.col - 1 + ref.span.len,
    id: ref.id,
    facet: entry(ref.id)?.facets[0] ?? null,
    ref,
  }));
}

/** One step of a given name's chain, as its hover card says it: where, and on which line. */
export interface ChainStep {
  /** The fragment, or null for the piece's own line. */
  readonly id: string | null;
  readonly line: number;
}

/**
 * A given name's chain (`&hh`): the fragment that defines it first, then each line that took it on, out to the piece's
 * own `from` line; null for a name no `from` line gave.
 */
export function chainOf(result: CompileResult, name: string): readonly ChainStep[] | null {
  const origin = result.origins?.get(name);
  return origin?.length ? [...origin].reverse() : null;
}
