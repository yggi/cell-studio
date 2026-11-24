/**
 * A selection turned into a fragment (#626, rung S5 of #621), around cells' `extract` (C4): the id it is offered under,
 * the facet it is prefilled with, and a piece written out for export, its takes of the person's own fragments in their
 * place, so a shared file plays anywhere. Pure: the dialog and the file save call it.
 */
import { type CatalogueEntry, createRecogniser, expand, type Fragment, references, type Resolve, signatureOf } from '@yggi/cells';
import { splitComment } from '@yggi/cells/edit';
import { readFrom } from '@yggi/cells/repository';

/** The id a fragment is offered under: `my_` and its first head, then ` 2`, ` 3` … while the library holds it. */
export function idFor(heads: readonly string[], taken: ReadonlySet<string>): string {
  const base = `my_${(heads[0] ?? '&fragment').replace(/^&/, '')}`;
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}_${n}`;
  return id;
}

const recogniser = createRecogniser();

/**
 * The facet a fragment is prefilled with: the facet of the fragment recognition finds it to be (cells' `recognise`), else
 * of the fragment its head's own line takes (`&bassline from root_bass &harm`: bass), else of any fragment it takes; null
 * where none says (the person picks).
 */
export function facetFor(fragment: string, entries: readonly CatalogueEntry[]): string | null {
  const byId = new Map(entries.map((e) => [e.id, e]));
  try {
    const found = recogniser.recognise(fragment, entries as readonly Fragment[])[0];
    const facet = found && byId.get(found.fragment.id)?.facets[0];
    if (facet) return facet;
  } catch {
    // (a text recognition can't read: what it takes says)
  }
  const head = signatureOf(fragment)?.names[0];
  const refs = references(fragment);
  const own = refs.find((r) => head && r.names?.includes(head));
  for (const r of own ? [own, ...refs] : refs) {
    const facet = byId.get(r.id)?.facets[0];
    if (facet) return facet;
  }
  return null;
}

/**
 * A piece as it is exported (#626): each line that takes one of the person's own fragments (`mine`, by id) written out in
 * its place, so the file compiles with the seed library alone. A line that takes it as it was extracted (its heads by
 * their own names, its main argument the fragment's main parameter, no other argument) becomes the fragment's lines
 * again, as they were before it was filed; any other take, the whole piece written out (cells' `expand`). A piece that
 * takes none is returned as it is.
 */
export function exportable(code: string, mine: ReadonlyMap<string, string>, resolve: Resolve): string {
  const takes = references(code).filter((r) => mine.has(r.id));
  if (!takes.length) return code;
  const lines = code.split('\n');
  const inline = new Map<number, string[]>();
  for (const r of takes) {
    const text = mine.get(r.id)!;
    const sig = signatureOf(text);
    const asWritten =
      sig !== null &&
      !sig.optional.length &&
      r.args === null &&
      r.names !== null &&
      r.names.join() === sig.names.join() &&
      (r.takes ?? r.names).join() === r.names.join() &&
      (r.main ?? null) === (sig.main ?? null);
    if (!asWritten) return expand(code, resolve);
    inline.set(
      r.span.line - 1,
      text.split('\n').filter((l) => readFrom(splitComment(l)[0].trim())?.kind !== 'signature'),
    );
  }
  return lines.flatMap((l, i) => inline.get(i) ?? [l]).join('\n');
}
