import { describe, expect, it } from 'vitest';
import { bridgeOf, EXCITER_RING, tinePlaces } from './tines';

describe('a resonator of tines drawn as a kalimba', () => {
  const tines = tinePlaces(70, [0, 2, 4, 7, 9, 12]);

  it('puts each tine where its pad was: evenly round the wheel, the first at the top', () => {
    expect(tines.map((t) => t.turn)).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]);
  });

  it('reaches each out to its strand, at the loom', () => {
    for (const t of tines) expect(t.outer).toBe(70 * EXCITER_RING);
  });

  it('makes a higher tine shorter, an octave √2 shorter', () => {
    const len = tines.map((t) => t.outer - t.inner);
    expect(len[0]).toBeGreaterThan(len[1]);
    expect(len[0] / len[5]).toBeCloseTo(Math.SQRT2, 5);
  });

  it('holds every tine under the bridge, clear of the hub', () => {
    for (const t of tines) {
      expect(t.inner).toBeLessThan(bridgeOf(70));
      expect(t.inner).toBeGreaterThan(70 * 0.3);
    }
  });

  it('draws one for one exciter and none for none', () => {
    expect(tinePlaces(70, [0])).toHaveLength(1);
    expect(tinePlaces(70, [])).toEqual([]);
  });
});
