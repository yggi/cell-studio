/**
 * Completion after `from` in the code view (#624, #587's second rung): the fragment ids a line could take, those whose
 * signature names the head the line gives first (`&bassV from …`: the voices headed `&bassV`), then the rest, each group
 * ranked by its distance to the piece's style (cells' `fragmentDistance`; the centre of style space where the piece names
 * none), ties by id. Pure.
 */
import { AXES, catalogue, type CatalogueEntry, type StylePoint } from '@yggi/cells';
import { fragmentDistance } from '@yggi/cells/repository';
import type { Suggestion } from './suggest';

/** Where a line asks for a fragment: the caret just after `from ` and the id typed so far. */
export interface FromContext {
  /** Where the id begins, 0-based in the line. */
  readonly start: number;
  /** What is typed of it. */
  readonly partial: string;
  /** The names the line gives, bare (`bassV`). */
  readonly names: readonly string[];
}

/** The line up to the caret (`before`) asks for a fragment's id, or null: `&x, &y from gm_k|`, not a signature, not a comment. */
export function fromContext(before: string): FromContext | null {
  if (before.includes('#')) return null;
  const m = /^(\s*)((?:\*|&[A-Za-z_]\w*(?:=\w+)?)(?:\s*,\s*&[A-Za-z_]\w*(?:=\w+)?)*)(?:\s+[^\s]+)*?\s+from\s+([A-Za-z_][\w/]*)?$/.exec(before);
  if (!m) return null;
  const partial = m[3] ?? '';
  const names = [...m[2]!.matchAll(/&([A-Za-z_]\w*)/g)].map((n) => n[1]!);
  return { start: before.length - partial.length, partial, names };
}

/** A fragment offered after `from`: its id, its first facet and how far it is from the piece's style. */
export interface FragmentSuggestion extends Suggestion {
  readonly kind: 'fragment';
  readonly facet: string | null;
  readonly distance: number;
  /** Its signature names a head the line gives. */
  readonly heads: boolean;
}

const CENTRE: StylePoint = Object.fromEntries(AXES.map((a) => [a.name, (a.range[0] + a.range[1]) / 2]));

/** A point on the axes, as cells' `styleAt` gives one (by `AXES`' order). */
export const pointOf = (values: readonly number[]): StylePoint => Object.fromEntries(AXES.map((a, i) => [a.name, values[i] ?? (a.range[0] + a.range[1]) / 2]));

const headsOf = (e: CatalogueEntry) => new Set((e.signature?.names ?? []).map((n) => n.slice(1)));

/** The ids `ctx` could complete to, best first, at most `limit`; `style` the piece's (the centre where it names none). */
export function suggestFragments(ctx: FromContext, style: StylePoint | null, limit = 12, entries: readonly CatalogueEntry[] = catalogue()): FragmentSuggestion[] {
  const point = style ?? CENTRE;
  const typed = ctx.partial.toLowerCase();
  const offered = entries.flatMap((e) => {
    const id = e.id.toLowerCase();
    // (what is typed: the id's start first, anywhere in it after)
    const match = !typed || id.startsWith(typed) ? 0 : id.includes(typed) ? 1 : -1;
    if (match < 0) return [];
    const facet = e.facets[0] ?? null;
    const distance = fragmentDistance(e, point, {}, facet ?? undefined);
    const heads = ctx.names.some((n) => headsOf(e).has(n));
    return [{ e, match, facet, distance, heads }];
  });
  offered.sort((a, b) => a.match - b.match || Number(b.heads) - Number(a.heads) || a.distance - b.distance || (a.e.id < b.e.id ? -1 : a.e.id > b.e.id ? 1 : 0));
  return offered.slice(0, limit).map(({ e, facet, distance, heads }) => ({
    text: e.id,
    label: e.id,
    kind: 'fragment',
    detail: [facet, Number.isFinite(distance) ? distance.toFixed(2) : null].filter(Boolean).join(' · '),
    facet,
    distance,
    heads,
  }));
}
