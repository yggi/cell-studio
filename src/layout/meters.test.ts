import { describe, expect, it } from 'vitest';
import { isGround, meterIndex, meterNow, meterRings } from './meters';
import { liveAt } from '../engine/live';
import { codeShifts } from '../engine/program';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';

const graphOf = (src: string) => buildGraph(compileSource(src));
const name = (id: string) => id.replace(/^cell:/, '');

describe('meters as ground', () => {
  it('a step into a meter is ground (not drawn); a step into anything else, or through a belt, is drawn', () => {
    for (const key of ['fifths', 'automaton', 'soundtape'] as const) {
      const m = buildGraph(compileSource(PRESETS[key].source));
      const byId = new Map(m.nodes.map((n) => [n.id, n]));
      for (const e of m.edges.filter((e) => e.kind === 'step')) {
        const meter = (byId.get(e.target) as { isMeter?: boolean }).isMeter;
        const belted = typeof byId.get(e.source)!.cell.params.belt === 'number';
        expect(isGround(e, byId), `${key}: ${e.id}`).toBe(!!meter && !belted);
      }
      for (const e of m.edges.filter((e) => e.kind !== 'step')) expect(isGround(e, byId)).toBe(false);
    }
  });

  it('two meters: each has its colour, in the order written; each cell wears the ring of the one that steps it, with its rate', () => {
    const m = graphOf(PRESETS.bossa.source);
    const index = new Map([...meterIndex(m)].map(([id, i]) => [name(id), i]));
    expect([...index.keys()]).toEqual(['bar', 'clave']);
    const rings = new Map([...meterRings(m)].map(([id, r]) => [name(id), r]));
    // (the clave is a meter stepped by the bar: it wears the bar's ring)
    expect(rings.get('clave')?.meter).toBe(0);
    expect(rings.get('rim')?.meter).toBe(1);
    expect(rings.get('strum')?.meter).toBe(1);
    expect(rings.get('bassline')?.meter).toBe(0);
    expect(rings.has('bar')).toBe(false);
  });

  it('the rate is the edge’s own label', () => {
    const m = graphOf('&bar scan(1 1 1 1) step=120bpm\n&a step=&bar/2 0 2\n&b step=&bar 0\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&a * &v, &b * &v]');
    const rings = new Map([...meterRings(m)].map(([id, r]) => [name(id), r.rate]));
    expect(rings.get('a')).toBe('÷2');
    expect(rings.get('b')).toBe('');
  });
});

describe('a meter now, on its own wheel', () => {
  // a swung bar: the first beat two thirds of it, the second a third
  const swung = [
    { index: 0, t0: 0, t1: 2 / 3 },
    { index: 1, t0: 2 / 3, t1: 1 },
  ];
  it('is through its beat within that beat’s stretch of the wheel', () => {
    expect(meterNow(swung, 0)).toEqual({ turn: 0, at: 0 });
    expect(meterNow(swung, 0.5)!.turn).toBeCloseTo(1 / 3);
    expect(meterNow(swung, 1)).toEqual({ turn: 2 / 3, at: 1 });
    expect(meterNow(swung, 1.5)!.turn).toBeCloseTo(5 / 6);
  });
  it('is nothing for a beat the wheel doesn’t have', () => expect(meterNow(swung, 2)).toBeNull());
  it('the live state says where each clock is in its cycle, in beats', () => {
    const r = compileSource('&bar scan(1 1 1 1) step=120bpm\n&a step=&bar 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&a * &v]');
    for (const s of [0, 0.25, 0.6, 1.9, 2.1]) {
      const at = liveAt(r, codeShifts(r), new Set(), s).beatAt.get('bar')!;
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThan(4);
      expect(at).toBeCloseTo((s * 2) % 4, 6); // (120 bpm: two beats a second)
    }
  });
});
