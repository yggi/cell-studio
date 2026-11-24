/**
 * The library's cards: every piece saved in this browser and every example, as the picker shows them, and every
 * fragment (the seed's and the person's own, #625), as its map shows them: one card, one details sheet, one search.
 */
import { compilePiece } from '../compile';
import { pieceTime, type PieceTime } from '@yggi/cells/inspect';
import { type CatalogueEntry, cellsFromMidi, pieceMeta } from '@yggi/cells';
import { canonicalTags, MIDI_FILE, type TagKind, tagName } from '@yggi/cells/library';
import { buildGraph } from '../layout/drawn';
import { EXAMPLE_INDEX, loadExample, type ExampleKey } from '../examples';
import { creditOf, loadMidiFile, MIDI_FILES, MIDI_SETS, type Credit } from '../corpus';
import type { Miniature } from '../layout/miniature';
import { textOf, type SavedPiece } from '../library';

export interface Entry {
  readonly id: string;
  readonly kind: 'example' | 'saved' | 'midi' | 'fragment';
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Its tier of the tutorial (its card's tier=), if it is one of its pieces. */
  readonly tier?: number | null;
  /** Its text: a saved piece has it; an example's is fetched when it opens (`load`); a MIDI file's, its notes as cells
   * (its miniature: it opens as the file). */
  readonly source?: string;
  readonly load?: () => Promise<string>;
  /** An example's graph in miniature, from the index (a saved piece's is worked out from its text). */
  readonly miniature?: Miniature | null;
  /** A file of the MIDI library: where it came from and on what terms (its details show it). */
  readonly credit?: Credit;
  /** A file of the MIDI library: its collection's name (its cell in the library, and one of its tags). */
  readonly collection?: string;
  /** For saved pieces: when. */
  readonly saved?: string;
  /** How many cells its graph has. */
  readonly size?: number;
  /** How long it is: when it ends, or its cycle. */
  readonly time?: PieceTime;
  /** A fragment: the library's entry (its text, facets, signature, what it takes); its tags are its facets. */
  readonly fragment?: CatalogueEntry;
}

/** Prose as plain words: its first paragraph, links as their words, no emphasis or code marks. */
export const firstParagraph = (prose: string): string =>
  (
    prose
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p && !p.startsWith('#') && !p.startsWith('```')) ?? ''
  )
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    .replace(/\s*\n\s*/g, ' ');

/** A fragment's card (#625): its id for its title, its prose's first paragraph, its facets for its tags. */
export const fragmentEntry = (e: CatalogueEntry): Entry => ({
  id: `fragment:${e.id}`,
  kind: 'fragment',
  title: e.id,
  description: firstParagraph(e.prose),
  tags: e.facets,
  fragment: e,
});

/** A saved piece's card: its size and length worked out from its text (a file's: its cells block). */
export function savedEntry(p: SavedPiece): Entry {
  const m = pieceMeta(p.source);
  const r = compilePiece(textOf(p.source));
  return {
    id: `saved:${p.id}`,
    kind: 'saved',
    title: p.title,
    description: m?.description ?? '',
    tags: canonicalTags(m?.tags ?? []),
    tier: m?.tier ?? null,
    source: p.source,
    saved: p.saved,
    size: buildGraph(r).nodes.filter((n) => !n.petalOf && n.cell && !n.cell.note).length,
    time: r.ok ? pieceTime(r) : undefined,
  };
}

// (one loader each, the same every time: a piece is fetched once)
const loaders = Object.fromEntries(EXAMPLE_INDEX.map((e) => [e.key, () => loadExample(e.key)])) as Record<ExampleKey, () => Promise<string>>;

/** The examples' cards, from the index made at build time (a piece's text is fetched when it's needed). */
export const exampleEntries: readonly Entry[] = EXAMPLE_INDEX.map((e) => ({
  id: `example:${e.key}`,
  kind: 'example',
  title: e.title,
  description: e.description,
  tags: e.tags,
  tier: e.tier,
  load: loaders[e.key],
  miniature: e.miniature,
  size: e.size,
  time: e.time,
}));

/** Pieces in more than one voice that imitate each other: counterpoint (a fugue, an invention, a sinfonia). */
const IMITATIVE = /Fug|Invention|Sinfonia/i;

/** The MIDI library's cards (src/corpus.ts), each in its collection: a file is fetched when its wheel or the file is
 * opened. */
export const midiEntries: readonly Entry[] = MIDI_FILES.map((m) => {
  const collection = MIDI_SETS.find((s) => s.id === m.set)!.title;
  return {
    id: `midi:${m.key}`,
    kind: 'midi',
    title: m.title,
    description: `Bach, ${collection}, ${m.opus}${m.tonality ? `, ${m.tonality}` : ''}: a MIDI file from the Mutopia Project, to play as it is or convert to cells.`,
    credit: creditOf(m),
    collection,
    tags: [collection, MIDI_FILE, 'artist:Bach', 'genre:classical', ...(IMITATIVE.test(m.original) ? ['counterpoint'] : [])],
    load: () => loadMidiFile(m.key).then((smf) => cellsFromMidi(smf, m.title, { free: false }).source),
  };
});

/** Whether a card matches the words searched for (lower case): in its title, its description or a tag's name. */
export const matches = (e: Entry, words: string): boolean =>
  !words || e.title.toLowerCase().includes(words) || e.description.toLowerCase().includes(words) || e.tags.some((t) => tagName(t).toLowerCase().includes(words));

/** A kind of tag the cards are filtered by (the tutorial has its own section, as the MIDI library has). */
export type FilterKind = Exclude<TagKind, 'tutorial'>;
/** The kinds of tag the cards are filtered by, in the order the filters stand. */
export const FILTER_KINDS: readonly FilterKind[] = ['genre', 'artist', 'topic'];
