import { describe, expect, it } from 'vitest';
import { PLAYED_KEPT, PlayedLog, type PlayedEvent } from './played';

const event = (n: number): PlayedEvent => ({ bar: n, part: 'bass', step: 0, note: 40, velocity: 90, length: 2, seconds: n, duration: 0.25 });

describe('the log of what a feed played', () => {
  it('keeps Jambot’s number, 20,000, the latest', () => {
    expect(PLAYED_KEPT).toBe(20_000);
    const log = new PlayedLog(3);
    log.push([0, 1, 2, 3, 4].map(event));
    expect(log.since().events.map((e) => e.bar)).toEqual([2, 3, 4]);
    expect(log.since().next).toBe(5);
  });

  it('gives a reader that comes back only what came since', () => {
    const log = new PlayedLog();
    log.push([0, 1].map(event));
    const { next } = log.since();
    log.push([2].map(event));
    expect(log.since(next).events.map((e) => e.bar)).toEqual([2]);
    expect(log.since(9).events).toEqual([]);
  });
});
