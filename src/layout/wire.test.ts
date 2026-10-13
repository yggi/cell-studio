import { describe, expect, it } from 'vitest';
import { polar, segmentsCross } from './geometry';
import { bundleCubic, bundlePaths, readingAngle, wireLabel, loomParts, loomPaths, measured, rippled, waveAlong } from './wire';

// (the polyline of a path: its M/L/A/Q/C points, an arc sampled along its circle, about its centre cx, cy)
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
    } else if (c === 'C') {
      const [p1x, p1y, p2x, p2y, x, y] = [+tok[i++], +tok[i++], +tok[i++], +tok[i++], +tok[i++], +tok[i++]];
      const [ax, ay] = out[out.length - 1];
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        const u = 1 - t;
        out.push([u ** 3 * ax + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t ** 3 * x, u ** 3 * ay + 3 * u * u * t * p1y + 3 * u * t * t * p2y + t ** 3 * y]);
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

/** The distance from p to the polyline q. */
const toLine = (p: [number, number], q: [number, number][]) => {
  let best = Infinity;
  for (let i = 1; i < q.length; i++) {
    const [ax, ay] = q[i - 1];
    const [bx, by] = q[i];
    const l2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * (bx - ax) + (p[1] - ay) * (by - ay)) / l2));
    best = Math.min(best, Math.hypot(p[0] - ax - t * (bx - ax), p[1] - ay - t * (by - ay)));
  }
  return best;
};

describe('bundlePaths: a flat bus, the same width everywhere', () => {
  for (const [what, m] of [
    ['straight', [150, 100]],
    ['bent', [260, 160]],
    ['a hard bend', [30, 50]],
  ] as const)
    it(`${what}: neighbouring strands stay a gap apart along the bus (its ends settle under the wheels)`, () => {
      const ps = bundlePaths(0, 300, m[0], m[1], 300, 0, [-6, -2, 2, 6]).map((d) => points(d, 0, 0));
      for (let s = 1; s < ps.length; s++) for (const p of ps[s].slice(6, -6)) expect(Math.abs(toLine(p, ps[s - 1]) - 4)).toBeLessThan(0.3);
    });
});

describe('bundlePaths between wheels: cut under their rims, true to the ends', () => {
  it('a hard bend between two wheels: no strands meet anywhere, and they are a gap apart all along', () => {
    for (const [m, ra, rb] of [
      [[30, 50], 40, 40],
      [[320, 330], 32, 60],
      [[-80, 150], 22, 22],
    ] as const) {
      const ps = bundlePaths(0, 300, m[0], m[1], 300, 0, [-6, -2, 2, 6], { a: ra, b: rb }).map((d) => points(d, 0, 0));
      expect(crossings(ps)).toBe(0);
      for (let s = 1; s < ps.length; s++) for (const p of ps[s].slice(1, -1)) expect(Math.abs(toLine(p, ps[s - 1]) - 4)).toBeLessThan(0.3);
      // (each strand starts and ends under its wheel)
      for (const p of ps) {
        expect(Math.hypot(p[0][0], p[0][1] - 300)).toBeLessThan(ra);
        expect(Math.hypot(p[p.length - 1][0] - 300, p[p.length - 1][1])).toBeLessThan(rb);
      }
    }
  });
});

describe('loomPaths: the strands round a wheel, a ring of tracks', () => {
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
      // and its runs a gap apart all along: the same width out of the loom as at the reader
      const runs = loomParts(0, 0, 60, turns, b[0] / 2, b[1] / 2, b[0], b[1], 4).map((p) => points(p.run, 0, 0));
      for (let s = 1; s < runs.length; s++) for (const p of runs[s].slice(1, -6)) expect(Math.abs(toLine(p, runs[s - 1]) - 4)).toBeLessThan(0.3);
    });
});

describe('rippled: sound as a wave along any path', () => {
  it('follows a path of lines, an arc and a curve, within its height of it, straight at its ends', () => {
    // (a ref's end locked to its segment: out along a line, round an arc, on through a cubic)
    const d = 'M 0 0 L 40 0 A 60 60 0 0 1 100 60 C 100 120 160 160 220 160';
    const base = points(d, 40, 60);
    const wave = points(rippled(d, 2.5, 11), 0, 0);
    expect(wave.length).toBeGreaterThan(40);
    for (const p of wave) expect(toLine(p, base)).toBeLessThan(2.5 + 0.5); // (the test samples the curve coarsely)
    // (it does wave: somewhere it is off the path by most of its height)
    expect(Math.max(...wave.map((p) => toLine(p, base)))).toBeGreaterThan(2);
    expect(Math.hypot(wave[0][0], wave[0][1])).toBeLessThan(0.2);
    const [lx, ly] = wave[wave.length - 1];
    expect(Math.hypot(lx - 220, ly - 160)).toBeLessThan(0.2);
  });
});

