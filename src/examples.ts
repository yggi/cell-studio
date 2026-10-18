/**
 * The examples as the app sees them: an index (title, tags, size, time: made at build time, see
 * tools/examples-index.ts) to list them by, and each piece's file, fetched when it is needed: a piece file
 * (`examples/<key>.md` in cells: its title, tags and tier in the frontmatter, the piece in a cells block; decision 047),
 * which the open piece keeps whole (ui/state/piece.svelte.ts: the editor shows its text).
 * (The tests read every text at once through engine/presets.ts.)
 */
import built from 'virtual:examples-index';
import type { ExampleInfo } from '../tools/examples-index';
import type { PresetKey } from '@yggi/cells/engine/order';
import royal from '@yggi/cells/examples/royal.md?raw';

export type { ExampleInfo };
export type { PresetKey };

/** Every example, in the library's order. */
export const EXAMPLES = built as readonly ExampleInfo[];

/** The piece the app starts with is in the first bundle: nothing to wait for. */
export const FIRST: PresetKey = 'royal';
export const FIRST_FILE = royal;

const files = import.meta.glob('/node_modules/@yggi/cells/examples/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const loaded = new Map<PresetKey, Promise<string>>();

/** An example's file; each is its own chunk, fetched on first use. */
export function loadExample(key: PresetKey): Promise<string> {
  let p = loaded.get(key);
  if (!p) {
    const load = files[`/node_modules/@yggi/cells/examples/${key}.md`];
    if (!load) return Promise.reject(new Error(`examples/${key}.md is missing`));
    p = load();
    p.catch(() => loaded.delete(key)); // offline, a failed fetch: try again next time
    loaded.set(key, p);
  }
  return p;
}
