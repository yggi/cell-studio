import { describe, expect, it } from 'vitest';
import { LIMITS } from './protocol';
import { REJOIN, failed, outage, retry } from './rejoin';

describe('when a dropped link tries again (#482)', () => {
  it('tries quickly at first and steadily after, the last delay repeating', () => {
    let o = outage(0);
    const waits: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = retry(o, i);
      waits.push('wait' in r ? r.wait : -1);
      o = failed(o, i, false);
    }
    expect(waits).toEqual([0.25, 0.5, 1, 2, 4, 4, 4, 4]);
  });

  it('tries for twice resumeSeconds, so a link down past the seat’s keeping still comes back as a new player', () => {
    expect(REJOIN.window).toBe(2 * LIMITS.resumeSeconds);
    const o = failed(outage(100), 101, false);
    expect(retry(o, 100 + REJOIN.window - 1)).toEqual({ wait: 0.5 });
    // (the last try falls on the window's end)
    expect(retry(failed(failed(o, 0, false), 0, false), 100 + REJOIN.window - 0.5)).toEqual({ wait: 0.5 });
    expect(retry(o, 100 + REJOIN.window)).toEqual({ giveUp: 'The link stayed down for 10 minutes.' });
  });

  it('takes the session for ended once the lobby refused every try for refusedFor, and not when a try between went unanswered', () => {
    let o = outage(0);
    o = failed(o, 1, true);
    o = failed(o, 50, true);
    expect(retry(o, 1 + REJOIN.refusedFor - 0.01)).toHaveProperty('wait');
    expect(retry(o, 1 + REJOIN.refusedFor)).toEqual({ giveUp: 'The session ended while the link was down.' });
    // (a try that didn't reach the lobby: the refusals start again from the next)
    o = failed(o, 60, false);
    expect(o.refusedSince).toBeNull();
    o = failed(o, 70, true);
    expect(retry(o, 1 + REJOIN.refusedFor)).toHaveProperty('wait');
  });
});
