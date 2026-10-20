import { describe, expect, it } from 'vitest';
import { groundsOf, levelsText, lineShare, meterIndex, meterNow, tapSwing } from './meters';
import { liveAt } from '@yggi/cells/engine/live';
import { codeShifts } from '@yggi/cells/engine/program';
import { buildGraph } from './drawn';
import { compileSource } from '@yggi/cells/engine/compile';
import { PRESETS } from '@yggi/cells/engine/presets';

const graphOf = (src: string) => buildGraph(compileSource(src));
const name = (id: string) => id.replace(/^cell:/, '');

describe('meters as ground', () => {
  it('a step into a meter is ground (not drawn); a step into anything else, or through a belt, is drawn', () => {
    for (const key of ['fifths', 'automaton', 'soundtape'] as const) {
      const m = buildGraph(compileSource(PRESETS[key].source));
      const byId = new Map(m.nodes.map((n) => [n.id, n]));
      const grounds = groundsOf(m);
      for (const e of m.edges.filter((e) => e.port === 'step')) {
        const meter = (byId.get(e.target) as { isMeter?: boolean }).isMeter;
        const belted = !!e.belt;
        expect(grounds.has(e.id), `${key}: ${e.id}`).toBe(!!meter && !belted);
      }
      for (const e of m.edges.filter((e) => e.port !== 'step')) expect(grounds.has(e.id)).toBe(false);
    }
  });

  it('two meters: each has its colour, in the order written', () => {
    const m = graphOf(PRESETS.bossa.source);
    const index = new Map([...meterIndex(m)].map(([id, i]) => [name(id), i]));
    expect([...index.keys()]).toEqual(['bar', 'clave']);
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
    const r = compileSource('&bar scan(1 1 1 1) step=120bpm\n&a step=4n 0 2\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&a * &v]');
    for (const s of [0, 0.25, 0.6, 1.9, 2.1]) {
      const at = liveAt(r, codeShifts(r), new Set(), s).beatAt.get('bar')!;
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThan(4);
      expect(at).toBeCloseTo((s * 2) % 4, 6); // (120 bpm: two beats a second)
    }
  });
});

describe('a meter’s feel (cells v0.4.0): its swing and its articulation by level', () => {
  const FEEL = '&bar meter("4/4", 2) step=120bpm swing=8n:2/3 legato=16n:.5,4n:.8\n';
  const r = compileSource(
    FEEL +
      '&a step=8n 0 2\n&b step=16n 0 2\n&c step=4n 0 2\n&d step=8t 0 2\n&e step=8n legato=1.5 0 2\n&f step=8n legato=free(.3, .1..1) 0\n&g step=8n legato=&l 0\n&l step=4n .5 1\n&v s=sine\n&out map=sample [&a * &v, &b * &v, &c * &v, &d * &v, &e * &v, &f * &v, &g * &v]',
  );
  it('has no diagnostics, so the rest reads a piece as written', () => expect(r.diagnostics).toEqual([]));
  it('writes its levels short, as swing= and legato= write them', () => {
    expect(levelsText(r.cells.get('bar')!.meter!.swing)).toBe('8n .67');
    expect(levelsText(r.cells.get('bar')!.meter!.legato)).toBe('16n .5, 4n .8');
    expect(levelsText(undefined)).toBeNull();
    expect(levelsText(compileSource('&bar meter("4/4") step=90bpm\n').cells.get('bar')!.meter!.swing)).toBeNull();
  });
  it('says a level that leans its pairs alone (swing=8n:r:pairs, cells v0.8.0)', () => {
    const odd = compileSource('&bar meter("7/8") step=120bpm swing=8n:2/3:pairs,16n:.55\n');
    expect(odd.diagnostics.filter((d) => d.severity === 'error' || /pairs/.test(d.message))).toEqual([]);
    expect(levelsText(odd.cells.get('bar')!.meter!.swing)).toBe('8n .67 pairs, 16n .55');
  });
  it('a tap is swung by a level its step divides into: eighths and sixteenths, not quarters, nor triplets', () => {
    expect(tapSwing(r, 'a').map((l) => l.level)).toEqual(['8n']);
    expect(tapSwing(r, 'b').map((l) => l.level)).toEqual(['8n']);
    expect(tapSwing(r, 'c')).toEqual([]);
    expect(tapSwing(r, 'd')).toEqual([]);
    expect(tapSwing(r, 'bar')).toEqual([]);
  });
  it('a line sounds its own legato=, a free()’s value, else its meter’s for its level; a cell of shares varies', () => {
    expect(lineShare(r, 'b')).toEqual({ share: 0.5, from: 'bar' });
    expect(lineShare(r, 'a')).toEqual({ share: 0.8, from: 'bar' }); // (8n: the finest level at or above it, 4n)
    expect(lineShare(r, 'e')).toEqual({ share: 1.5, from: null });
    expect(lineShare(r, 'f')).toEqual({ share: 0.3, from: null });
    expect(lineShare(r, 'g')).toBeNull();
    expect(lineShare(compileSource('&t step=4 0 2'), 't')).toEqual({ share: 1, from: null });
  });
});
