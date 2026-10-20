import { describe, expect, it } from 'vitest';
import { Piece } from './piece.svelte';
import { PRESETS } from '@yggi/cells/engine/presets';
import { pieceMeta } from '@yggi/cells/engine/parser/index';
import { shorten } from '@yggi/cells/engine/shorten/index';
import { fileName, pieceFile, textOf } from '../../library';

const SRC = `&bar step=free(120bpm, 60..180)
&tune step=&bar 0 2 4 shift=free(0, 0..7) over=&bar
&lead s=sine
&out [&tune * &lead]`;

describe('Piece: the code and what it compiles to', () => {
  it('compiles the code it holds, and follows edits', () => {
    const p = new Piece(SRC);
    expect(p.result.ok).toBe(true);
    expect(p.program.cells.has('tune')).toBe(true);
    p.code = `${SRC}\n&extra 1 2 3`;
    expect(p.program.cells.has('extra')).toBe(true);
  });

  it('keeps showing the last version that compiled while the code has errors', () => {
    const p = new Piece(SRC);
    const before = p.program;
    p.code = `${SRC}\n&broken [`;
    expect(p.stale).toBe(true);
    expect(p.errors).toBeGreaterThan(0);
    expect(p.program).toBe(before);
    p.code = SRC;
    expect(p.stale).toBe(false);
  });

  it('turns a cell through its free() value, and switches one off', () => {
    const p = new Piece(SRC);
    p.turn('tune', 3);
    expect(p.code).toContain('shift=free(3, 0..7)');
    p.toggle('cell:lead');
    expect(p.program.cells.get('lead')?.off).toBe(true);
    p.toggle('cell:lead');
    expect(p.program.cells.get('lead')?.off).toBe(false);
    // (a product's junction is not a cell: holding it switches nothing)
    const before = p.code;
    p.toggle('junction:out:0');
    expect(p.code).toBe(before);
  });

  it('adds a cell and names it', () => {
    const p = new Piece(SRC);
    const name = p.add();
    expect(p.program.cells.has(name)).toBe(true);
  });

  it('holds a free() value moved by hand: it plays, the code keeps what is written until kept', () => {
    const p = new Piece(SRC);
    const tempo = p.program.cells.get('bar')!.frees[0];
    p.hold(tempo, 90);
    expect(p.held.size).toBe(1);
    expect(p.code).toContain('free(120bpm');
    expect(p.playedCode).toContain('free(90bpm');
    expect(p.good.source.code).toContain('free(90bpm');
    p.keep();
    expect(p.held.size).toBe(0);
    expect(p.code).toContain('free(90bpm');
  });

  it('lets go of what is held: by revert, or when an edit changes how many free()s there are', () => {
    const p = new Piece(SRC);
    const tempo = p.program.cells.get('bar')!.frees[0];
    p.hold(tempo, 90);
    p.revert();
    expect(p.held.size).toBe(0);

    p.hold(tempo, 90);
    p.code = `${SRC}\n&more 0 1`; // (the same free()s: still held)
    expect(p.held.size).toBe(1);
    p.code = `${SRC}\n&more 0 1 shift=free(0, 0..3)`;
    expect(p.held.size).toBe(0);
  });
});

describe('Piece: a braid left free, held (#210)', () => {
  const RIFF = `&key scan(2 2 1 2 2 2 1)
&bar scan(1 1 1 1) step=free(120bpm, 60..180)
&riff over=&key step=16n free(0 2 4 ~)
&lead s=sine
&out map=sample [&riff * &lead]`;
  it('holds a take: it plays, the code keeps the braid written; Keep writes that one, the tempo held stays held', () => {
    const p = new Piece(RIFF);
    const [tempo, braid] = [p.program.cells.get('bar')!.frees[0], p.program.cells.get('riff')!.frees[0]];
    p.hold(tempo, 90);
    p.hold(braid, '7 ~ [0,4]@2');
    expect(p.code).toContain('free(0 2 4 ~)');
    expect(p.program.cells.get('riff')!.frees[0].braid).toBe('7 ~ [0,4]@2');
    p.keep(p.program.cells.get('riff')!.frees[0]);
    expect(p.code).toContain('&riff over=&key step=16n free(7 ~ [0,4]@2)');
    expect(p.code).toContain('free(120bpm');
    expect([...p.held.values()]).toEqual([90]);
  });
  it('Revert one lets go of that one; all of them, of everything', () => {
    const p = new Piece(RIFF);
    const braid = p.program.cells.get('riff')!.frees[0];
    p.hold(p.program.cells.get('bar')!.frees[0], 90);
    p.hold(braid, '7 7 7 7');
    p.revert(p.program.cells.get('riff')!.frees[0]);
    expect(p.program.cells.get('riff')!.frees[0].braid).toBe('0 2 4 ~');
    expect(p.held.size).toBe(1);
    p.hold(braid, '7 7 7 7');
    p.revert();
    expect(p.held.size).toBe(0);
  });
});

