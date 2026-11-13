import { describe, expect, it } from 'vitest';
import { setOff, setShift } from '@yggi/cells/engine/edit';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { plan } from '@yggi/cells/engine/realize';
import { windowAt } from '@yggi/cells/engine/schedule';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { compilePiece, ownLine } from './compile';

const KIT = '&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]';
const events = (r: CompileResult) => windowAt(plan(r, codeShifts(r), r.off), 0, 4.8).events;
// (an event's output is named by the line of the cell that plays it, which a line written above it moves)
const heard = (r: CompileResult) => events(r).map(({ output, ...e }) => ({ ...e, output: output?.replace(/:\d+:/, ':') }));

describe('an edit of a used cell: a line of the piece’s own (#480)', () => {
  it('writes the given line, word for word, under its from line, which stops asking for it (cells’ takeIn, #610)', () => {
    const text = ownLine(KIT, 'sd');
    const [first, ...rest] = KIT.split('\n');
    expect(text.split('\n')).toEqual([first!.replace('&sd, ', ''), '&sd note=38 s=white hpf=1500 env=&(map=adsr 0 .12 0 .05)', ...rest]);
    // (now the piece's own, and it compiles to the same)
    expect(heard(compilePiece(text))).toEqual(heard(compilePiece(KIT)));
  });

  it('adds exactly one line for an edit, and changes what it edits only (S1)', () => {
    const before = events(compilePiece(KIT));
    const off = setOff(ownLine(KIT, 'hh'), 'hh', true);
    expect(off.split('\n')).toHaveLength(KIT.split('\n').length + 1);
    expect(off.split('\n').filter((l) => !KIT.split('\n').includes(l))).toEqual([
      KIT.split('\n')[0]!.replace('&hh, ', ''),
      '&hh off note=42 s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)',
    ]);
    expect(events(compilePiece(off)).length).toBeLessThan(before.length);
    expect(heard(compilePiece(ownLine(KIT, 'hh')))).toEqual(heard(compilePiece(KIT)));
  });

  it('writes a second line under the from line too, and leaves the piece’s own cells and other text alone', () => {
    const two = ownLine(ownLine(KIT, 'sd'), 'rim');
    expect(
      two
        .split('\n')
        .slice(0, 3)
        .map((l) => l.split(' ')[0]),
    ).toEqual(['&bd,', '&rim', '&sd']);
    expect(setShift(two, 'rim', 2).split('\n')).toHaveLength(5);
    expect(ownLine(KIT, 'beat')).toBe(KIT);
    expect(ownLine(KIT, 'nothing')).toBe(KIT);
    expect(ownLine('&a 1 2', 'a')).toBe('&a 1 2');
  });

  it('leaves the head of a template’s copy as written: its `from` line defines it (#610)', () => {
    for (const [key, name] of [
      ['clock', 'bar'],
      ['electroswing', 'drumsOut'],
    ] as const) {
      const text = EXAMPLES[key].source;
      expect(ownLine(text, name), `${key}: &${name}`).toBe(text);
      expect(compilePiece(ownLine(text, name)).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    }
  });

  it('writes the line of a cell a `*` copy with arguments gives: radio’s band’s, which `*` then leaves to the piece (cells v0.23.0)', () => {
    const text = EXAMPLES.radio.source;
    const before = heard(compilePiece(text));
    for (const name of ['bd', 'drumsOut', 'bassV']) {
      const written = ownLine(text, name);
      expect(written.split('\n'), `&${name}`).toHaveLength(text.split('\n').length + 1);
      const r = compilePiece(written);
      expect(
        r.diagnostics.filter((d) => d.severity === 'error'),
        `&${name}`,
      ).toEqual([]);
      expect(heard(r), `&${name}`).toEqual(before);
      // (and it is the piece's line that plays: turned off, its notes go)
      expect(heard(compilePiece(setOff(written, name, true))).length, `&${name} off`).toBeLessThan(before.length);
    }
  });
});
