import { describe, expect, it } from 'vitest';
import { CARD, follow, frameFor, freqTicks, hzOf, pan, tOf, timeTicks, xOf, yOf, zones, zoom } from './timeview';

describe('the time view', () => {
  const f = frameFor(120, 1200, 600);
  it('puts time across and frequency up, round the tower', () => {
    expect(xOf(f, 60)).toBeCloseTo(600);
    expect(tOf(f, 300)).toBeCloseTo(30);
    expect(yOf(f, f.lo)).toBeCloseTo(600);
    expect(yOf(f, f.hi)).toBeCloseTo(0);
    expect(hzOf(f, yOf(f, 440))).toBeCloseTo(440);
    expect(yOf(f, 1)).toBeGreaterThan(yOf(f, 440));
  });
  it('zooms about a moment and stays within the piece', () => {
    const z = zoom(f, 30, 0.5, 120);
    expect(z.to - z.from).toBeCloseTo(60);
    expect(xOf(z, 30)).toBeCloseTo(xOf(f, 30));
    const edge = zoom(f, 0, 0.1, 120);
    expect(edge.from).toBe(0);
    expect(pan(z, -1000, 120).from).toBe(0);
    expect(pan(z, 1000, 120).to).toBeCloseTo(120);
    expect(zoom(f, 60, 10, 120).to - zoom(f, 60, 10, 120).from).toBeCloseTo(120);
  });
  it('pages on to follow the playhead', () => {
    const z = zoom(f, 0, 0.25, 120);
    expect(follow(z, 10, 120)).toBe(z);
    const on = follow(z, 40, 120);
    expect(on.from).toBeLessThan(40);
    expect(on.to).toBeGreaterThan(40);
  });
  it('ticks time and the tower, and names its zones', () => {
    expect(timeTicks(f).map((t) => t.at)).toEqual([0, 15, 30, 45, 60, 75, 90, 105, 120]);
    expect(freqTicks(f).map((t) => t.label)).toEqual(['60 s', '10 s', '1 s', '0.1 s', '100 Hz', '1 kHz', '10 kHz']);
    expect(zones(f).map((z) => z.name)).toEqual(['slow', 'pulse', 'audible', 'card']);
    expect(zones(f).find((z) => z.name === 'card')!.lo).toBe(CARD);
  });
});
