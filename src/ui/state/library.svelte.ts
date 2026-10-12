import { FIRST, type PresetKey } from '../../examples';
import { listSaved, removeSaved, storageAvailable, type SavedPiece } from '../../library';
import { freezeLayout, layoutKey, libraryLayoutAsync, stageOf, thawLayout, type FrozenLayout, type LibraryLayout } from '../../layout/library';
import { storageKey } from '../../storageKey';
import { exampleEntries, savedEntry, type Entry } from '../entries';

// (the library's layout kept in the browser between visits: the next visit's opening is a replay, not the physics again)
const STORE = storageKey('cell-studio:library-layout:v6');
type Stored = { key: string; layout: FrozenLayout };
try {
  for (const v of ['v2', 'v3', 'v4', 'v5']) localStorage.removeItem(`cell-studio:library-layout:${v}`);
} catch {
  // (no storage)
}
function storedLayout(key: string): LibraryLayout | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE) ?? 'null') as { key?: unknown; layout?: unknown } | null;
    return stored && stored.key === key ? thawLayout(stored.layout) : null;
  } catch {
    return null; // (no storage, or not ours: grow it)
  }
}
function storeLayout(key: string, layout: LibraryLayout): void {
  try {
    localStorage.setItem(STORE, JSON.stringify({ key, layout: freezeLayout(layout) } satisfies Stored));
  } catch {
    // (full, or not allowed: it's only a cache)
  }
}

/** What's open: an example, a piece saved here, a file. */
export type Open = { kind: 'example'; key: PresetKey } | { kind: 'saved'; id: string } | { kind: 'file'; name: string };

/** The pieces to choose from (the examples and those saved in this browser), and which is open. */
export class Library {
  saved = $state.raw<SavedPiece[]>(listSaved());
  readonly storageOk = storageAvailable();
  open = $state<Open>({ kind: 'example', key: FIRST });
  /** Counts the pieces opened: a new one is laid out afresh. 0: nothing chosen yet (the front door). */
  opened = $state(0);
  readonly anyOpen = $derived(this.opened > 0);
  readonly entries = $derived<Entry[]>([...this.saved.map(savedEntry), ...exampleEntries]);
  /** The card of the piece open now (none for a file, or before anything is chosen). */
  readonly currentId = $derived(!this.anyOpen ? null : this.open.kind === 'example' ? `example:${this.open.key}` : this.open.kind === 'saved' ? `saved:${this.open.id}` : null);

  /** The library as a graph, kept between openings while the same pieces carry the same tags (`layoutKey`). */
  #kept: { key: string; layout: LibraryLayout } | null = null;

  /**
   * Lay the library out for `show`: the layout kept from before at once; else one kept in the browser from a visit
   * before, its opening replayed (0.7 s, a stage a frame, no physics); else, once the cards have been drawn (two
   * frames), grown, each stage shown. `still` (reduced motion): only the end shown. Returns what stops it.
   */
  arrange(entries: readonly Entry[], still: boolean, show: (l: LibraryLayout) => void): () => void {
    const key = layoutKey(entries);
    if (this.#kept?.key === key) {
      show(this.#kept.layout);
      return () => {};
    }
    let cancelled = false;
    const frame = (l: LibraryLayout) =>
      new Promise<void>((go) => {
        if (!cancelled) show(l);
        requestAnimationFrame(() => go());
      });
    const stored = storedLayout(key);
    if (stored) {
      this.#kept = { key, layout: stored };
      if (still) show(stored);
      else
        void (async () => {
          const t0 = performance.now();
          for (let t = 0; !cancelled; t = Math.min(1, (performance.now() - t0) / 700)) {
            await frame(stageOf(stored, t));
            if (t === 1) break;
          }
        })();
      return () => (cancelled = true);
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setTimeout(async () => {
          const layout = await libraryLayoutAsync(entries, still ? undefined : frame);
          this.#kept = { key, layout };
          storeLayout(key, layout);
          if (!cancelled) show(layout);
        }, 0),
      ),
    );
    return () => (cancelled = true);
  }

  /** Read the saved pieces again (after saving or removing one). */
  refresh(): void {
    this.saved = listSaved();
  }
  /** Remove a saved piece by its card's id (`saved:<id>`). */
  remove(id: string): void {
    removeSaved(id.slice('saved:'.length));
    this.refresh();
  }
}
