import { describe, expect, it } from 'vitest';
import { decadeLabel, HEARING, TOWER_PX, towerScale, towerTicks, withConstant } from './towerscale';
import { towerY } from './towerlayout';

describe('the tower scale (#440)', () => {
  it("is the graph's tower at zoom 1, the neutral zone in it: towerY", () => {
    const s = towerScale({ perDecade: TOWER_PX, offset: 0, zone: 1.4 });
    for (const d of [-3, -0.3, 0, 1, HEARING - 1e-6, HEARING, 2.5, 4]) expect(s.y(d)).toBeCloseTo(towerY(d, 1.4), 6);
  });

  it('panned and zoomed: an affine map of it; its inverse, the neutral zone reading as 20 Hz', () => {
    const s = towerScale({ perDecade: TOWER_PX * 0.5, offset: 300, zone: 1 });
    expect(s.y(2)).toBeCloseTo(towerY(2, 1) * 0.5 + 300, 6);
    for (const d of [-2, 0.5, 2, 3.9]) expect(s.at(s.y(d))).toBeCloseTo(d, 6);
    expect(s.at((s.y(HEARING) + s.y(HEARING - 1e-9)) / 2)).toBe(HEARING);
  });

  it('its strata from the bottom, each its decades and its band; the neutral zone only when it has height', () => {
    const s = towerScale({ perDecade: 100, offset: 0, zone: 1 });
    expect(s.strata.map((x) => x.name)).toEqual(['slow', 'pulse', 'voices', 'audible']);
    const [slow, pulse, voices, audible] = s.strata;
    expect(pulse!.bottom).toBeCloseTo(slow!.top, 3);
    expect(voices!.bottom - voices!.top).toBeCloseTo(100, 3);
    expect(audible!.bottom).toBeCloseTo(voices!.top, 3);
    expect(towerScale({ perDecade: 100, offset: 0 }).strata.map((x) => x.name)).toEqual(['slow', 'pulse', 'audible']);
  });

  it('the constant a band of its own at the foot, clipping what it covers; the card above 20 kHz when shown', () => {
    const s = withConstant(towerScale({ perDecade: 100, offset: 0, to: Math.log10(40000) }), { top: 500, bottom: 560 });
    expect(s.strata.map((x) => x.name)).toEqual(['constant', 'slow', 'pulse', 'audible', 'card']);
    expect(s.strata[1]!.bottom).toBe(500);
  });

  it('its marks: Hz named at 1, 2, 5; each C; each decade as a period or a frequency', () => {
    const s = towerScale({ perDecade: 100, offset: 0 });
    const t = towerTicks(s, -Infinity, Infinity);
    expect(t.hz.filter((x) => x.named).map((x) => x.label)).toEqual(['20 Hz', '50 Hz', '100 Hz', '200 Hz', '500 Hz', '1 kHz', '2 kHz', '5 kHz', '10 kHz', '20 kHz']);
    expect(t.octaves.map((x) => x.label)).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10']);
    expect(t.decades.map((x) => x.label)).toEqual(['12 d', '1.2 d', '2.8 h', '17 min', '1.7 min', '10 s', '1 Hz', '10 Hz']);
    expect(decadeLabel(3)).toBe('1 kHz');
  });
});
