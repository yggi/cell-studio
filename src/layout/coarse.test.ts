import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { cellView, type Fill, type Segment } from './cellview';
import { BORDER, MAX_SEGMENTS, border, coarsen } from './coarse';

const rest: Fill = { kind: 'rest' };
const note = (hue: number, alter = 0): Fill => ({ kind: 'pitch', hue, octave: 4, alter });
const lvl = (v: number): Fill => ({ kind: 'level', v });

/** A braid of n equal steps; `at` says which fills the steps that aren't rests have. */
function braid(n: number, at: Record<number, Fill[]> = {}): Segment[] {
  return Array.from({ length: n }, (_, i) => ({
    t0: i / n,
    t1: (i + 1) / n,
    index: i,
    bands: at[i] ?? [rest],
    notes: at[i] ? at[i].map((_, k) => ({ semis: i + k, value: i, alter: 0, lap: 12 })) : undefined,
  }));
}

describe('coarsen', () => {
  it('returns a braid at or under the cap as it is', () => {
    const s = braid(MAX_SEGMENTS, { 3: [note(10)] });
    expect(coarsen(s)).toBe(s);
    const few = braid(5);
    expect(coarsen(few, 4)).not.toBe(few);
    expect(coarsen(few, 5)).toBe(few);
  });

  it('buckets by angle: no merged segment is longer than 1/cap of a turn, and the turn is still covered', () => {
    const s = braid(1000);
    const out = coarsen(s, 100);
    expect(out.length).toBeGreaterThan(80);
    expect(out.length).toBeLessThanOrEqual(100);
    for (const o of out) expect(o.t1 - o.t0).toBeLessThanOrEqual(1 / 100 + 1e-9);
    expect(out[0].t0).toBe(0);
    expect(out.at(-1)!.t1).toBeCloseTo(1);
    // neighbours touch: nothing is lost between buckets
    out.slice(1).forEach((o, i) => expect(o.t0).toBeCloseTo(out[i].t1));
  });

  it('draws a bucket as its first note, not as the rest in front of it', () => {
    // steps 20..29 are one bucket (cap 100 → 10 steps): rests, then a note at 23 and another at 26
    const out = coarsen(braid(1000, { 23: [note(100)], 26: [note(200)] }), 100);
    const b = out.find((o) => o.t0 <= 23 / 1000 + 1e-9 && o.t1 > 23 / 1000)!;
    expect(b.bands).toEqual([note(100)]);
    expect(b.notes).toHaveLength(1);
    expect(b.notes![0].value).toBe(23);
  });

  it('keeps an accidental striped (its alteration is its own)', () => {
    const out = coarsen(braid(1000, { 5: [note(30, 1)] }), 100);
    expect(out[0].bands).toEqual([note(30, 1)]);
  });

  it('is a rest only when every member is', () => {
    const out = coarsen(braid(1000, { 55: [note(1)] }), 100);
    expect(out[0].bands).toEqual([rest]);
    expect(out.filter((o) => o.bands[0].kind === 'rest')).toHaveLength(out.length - 1);
  });

  it('spans the union of its members: the playhead finds the bucket for any of their times', () => {
    const s = braid(1000, { 3: [note(1)] });
    const out = coarsen(s, 100);
    const hit = (t: number) => out.filter((o) => t >= o.t0 - 1e-9 && t < o.t1 - 1e-9);
    for (const sg of s) expect(hit(sg.t0 + 1e-6)).toHaveLength(1);
    expect(out[0]).toMatchObject({ t0: 0, index: 0 });
    expect(out[0].t1).toBeCloseTo(0.01);
  });

  it('shows the highest level of a bucket (show=levels), and a level beats a rest', () => {
    const out = coarsen(braid(1000, { 1: [lvl(0.2)], 4: [lvl(0.9)], 7: [lvl(0.5)], 12: [lvl(0.1)] }), 100);
    expect(out[0].bands).toEqual([lvl(0.9)]);
    expect(out[1].bands).toEqual([lvl(0.1)]);
    expect(out[2].bands).toEqual([rest]);
  });

  it("keeps a chord a chord: the bands are the picked step's own, never mixed across steps", () => {
    const chord = [note(10), note(20), note(30)];
    const out = coarsen(braid(1000, { 2: [note(5)], 3: chord, 6: [note(40), note(50)] }), 100);
    // the first non-rest member is the single note at 2, so it's one band …
    expect(out[0].bands).toEqual([note(5)]);
    // … and when the chord comes first, all three bands stay
    const out2 = coarsen(braid(1000, { 2: chord, 3: [note(5)] }), 100);
    expect(out2[0].bands).toEqual(chord);
    expect(out2[0].notes).toHaveLength(3);
  });

  it('does not merge a step longer than a bucket: long notes keep their length', () => {
    const s: Segment[] = [
      ...braid(400).map((x) => ({ ...x, t0: x.t0 * 0.5, t1: x.t1 * 0.5 })), // first half: 400 steps
      { t0: 0.5, t1: 0.75, index: 400, bands: [note(7)] }, // a long note, a quarter turn
      ...braid(400).map((x) => ({ ...x, t0: 0.75 + x.t0 * 0.25, t1: 0.75 + x.t1 * 0.25, index: 401 + x.index })),
    ];
    const out = coarsen(s, 100);
    expect(out.find((o) => o.t0 === 0.5 && o.t1 === 0.75)!.bands).toEqual([note(7)]);
    expect(out.length).toBeLessThan(100);
  });

  it('a segment that would run past the bucket starts the next one', () => {
    // 3 equal steps of 0.4/3 then more: with cap 5 (0.2 a bucket) two fit, the third opens a new bucket
    const n = 15;
    const out = coarsen(braid(n), 5);
    expect(out.map((o) => +((o.t1 - o.t0) * n).toFixed(3))).toEqual([3, 3, 3, 3, 3]);
  });
});

