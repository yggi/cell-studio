// The layout's milliseconds, out of the quick tests (#481): a wall-clock bound fails on a loaded machine for want of
// cores, not for a slower layout, so it runs where the slow tests run (on every ready PR's CI, nightly, and by `npm test`
// when the change reaches it), and the quick tests check what the layout does, not how fast.
import { describe, expect, it } from 'vitest';
import { libraryLayout } from './library';
import { entries } from './library.fixture';
import { readBraid, tooWide } from './roll';

const time = <T>(run: () => T) => {
  const t0 = performance.now();
  const result = run();
  return { result, ms: performance.now() - t0 };
};

describe('the layout, in time', () => {
  it('grows the library and brings it to rest within 1.5 s', () => {
    const { result, ms } = time(() => libraryLayout(entries));
    expect(result.done).toBe(true);
    expect(ms).toBeLessThan(1500);
  });

  it('refuses a note far outside its table at once: within 50 ms, not by drawing thousands of rows', () => {
    for (const text of ['0 5000', '0 100000', '0 1000000000', '1000000000', '-5000 2', '-1000000000']) {
      const { result, ms } = time(() => {
        const r = readBraid(text.split(' '));
        return r.ok ? tooWide(r.roll, 12) : r.problem;
      });
      expect(result, text).toBe('a note far outside its table');
      expect(ms, text).toBeLessThan(50);
    }
  });
});
