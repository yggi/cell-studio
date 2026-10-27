import { describe, expect, it } from 'vitest';
import { setOff, setShift } from '@yggi/cells/engine/edit';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { plan } from '@yggi/cells/engine/realize';
import { windowAt } from '@yggi/cells/engine/schedule';
import { compilePiece, withUsedLine } from './compile';

const KIT = 'use * from "core kit"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]';
const events = (r: CompileResult) => windowAt(plan(r, codeShifts(r), r.off), 0, 4.8).events;
// (an event's output is named by the line of the cell that plays it, which a line written above it moves)
const heard = (r: CompileResult) => events(r).map(({ output, ...e }) => ({ ...e, output: output?.replace(/:\d+:/, ':') }));

describe('an edit of a used cell: a line of the piece’s own (#480)', () => {
  it('writes the used line, word for word, under its use, and changes no other line', () => {
    const text = withUsedLine(KIT, 'sd');
    expect(text.split('\n')).toEqual([KIT.split('\n')[0], '&sd s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)', ...KIT.split('\n').slice(1)]);
    // (now the piece's: it overrides the kit's, and compiles to the same)
    const r = compilePiece(text);
    expect(r.uses?.[0]?.overrode).toEqual(['&sd']);
    expect(heard(r)).toEqual(heard(compilePiece(KIT)));
  });

  it('adds exactly one line for an edit, and deleting it brings the used one back: the same events (S1)', () => {
    const before = events(compilePiece(KIT));
    const off = setOff(withUsedLine(KIT, 'hh'), 'hh', true);
    expect(off.split('\n')).toHaveLength(KIT.split('\n').length + 1);
    expect(off.split('\n').filter((l) => !KIT.split('\n').includes(l))).toEqual(['&hh off s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)']);
    expect(events(compilePiece(off)).length).toBeLessThan(before.length);
    const deleted = off
      .split('\n')
      .filter((l) => !l.startsWith('&hh'))
      .join('\n');
    expect(deleted).toBe(KIT);
    expect(events(compilePiece(deleted))).toEqual(before);
  });

  it('writes a second override under the first, and leaves the piece’s own cells and other text alone', () => {
    const two = withUsedLine(withUsedLine(KIT, 'sd'), 'rim');
    expect(
      two
        .split('\n')
        .slice(0, 3)
        .map((l) => l.split(' ')[0]),
    ).toEqual(['use', '&sd', '&rim']);
    expect(setShift(two, 'rim', 2).split('\n')).toHaveLength(5);
    expect(withUsedLine(KIT, 'beat')).toBe(KIT);
    expect(withUsedLine(KIT, 'nothing')).toBe(KIT);
    expect(withUsedLine('&a 1 2', 'a')).toBe('&a 1 2');
  });
});
