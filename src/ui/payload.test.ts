import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { cellView } from '../layout/cellview';
import { payloadOf, shapeOf, valuesOf } from './payload';

describe('which payload an edge carries while it plays (docs/notes/edge-styles.md §2)', () => {
  it('sound a wave, a clock’s ticks a train, a melody its notes, any other value a level', () => {
    expect(payloadOf('audio', 'mix', false)).toBe('wave');
    // (a sound spliced in travels too, though the wire is a reference)
    expect(payloadOf('audio', 'braid', true)).toBe('wave');
    expect(payloadOf('sync', 'step', false)).toBe('ticks');
    for (const port of ['voice', 'trigger', 'midi', 'pitch', 'play', 'write']) expect(payloadOf('cv', port, false)).toBe('notes');
    for (const port of ['lpf', 'level', 'env', 'velocity', 'gate']) expect(payloadOf('cv', port, false)).toBe('levels');
  });
  it('a pointer stays still (D6), and a note’s link carries nothing', () => {
    expect(payloadOf('cv', 'braid', true)).toBeNull();
    expect(payloadOf('cv', 'over', true)).toBeNull();
    expect(payloadOf('none', 'about', false)).toBeNull();
  });
});

describe('what a source sends at each step', () => {
  const at = (src: string, cell: string) => {
    const p = compileSource(src);
    return valuesOf(p, cellView(p, cell, codeShifts(p), false), cell);
  };
  it('a melody: its notes, as its wheel colours them', () => {
    const v = at('&tune 0 4 7', 'tune')!;
    expect([0, 1, 2].map((i) => v(i)?.kind)).toEqual(['pitch', 'pitch', 'pitch']);
    expect(v(0)).not.toEqual(v(1));
  });
  it('an oscillator its wheel draws as a curve: its numbers as levels (map=lin as written, map=db as a gain)', () => {
    const lin = at('&bar scan(1 1 1 1) step=120bpm\n&swell map=lin loop=&bar*4 .2 1 .2', 'swell')!;
    expect([0, 1, 2].map((i) => lin(i))).toEqual([0.2, 1, 0.2].map((v) => ({ kind: 'level', v })));
    const db = at('&bar scan(1 1 1 1) step=120bpm\n&duck map=db loop=&bar*4 0 -6', 'duck')!;
    expect((db(1) as { v: number }).v).toBeCloseTo(0.501, 3);
  });
  it('a moving piece’s swell, as the edge sheet shows it', () => {
    const v = at(readFileSync('examples/moving.cells', 'utf8'), 'swell');
    expect(v).not.toBeNull();
  });
});

describe('a voice’s own shape on its wire', () => {
  it('reads its waveform, and a mix or a sample as a sine', () => {
    const p = compileSource('&a s=saw\n&b s=triangle\n&c s=white\n&d s=sine\n&m map=sample [&a, &b]');
    expect(['a', 'b', 'c', 'd', 'm'].map((v) => shapeOf(p, v))).toEqual(['saw', 'tri', 'noise', 'sine', 'sine']);
    expect(shapeOf(p, null)).toBe('sine');
  });
});
