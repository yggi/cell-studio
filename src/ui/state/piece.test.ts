import { describe, expect, it } from 'vitest';
import { Piece } from './piece.svelte';

const SRC = `&bar step=free(120bpm, 60..180)
&tune 0 2 4 shift=free(0, 0..7) over=&bar
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
&riff over=&key step=&bar/4 free(0 2 4 ~)
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
    expect(p.code).toContain('&riff over=&key step=&bar/4 free(7 ~ [0,4]@2)');
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
