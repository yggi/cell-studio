import { FIRST, type PresetKey } from '../../examples';
import { listSaved, removeSaved, storageAvailable, type SavedPiece } from '../../library';
import { exampleEntries, savedEntry, type Entry } from '../entries';

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
  readonly currentId = $derived(
    !this.anyOpen ? null : this.open.kind === 'example' ? `example:${this.open.key}` : this.open.kind === 'saved' ? `saved:${this.open.id}` : null,
  );

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
