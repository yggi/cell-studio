import { describe, expect, it } from 'vitest';
import { eased, type Ease } from './payloadGate';

const cfg = { over: 1.2, hold: 5, most: 60 };
const run = (scales: [number, number][]) => {
  let e: Ease = { behind: false, since: 0, hold: 0 };
  return scales.map(([t, s]) => (e = eased(e, s, t, cfg)).behind);
};

describe('the payload is held back while the page is behind (docs/notes/edge-styles.md §2)', () => {
  it('shows while frames come on time', () => {
    expect(
      run([
        [0, 1],
        [1, 1.1],
        [2, 1],
      ]),
    ).toEqual([false, false, false]);
  });
  it('goes once frames come late, and comes back after the page has kept up for the hold', () => {
    expect(
      run([
        [0, 1.3],
        [1, 1.69],
        [2, 1.3],
        [4, 1],
        [6.9, 1],
        [7, 1],
      ]),
    ).toEqual([true, true, true, true, true, false]);
  });
  it('waits twice as long each time it falls behind again, up to the most', () => {
    let e: Ease = { behind: false, since: 0, hold: 0 };
    const holds: number[] = [];
    for (let i = 0, t = 0; i < 6; i++) {
      e = eased(e, 2, t, cfg);
      holds.push(e.hold);
      t += e.hold;
      e = eased(e, 1, t, cfg);
      expect(e.behind).toBe(false);
    }
    expect(holds).toEqual([5, 10, 20, 40, 60, 60]);
  });
});