describe('Piece: a MIDI file, as it is', () => {
  const MIDI = `midi format=1 ppq=96 name="Two notes"
tempo 1:1:0 120
track "lead"
1:1:0 ch1 C4 96 v100
1:2:0 ch1 E4 96 v100`;

  it('plays its notes, written out as cells behind the scenes, and keeps its text', () => {
    const p = new Piece(MIDI);
    expect(p.midi).not.toBeNull();
    expect(p.title).toBe('Two notes');
    expect(p.result.ok).toBe(true);
    expect(p.program.cells.has('lead')).toBe(true);
    expect(p.result.diagnostics).toEqual([]);
    p.toggle('cell:lead');
    p.turn('lead', 2);
    expect(p.code).toBe(MIDI);
  });

  it('says which lines of its text it cannot read, and plays the last version that could', () => {
    const p = new Piece(MIDI);
    const before = p.program;
    p.code = `${MIDI}\n1:3:0 ch1 nope`;
    expect(p.result.diagnostics.map((d) => d.span.line)).toEqual([6]);
    expect(p.stale).toBe(true);
    expect(p.program).toBe(before);
  });
});

describe('Piece: a piece file (decision 047)', () => {
  const OLD = `&piece title="Old way" tags="tutorial, diatonic" tier=2 label="A piece saved before files." about=&out
&bar scan(1 1 1 1) step=120bpm
&tune step=4n 0 2 4 7
&lead s=sine loop=C4
&out map=sample [&tune * &lead]`;

  it('opens an example’s file: the code is its cells block, the title its frontmatter’s, the file the same bytes', () => {
    const p = new Piece(PRESETS.royal.file);
    expect(p.code).toBe(PRESETS.royal.source);
    expect(p.title).toBe(pieceMeta(PRESETS.royal.file)?.title);
    expect(p.file).toBe(PRESETS.royal.file);
    expect(p.result.diagnostics).toEqual([]);
    // (an edit is the code's: the frontmatter stays)
    p.code = `${p.code}\n&extra 1 2 3`;
    expect(p.title).toBe(pieceMeta(PRESETS.royal.file)?.title);
    expect(pieceFile(p.file)?.text).toBe(p.code);
    // (a bare text opened after it has no frontmatter)
    p.open(SRC);
    expect(p.frontmatter).toBeNull();
    expect(p.file).toBe(SRC);
  });

  it('a text whose card says what the piece is: one warning, on the card; Shorten’s suggestion moves it to the frontmatter', () => {
    const p = new Piece(OLD);
    const warnings = p.result.diagnostics.filter((d) => d.severity === 'warning');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.span.line).toBe(1);
    expect(warnings[0]!.message).toMatch(/frontmatter/);
    expect(p.title).toBe('Old way');
    const card = shorten(p.code).filter((s) => s.kind === 'card');
    expect(card).toHaveLength(1);
    const before = p.program;
    p.take(card[0]!.apply(p.code));
    expect(p.result.diagnostics.filter((d) => d.severity === 'warning')).toEqual([]);
    // (the card's label is the frontmatter's description, and the card's line goes: cells #199)
    expect(p.frontmatter).toEqual({ title: 'Old way', tags: ['tutorial', 'diatonic'], tier: 2, description: 'A piece saved before files.' });
    expect(p.title).toBe('Old way');
    expect(p.code).not.toMatch(/title=|tier=|tags=|&piece/);
    expect(pieceMeta(p.file)).toMatchObject({ title: 'Old way', tags: ['tutorial', 'diatonic'], tier: 2, description: 'A piece saved before files.', cell: null });
    expect(p.program.cells.size).toBe(before.cells.size - 1);
    // (a rewrite that is a text is the code)
    p.take(`${p.code}\n&more 1`);
    expect(p.program.cells.has('more')).toBe(true);
    expect(p.frontmatter).toMatchObject({ title: 'Old way' });
  });
});

describe('Piece: a literate piece file (cells decision 051)', () => {
  // three cells blocks with prose before, between and after them: the code is their join
  const LITERATE = `---
title: Three blocks
tags: [tutorial]
---

# A piece in three blocks

The clock first.

\`\`\`cells
&bar meter("4/4") step=120bpm
\`\`\`

Then the line and its voice.

\`\`\`cells
&t step=4n 0 2 4 7
&lead s=sine loop=A4
\`\`\`

And what hears them.

\`\`\`cells
&out map=sample [&t * &lead]
\`\`\`

That is all.
`;

  it('opens with its prose kept; an edit in the graph rewrites one line of the second block, and the file differs only there', () => {
    const p = new Piece(LITERATE);
    expect(p.result.diagnostics).toEqual([]);
    // (the editor shows the code: the blocks joined)
    expect(p.code).toBe('&bar meter("4/4") step=120bpm\n&t step=4n 0 2 4 7\n&lead s=sine loop=A4\n&out map=sample [&t * &lead]');
    expect(p.file).toBe(LITERATE);
    p.turn('t', 2);
    const before = LITERATE.split('\n');
    const after = p.file.split('\n');
    expect(after).toHaveLength(before.length);
    const changed = after.flatMap((l, i) => (l === before[i] ? [] : [i]));
    expect(changed).toEqual([before.indexOf('&t step=4n 0 2 4 7')]);
    expect(after[changed[0]!]).toMatch(/^&t .*shift=2/);
    // (opened again, it reads as it was written)
    expect(new Piece(p.file).code).toBe(p.code);
  });
});

describe('a piece’s file name and what compiles', () => {
  it('names a piece file .md and a bare text .cells, from its title', () => {
    expect(fileName(PRESETS.royal.file)).toBe(`${fileName(PRESETS.royal.file, '')}.md`);
    expect(fileName(PRESETS.royal.file, '.mid')).toMatch(/^royal-theme.*\.mid$/);
    expect(fileName('# A sketch\n&a loop=A4')).toBe('a-sketch.cells');
    expect(textOf(PRESETS.royal.file)).toBe(PRESETS.royal.source);
    expect(textOf(SRC)).toBe(SRC);
  });
});
