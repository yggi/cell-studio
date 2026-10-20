import { describe, expect, it } from 'vitest';
import { bottomOf, chipPlaces, entersFromSide, envelopeBox, socketOf, voiceOutline } from './voice';

describe("a voice's wheel", () => {
  it('its waveform on top, its envelope in a band under the centre, inside the outline', () => {
    const band = envelopeBox(160);
    expect(socketOf(160)).toBe(80);
    expect(band.top).toBeGreaterThan(0);
    expect(band.bottom).toBe(bottomOf(160));
    expect(band.width).toBeLessThan(160);
  });

  it('one outline, round on top and flat underneath, as wide as the disc and as deep as the band', () => {
    const d = voiceOutline(160);
    const xy = [...d.matchAll(/(-?\d+\.\d+) (-?\d+\.\d+)(?= [ALZ]|$)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    const ys = xy.map(([, y]) => y);
    const xs = xy.map(([x]) => x);
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    // (its flat bottom: the band's, under the centre by bottomOf)
    expect(Math.max(...ys)).toBeCloseTo(80 + bottomOf(160), 1);
    // (symmetric about the centre, never wider than the disc)
    expect(Math.min(...xs) + Math.max(...xs)).toBeCloseTo(160, 1);
    expect(Math.max(...xs)).toBeLessThanOrEqual(160);
  });

  it('its chips on its upper shoulders', () => {
    for (const ch of chipPlaces(160, 4)) expect(ch.y).toBeLessThan(0);
  });

  it('what plays it comes in from below, what else feeds it from the side', () => {
    for (const port of ['voice', 'is', 'env']) expect(entersFromSide({ port })).toBe(false);
    expect(entersFromSide({ port: 'lpf', notes: 'melody' })).toBe(false);
    for (const port of ['lpf', 'pitch', 'fm', 'delaytime', 'level']) expect(entersFromSide({ port })).toBe(true);
  });
});
