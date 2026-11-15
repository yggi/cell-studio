/**
 * What a client keeps of a song a host of the session's version 2 plays (#525, rung 1): the bars' conducts, the
 * scores told, the fragments they lock that came with them, the band the host names, and the finale. Rung 1 keeps them
 * and plays nothing from them; playing each bar from the score that states it is rung 2.
 *
 * A conduct is kept by its bar (one sent again for the same bar replaces it); a score is kept in the order told, a
 * later one stating some bars again (a bar composed otherwise than foreseen has its section scored again from it), as
 * `follow.ts` keeps version 1's texts. Each is bounded, so a long session keeps the latest only.
 */
import type { Conduct, Fragment, Locked, Score } from './protocol-v2';

export interface Scored {
  /** The conducts kept, by bar, ascending. */
  readonly conducts: readonly Conduct[];
  /** The scores kept, in the order told. */
  readonly scores: readonly Score[];
  /** The fragments the welcome and the scores carried, each once by its id and hash, in the order first told. */
  readonly fragments: readonly Fragment[];
  /** The default band the host plays, as its welcome names it (shown, never played); null for none. */
  readonly band: Locked | null;
  /** The song's last bar, once the host composed its finale. */
  readonly finale: number | null;
}

export const NOTHING_SCORED: Scored = { conducts: [], scores: [], fragments: [], band: null, finale: null };

/** How many conducts are kept: 64 bars, minutes of music at any tempo, far more than a host sends ahead (a beat before each bar). */
export const CONDUCTS_KEPT = 64;
/** How many scores are kept: 16, several sections and their rewrites (a host sends a score four bars and a beat before its section). */
export const SCORES_KEPT = 16;
/** How many fragments are kept: 64, more than the scores kept lock. */
export const FRAGMENTS_KEPT = 64;

/** Fragments added to those kept, each once by its id and hash. */
function withFragments(kept: readonly Fragment[], more: readonly Fragment[]): readonly Fragment[] {
  const named = new Set(kept.map((f) => `${f.id}\n${f.hash}`));
  const added = more.filter((f) => !named.has(`${f.id}\n${f.hash}`) && named.add(`${f.id}\n${f.hash}`));
  return added.length ? [...kept, ...added].slice(-FRAGMENTS_KEPT) : kept;
}

/** A song followed further: a bar's conduct. */
export function withConduct(s: Scored, conduct: Conduct): Scored {
  const conducts = [...s.conducts.filter((c) => c.bar !== conduct.bar), conduct].sort((a, b) => a.bar - b.bar);
  return { ...s, conducts: conducts.slice(-CONDUCTS_KEPT) };
}

/** A song followed further: a section's score, and the fragments it carries. */
export function withScore(s: Scored, score: Score): Scored {
  return { ...s, scores: [...s.scores, score].slice(-SCORES_KEPT), fragments: withFragments(s.fragments, score.fragments) };
}

/** What a welcome says of the song: its conducts and scores (none while stopped), its fragments and band. */
export function welcomed(song: { readonly conducts: readonly Conduct[]; readonly scores: readonly Score[] } | null, fragments: readonly Fragment[], band: Locked | null): Scored {
  let s: Scored = { ...NOTHING_SCORED, band, fragments: withFragments([], fragments) };
  for (const c of song?.conducts ?? []) s = withConduct(s, c);
  for (const score of song?.scores ?? []) s = withScore(s, score);
  return s;
}
