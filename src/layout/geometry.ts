/** Geometry: SVG path helpers for the cell wheels (angles in turns, 0 = 12 o'clock, clockwise), and the edges' splines. */

const TAU = Math.PI * 2;

export function polar(cx: number, cy: number, r: number, turns: number): [number, number] {
  const a = turns * TAU - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

const f = (n: number) => +n.toFixed(3);

/** Annular sector between radii r0 < r1 from turn t0 to t1. A full turn yields a ring (use fill-rule evenodd). */
export function ringSegment(cx: number, cy: number, r0: number, r1: number, t0: number, t1: number): string {
  const span = t1 - t0;
  if (span >= 1 - 1e-9) {
    const ring = (r: number) => `M ${f(cx)} ${f(cy - r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy + r)} A ${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy - r)} Z`;
    return r0 > 0 ? `${ring(r1)} ${ring(r0)}` : ring(r1);
  }
  const large = span > 0.5 ? 1 : 0;
  const [ax, ay] = polar(cx, cy, r1, t0);
  const [bx, by] = polar(cx, cy, r1, t1);
  const [c2x, c2y] = polar(cx, cy, r0, t1);
  const [dx, dy] = polar(cx, cy, r0, t0);
  return [`M ${f(ax)} ${f(ay)}`, `A ${f(r1)} ${f(r1)} 0 ${large} 1 ${f(bx)} ${f(by)}`, `L ${f(c2x)} ${f(c2y)}`, `A ${f(r0)} ${f(r0)} 0 ${large} 0 ${f(dx)} ${f(dy)}`, 'Z'].join(
    ' ',
  );
}

/** An arc at radius r from turn t0 to t1 (for text to follow); `back` runs it from t1 to t0, so that text on the lower half reads upright. */
export function arcPath(cx: number, cy: number, r: number, t0: number, t1: number, back = false): string {
  const [x0, y0] = polar(cx, cy, r, back ? t1 : t0);
  const [x1, y1] = polar(cx, cy, r, back ? t0 : t1);
  return `M ${f(x0)} ${f(y0)} A ${f(r)} ${f(r)} 0 ${t1 - t0 > 0.5 ? 1 : 0} ${back ? 0 : 1} ${f(x1)} ${f(y1)}`;
}

/** Do segments p1–p2 and p3–p4 cross (properly, not just touch at an end)? */
export function segmentsCross(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): boolean {
  const d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3);
  if (Math.abs(d) < 1e-9) return false;
  const t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d;
  const u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d;
  return t > 1e-6 && t < 1 - 1e-6 && u > 1e-6 && u < 1 - 1e-6;
}

/** A point on the quadratic spline from a to b that passes through m at t = ½. */
export function splinePoint(ax: number, ay: number, mx: number, my: number, bx: number, by: number, t: number) {
  // control point: the one that makes the curve pass through m halfway
  const cx = 2 * mx - (ax + bx) / 2;
  const cy = 2 * my - (ay + by) / 2;
  const u = 1 - t;
  return { x: u * u * ax + 2 * u * t * cx + t * t * bx, y: u * u * ay + 2 * u * t * cy + t * t * by };
}

/** A point on the spline through m and its unit normal there (the derivative turned a quarter). */
function splineFrame(ax: number, ay: number, mx: number, my: number, bx: number, by: number, t: number) {
  const cx = 2 * mx - (ax + bx) / 2;
  const cy = 2 * my - (ay + by) / 2;
  const p = splinePoint(ax, ay, mx, my, bx, by, t);
  const dx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
  const dy = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
  const l = Math.hypot(dx, dy) || 1;
  return { ...p, nx: -dy / l, ny: dx / l };
}

/**
 * The spline through m drawn as a wave along it (what sound looks like on an edge): `amp` px either side, one
 * period every `period` px, fading in and out at its ends so it leaves and meets the nodes straight.
 */
export function ripplePath(ax: number, ay: number, mx: number, my: number, bx: number, by: number, amp = 2.5, period = 11): string {
  const length = Math.hypot(mx - ax, my - ay) + Math.hypot(bx - mx, by - my);
  const n = Math.max(8, Math.ceil((length / period) * 6));
  const turns = Math.max(1, Math.round(length / period));
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const f = splineFrame(ax, ay, mx, my, bx, by, t);
    const a = amp * Math.sin(t * turns * 2 * Math.PI) * Math.min(1, t * 10, (1 - t) * 10);
    pts.push(`${(f.x + f.nx * a).toFixed(1)} ${(f.y + f.ny * a).toFixed(1)}`);
  }
  return `M ${pts.join(' L ')}`;
}

/**
 * A curve from a to a wheel's rim at `turns` (0 the top, clockwise), arriving along the radius from outside, as a
 * tape's head meets its reel: so the end shows on the segment it belongs to, not under the wheel. `via` pulls its
 * first half (the layout's bend); `reverse` runs it from the rim to a.
 */
export function radialPath(ax: number, ay: number, via: { x: number; y: number }, cx: number, cy: number, r: number, turns: number, reverse = false): string {
  const [px, py] = polar(cx, cy, r, turns);
  const lead = Math.min(80, 0.4 * Math.hypot(px - ax, py - ay));
  const [qx, qy] = polar(cx, cy, r + lead, turns);
  const f = (n: number) => n.toFixed(1);
  return reverse
    ? `M ${f(px)} ${f(py)} C ${f(qx)} ${f(qy)} ${f(via.x)} ${f(via.y)} ${f(ax)} ${f(ay)}`
    : `M ${f(ax)} ${f(ay)} C ${f(via.x)} ${f(via.y)} ${f(qx)} ${f(qy)} ${f(px)} ${f(py)}`;
}
