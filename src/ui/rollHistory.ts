/**
 * The piano roll's Undo (#211): per piece and cell, the braid each edit replaced and the braid it wrote. It outlives a
 * sheet (the sheet is remade as the program is), so it is kept by the piece opened (the library's `opened` count) as well
 * as the cell's name: a same-named cell in another piece never undoes into this one's braid.
 */
export interface RollEdit {
  readonly before: readonly string[];
  readonly after: string;
}

/** How many edits back Undo goes, per cell. */
const DEPTH = 50;

export class RollHistory {
  private piece: number | null = null;
  private readonly byCell = new Map<string, RollEdit[]>();

  /** Its edits for a cell of this piece (opening another piece forgets the last one's). */
  private of(piece: number, name: string): RollEdit[] {
    if (piece !== this.piece) {
      this.byCell.clear();
      this.piece = piece;
    }
    return this.byCell.get(name) ?? [];
  }

  /** An edit: `before` the braid replaced, `after` the braid written (as text). */
  push(piece: number, name: string, before: readonly string[], after: string): void {
    this.byCell.set(name, [...this.of(piece, name).slice(-(DEPTH - 1)), { before: [...before], after }]);
  }

  /** Can Undo step back, the braid now being `written`? Only while it is still what the last edit wrote. */
  canUndo(piece: number, name: string, written: string): boolean {
    return this.of(piece, name).at(-1)?.after === written;
  }

  /** The braid to write back (and the edit forgotten), or null when Undo can't. */
  undo(piece: number, name: string, written: string): readonly string[] | null {
    const list = this.of(piece, name);
    const last = list.at(-1);
    if (!last || last.after !== written) return null;
    this.byCell.set(name, list.slice(0, -1));
    return last.before;
  }
}
