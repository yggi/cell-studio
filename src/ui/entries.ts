/**
 * The library's cards: every piece saved in this browser and every example, as the picker shows them.
 */
import { compileSource } from '../engine/compile';
import { pieceTime, type PieceTime } from '../engine/duration';
import { buildGraph } from '../engine/graph';
import { pieceMeta } from '../engine/parser';
import { canonicalTags } from '../engine/tags';
import { EXAMPLES, loadExample, type PresetKey } from '../examples';
import type { SavedPiece } from '../library';

export interface Entry {
  readonly id: string;
  readonly kind: 'example' | 'saved';
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Its text: a saved piece has it; an example is fetched when needed (`load`). */
  readonly source?: string;
  readonly load?: () => Promise<string>;
  readonly layout?: Readonly<Record<string, readonly [number, number]>> | null;
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
    source: p.source,
    saved: p.saved,
    size: buildGraph(r).nodes.filter((n) => !n.petalOf && !n.cell.note).length,
    time: r.ok ? pieceTime(r) : undefined,
  };
}

// (one loader each, the same every time: a card's picture is fetched once)
const loaders = Object.fromEntries(EXAMPLES.map((e) => [e.key, () => loadExample(e.key)])) as Record<PresetKey, () => Promise<string>>;

/** The examples' cards, from the index made at build time (a piece's text is fetched when it's needed). */
export const exampleEntries: readonly Entry[] = EXAMPLES.map((e) => ({
  id: `example:${e.key}`,
  kind: 'example',
  title: e.title,
  description: e.description,
  tags: e.tags,
  load: loaders[e.key],
  size: e.size,
  time: e.time,
}));
