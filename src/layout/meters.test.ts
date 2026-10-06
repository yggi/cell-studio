import { describe, expect, it } from 'vitest';
import { isGround, meterIndex, meterRings } from './meters';
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
