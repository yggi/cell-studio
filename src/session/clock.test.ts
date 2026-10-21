import { describe, expect, it } from 'vitest';
import { NO_CLOCK, READY, WINDOW, hostHeardAt, reading, withPing, type HostClock } from './clock';

/** Pings to a host whose page clock is 100 s ahead of this one, each `trips[i]` seconds there and back, half each way. */
const pinged = (trips: readonly number[], heard: number | null = null, skewed = 0): HostClock =>
  trips.reduce((c, trip, i) => withPing(c, { sent: i, received: i + trip, host: i + 100 + trip / 2 + skewed, heard }), NO_CLOCK);

describe("the host's clock, read from pings", () => {
  it(`is trusted after ${READY} pings, from the one with the shortest round trip`, () => {
    expect(reading(pinged([0.02, 0.02, 0.02]))).toBeNull();
    const r = reading(pinged([0.02, 0.01, 0.03, 0.02]))!;
    expect(r.offset).toBeCloseTo(100, 9);
    expect(r.bound).toBeCloseTo(0.005, 9);
  });

  it('is off by half the difference when the way there is longer than the way back, within its bound', () => {
    // (the pong said 100 + trip/2 + 4 ms: as if the ping took 4 ms longer to get there than back)
    const r = reading(pinged([0.01, 0.01, 0.01, 0.01], null, 0.004))!;
    expect(r.offset - 100).toBeCloseTo(0.004, 9);
    expect(Math.abs(r.offset - 100)).toBeLessThanOrEqual(r.bound);
  });

  it(`reads the latest ${WINDOW} pings: a short trip long ago is forgotten`, () => {
    const r = reading(pinged([0.001, ...Array<number>(WINDOW).fill(0.02)]))!;
    expect(r.bound).toBeCloseTo(0.01, 9);
  });

  it('takes no reading from a pong that came back before it was sent', () => {
    expect(withPing(NO_CLOCK, { sent: 2, received: 1, host: 5, heard: null }).samples).toEqual([]);
  });

  it("hears the host's output: its page clock plus its output's offset, the latest a pong said", () => {
    const c = withPing(pinged([0.01, 0.01, 0.01, 0.01], -40), { sent: 9, received: 8, host: 0, heard: null });
    expect(c.heard).toBe(-40);
    expect(hostHeardAt(c, 50)).toBeCloseTo(110, 9);
    expect(hostHeardAt(pinged([0.01, 0.01]), 50)).toBeNull();
    // (a host whose output isn't paired yet: its page clock)
    expect(hostHeardAt(pinged([0.01, 0.01, 0.01, 0.01]), 50)).toBeCloseTo(150, 9);
  });
});
