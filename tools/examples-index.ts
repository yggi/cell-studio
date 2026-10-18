// The examples' index: what the library lists (title, tags, size, time, the miniature) worked out once, at build
// time, so the app compiles nothing to show it and fetches a piece's source only when it opens.
// Used by the vite plugin (vite.config.ts: `virtual:examples-index`) and by the tests.
import { readFileSync } from 'node:fs';
import { compileSource } from '@yggi/cells/engine/compile';
import { pieceTime, type PieceTime } from '@yggi/cells/engine/duration';
import { buildGraph } from '../src/layout/drawn';
import { ORDER, type PresetKey } from '@yggi/cells/engine/order';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { readPiece } from '@yggi/cells/engine/piecefile';
import { miniature, type Miniature } from '../src/layout/miniature';
import { isSide } from '../src/layout/side';
import { bestRowOrder } from '../src/layout/physics';
import { rowsKey } from '../src/layout/start';
import { canonicalTags } from '@yggi/cells/engine/tags';

export interface ExampleInfo {
  readonly key: PresetKey;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Its tier of the tutorial (its file's tier:), or null. */
  readonly tier: number | null;
  /** How many cells its graph has. */
  readonly size: number;
  /** How long it is: when it ends, or its cycle. */
  readonly time: PieceTime;
  /** Its text's length (its file's cells block), in bytes. */
  readonly bytes: number;
  /** Its graph in miniature (src/layout/miniature.ts): the library draws it without fetching the piece. */
  readonly miniature: Miniature | null;
  /** The order its graph's rows are laid out in (layout/physics.ts: bestRowOrder), by its shape: it opens without the trials. */
  readonly rows: { readonly key: string; readonly order: 0 | 1 };
}

/** What the index says of an example that needs no layout: all but its miniature and its rows' order. */
export type ExampleMeta = Omit<ExampleInfo, 'miniature' | 'rows'>;

/** Where the cells package keeps its examples, one piece file each (`<key>.md`, decision 047). */
export const EXAMPLES_DIR = 'node_modules/@yggi/cells/examples';

/** An example's file (its title, tags and tier in the frontmatter, the piece in a cells block) and its text, what compiles. */
export function readExample(key: string, dir = EXAMPLES_DIR): { file: string; text: string } {
  const file = readFileSync(`${dir}/${key}.md`, 'utf8');
  const piece = readPiece(file);
  if ('problems' in piece) throw new Error(`examples/${key}.md: ${piece.problems.map((p) => `line ${p.line}: ${p.message}`).join('; ')}`);
  return { file, text: piece.text };
}

/** Each example's own entry, without laying it out (the examples' page reads only these): in the library's order. */
export function buildExamplesMeta(dir = EXAMPLES_DIR): (ExampleMeta & { source: string; graph: ReturnType<typeof buildGraph> })[] {
  return ORDER.map((key) => {
    const { file, text: source } = readExample(key, dir);
    const r = compileSource(source);
    const m = pieceMeta(file);
    const graph = buildGraph(r);
    return {
      key,
      title: m?.title ?? key,
      description: m?.description ?? '',
      tags: canonicalTags(m?.tags ?? []),
      tier: m?.tier ?? null,
      size: graph.nodes.filter((n) => !n.petalOf && n.cell && !isSide(n)).length,
      time: pieceTime(r),
      bytes: Buffer.byteLength(source),
      source,
      graph,
    };
  });
}

/** Every example, in the library's order, from the cells package's examples/<key>.md (its text as the app reads it: the file's cells block). */
export function buildExamplesIndex(dir = EXAMPLES_DIR): ExampleInfo[] {
  return buildExamplesMeta(dir).map(({ source, graph, ...meta }) => {
    const order = bestRowOrder(graph);
    return { ...meta, miniature: miniature(source, order), rows: { key: rowsKey(graph), order } };
  });
}

/** The index as module source (JSON can't hold the Infinity of an astronomically long cycle). */
export function examplesIndexModule(index: readonly ExampleInfo[]): string {
  const json = JSON.stringify(index, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__Infinity__' : v));
  return `export default ${json.replace(/"__Infinity__"/g, 'Infinity')};`;
}
