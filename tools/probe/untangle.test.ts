// Probe (not part of the gate): crossings and edges under foreign wheels, in both layouts (the signal path's and the
// tower's), over the library, three seeds — the products' meters hung under their voices, and what untangles them.
// Each example laid out as the app lays it out (500 ticks, layNet); the tower layout as tower-layout.test.ts lays it.
// Run: PROBE=out.txt npx vitest run tools/probe/untangle.test.ts   (ONLY=word; SEEDS=0,1,2; VARIANTS=0,2: those rows;
// LAYOUTS=flow,tower; WORST=8: the pieces with the most crossings, per layout; PIECES=1: every piece's, as JSON). docs/notes/untangle.md
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { ForceLayout } from '../../src/layout/physics';
import { type GraphModel } from '@yggi/cells/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '@yggi/cells/engine/compile';
import { PRESETS } from '@yggi/cells/engine/presets';
import { TOWER_LAYOUT, type LayoutOptions } from '../../src/layout/options';
import { towerSetup } from '../../src/ui/towerSetup';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');

type Variant = { name: string; opts: Partial<LayoutOptions> };
const VARIANTS: Variant[] = [
  { name: 'today', opts: {} },
  { name: 'one start, trials of 120 ticks, crossings alone (as before)', opts: { starts: 1, trial: 120, underWeight: 0 } },
  { name: '5 starts', opts: { starts: 5 } },
  { name: 'trials of 500 ticks', opts: { trial: 500 } },
  { name: 'an edge under weighs .25', opts: { underWeight: 0.25 } },
  { name: 'crossings alone', opts: { underWeight: 0 } },
  { name: 'no room under voices at the start', opts: { hangRoom: 0 } },
  { name: 'meter rise 40', opts: { meterRise: 40 } },
  { name: 'no meter rise', opts: { meterRise: 0 } },
  { name: 'edges clear 1', opts: { edgeClear: 1 } },
  { name: 'edges clear 3', opts: { edgeClear: 3 } },
];

type Row = { crossings: number; under: number; overlap: number };

const compiled = new Map<string, { program: ReturnType<typeof compileSource>; whole: GraphModel }>();
function measure(source: string, tower: boolean, opts: Partial<LayoutOptions>, seed: number): Row {
  if (!compiled.has(source)) {
    const program = compileSource(source);
    compiled.set(source, { program, whole: buildGraph(program) });
  }
  const { program, whole } = compiled.get(source)!;
  // (as the app lays it: graphLayout.svelte.ts)
  const setup = tower ? towerSetup(program, whole) : null;
  const model: GraphModel = setup?.model ?? whole;
  const l = new ForceLayout(undefined, { live: false, seed, ...(tower ? TOWER_LAYOUT : {}), ...opts, ...setup?.options });
  l.setGraph({ ...model, nodes: model.nodes.filter((n) => !n.petalOf) });
  l.tick(500);
  l.layNet();
  const q = l.quality();
  l.destroy();
  return { crossings: q.crossings, under: q.under, overlap: q.overlap > 10 ? 1 : 0 };
}

describe.runIf(process.env.PROBE)('untangling', () => {
  it('measures the library', () => {
    const only = process.env.ONLY;
    const pieces = Object.entries(PRESETS).filter(([k]) => !only || k.toLowerCase().includes(only.toLowerCase()));
    const pick = process.env.VARIANTS?.split(',').map(Number);
    const variants = pick ? VARIANTS.filter((_, i) => pick.includes(i)) : VARIANTS;
    const seeds = (process.env.SEEDS ?? '0,1,2').split(',').map(Number);
    const layouts = (process.env.LAYOUTS ?? 'flow,tower').split(',');
    log(`# Untangling (${pieces.length} pieces × ${seeds.length} seeds; library sums, mean over seeds)\n`);
    log('| variant | layout | crossings | under | pieces with an overlap |');
    log('|---|---|---|---|---|');
    for (const v of variants)
      for (const layout of layouts) {
        const by = new Map<string, Row>();
        const best = new Map<string, number>();
        for (const seed of seeds)
          for (const [key, p] of pieces) {
            const r = measure(p.source, layout === 'tower', v.opts, seed);
            best.set(key, Math.min(best.get(key) ?? Infinity, r.crossings));
            const acc = by.get(key) ?? { crossings: 0, under: 0, overlap: 0 };
            by.set(key, { crossings: acc.crossings + r.crossings / seeds.length, under: acc.under + r.under / seeds.length, overlap: acc.overlap + r.overlap / seeds.length });
          }
        const sum = (f: (r: Row) => number) => [...by.values()].reduce((n, r) => n + f(r), 0);
        if (process.env.BEST) log(`(best of the seeds, ${layout}: ${[...best.values()].reduce((a, b) => a + b, 0)})`);
        log(`| ${v.name} | ${layout} | ${sum((r) => r.crossings).toFixed(1)} | ${sum((r) => r.under).toFixed(1)} | ${sum((r) => r.overlap).toFixed(1)} |`);
        if (process.env.PIECES) log(`pieces ${v.name} ${layout} ${JSON.stringify(Object.fromEntries(by))}`);
        const worst = Number(process.env.WORST ?? 0);
        if (worst)
          log(
            `|  | ${layout}, most | ${[...by]
              .sort((a, b) => b[1].crossings - a[1].crossings)
              .slice(0, worst)
              .map(([k, r]) => `${k} ${r.crossings.toFixed(1)}/${r.under.toFixed(1)}`)
              .join(', ')} | | |`,
          );
      }
  }, 3_600_000);
});
