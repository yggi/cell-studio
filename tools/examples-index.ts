// The examples' index: what the library lists (title, tags, size, time, the miniature) worked out once, at build
// time, so the app compiles nothing to show it and fetches a piece's source only when it opens.
// Used by the vite plugin (vite.config.ts: `virtual:examples-index`) and by the tests.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileSource } from '@yggi/cells/engine/compile';
import { pieceTime, type PieceTime } from '@yggi/cells/engine/duration';
import { buildGraph } from '../src/layout/drawn';
import { ORDER, type PresetKey } from '@yggi/cells/engine/order';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { readPiece } from '@yggi/cells/engine/piecefile';
import { miniature, type Miniature } from '../src/layout/miniature';
import { isSide, sideless } from '../src/layout/side';
import { bestRowOrder } from '../src/layout/physics';
import { rowsKey } from '../src/layout/start';
import { TOWER_LAYOUT } from '../src/layout/options';
import { towerSetup } from '../src/ui/towerSetup';
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
  /** The start its graph is laid out from (layout/physics.ts: bestRowOrder; its rows' order and jitter, start.ts startCode), by its shape: it opens without the trials. */
  readonly rows: { readonly key: string; readonly order: number };
  /** The same for the tower layout (ui/towerSetup.ts), its graph's shape with its sockets: it opens there without the trials too. */
  readonly towerRows: { readonly key: string; readonly order: number };
}

/** What the index says of an example that needs no layout: all but its miniature and its starts. */
export type ExampleMeta = Omit<ExampleInfo, 'miniature' | 'rows' | 'towerRows'>;

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
    // (the tower layout's, as the app lays it: its graph with its sockets, its options; physics.ts rowOrderFor keys it so)
    const tower = towerSetup(compileSource(source), graph);
    const drawn = sideless({ ...tower.model, nodes: tower.model.nodes.filter((n) => !n.petalOf) });
    const towerRows = { key: rowsKey(drawn), order: bestRowOrder(drawn, { ...TOWER_LAYOUT, ...tower.options }) };
    return { ...meta, miniature: miniature(source, order), rows: { key: rowsKey(graph), order }, towerRows };
  });
}

/** The index as module source (JSON can't hold the Infinity of an astronomically long cycle). */
export function examplesIndexModule(index: readonly ExampleInfo[]): string {
  const json = JSON.stringify(index, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? '__Infinity__' : v));
  return `export default ${json.replace(/"__Infinity__"/g, 'Infinity')};`;
}

/** What the index is made of besides the examples: this file and the layout's code (the cells package is in the lockfile). */
const INPUTS = ['tools/examples-index.ts', 'src/layout', 'src/ui/towerSetup.ts', 'src/ui/sections.ts', 'src/ui/theme.ts', 'package-lock.json'];

/** The files under a path (a file, or a folder's code walked, tests left out), sorted. */
function filesOf(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path)
    .sort()
    .flatMap((f) => (f.endsWith('.test.ts') ? [] : statSync(join(path, f)).isDirectory() ? filesOf(join(path, f)) : f.endsWith('.ts') ? [join(path, f)] : []));
}

/** A hash of everything the index is made from (`INPUTS`, under `root`, and the examples in `dir`): the same, the index is too. */
export function indexKey(dir = EXAMPLES_DIR, root = '.'): string {
  const h = createHash('sha256');
  // (each by its name where it is, not the whole path: the same examples elsewhere are the same index)
  const examples = existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .sort()
    : [];
  const files = [...INPUTS.flatMap((p) => filesOf(join(root, p)).map((f) => ({ name: f.slice(root.length), path: f }))), ...examples.map((f) => ({ name: f, path: join(dir, f) }))];
  for (const { name, path } of files) h.update(name).update('\0').update(readFileSync(path)).update('\0');
  return h.digest('hex').slice(0, 16);
}

/**
 * The index as module source, kept in `cache` by what it is made from (indexKey): choosing each example's starts takes
 * most of a minute, and a dev server or a build starts often with nothing it depends on changed. `make`: the module,
 * when it isn't kept (a test's stand-in).
 */
export function cachedExamplesIndexModule({
  cache = 'node_modules/.cache/cell-studio',
  dir = EXAMPLES_DIR,
  make = () => examplesIndexModule(buildExamplesIndex(dir)),
}: { cache?: string; dir?: string; make?: () => string } = {}): string {
  const file = join(cache, `examples-index-${indexKey(dir)}.js`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const module = make();
  mkdirSync(cache, { recursive: true });
  writeFileSync(file, module);
  return module;
}
