import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts, EXAMPLES } from '@yggi/cells';
import { liveAt } from './live';
import { meterWheel, selectorSection } from './meterwheel';

const wheel = (key: keyof typeof EXAMPLES, name = 'bar') => {
  const r = compilePiece(EXAMPLES[key].source);
  if (!r.ok) throw new Error(`${key} does not compile`);
  return { r, w: meterWheel(r, name) };
};
const round = (x: number) => +x.toFixed(4);

describe('a meter’s wheel (#701)', () => {
  it('draws pulses at their sync levels, and a beat a pulse of 4/4 with no swing=', () => {
    const { w } = wheel('metronome');
    expect(w!.pulses.map((p) => [round(p.t0), round(p.t1), p.level])).toEqual([
      [0, 0.25, 0],
      [0.25, 0.5, 2],
      [0.5, 0.75, 1],
      [0.75, 1, 2],
    ]);
    expect(w!.beats.map((b) => [round(b.t0), round(b.t1), b.pulses])).toEqual([0, 1, 2, 3].map((i) => [i / 4, (i + 1) / 4, 1]));
    expect(w!.swing).toBeNull();
  });

  it('puts the swing of 8n on quarters one pair in each pulse, long then short at the share', () => {
    const { w } = wheel('swing');
    expect(w!.swing!.share).toBeCloseTo(2 / 3);
    expect(w!.swing!.pairs.map((p) => [round(p.t0), round(p.t1), round(p.split)])).toEqual([0, 1, 2, 3].map((i) => [i / 4, (i + 1) / 4, round(i / 4 + 0.25 * (2 / 3))]));
    expect(w!.swing!.even).toEqual([]);
  });

  it('puts the swing of 16n on quarters two pairs in each pulse', () => {
    const { w } = wheel('funk');
    expect(w!.swing!.pairs.length).toBe(8);
    expect(w!.swing!.share).toBeCloseTo(0.58);
    const first = w!.swing!.pairs[0]!;
    expect([first.t0, round(first.t1), round(first.split)]).toEqual([0, 0.125, round(0.125 * 0.58)]);
  });

  it('leans 2+2+3 where its pulses are the swung level: the two pairs, the three even, the pulses placed as played', () => {
    const { w } = wheel('aksak');
    expect(w!.beats.map((b) => b.pulses)).toEqual([2, 2, 3]);
    expect(w!.swing!.pairs.length).toBe(2);
    expect(w!.swing!.even.length).toBe(3);
    // (the second pulse of a pair starts at the share, .6, of the pair: its pair's start + 2/7 of the turn × .6)
    const p = w!.swing!.pairs[0]!;
    expect(round(p.split)).toBe(round(w!.pulses[1]!.t0));
    expect(round(p.split)).toBe(round((2 / 7) * 0.6));
  });

  it('leans nothing in 12/8, which has no swing=, and 5/4 swings each of its five beats', () => {
    expect(wheel('twelve').w!.swing).toBeNull();
    expect(wheel('twelve').w!.pulses.length).toBe(12);
    expect(wheel('five').w!.swing!.pairs.length).toBe(5);
  });

  it('is null for a meter that is a scan, and for a cell that is no meter', () => {
    const scan = compilePiece('&bar scan(1 1 1 1) step=120bpm\n&a step=4n 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&a * &v]');
    expect(meterWheel(scan, 'bar')).toBeNull();
    expect(meterWheel(scan, 'a')).toBeNull();
  });

  it('draws every example’s meter, or none: pulses fill the turn once, in order, and beats cover them', () => {
    for (const [key, e] of Object.entries(EXAMPLES)) {
      const r = compilePiece(e.source);
      if (!r.ok) continue;
      for (const [name, c] of r.cells) {
        if (!c.meter) continue;
        const w = meterWheel(r, name);
        if (!w) continue;
        expect(w.pulses[0]!.t0, `${key} &${name}`).toBeCloseTo(0, 9);
        expect(w.pulses.at(-1)!.t1, `${key} &${name}`).toBeCloseTo(1, 9);
        w.pulses.forEach((p, i) => i && expect(p.t0, `${key} &${name}`).toBeCloseTo(w.pulses[i - 1]!.t1, 9));
        expect(
          w.beats.reduce((a, b) => a + b.pulses, 0),
          `${key} &${name}`,
        ).toBe(w.pulses.length);
        for (const p of w.swing?.pairs ?? []) expect(p.split, `${key} &${name}`).toBeGreaterThan(p.t0);
      }
    }
  });
});

describe('a selector’s section on its meter’s wheel (#701)', () => {
  const r = compilePiece(EXAMPLES.arrangement.source);
  if (!r.ok) throw new Error('arrangement does not compile');
  it('is the section the selector picks alone: k of its table’s n; none while it picks several or none', () => {
    const at = (s: number) => {
      const live = liveAt(r, codeShifts(r), new Set(), s);
      return selectorSection(r, 'bar', (n) => live.cells.get(n)?.entries);
    };
    expect(at(0)).toEqual({ k: 0, n: 3 });
    expect(at(9)).toBeNull();
    expect(at(40)).toBeNull();
  });
  it('is none for a meter no selector steps', () => {
    expect(selectorSection(r, 'tempo', () => new Set([0]))).toBeNull();
  });
});
