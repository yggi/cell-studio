// Probe (not part of the gate): how well a tape faces its heads at what they connect to, with its read heads as nodes
// (today) and as bulbs on it (decision 021): each face's error (degrees), and the crossings, over three seeds.
// Run: PROBE=out.txt npx vitest run tools/probe/tape-aims.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from '../../src/layout/drawn';
import { tapeFaces } from '../../src/layout/aims';
import { ForceLayout } from '../../src/layout/physics';

describe.runIf(process.env.PROBE)('tape aims', () => {
  it('measures every tape', { timeout: 600_000 }, () => {
    const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
    log('piece        heads as   faces  err mean  err max  crossings  over its tape  (degrees; mean of seeds 0 1 2; edges from a head over its own tape, of all)');
    for (const key of ['echotape', 'soundtape', 'worn', 'testtones', 'resonanz', 'fiveto12'] as const) {
      for (const bulbs of [false, true]) {
        const model = buildGraph(compileSource(PRESETS[key].source), bulbs ? {} : { bulbs: false });
        const faces = tapeFaces(model);
        let sum = 0,
          max = 0,
          n = 0,
          cross = 0,
          over = 0,
          from = 0;
        for (const seed of [0, 1, 2]) {
          const l = new ForceLayout(undefined, { live: false, seed });
          l.setGraph(model);
          l.tick(500);
          l.layNet();
          cross += l.quality().crossings / 3;
          // (an edge from a head, its bulb's hub or its node, to what it plays into: over its tape's wheel, R = 70)
          for (const e of model.edges) {
            const tape = e.bulb && e.bulbAt ? e.from : model.edges.find((x) => x.port === 'play' && x.to === e.from)?.from;
            if (!tape || e.port === 'play' || e.to === tape) continue;
            const t = l.position(tape)!;
            const turn = (l.tapeTurn(tape)! * Math.PI) / 180 - (-90 * Math.PI) / 180;
            const a = e.bulbAt
              ? { x: t.x + e.bulbAt.x * Math.cos(turn) - e.bulbAt.y * Math.sin(turn), y: t.y + e.bulbAt.x * Math.sin(turn) + e.bulbAt.y * Math.cos(turn) }
              : l.position(e.from)!;
            const b = l.position(e.to);
            if (!b) continue;
            from++;
            const [dx, dy] = [b.x - a.x, b.y - a.y];
            const k = Math.max(0, Math.min(1, ((t.x - a.x) * dx + (t.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
            if (Math.hypot(a.x + dx * k - t.x, a.y + dy * k - t.y) < 70 * 0.9) over++;
          }
          for (const f of faces) {
            const turn = (l.tapeTurn(f.tape)! * Math.PI) / 180;
            const t = l.position(f.tape)!;
            const c = l.position(f.to)!;
            const d = Math.atan2(c.y - t.y, c.x - t.x) - (turn + f.offset);
            const e = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * (180 / Math.PI);
            sum += e;
            n++;
            max = Math.max(max, e);
          }
          l.destroy();
        }
        log(
          `${key.padEnd(12)} ${(bulbs ? 'bulbs' : 'nodes').padEnd(9)} ${String(faces.length).padStart(5)}  ${(sum / n).toFixed(0).padStart(8)}  ${max.toFixed(0).padStart(7)}  ${cross.toFixed(1).padStart(9)}  ${String(over).padStart(4)} of ${from}`,
        );
      }
    }
  });
});
