import { describe, expect, it } from 'vitest';
import { RollHistory } from './rollHistory';

describe("the piano roll's Undo", () => {
  it('steps back one edit at a time, while the braid is what the roll wrote', () => {
    const h = new RollHistory();
    h.push(1, 'tune', ['0', '2'], '0 2 4');
    h.push(1, 'tune', ['0', '2', '4'], '0 2 4 7');
    expect(h.canUndo(1, 'tune', '0 2 4 7')).toBe(true);
    // (changed in the code meanwhile: Undo would write over it, so it can't)
    expect(h.canUndo(1, 'tune', '0 2 5 7')).toBe(false);
    expect(h.undo(1, 'tune', '0 2 4 7')).toEqual(['0', '2', '4']);
    expect(h.undo(1, 'tune', '0 2 4')).toEqual(['0', '2']);
    expect(h.undo(1, 'tune', '0 2')).toBeNull();
  });

  it('is kept per piece: a same-named cell in the next piece opened never undoes into the last one’s braid', () => {
    const h = new RollHistory();
    h.push(1, 'tune', ['0', '2'], '0 2 4');
    // another piece whose &tune happens to be exactly what the last edit wrote
    expect(h.canUndo(2, 'tune', '0 2 4')).toBe(false);
    expect(h.undo(2, 'tune', '0 2 4')).toBeNull();
    // and back to the first piece (opened again: a new count), its edits are gone too
    expect(h.canUndo(3, 'tune', '0 2 4')).toBe(false);
  });

  it('remembers 50 edits a cell', () => {
    const h = new RollHistory();
    for (let i = 0; i < 60; i++) h.push(1, 'tune', [String(i)], String(i + 1));
    let n = 0;
    for (let w = '60'; ; n++) {
      const back = h.undo(1, 'tune', w);
      if (!back) break;
      w = back[0];
    }
    expect(n).toBe(50);
  });
});
