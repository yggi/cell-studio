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

/** The spline through m moved `offset` px sideways (one strand of a bus): the same curve, beside it. */
export function strandPath(ax: number, ay: number, mx: number, my: number, bx: number, by: number, offset: number): string {
  const l = Math.hypot(bx - ax, by - ay) || 1;
  const [nx, ny] = [(-(by - ay) / l) * offset, ((bx - ax) / l) * offset];
  const cx = 2 * mx - (ax + bx) / 2 + nx;
  const cy = 2 * my - (ay + by) / 2 + ny;
  return `M ${ax + nx} ${ay + ny} Q ${cx} ${cy} ${bx + nx} ${by + ny}`;
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

/**
 * A wheel's strands, routed as a cable loom (a table's entries, a resonator's tines), each one cubic Bézier: out of
 * its place on the rim (`turns`, 0 the top, clockwise) along the radius, into its place in a bundle `gap` px apart that
 * leaves the wheel towards b and follows the edge's curve (through m) to b. The places in the bundle are in the order
 * the strands sit round the wheel, seen from b's side, so neighbours stay neighbours and none cross where they leave;
 * a strand from the far side dives under the wheel (edges are drawn beneath it) and comes out in its place. Paths in
 * the order of `turns`; `ends`, where each one's bundle place is (for a net's branches to go on from).
 */
export function loomPaths(cx: number, cy: number, r: number, turns: readonly number[], mx: number, my: number, bx: number, by: number, gap: number): string[] {
  return loom(cx, cy, r, turns, mx, my, bx, by, gap).paths;
}

/**
 * The places in a loom's bundle (0 … n−1, across it): by angle round the wheel from the way it leaves (`phi`, radians),
 * right of it to the right, left to the left — so a branch of the bundle carries each strand on at the same place.
 */
export function loomOrder(turns: readonly number[], phi: number): number[] {
  const delta = turns.map((t) => Math.atan2(Math.sin(t * 2 * Math.PI - Math.PI / 2 - phi), Math.cos(t * 2 * Math.PI - Math.PI / 2 - phi)));
  return delta.map((d, i) => delta.filter((e, j) => e < d || (e === d && j < i)).length);
}

/** loomPaths, with where each strand's bundle place ends (b, offset across). */
function loom(cx: number, cy: number, r: number, turns: readonly number[], mx: number, my: number, bx: number, by: number, gap: number) {
  const phi = Math.atan2(by - cy, bx - cx);
  const [ux, uy] = [Math.cos(phi), Math.sin(phi)];
  const [nx, ny] = [-uy, ux];
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const at = turns.map((t) => t * 2 * Math.PI - Math.PI / 2);
  const delta = at.map((a) => wrap(a - phi));
  const rank = loomOrder(turns, phi);
  const n = turns.length;
  const d = Math.hypot(bx - cx, by - cy) || 1;
  // (where the bundle gathers: out of the wheel, but well short of b)
  const reach = r + Math.max(8, Math.min(90, 0.55 * (d - r)));
  const f = (v: number) => v.toFixed(1);
  const ends: { x: number; y: number; o: number }[] = [];
  const paths = at.map((a, i) => {
    // (n across is to b's left in screen terms; a positive angle from b's direction is on that side)
    const o = (rank[i] - (n - 1) / 2) * gap;
    const [px, py] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    // out along the radius, a little (a strand from the far side only just: it turns under the wheel at once)
    const back = (1 - Math.cos(delta[i])) / 2;
    const l1 = 6 + 18 * (1 - back);
    const [gx, gy] = [cx + ux * reach + nx * o, cy + uy * reach + ny * o];
    // (into its place over most of the way out: a strand far to the side has room to come in)
    const l2 = (reach - r) * (0.55 + 0.3 * back);
    // on along the edge's curve — never back: a control behind where the bundle gathered would loop it
    const [qx, qy] = [2 * mx - (cx + bx) / 2, 2 * my - (cy + by) / 2];
    const ahead = (qx - cx) * ux + (qy - cy) * uy > reach + 4;
    const [kx, ky] = ahead ? [qx + nx * o, qy + ny * o] : [(gx + bx + nx * o) / 2, (gy + by + ny * o) / 2];
    ends.push({ x: bx + nx * o, y: by + ny * o, o });
    return `M ${f(px)} ${f(py)} C ${f(px + Math.cos(a) * l1)} ${f(py + Math.sin(a) * l1)} ${f(gx - ux * l2)} ${f(gy - uy * l2)} ${f(gx)} ${f(gy)} Q ${f(kx)} ${f(ky)} ${f(bx + nx * o)} ${f(by + ny * o)}`;
  });
  return { paths, ends };
}
