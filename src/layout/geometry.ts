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
 * A wheel's strands, routed as a cable loom (a table's entries, a resonator's tines): each leaves the rim at its place
 * (`turns`, 0 the top, clockwise) at a right angle onto a ring round the wheel, runs round it on a lane of its own
 * towards b, and turns off it where the ring faces b, into a bundle `gap` px apart that follows the edge's curve
 * (through m) to b. A strand further round runs outside the nearer ones and turns off first, further across, so no
 * strand crosses another. Paths in the order of `turns`.
 */
export function loomPaths(cx: number, cy: number, r: number, turns: readonly number[], mx: number, my: number, bx: number, by: number, gap: number): string[] {
  const phi = Math.atan2(by - cy, bx - cx);
  const [ux, uy] = [Math.cos(phi), Math.sin(phi)];
  const [nx, ny] = [-uy, ux];
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const at = turns.map((t) => t * 2 * Math.PI - Math.PI / 2);
  const delta = at.map((a) => wrap(a - phi));
  const side = delta.map((d) => (d >= 0 ? 1 : -1));
  // a strand's lane: counted out from the rim among those on its side, the nearest to b innermost
  const lane = delta.map((d, i) => delta.filter((e, j) => side[j] === side[i] && (Math.abs(e) < Math.abs(d) || (Math.abs(e) === Math.abs(d) && j < i))).length);
  const left = side.filter((v) => v > 0).length;
  const right = side.length - left;
  const f = (v: number) => v.toFixed(1);
  const lead = Math.min(50, 0.25 * Math.hypot(bx - cx, by - cy));
  return at.map((a, i) => {
    const rl = r + 8 + lane[i] * gap;
    // its place across the bundle: the left side's on the left, the outermost lane outermost, the bundle centred
    const o = side[i] > 0 ? (lane[i] + 0.5) * gap - ((left - right) * gap) / 2 : -(lane[i] + 0.5) * gap - ((left - right) * gap) / 2;
    const psi = phi + Math.asin(Math.max(-0.95, Math.min(0.95, o / rl)));
    const [px, py] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [qx, qy] = [cx + rl * Math.cos(a), cy + rl * Math.sin(a)];
    const runs = Math.abs(delta[i]) > Math.abs(wrap(psi - phi)) && Math.sign(wrap(a - psi)) === side[i];
    // the way round: towards b (a strand on b's left goes back round, to smaller angles)
    const dir = side[i] > 0 ? -1 : 1;
    // onto the ring: up the radius, round a corner of radius rc onto its lane (not a right angle)
    const rc = Math.min(rl - r - 1, 3 * gap, Math.abs(wrap(a - psi)) * rl * 0.5);
    const on = runs && rc > 1 ? a + (dir * rc) / rl : a;
    const [sx, sy] = [cx + (rl - rc) * Math.cos(a), cy + (rl - rc) * Math.sin(a)];
    const [ox, oy] = [cx + rl * Math.cos(on), cy + rl * Math.sin(on)];
    const onto = runs && rc > 1 ? ` L ${f(sx)} ${f(sy)} Q ${f(qx)} ${f(qy)} ${f(ox)} ${f(oy)}` : ` L ${f(qx)} ${f(qy)}`;
    const [lx, ly] = runs ? [cx + rl * Math.cos(psi), cy + rl * Math.sin(psi)] : [qx, qy];
    const arc = runs ? ` A ${f(rl)} ${f(rl)} 0 ${Math.abs(wrap(on - psi)) > Math.PI ? 1 : 0} ${side[i] > 0 ? 0 : 1} ${f(lx)} ${f(ly)}` : '';
    // off the ring: on along its lane, round into b's direction, then the edge's curve, beside the others
    const along = (lx - cx) * ux + (ly - cy) * uy + lead;
    const [gx, gy] = [cx + ux * along + nx * o, cy + uy * along + ny * o];
    const [kx, ky] = [2 * mx - (cx + bx) / 2 + nx * o, 2 * my - (cy + by) / 2 + ny * o];
    const k = lead * 0.5;
    // (the lane's direction where it leaves: its tangent, the way it was going)
    // (a tight corner: a long tangent would swing it out sideways before it turns)
    const kt = Math.min(k, 2 * gap);
    const [tx, ty] = runs ? [lx - dir * Math.sin(psi) * kt, ly + dir * Math.cos(psi) * kt] : [lx + Math.cos(a) * kt, ly + Math.sin(a) * kt];
    return `M ${f(px)} ${f(py)}${onto}${arc} C ${f(tx)} ${f(ty)} ${f(gx - ux * k)} ${f(gy - uy * k)} ${f(gx)} ${f(gy)} Q ${f(kx)} ${f(ky)} ${f(bx + nx * o)} ${f(by + ny * o)}`;
  });
}
