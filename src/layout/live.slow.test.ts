// Lifted from yggi/cells src/engine/timing.slow.test.ts @ 435243f, its live view's ceiling: the view lives in Cell studio
// (cells decision 086, #650). A wall-clock ceiling, so in the slow tier.
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { resolveSeed } from '@yggi/cells/repository/library';
import { liveAt } from './live';

describe('what the live view costs', () => {
  it('the heads at rest of an example take under 50 ms, on average over every example', () => {
    const t0 = performance.now();
    let n = 0;
    for (const p of Object.values(EXAMPLES)) {
      const r = compileSource(p.source, undefined, { resolve: resolveSeed });
      liveAt(r, codeShifts(r), r.off, 0);
      n++;
    }
    expect((performance.now() - t0) / n).toBeLessThan(50);
  });
});
