// The examples' index: what the library lists (title, tags, size, time, the miniature) worked out once, at build
// time, so the app compiles nothing to show it and fetches a piece's source only when it opens.
// Used by the vite plugin (vite.config.ts: `virtual:examples-index`) and by the tests.
import { readFileSync } from 'node:fs';
import { compileSource } from '../src/engine/compile';
import { pluginKey } from '../src/engine/plugins';
import { pieceTime, type PieceTime } from '../src/engine/duration';
import { buildGraph } from '../src/engine/graph';
import { ORDER, type PresetKey } from '../src/engine/order';
import { pieceMeta } from '../src/engine/parser';
import { miniature, type Miniature } from '../src/layout/miniature';
import { bestRowOrder } from '../src/layout/physics';
import { rowsKey } from '../src/layout/start';
import { canonicalTags } from '../src/engine/tags';

export interface ExampleInfo {
  readonly key: PresetKey;
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** Its place in the tutorial (its card's rung=), or null. */
  readonly rung: number | null;
  /** How many cells its graph has. */
  readonly size: number;
  /** How long it is: when it ends, or its cycle. */
  readonly time: PieceTime;
  /** The source's length, in bytes. */
  readonly bytes: number;
  /** The plugins it carries (`pluginKey`: manifest and code): shipped with the app, so run without asking (ui/pluginTrust.ts). */
  readonly plugins: readonly string[];
  /** Its graph in miniature (src/layout/miniature.ts): the library draws it without fetching the piece. */
  readonly miniature: Miniature | null;
  /** The order its graph's rows are laid out in (layout/physics.ts: bestRowOrder), by its shape: it opens without the trials. */
  readonly rows: { readonly key: string; readonly order: 0 | 1 };
}

/** What the index says of an example that needs no layout: all but its miniature and its rows' order. */
export type ExampleMeta = Omit<ExampleInfo, 'miniature' | 'rows'>;

/** Each example's own entry, without laying it out (the examples' page reads only these): in the library's order. */
export function buildExamplesMeta(dir = 'examples'): (ExampleMeta & { source: string; graph: ReturnType<typeof buildGraph> })[] {
  return ORDER.map((key) => {
    const source = readFileSync(`${dir}/${key}.cells`, 'utf8').replace(/\n$/, '');
    const r = compileSource(source);
    const m = pieceMeta(source);
    const graph = buildGraph(r);
    return {
      key,
      title: m?.title ?? key,
      description: m?.description ?? '',
      tags: canonicalTags(m?.tags ?? []),
      rung: m?.rung ?? null,
      size: graph.nodes.filter((n) => !n.petalOf && !n.cell.note).length,
      time: pieceTime(r),
      bytes: Buffer.byteLength(source),
      plugins: [...r.plugins.values()].map(pluginKey),
      source,
      graph,
    };
  });
}

/** Every example, in the library's order, from examples/<key>.cells (as the app reads them: no trailing newline). */
export function buildExamplesIndex(dir = 'examples'): ExampleInfo[] {
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
