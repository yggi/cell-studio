/**
 * The library's cards: every piece saved in this browser and every example, as the picker shows them.
 */
import { compileSource } from '../engine/compile';
import { pieceTime, type PieceTime } from '../engine/duration';
import { buildGraph } from '../layout/drawn';
import { pieceMeta } from '../engine/parser';
import { canonicalTags, MIDI_FILE, tagName, type TagKind } from '../engine/tags';
import { EXAMPLES, loadExample, type PresetKey } from '../examples';
import { loadMidiFile, MIDI_FILES } from '../corpus';
import { cellsFromMidi } from '../engine/midiimport';
import type { Miniature } from '../layout/miniature';
import type { SavedPiece } from '../library';

export interface Entry {
  readonly id: string;
  readonly kind: 'example' | 'saved' | 'midi';
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
  /** For saved pieces: when. */
  readonly saved?: string;
  /** How many cells its graph has. */
  readonly size?: number;
  /** How long it is: when it ends, or its cycle. */
  readonly time?: PieceTime;
}

/** A saved piece's card: its size and length worked out from its text. */
export function savedEntry(p: SavedPiece): Entry {
  const m = pieceMeta(p.source);
  const r = compileSource(p.source);
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
const loaders = Object.fromEntries(EXAMPLES.map((e) => [e.key, () => loadExample(e.key)])) as Record<PresetKey, () => Promise<string>>;

/** The examples' cards, from the index made at build time (a piece's text is fetched when it's needed). */
export const exampleEntries: readonly Entry[] = EXAMPLES.map((e) => ({
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

/** The MIDI library's cards (src/corpus.ts): a file is fetched when its wheel or the file is opened. */
export const midiEntries: readonly Entry[] = MIDI_FILES.map((m) => ({
  id: `midi:${m.key}`,
  kind: 'midi',
  title: m.title,
  description: `Bach, Das Wohltemperierte Clavier ${m.book === 1 ? 'I' : 'II'}, BWV ${m.bwv}: the MIDI file of the Mutopia Project (${m.licence}, typeset by ${m.maintainer}), to convert to cells.`,
  tags: [MIDI_FILE, 'artist:Bach', 'genre:classical', ...(m.part === 'fugue' ? ['counterpoint'] : [])],
  load: () => loadMidiFile(m.key).then((smf) => cellsFromMidi(smf, m.title, { free: false }).source),
  miniature: null,
}));

/** Whether a card matches the words searched for (lower case): in its title, its description or a tag's name. */
export const matches = (e: Entry, words: string): boolean =>
  !words || e.title.toLowerCase().includes(words) || e.description.toLowerCase().includes(words) || e.tags.some((t) => tagName(t).toLowerCase().includes(words));

/** A kind of tag the cards are filtered by (the tutorial has its own section, as the MIDI library has). */
export type FilterKind = Exclude<TagKind, 'tutorial'>;
/** The kinds of tag the cards are filtered by, in the order the filters stand. */
export const FILTER_KINDS: readonly FilterKind[] = ['genre', 'artist', 'topic'];
