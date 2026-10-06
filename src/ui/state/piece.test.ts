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
