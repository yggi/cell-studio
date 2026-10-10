// Probe (not part of the gate): the tower and the graph balanced (src/layout/towerfit.ts). Each piece laid out with
// its nodes drawn, weakly, to the height their time scale has in the graph as it stands (`towerPull`), against none;
// the library's sums (quality.ts) and how far height follows the tower (Spearman's ρ over the nodes with a finite
// height), the mean over seeds.
// Run: PROBE=out.txt npx vitest run tools/probe/tower-balance.test.ts (SEEDS=0,1,2,3, PULLS=0,0.02,0.05,0.1)
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '../../src/engine/presets';
import { compileSource } from '../../src/engine/compile';
import { buildGraph } from '../../src/engine/graph';
import { ForceLayout } from '../../src/layout/physics';
import { towerSpans } from '../../src/layout/tower';

const SEEDS = (process.env.SEEDS ?? '0,1,2,3').split(',').map(Number);
const PULLS = (process.env.PULLS ?? '0,0.02,0.05,0.1').split(',').map(Number);

const ranks = (xs: readonly number[]) => {
  const order = xs.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
  const r = new Array<number>(xs.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) r[order[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
};
const spearman = (a: readonly number[], b: readonly number[]) => {
  const [ra, rb] = [ranks(a), ranks(b)];
  const m = (a.length - 1) / 2;
  let num = 0,
    da = 0,
    db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (ra[i] - m) * (rb[i] - m);
    da += (ra[i] - m) ** 2;
    db += (rb[i] - m) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
};

describe.runIf(process.env.PROBE)('the tower and the graph, balanced', () => {
  it('lays the library out under each pull', () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    const pieces = Object.values(PRESETS).map((p) => {
      const program = compileSource(p.source);
      const model = buildGraph(program);
      return { model, tower: new Map([...towerSpans(program, model)].map(([id, s]) => [id, s.at])) };
    });
    log(`pull     crossings   cost   area Mpx²   ρ height~tower   (library sums, ρ the mean over pieces; mean of seeds ${SEEDS.join(',')})`);
    for (const pull of PULLS) {
      let crossings = 0,
        cost = 0,
        area = 0,
        rho = 0,
        n = 0;
      for (const seed of SEEDS)
        for (const { model, tower } of pieces) {
          const l = new ForceLayout(undefined, { live: false, seed, tower, towerPull: pull });
          l.setGraph(model);
          l.tick(500);
          l.layNet();
          const q = l.quality();
          crossings += q.crossings;
          cost += q.cost;
          area += (q.width * q.height) / 1e6;
          const pts = model.nodes.flatMap((g) => {
            const at = tower.get(g.id);
            const p = l.position(g.id);
            return p && at !== undefined && Number.isFinite(at) ? [{ at, up: -p.y }] : [];
          });
          if (pts.length > 2) {
            rho += spearman(
              pts.map((p) => p.at),
              pts.map((p) => p.up),
            );
            n++;
          }
          l.destroy();
        }
      const s = SEEDS.length;
      log(
        `${String(pull).padEnd(8)} ${(crossings / s).toFixed(1).padStart(9)} ${(cost / s).toFixed(1).padStart(6)} ${(area / s).toFixed(1).padStart(10)} ${(rho / n).toFixed(3).padStart(14)}`,
      );
    }
  }, 3_600_000);
});