describe('a position that is not a number yet', () => {
  it('does not throw (the edge derives its path from the layout, which may be mid-move)', () => {
    expect(() => bundlePaths(0, 0, NaN, 10, 100, 0, [-2, 2])).not.toThrow();
    expect(() => bundlePaths(NaN, NaN, NaN, NaN, NaN, NaN, [0])).not.toThrow();
    expect(() => bundlePaths(0, 0, Infinity, 10, 100, 0, [2])).not.toThrow();
  });
});

describe('a path measured, and sound travelling along it', () => {
  const d = 'M 0 0 L 100 0 A 50 50 0 0 1 150 50';
  const m = measured(d);
  it('knows its length, the point at a distance, and the stretch between two', () => {
    expect(m.length).toBeCloseTo(100 + (Math.PI * 50) / 2, 0);
    expect(m.at(50)).toEqual({ x: 50, y: 0 });
    expect(m.at(-5)).toEqual({ x: 0, y: 0 });
    const piece = points(m.slice(20, 60), 0, 0);
    expect(piece[0]).toEqual([20, 0]);
    expect(piece[piece.length - 1]).toEqual([60, 0]);
    expect(m.slice(60, 20)).toBe('');
    expect(measured('M NaN NaN L 1 1').length).toBe(0);
  });
  it('a wave of a shape moves along the flow with its phase, and stays within its height', () => {
    const line = measured('M 0 0 L 200 0');
    const ys = (phase: number) => points(waveAlong(line, 3, 20, 'sine', phase), 0, 0).map((p) => p[1]);
    for (const y of ys(0)) expect(Math.abs(y)).toBeLessThanOrEqual(3 + 1e-6);
    // (a whole cycle on: the same wave; half a cycle on: mirrored, away from the faded ends)
    expect(ys(1).map((y) => y.toFixed(3))).toEqual(ys(0).map((y) => y.toFixed(3)));
    const [a, b] = [ys(0), ys(0.5)];
    for (let i = 10; i < a.length - 10; i++) expect(b[i]).toBeCloseTo(-a[i], 3);
    // (a square wave sits at its height)
    const sq = points(waveAlong(line, 2, 20, 'square', 0), 0, 0).filter((p) => p[0] > 30 && p[0] < 170);
    expect(sq.every((p) => Math.abs(Math.abs(p[1]) - 2) < 1e-6)).toBe(true);
    expect(waveAlong(measured(''), 2, 20, 'sine', 0)).toBe('');
    // (a height, length or phase that isn't a number draws nothing, never a path full of NaN)
    for (const [amp, period, phase] of [
      [NaN, 20, 0],
      [2, NaN, 0],
      [2, Infinity, 0],
      [2, 20, NaN],
    ])
      expect(waveAlong(line, amp, period, 'sine', phase)).toBe('');
  });
});

describe('a bus along a sigmoid', () => {
  it('keeps its strands their gap apart from end to end, true to both ends', () => {
    const [a, c1, c2, b] = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 200 },
    ];
    const strands = bundleCubic(a, c1, c2, b, [-3, 3]).map((d) =>
      d
        .slice(2)
        .split(' L ')
        .map((p) => p.split(' ').map(Number)),
    );
    // (upright at both ends: the strands side by side across x there, 6 px apart)
    for (const i of [0, strands[0].length - 1]) {
      expect(Math.abs(strands[0][i][0] - strands[1][i][0])).toBeCloseTo(6, 0);
      expect(strands[0][i][1]).toBeCloseTo(strands[1][i][1], 0);
    }
    // (and the gap kept through the bend)
    for (const p of strands[0]) {
      const near = Math.min(...strands[1].map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])));
      expect(near).toBeGreaterThan(5.5);
      expect(near).toBeLessThan(6.5);
    }
  });
});

describe('a label on a wire (#137)', () => {
  it('reads along it, upright, level where it is steep', () => {
    expect(readingAngle(1, 0)).toBe(0);
    expect(readingAngle(-1, 0)).toBeCloseTo(0, 6);
    expect(readingAngle(1, 1)).toBeCloseTo(45, 6);
    expect(readingAngle(-1, -1)).toBeCloseTo(45, 6);
    expect(readingAngle(0.2, 1)).toBe(0);
  });
  it('sits at the middle, or slides along to the first place clear of a wheel', () => {
    const m = measured('M 0 0 L 300 0');
    expect(wireLabel(m, 40)).toMatchObject({ x: 150, y: 0, angle: 0 });
    // (a wheel over the middle: it moves off it, still on the wire)
    const p = wireLabel(m, 40, [{ x: 150, y: 0, r: 30 }])!;
    expect(Math.abs(p.x - 150)).toBeGreaterThan(30 + 20);
    expect(p.y).toBe(0);
    // (near the end: a tap's, back from its socket)
    expect(wireLabel(m, 40, [], 6, 20)!.x).toBeCloseTo(260, 0);
  });
});
