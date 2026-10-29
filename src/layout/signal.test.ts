import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { runsOn, sentSince, ticksOn } from './signal';

// (a step a beat, at 120 bpm: every half second; a bar of four)
const SRC = `&bar scan(1 1 1 1) step=120bpm
&tune step=4n 0 2 4 5
&slow step=2n 0 7`;
const program = compilePiece(SRC);
const shifts = codeShifts(program);

describe('what a cell sent, read from its clock (signal.ts)', () => {
  it('lists its steps newest first, back to the one under way at the start of the span', () => {
    const sent = sentSince(program, shifts, 'tune', 1.25, 1);
    expect(sent.map((s) => s.index)).toEqual([2, 1, 0]);
    expect(sent.map((s) => s.at)).toEqual([1, 0.5, 0].map((x) => expect.closeTo(x, 6)));
    expect(sent.map((s) => s.local)).toEqual([2, 1, 0]);
  });

  it('wraps its place in the braid, and reads a slower cell at its own rate', () => {
    expect(sentSince(program, shifts, 'tune', 2.6, 0.1)[0]).toMatchObject({ index: 5, local: 1 });
    expect(sentSince(program, shifts, 'slow', 2.6, 0.1)[0]).toMatchObject({ index: 2, local: 0 });
  });

  it('sends nothing before the start, and nothing for a cell no clock steps', () => {
    expect(sentSince(program, shifts, 'tune', -1, 1)).toEqual([]);
    expect(sentSince(compilePiece('&x 0 2 4'), shifts, 'x', 1, 1)).toEqual([]);
  });
});

describe('a wire as a delay line', () => {
  it('lays each step from where the next began out to where it began; the oldest cut at the end of the wire', () => {
    const runs = runsOn(sentSince(program, shifts, 'tune', 1.25, 1), 1.25, 100, 100);
    expect(runs.map((r) => [r.from, r.to, r.step.local, r.onset])).toEqual([
      [0, expect.closeTo(25, 6), 2, true],
      [expect.closeTo(25, 6), expect.closeTo(75, 6), 1, true],
      [expect.closeTo(75, 6), 100, 0, false],
    ]);
  });

  it('is filled only as far as the piece has played', () => {
    const runs = runsOn(sentSince(program, shifts, 'tune', 0.3, 1), 0.3, 100, 100);
    expect(runs).toHaveLength(1);
    expect(runs[0].to).toBeCloseTo(30, 6);
  });

  it('carries a clock’s ticks at the rate of what it steps, the bar’s first at level 0', () => {
    const ticks = ticksOn(program, shifts, 'bar', 'tune', 2.25, 200, 100);
    // (ticks at 2.0, 1.5, 1.0, 0.5: 25, 75, 125, 175 px out; the bar's first left at 2.0 and at 0.0, off the wire)
    expect(ticks.map((t) => Math.round(t.at))).toEqual([25, 75, 125, 175]);
    expect(ticks.map((t) => t.level)).toEqual([0, 1, 1, 1]);
    // (twice as slow: half as many)
    expect(ticksOn(program, shifts, 'bar', 'slow', 2.25, 200, 100).map((t) => Math.round(t.at))).toEqual([25, 125]);
  });
});
