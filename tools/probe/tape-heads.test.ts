// Probe (not part of the gate): a tape's read heads as bulbs on its wheel, as a braid's splices (decision 014) and a
// table's taps (decision 016) are. For every tape in the library: each head, what it takes besides the tape (its
// edges in), what reads it (its edges out, by port), how many readers, its drawn show, and whether it would pass a
// rule "a cell whose only input is its host, read by edges that can leave from its bulb", and whether the graph
// draws it as one. Then, per piece, every cell its own node (`bulbs: false`: the heads as they were drawn) against
// the graph as drawn (the heads bulbs on their tape): nodes, crossings and overlap at rest, over three seeds.
// Run: PROBE=out.txt npx vitest run tools/probe/tape-heads.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compileSource } from '@yggi/cells/engine/compile';
import { type GraphModel } from '@yggi/cells/engine/graph';
import { buildGraph } from '../../src/layout/drawn';
import { effectiveShow } from '../../src/layout/show';
import { ForceLayout } from '../../src/layout/physics';

function rest(model: GraphModel, seed: number) {
  const l = new ForceLayout(undefined, { live: false, seed });
  l.setGraph(model);
  l.tick(500);
  l.layNet();
  const q = l.quality();
  l.destroy();
  return q;
}

describe.runIf(process.env.PROBE)('tape heads as bulbs', () => {
  it('measures every tape in the library', { timeout: 600_000 }, () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    const only = process.env.ONLY;
    log('piece          tape     head      in (besides play)   out (port×n)              show     passes, drawn');
    const summary: string[] = [];
    for (const [key, { source }] of Object.entries(PRESETS)) {
      if (only && !key.includes(only)) continue;
      const r = compileSource(source);
      const tapes = [...r.cells.values()].filter((c) => typeof c.params.write === 'string' || [...r.cells.values()].some((h) => h.params.play === c.name));
      if (!tapes.length) continue;
      const model = buildGraph(r, { bulbs: false });
      const drawn = buildGraph(r);
      const ids = new Set(model.nodes.map((n) => n.id));
      for (const t of tapes) {
        for (const h of [...r.cells.values()].filter((h) => h.params.play === t.name)) {
          const id = `cell:${h.name}`;
          const ins = model.edges.filter((e) => e.to === id && e.from !== `cell:${t.name}` && e.port !== 'about');
          const outs = model.edges.filter((e) => e.from === id && e.port !== 'about');
          const ports = [...new Set(outs.map((e) => e.port))].map((p) => `${p}×${outs.filter((e) => e.port === p).length}`).join(' ');
          const passes = ids.has(id) && ins.length === 0;
          log(
            `${key.padEnd(14)} ${t.name.padEnd(8)} ${h.name.padEnd(9)} ${(ins.map((e) => `${e.port}:${e.from.slice(5)}`).join(' ') || '–').padEnd(19)} ${ports.padEnd(25)} ${effectiveShow(r, h.name).show.padEnd(8)} ${passes ? 'yes' : 'no'}${drawn.bulbs.get(h.name) === t.name ? ', a bulb' : ''}`,
          );
        }
      }
      const seeds = [0, 1, 2];
      const a = seeds.map((s) => rest(model, s));
      const b = seeds.map((s) => rest(drawn, s));
      const mean = (qs: { crossings: number; overlap: number }[], k: 'crossings' | 'overlap') => (qs.reduce((x, q) => x + q[k], 0) / qs.length).toFixed(1);
      summary.push(
        `${key.padEnd(14)} ${String(model.nodes.length).padStart(3)} → ${String(drawn.nodes.length).padStart(3)}   ${mean(a, 'crossings').padStart(5)} → ${mean(b, 'crossings').padStart(5)}   ${mean(a, 'overlap').padStart(5)} → ${mean(b, 'overlap').padStart(5)}`,
      );
    }
    log('\npiece          nodes        crossings        overlap   (every cell a node → heads as bulbs, mean of seeds 0 1 2)');
    for (const s of summary) log(s);
  });
});