describe('coarsen on the Prelude', () => {
  const r = compileSource(readFileSync('examples/bwv847.cells', 'utf8'));
  const sh = codeShifts(r);

  it('brings the long braids to about the cap, and leaves what is under it alone', () => {
    for (const n of ['lh', 'rh', 'lhFigure', 'rhFigure', 'alto', 'bass', 'soprano']) {
      const v = cellView(r, n, sh, false)!;
      const out = coarsen(v.segments);
      expect(v.segments.length, n).toBeGreaterThan(MAX_SEGMENTS);
      expect(out.length, n).toBeLessThanOrEqual(MAX_SEGMENTS * 1.25);
      // every note survives: each pitched segment lies inside a pitched bucket
      const pitched = v.segments.filter((s) => s.bands.some((f) => f.kind === 'pitch'));
      for (const s of pitched) {
        const b = out.find((o) => s.t0 >= o.t0 - 1e-9 && s.t1 <= o.t1 + 1e-9)!;
        expect(
          b.bands.some((f) => f.kind === 'pitch'),
          `${n} at ${s.t0}`,
        ).toBe(true);
      }
    }
    for (const n of ['subject', 'alto4']) {
      const v = cellView(r, n, sh, false)!;
      expect(coarsen(v.segments)).toBe(v.segments);
    }
  });
});

describe('border', () => {
  it('is full on wide segments, none on merged ones, and tapers between', () => {
    const deg = (d: number) => d / 360;
    expect(border(deg(30))).toBe(BORDER);
    expect(border(deg(6))).toBe(BORDER);
    expect(border(deg(360 / MAX_SEGMENTS))).toBe(0); // a bucket
    expect(border(deg(2.5))).toBe(0);
    expect(border(0.0003)).toBe(0);
    const mid = border(deg(4));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(BORDER);
    expect(border(deg(5))).toBeGreaterThan(mid); // (monotone)
  });
});
