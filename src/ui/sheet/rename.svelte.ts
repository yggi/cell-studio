import type { Attachment } from 'svelte/attachments';
import { nameProblem, renameCell } from '@yggi/cells/engine/edit';

/**
 * A cell's name, edited where it's shown (SheetName.svelte): the draft follows the name until typed into, `commit`
 * renames (unless the draft is empty, the same or has a problem), `reset` puts the name back.
 */
export class Rename {
  /** The name as typed so far: the cell's name again whenever that changes. */
  draft: string;
  /** Why the draft can't be the name (taken, not a name), or null. */
  readonly problem: string | null;
  readonly #name: () => string;
  readonly #source: () => string;
  readonly #onrename: (source: string, to: string) => void;

  constructor(name: () => string, source: () => string, onrename: (source: string, to: string) => void) {
    this.#name = name;
    this.#source = source;
    this.#onrename = onrename;
    this.draft = $derived(name());
    this.problem = $derived.by(() => {
      const to = this.draft.trim();
      return to && to !== name() ? nameProblem(source(), to, name()) : null;
    });
  }

  /** The cell's current name. */
  get name(): string {
    return this.#name();
  }

  /** Whether the draft differs from the cell's current name. */
  get edited(): boolean {
    return this.draft !== this.#name();
  }

  commit() {
    const name = this.#name();
    const to = this.draft.trim();
    if (!to || to === name || this.problem) {
      if (!this.problem) this.draft = name;
      return;
    }
    this.#onrename(renameCell(this.#source(), name, to), to);
  }

  reset() {
    this.draft = this.#name();
  }
}

/**
 * Key handling on the name input (SheetName.svelte): Enter commits; Escape with an edited draft cancels the rename
 * and leaves the sheet open; with nothing typed (draft unedited), Escape bubbles to the sheet's trap to close at once.
 */
export function nameKeys(rename: Rename): Attachment<HTMLInputElement> {
  return (node) => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        rename.commit();
        node.blur();
      } else if (e.key === 'Escape') {
        if (rename.edited) {
          e.preventDefault();
          e.stopPropagation();
          rename.reset();
          node.blur();
        }
      }
    };
    node.addEventListener('keydown', key);
    return () => node.removeEventListener('keydown', key);
  };
}
