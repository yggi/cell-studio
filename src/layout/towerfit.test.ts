import { describe, expect, it } from 'vitest';
import { towerFit } from './towerfit';

describe('the tower fitted to the graph', () => {
  it('follows the graph where it already rises with the tower, interpolating between', () => {
    const f = towerFit([
      { at: 0, y: 300 },
      { at: 1, y: 200 },
      { at: 3, y: 0 },
    ])!;
    expect(f(0)).toBe(300);
    expect(f(1)).toBe(200);
    expect(f(2)).toBe(100);
    expect(f(-5)).toBe(300);
    expect(f(9)).toBe(0);
  });

  it('pools what runs against it: never lower in the graph for higher on the tower', () => {
    const f = towerFit([
      { at: 0, y: 300 },
      { at: 1, y: 100 },
      { at: 2, y: 200 },
      { at: 3, y: 0 },
    ])!;
    for (let d = 0; d < 3; d += 0.25) expect(f(d + 0.25)).toBeLessThanOrEqual(f(d) + 1e-9);
    expect(f(1)).toBeCloseTo(f(2), 6);
  });

  it('needs two heights on the tower; the constant and the card take no part', () => {
    expect(towerFit([{ at: 1, y: 0 }])).toBeNull();
    expect(
      towerFit([
        { at: -Infinity, y: 500 },
        { at: 1, y: 0 },
        { at: Infinity, y: -500 },
      ]),
    ).toBeNull();
  });
});

describe('the tower pulls the graph, weakly', () => {
  it('a node drawn to its time scale’s height: the graph’s heights follow the tower more', async () => {
    const { ForceLayout } = await import('./physics');
    const { buildGraph } = await import('../engine/graph');
    const { compileSource } = await import('../engine/compile');
    const { PRESETS } = await import('../engine/presets');
    const { towerSpans } = await import('./tower');
    const program = compileSource(PRESETS.pop.source);
    const model = buildGraph(program);
    const tower = new Map([...towerSpans(program, model)].map(([id, s]) => [id, s.at]));
    // (pairs on the tower in order whose graph heights are in order too: the share the graph agrees with the tower)
    const agreement = (pull: number) => {
      const l = new ForceLayout(undefined, { live: false, seed: 0, tower, towerPull: pull });
      l.setGraph(model);
      l.tick(400);
      const pts = [...tower].flatMap(([id, at]) => (Number.isFinite(at) && l.position(id) ? [{ at, up: -l.position(id)!.y }] : []));
      l.destroy();
      let agree = 0;
      let pairs = 0;
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++)
          if (pts[i].at !== pts[j].at) {
            pairs++;
            if (pts[i].at < pts[j].at === pts[i].up < pts[j].up) agree++;
          }
      return agree / pairs;
    };
    expect(agreement(0.2)).toBeGreaterThan(agreement(0));
  });
});
