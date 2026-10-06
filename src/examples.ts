/**
 * The examples as the app sees them: an index (title, tags, size, time: made at build time, see
 * tools/examples-index.ts) to list them by, and each piece's source, fetched when it is needed.
 * (The tests read every source at once through engine/presets.ts.)
 */
import built from 'virtual:examples-index';
import type { ExampleInfo } from '../tools/examples-index';
import type { PresetKey } from './engine/order';
import royal from '../examples/royal.cells?raw';

export type { ExampleInfo };
export type { PresetKey };

/** Every example, in the library's order. */
export const EXAMPLES = built as readonly ExampleInfo[];

/** The piece the app starts with is in the first bundle: nothing to wait for. */
export const FIRST: PresetKey = 'royal';
export const FIRST_SOURCE = royal.replace(/\n$/, '');

const files = import.meta.glob('/examples/*.cells', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const loaded = new Map<PresetKey, Promise<string>>();

/** An example's source; each file is its own chunk, fetched on first use. */
export function loadExample(key: PresetKey): Promise<string> {
  let p = loaded.get(key);
  if (!p) {
    const load = files[`/examples/${key}.cells`];
    if (!load) return Promise.reject(new Error(`examples/${key}.cells is missing`));
    p = load().then((s) => s.replace(/\n$/, ''));
    p.catch(() => loaded.delete(key)); // offline, a failed fetch: try again next time
    loaded.set(key, p);
  }
  return p;
}
