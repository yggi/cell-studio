/**
 * A selection turned into a fragment (#626, rung S5 of #621), around cells' `extract` (C4): the id it is offered under,
 * the facet it is prefilled with, and a piece written out for export, its takes of the person's own fragments in their
 * place, so a shared file plays anywhere. Pure: the dialog and the file save call it.
 */
import { references } from '@yggi/cells/engine/references';
import { expand, signatureOf } from '@yggi/cells/engine/use';
import { splitComment } from '@yggi/cells/engine/edit';
import { readFrom } from '@yggi/cells/engine/parser/use';
import type { Resolve } from '@yggi/cells/engine/program';
import type { CatalogueEntry } from '@yggi/cells/repository/catalogue';
import { createRecogniser } from '@yggi/cells/repository/recognise';
import { createRepository, type Fragment, type LearnedLayer, type Repository } from '@yggi/cells/repository/fragments';
import { canonicalText, fileFragment, type Filed, type Filing } from '@yggi/cells/repository/learned';

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

/** Each seed's repository, and the same seed less its texts of `from` lines alone (`fileOwn`). */
const repositories = new WeakMap<readonly Fragment[], { readonly all: Repository; readonly sighted: readonly Fragment[]; readonly blind: Repository }>();

/**
 * A fragment filed as the person's own (cells' `fileFragment`), under the id it asks for unless the library holds its
 * text already. Guarded until cells reads a text of `from` lines alone as itself (yggi/cells#941): cells reads every such
 * text as the same (its `canonicalText` is ""), so at v0.30.0 one would be filed as the seed `stick_count` and the piece
 * would take that. Such a text is matched against the seed's other texts, and against a seed of `from` lines alone only
 * where it is written the same.
 */
export function fileOwn(seed: readonly Fragment[], layer: LearnedLayer, filing: Filing): Filed {
  let kept = repositories.get(seed);
  if (!kept) {
    const sighted = seed.filter((f) => canonicalText(f.text) !== '');
    kept = { all: createRepository(seed), sighted, blind: createRepository(sighted) };
    repositories.set(seed, kept);
  }
  if (canonicalText(filing.text) !== '') return fileFragment(kept.all, layer, filing);
  const written = filing.text.trim();
  const same = seed.find((f) => canonicalText(f.text) === '' && f.text.trim() === written);
  return fileFragment(same ? createRepository([...kept.sighted, same]) : kept.blind, layer, filing);
}
