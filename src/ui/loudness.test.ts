import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { PRESETS } from '@yggi/cells/engine/presets';
import { FLOOR_DB, lapOf, levelOf, LoudRing, Score, SCORE_SLOTS } from './loudness';

describe('levelOf', () => {
  it('reads amplitudes on the dB scale, the floor 0 and full scale 1', () => {
    expect(levelOf(1)).toBe(1);
    expect(levelOf(2)).toBe(1);
    expect(levelOf(0)).toBe(0);
    expect(levelOf(10 ** (FLOOR_DB / 20))).toBeCloseTo(0);
    expect(levelOf(10 ** (FLOOR_DB / 40))).toBeCloseTo(0.5);
  });
});

describe('LoudRing', () => {
  it('keeps the loudest level heard in a slot this lap', () => {
    const r = new LoudRing(4);
    r.write(0.1, 0, 0.3);
    r.write(0.2, 0, 0.8);
    r.write(0.22, 0, 0.5);
    expect(r.level[0]).toBeCloseTo(0.8);
  });
  it('fills the slots passed over between two writes', () => {
    const r = new LoudRing(8);
    r.write(0, 0, 0.2);
    r.write(0.6, 0, 0.9);
    expect([...r.level].map((v) => +v.toFixed(1))).toEqual([0.2, 0.9, 0.9, 0.9, 0.9, 0, 0, 0]);
  });
  it('a new lap replaces each slot as it reaches it; ahead of it, the last lap stays, older', () => {
    const r = new LoudRing(4);
    for (const p of [0, 0.25, 0.5, 0.75]) r.write(p, 0, 0.9);
    r.write(0.1, 1, 0.2);
    expect(r.level[0]).toBeCloseTo(0.2);
    expect(r.level[2]).toBeCloseTo(0.9);
    expect(r.fresh(0, 1)).toBe(1);
    expect(r.fresh(2, 1)).toBeLessThan(1);
    expect(r.fresh(2, 3)).toBe(0);
  });
  it('round the end of a lap: the last lap keeps its tail, the new one starts at 0', () => {
    const r = new LoudRing(4);
    r.write(0.3, 0, 0.5);
    r.write(0.3, 1, 0.7);
    expect(r.lap[2]).toBe(0);
    expect(r.lap[0]).toBe(1);
    expect(r.level[1]).toBeCloseTo(0.7);
  });
});

describe('lapOf and Score', () => {
  const pop = compileSource(PRESETS.pop.source);
  it('a lap is a bar of the main meter, between 1.5 and 8 s; 2 s without a meter', () => {
    const lap = lapOf(pop, codeShifts(pop));
    const long = lap.q(lap.steps) - lap.q(0);
    expect(long).toBeGreaterThanOrEqual(1.5);
    expect(long).toBeLessThanOrEqual(8);
    const tone = compileSource('&a loop=A4');
    expect(lapOf(tone, codeShifts(tone)).steps).toBe(2);
  });
  it("the score's shape: where a voice plays over the lap, sampled a slot at a time", () => {
    const s = new Score(pop, codeShifts(pop), new Set(), 30);
    let guard = 0;
    while (s.advance(3) && guard++ < 100);
    expect(s.filled).toBe(SCORE_SLOTS);
    const played = [...s.voices.keys()];
    expect(played.length).toBeGreaterThan(0);
    const shape = s.shape(played);
    expect(Math.max(...shape)).toBeCloseTo(0.85);
    expect(s.shape(['cell:nothing']).every((v) => v === 0)).toBe(true);
  });
});
