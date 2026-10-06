import { describe, expect, it } from 'vitest';
import { heardLag, MAX_LAG } from './heard';

describe('heardLag', () => {
  it('starts at the first reading, and smooths the jitter of the ones after', () => {
    expect(heardLag(null, 0.056, null)).toBe(0.056);
    const a = heardLag(0.056, 0.062, null);
    expect(a).toBeGreaterThan(0.056);
    expect(a).toBeLessThan(0.062);
    // (a steady reading stays put)
    let x = 0.056;
    for (let i = 0; i < 20; i++) x = heardLag(x, 0.056, null);
    expect(x).toBeCloseTo(0.056, 6);
  });
  it('follows a different device at once', () => {
    expect(heardLag(0.28, 0.024, null)).toBe(0.024);
    expect(heardLag(0.024, 0.28, null)).toBe(0.28);
  });
  it('without a reading keeps what it had, else the browser output latency, else nothing', () => {
    expect(heardLag(0.05, null, 0.3)).toBe(0.05);
    expect(heardLag(null, null, 0.3)).toBe(0.3);
    expect(heardLag(null, null, null)).toBe(0);
  });
  it('is never negative or absurd', () => {
    expect(heardLag(null, -1, null)).toBe(0);
    expect(heardLag(null, 5, null)).toBe(MAX_LAG);
  });
});
