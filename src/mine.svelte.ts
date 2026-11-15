/**
 * A person's own fragments (#626, rung S5 of #621): cells' learned layer (decision 048), the fragments filed here kept in
 * this browser's IndexedDB, and every compile of the app resolving `from` lines through the seed library and them
 * (`resolverOf(layer)`). A layer is read once at start; filing writes it back. Where IndexedDB isn't there (a test, a
 * private window that refuses it) the layer lives as long as the page.
 */
import { EMPTY_LAYER, type LearnedLayer } from '@yggi/cells/repository/fragments';
import { fileFragment, type Filing } from '@yggi/cells/repository/learned';
import { LIBRARY, resolverOf } from '@yggi/cells/repository/library';
import { createRepository } from '@yggi/cells/repository/fragments';
import { storageKey } from './storageKey';
import { setResolver } from './compile';

const DB = storageKey('cell-studio-mine');
const STORE = 'layer';
const KEY = 'v1';

/** IndexedDB, opened once; null where the browser has none or refuses it. */
function open(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((done) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
}
const request = <T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) =>
  new Promise<T | undefined>((done) => {
    try {
      const req = run(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => done(req.result);
      req.onerror = () => done(undefined);
    } catch {
      done(undefined);
    }
  });

/** A layer read back, its shape checked: null for anything else. */
function asLayer(v: unknown): LearnedLayer | null {
  const l = v as Partial<LearnedLayer> | null;
  return l && Array.isArray(l.filed) && Array.isArray(l.points) && Array.isArray(l.together) ? (l as LearnedLayer) : null;
}

/** The seed as a repository, for filing: made on the first filing (it checks every fragment), not at start. */
let repository: ReturnType<typeof createRepository> | undefined;

class Mine {
  #layer = $state.raw<LearnedLayer>(EMPTY_LAYER);
  /** How a `from` line is read: the seed library, then the fragments filed here. */
  readonly resolve = $derived(resolverOf(this.#layer));
  /** The layer: the fragments filed here, and what use added. Read in a compile, it is tracked: a new one compiles again. */
  get layer(): LearnedLayer {
    return this.#layer;
  }
  set layer(layer: LearnedLayer) {
    this.#layer = layer;
    // (every compile of the app reads through it from now on: compile.ts)
    setResolver(resolverOf(layer));
  }
  /** The ids of the fragments filed here. */
  readonly ids = $derived(new Set(this.#layer.filed.map((f) => f.fragment.id)));
  #db: Promise<IDBDatabase | null> | null = null;

  /** Read the layer kept in this browser (once, at start). */
  async load(): Promise<void> {
    this.#db ??= open();
    const db = await this.#db;
    if (!db) return;
    const kept = asLayer(await request(db, 'readonly', (s) => s.get(KEY)));
    if (kept) this.layer = kept;
  }
  /** File a fragment as this person's own; its id (the one it is held under, where the library holds its text already). */
  async file(filing: Filing): Promise<string> {
    const filed = fileFragment((repository ??= createRepository(LIBRARY)), this.layer, filing);
    this.layer = filed.layer;
    this.#db ??= open();
    const db = await this.#db;
    // (the layer is plain data, raw state: IndexedDB clones it as it is)
    if (db) await request(db, 'readwrite', (s) => s.put(this.layer, KEY));
    return filed.id;
  }
}

/** This person's fragments: one per page. */
export const mine = new Mine();
