// Probe (not part of the gate): what each force of the layout does to the library's drawing. The whole library laid
// out with today's options, with the start alone (no physics), and with each force switched off in turn; per variant
// the library's sums of the layout's numbers (quality.ts), the mean over seeds.
// Run: PROBE=out.txt npx vitest run tools/probe/forces.test.ts
// (SEEDS=0,1,2, VARIANTS=name,name, TICKS=500, CUSTOM="half spread:spread=0.25;…")
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from '../../src/layout/drawn';
import { ForceLayout } from '../../src/layout/physics';
import type { LayoutOptions } from '../../src/layout/options';

const SEEDS = (process.env.SEEDS ?? '0').split(',').map(Number);
const TICKS = Number(process.env.TICKS ?? 500);
const off = (k: keyof LayoutOptions): [string, Partial<LayoutOptions>] => [`no ${k}`, { [k]: 0 } as Partial<LayoutOptions>];
const VARIANTS: [string, Partial<LayoutOptions>, number?][] = [
  ['today', {}],
  ['start only', {}, 0],
  ...(
    [
      'uncross',
      'straighten',
      'avoid',
      'contract',
      'rankPull',
      'centre',
      'columnPull',
      'spread',
      'kindRepel',
      'tagPull',
      'tagRepel',
      'mux',
      'massRepel',
      'degreeRepel',
      'netPull',
      'placeLast',
    ] as (keyof LayoutOptions)[]
  ).map(off),
];

// (CUSTOM="name:key=v,key=v;name:…": variants of several changes at once, after these)
const custom: [string, Partial<LayoutOptions>][] = (process.env.CUSTOM ?? '')
  .split(';')
  .filter(Boolean)
  .map((v) => {
    const [name, kv] = v.split(':');
    return [
      name,
      Object.fromEntries(
        (kv ?? '')
          .split(',')
          .filter(Boolean)
          .map((p) => [p.split('=')[0], Number(p.split('=')[1])]),
      ),
    ];
  });
VARIANTS.push(...custom);

describe.runIf(process.env.PROBE)('the forces, one at a time', () => {
  it('lays the library out under each variant', () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    const only = process.env.VARIANTS?.split(',');
    const models = Object.entries(PRESETS).map(([key, p]) => ({ key, model: buildGraph(compileSource(p.source)) }));
    log(`variant              crossings   cost  intruders clusters overlap   area   (library sums, mean of seeds ${SEEDS.join(',')})`);
    for (const [name, opts, ticks] of VARIANTS) {
      if (only && !only.includes(name)) continue;
      const sum = { crossings: 0, cost: 0, intruders: 0, clusters: 0, overlap: 0, area: 0 };
      for (const seed of SEEDS)
        for (const { model } of models) {
          const l = new ForceLayout(undefined, { live: false, seed, ...opts });
          l.setGraph(model);
          l.tick(ticks ?? TICKS);
          l.layNet();
          const q = l.quality();
          sum.crossings += q.crossings;
          sum.cost += q.cost;
          sum.intruders += q.intruders;
          sum.clusters += q.clusters;
          sum.overlap += q.overlap;
          sum.area += (q.width * q.height) / 1e6;
          l.destroy();
        }
      const m = (v: number) => (v / SEEDS.length).toFixed(1).padStart(8);
      log(`${name.padEnd(18)} ${m(sum.crossings)} ${m(sum.cost)} ${m(sum.intruders)} ${m(sum.clusters)} ${m(sum.overlap)} ${m(sum.area)}`);
    }
  }, 3_600_000);
});
