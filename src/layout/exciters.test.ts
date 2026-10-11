import { describe, expect, it } from 'vitest';
import { bridgeOf, EXCITER_RING, exciterPlaces, materialOf } from './exciters';

describe('a resonator drawn as its body', () => {
  const tines = exciterPlaces('tine', 70, [0, 2, 4, 7, 9, 12]);
  const len = (p: { inner: number; outer: number }) => p.outer - p.inner;

  it('puts each exciter evenly round the wheel, the first at the top, a single one at the top', () => {
    expect(tines.map((t) => t.turn)).toEqual([0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6]);
    expect(exciterPlaces('fork', 70, [0]).map((t) => t.turn)).toEqual([0]);
  });

  it('reaches each out to its strand, at the loom', () => {
    for (const body of ['tine', 'bar', 'pipe', 'wire', 'bell', 'fork', 'plate', 'box', 'spring'])
      for (const t of exciterPlaces(body, 70, [0, 7])) expect(t.outer).toBe(70 * EXCITER_RING);
  });

  it('sizes each element by its pitch, as its body rings: a tine √2 shorter an octave up, a pipe half', () => {
    expect(len(tines[0]) / len(tines[5])).toBeCloseTo(Math.SQRT2, 5);
    const pipes = exciterPlaces('pipe', 100, [0, 12]);
    expect(len(pipes[0]) / len(pipes[1])).toBeCloseTo(2, 5);
    const strings = exciterPlaces('wire', 70, [0, 12]);
    expect(len(strings[0])).toBe(len(strings[1]));
    expect(strings[1].scale).toBeLessThan(strings[0].scale);
  });

  it('holds every tine under the bridge, clear of the hub', () => {
    for (const t of tines) {
      expect(t.inner).toBeLessThan(bridgeOf(70));
      expect(t.inner).toBeGreaterThan(70 * 0.3);
    }
  });

  it('draws none for none', () => {
    expect(exciterPlaces('tine', 70, [])).toEqual([]);
  });

  it('makes each body of its material', () => {
    expect(['fork', 'tine', 'bar', 'wire', 'pipe', 'nothing'].map(materialOf)).toEqual(['brass', 'steel', 'wood', 'spruce', 'organ', 'brass']);
  });
});
