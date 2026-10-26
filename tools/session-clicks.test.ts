import { describe, expect, it } from 'vitest';
import { clean, clicksAt, type Bar, type Blocks } from './session-clicks';

const BLOCK = 128 / 48000;
/**
 * Blocks of 128 samples at 48 kHz over 20 s: a steady level of 0.1, struck to 0.5 at each of `hits` (seconds) and
 * decaying back over 10 blocks, some 3 dB a block (a drum's decay), and cut dead at each of `cuts` for 0.2 s.
 */
const blocks = (hits: readonly number[], cuts: readonly number[] = []): Blocks => {
  const t: number[] = [];
  for (let x = 0; x < 20; x += BLOCK) t.push(x);
  const rms = t.map((x) => {
    if (cuts.some((c) => x >= c && x < c + 0.2)) return 0;
    const n = hits.map((h) => (x - h) / BLOCK).find((n) => n >= 0 && n < 10);
    return n === undefined ? 0.1 : 0.1 + 0.4 * 0.7 ** n;
  });
  return { t, peak: rms.map((r) => r * 1.4), rms };
};
/** Bars of 2 s from 1 s, a switch at bar 4 (9 s), each bar struck on its downbeat. */
const bars: Bar[] = Array.from({ length: 9 }, (_, i) => ({ bar: i, at: 1 + 2 * i, switched: i === 4 }));
const downbeats = bars.map((b) => b.at);

describe('a click at a switch, by level', () => {
  it('passes a switch whose level drops no faster than the bars’ around it: a drum’s decay at each', () => {
    const c = clicksAt(blocks(downbeats), bars);
    expect(c.switches).toEqual([{ bar: 4, drop: expect.closeTo(c.switches[0]!.reference, 9), reference: expect.any(Number), db: expect.closeTo(0, 9) }]);
    expect(c.switches[0]!.reference).toBeLessThan(10);
    expect(c.unchecked).toEqual([]);
    expect(c.loudest).toBeCloseTo(-3.1, 1);
    expect(clean(c)).toBe(true);
  });

  it('finds the notes cut at the bar line, and where the player rewires ahead of it', () => {
    for (const at of [8.95, 8.7]) {
      const c = clicksAt(blocks(downbeats, [at]), bars);
      // (from 0.1, −20 dBFS, to silence, counted as −100: 80 dB)
      expect(c.switches[0]!.drop).toBeCloseTo(80, 6);
      expect(clean(c)).toBe(false);
    }
  });

  it('counts no drop from below −40 dBFS: a quiet note’s end is no cut heard', () => {
    const quiet = blocks(downbeats, [8.7]);
    const c = clicksAt({ ...quiet, rms: quiet.rms.map((r) => r * 0.05) }, bars);
    expect(c.switches[0]!.db).toBeLessThan(6);
  });

  it('says what it couldn’t check, and silence is no pass', () => {
    const lone: Bar[] = [{ bar: 0, at: 5, switched: true }];
    expect(clicksAt(blocks(downbeats), lone).unchecked).toEqual([0]);
    expect(clean(clicksAt(blocks(downbeats), lone))).toBe(false);
    const quiet = blocks(downbeats);
    expect(clean(clicksAt({ ...quiet, peak: quiet.peak.map(() => 0.001) }, bars))).toBe(false);
  });
});
