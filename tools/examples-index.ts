// The examples' index: what the library lists (title, tags, size, time, the miniature) worked out once, at build
// time, so the app compiles nothing to show it and fetches a piece's source only when it opens.
// Used by the vite plugin (vite.config.ts: `virtual:examples-index`) and by the tests.
import { readFileSync } from 'node:fs';
import { compileSource } from '../src/engine/compile';
import { pieceTime, type PieceTime } from '../src/engine/duration';
import { buildGraph } from '../src/engine/graph';
import { ORDER, type PresetKey } from '../src/engine/order';
import { pieceMeta } from '../src/engine/parser';
import { miniature, type Miniature } from '../src/layout/miniature';
import { bestRowOrder, rowsKey } from '../src/layout/physics';
import { canonicalTags } from '../src/engine/tags';

export interface ExampleInfo {
  readonly key: PresetKey;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** How many cells its graph has. */
  readonly size: number;
  /** How long it is: when it ends, or its cycle. */
  readonly time: PieceTime;
  /** The source's length, in bytes. */
  readonly bytes: number;
  /** Its graph in miniature (src/layout/miniature.ts): the library draws it without fetching the piece. */
  readonly miniature: Miniature | null;
  /** The order its graph's rows are laid out in (layout/physics.ts: bestRowOrder), by its shape: it opens without the trials. */
  readonly rows: { readonly key: string; readonly order: number };
}

/** Every example, in the library's order, from examples/<key>.cells (as the app reads them: no trailing newline). */
export function buildExamplesIndex(dir = 'examples'): ExampleInfo[] {
  return ORDER.map((key) => {
    const source = readFileSync(`${dir}/${key}.cells`, 'utf8').replace(/\n$/, '');
    const r = compileSource(source);
    const m = pieceMeta(source);
    const graph = buildGraph(r);
    const order = bestRowOrder(graph);
    return {
      key,
      title: m?.title ?? key,
      description: m?.description ?? '',
      tags: canonicalTags(m?.tags ?? []),
      size: graph.nodes.filter((n) => !n.petalOf && !n.cell.note).length,
      time: pieceTime(r),
      bytes: Buffer.byteLength(source),
      miniature: miniature(source, order),
      rows: { key: rowsKey(graph), order },
    };
  });
}

/** The index as module source (JSON can't hold the Infinity of an astronomically long cycle). */
export function examplesIndexModule(index: readonly ExampleInfo[]): string {
  const json = JSON.stringify(index, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__Infinity__' : v));
  return `export default ${json.replace(/"__Infinity__"/g, 'Infinity')};`;
}
