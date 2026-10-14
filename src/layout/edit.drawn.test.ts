import { describe, expect, it } from 'vitest';
import { setAttr, declLine, declWords, deleteCell, renameCell, setBraid, setOff, setShift, setTiming, usersOf } from '@yggi/cells/engine/edit';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from './drawn';
import { readFileSync } from 'node:fs';

describe('a product’s junction is not a cell (graph.ts)', () => {
  it('no edit by its id, or by what a cell id would make of it, changes the code', () => {
    const src = readFileSync('tools/gallery/golden/golden.cells', 'utf8');
    const junctions = buildGraph(compileSource(src)).nodes.filter((n) => n.kind === 'junction');
    expect(junctions.length).toBeGreaterThan(0);
    for (const { id } of junctions)
      for (const name of [id, id.slice('cell:'.length), id.slice('junction:'.length)]) {
        expect(declLine(src, name)).toBe(-1);
        expect(declWords(src, name)).toBeNull();
        expect(usersOf(src, name)).toEqual([]);
        for (const edited of [
          setOff(src, name, true),
          setShift(src, name, 3),
          setAttr(src, name, 'level', '.5'),
          setTiming(src, name, 'step', '&bar'),
          setBraid(src, name, ['0']),
          deleteCell(src, name),
          renameCell(src, name, 'renamed'),
        ])
          expect(edited).toBe(src);
      }
  });
});
