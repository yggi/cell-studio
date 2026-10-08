import { describe, expect, it } from 'vitest';
import { arcPath, loomPaths, polar, ringSegment, segmentsCross } from './geometry';

describe('geometry', () => {
  it('draws an arc for text, either way round', () => {
    expect(arcPath(100, 100, 50, 0, 0.25)).toBe('M 100 50 A 50 50 0 0 1 150 100');
    expect(arcPath(100, 100, 50, 0, 0.25, true)).toBe('M 150 100 A 50 50 0 0 0 100 50');
    expect(arcPath(100, 100, 50, 0, 0.75)).toContain(' 0 1 1 ');
  });

  it("measures turns clockwise from 12 o'clock", () => {
    const [x0, y0] = polar(0, 0, 10, 0);
    const [x1, y1] = polar(0, 0, 10, 0.25);
    expect([Math.round(x0), Math.round(y0)]).toEqual([0, -10]);
    expect([Math.round(x1), Math.round(y1)]).toEqual([10, 0]);
  });

  it('uses the large-arc flag past half a turn', () => {
    expect(ringSegment(50, 50, 20, 40, 0, 0.25)).toContain('0 0 1');
    expect(ringSegment(50, 50, 20, 40, 0, 0.75)).toContain('0 1 1');
  });

  it('draws a full turn as two concentric rings', () => {
    const d = ringSegment(50, 50, 20, 40, 0, 1);
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d).not.toContain('NaN');
  });
});

describe('loomPaths: the strands round a wheel, a ring of tracks', () => {
  // (the polyline of a path: its M/L/A/Q points, an arc sampled along its circle)
  const points = (d: string, cx: number, cy: number) => {
    const out: [number, number][] = [];
    const tok = d.split(/\s+/);
    for (let i = 0; i < tok.length;) {
      const c = tok[i++];
      if (c === 'M' || c === 'L') out.push([+tok[i++], +tok[i++]]);
      else if (c === 'Q') {
        const [qx, qy, x, y] = [+tok[i++], +tok[i++], +tok[i++], +tok[i++]];
        const [ax, ay] = out[out.length - 1];
        for (let k = 1; k <= 8; k++) {
          const t = k / 8;
          out.push([(1 - t) ** 2 * ax + 2 * (1 - t) * t * qx + t * t * x, (1 - t) ** 2 * ay + 2 * (1 - t) * t * qy + t * t * y]);
        }
      } else if (c === 'A') {
        const r = +tok[i++];
        i += 3;
        const sweep = +tok[i++];
        const [x, y] = [+tok[i++], +tok[i++]];
        const [ax, ay] = out[out.length - 1];
        const a0 = Math.atan2(ay - cy, ax - cx);
        let a1 = Math.atan2(y - cy, x - cx);
        // (clockwise on screen when sweep is 1: the angle grows)
        if (sweep && a1 < a0) a1 += 2 * Math.PI;
        if (!sweep && a1 > a0) a1 -= 2 * Math.PI;
        for (let k = 1; k <= 12; k++) out.push([cx + r * Math.cos(a0 + ((a1 - a0) * k) / 12), cy + r * Math.sin(a0 + ((a1 - a0) * k) / 12)]);
      }
    }
    return out;
  };
  const crossings = (ps: [number, number][][]) => {
    let n = 0;
    for (let a = 0; a < ps.length; a++)
      for (let b = a + 1; b < ps.length; b++)
        for (let i = 1; i < ps[a].length; i++) for (let j = 1; j < ps[b].length; j++) if (segmentsCross(...ps[a][i - 1], ...ps[a][i], ...ps[b][j - 1], ...ps[b][j])) n++;
    return n;
  };
  for (const [what, b] of [
    ['up', [0, -400]],
    ['right', [400, 30]],
    ['down left', [-300, 280]],
    ['across the seam', [-40, -400]],
  ] as const)
    it(`twelve taps to a reader ${what}: each leaves its tap, none crosses another, the bundle ends a gap apart`, () => {
      const turns = Array.from({ length: 12 }, (_, i) => i / 12);
      const paths = loomPaths(0, 0, 60, turns, b[0] / 2, b[1] / 2, b[0], b[1], 4);
      const ps = paths.map((d) => points(d, 0, 0));
      ps.forEach((p, i) => {
        const [x, y] = polar(0, 0, 60, turns[i]);
        expect(Math.hypot(p[0][0] - x, p[0][1] - y)).toBeLessThan(0.2);
      });
      expect(crossings(ps)).toBe(0);
      // the bus in its own order: strand i is i-th across the bundle, left to right looking along it (as a flat bus)
      const l = Math.hypot(b[0], b[1]);
      const across = ps.map((p) => (p[p.length - 1][0] * -b[1] + p[p.length - 1][1] * b[0]) / l);
      across.forEach((x, i) => expect(x).toBeCloseTo((i - 5.5) * 4, 0));
    });
});
