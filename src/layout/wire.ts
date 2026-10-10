/**
 * A bus's geometry (docs/notes/edge-styles.md §1): its strands are true offsets of one centreline, so the bundle keeps
 * its width through every bend; out of a loom they turn off their tracks through fillets, no corners.
 */

type Pt = { readonly x: number; readonly y: number };

const TAU = Math.PI * 2;
const v = (n: number) => n.toFixed(1);
/** About this far apart (px) the curves are sampled: fine enough for a stroke, few enough to stay cheap. */
const STEP = 5;

/** Points along the cubic a → b (controls c1, c2), about STEP px apart. */
function sampleCubic(a: Pt, c1: Pt, c2: Pt, b: Pt): Pt[] {
  const l = Math.hypot(c1.x - a.x, c1.y - a.y) + Math.hypot(c2.x - c1.x, c2.y - c1.y) + Math.hypot(b.x - c2.x, b.y - c2.y);
  // (a position not yet a number draws nothing, as it always did, rather than throwing in the edge's derived path)
  if (!Number.isFinite(l)) return [a, b];
  const n = Math.max(6, Math.min(96, Math.ceil(l / STEP)));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    const [k0, k1, k2, k3] = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return { x: k0 * a.x + k1 * c1.x + k2 * c2.x + k3 * b.x, y: k0 * a.y + k1 * c1.y + k2 * c2.y + k3 * b.y };
  });
}

/** The quadratic a → b with control q, as points. */
const sampleQuad = (a: Pt, q: Pt, b: Pt) =>
  sampleCubic(a, { x: a.x + (2 / 3) * (q.x - a.x), y: a.y + (2 / 3) * (q.y - a.y) }, { x: b.x + (2 / 3) * (q.x - b.x), y: b.y + (2 / 3) * (q.y - b.y) }, b);

/** Within this far (px) of an end that sits under a wheel, a strand's place across turns back to the chord's. */
const SETTLE = 20;

/**
 * A polyline moved `o` px along its normal (its tangent turned a quarter, clockwise on screen) at every point. `ends`:
 * at those ends (`a` its first, `b` its last) the normal turns to the chord's (a's to b's, turned) over the last SETTLE
 * px, so the bundle's ends lie across the node there, as a flat bus's always did, not swung out past a small one.
 */
function offsetPoints(pts: readonly Pt[], o: number, ends: { a?: boolean; b?: boolean } = {}): Pt[] {
  const [first, last] = [pts[0], pts[pts.length - 1]];
  const lc = Math.hypot(last.x - first.x, last.y - first.y) || 1;
  const chord = { x: -(last.y - first.y) / lc, y: (last.x - first.x) / lc };
  const along: number[] = [0];
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = along[along.length - 1];
  const settle = Math.min(SETTLE, total / 4);
  // (how much of the true normal: 0 at a settled end, 1 a SETTLE in, smoothly)
  const weight = (s: number) => {
    const d = Math.min(ends.a ? s : Infinity, ends.b ? total - s : Infinity);
    const t = settle > 0 ? Math.min(1, d / settle) : 1;
    return t * t * (3 - 2 * t);
  };
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = weight(along[i]);
    const [nx, ny] = [w * (-(b.y - a.y) / l) + (1 - w) * chord.x, w * ((b.x - a.x) / l) + (1 - w) * chord.y];
    const ln = Math.hypot(nx, ny) || 1;
    return { x: p.x + (nx / ln) * o, y: p.y + (ny / ln) * o };
  });
}

const line = (pts: readonly Pt[]) => pts.map((p) => `${v(p.x)} ${v(p.y)}`).join(' L ');

/**
 * A flat bus along the spline from a to b through m (a chord's notes, a hop out of a reader's hub): each strand the
 * curve moved by its offset (px, positive to the left looking along it), so it is the same width everywhere it shows
 * (its ends, under the wheels, settle across the chord).
 */
export function bundlePaths(ax: number, ay: number, mx: number, my: number, bx: number, by: number, offsets: readonly number[]): string[] {
  const q = { x: 2 * mx - (ax + bx) / 2, y: 2 * my - (ay + by) / 2 };
  const centre = sampleQuad({ x: ax, y: ay }, q, { x: bx, y: by });
  return offsets.map((o) => `M ${line(offsetPoints(centre, o, { a: true, b: true }))}`);
}

/**
 * A wheel's strands, routed as a cable loom (a table's entries, a resonator's tines, a ref written several times): out
 * of each tap (`turns`, 0 the top, clockwise; r its ring) along the radius onto a track of its own round the wheel, and
 * off the ring towards b — so the wires round a source make a ring. A bus keeps one order everywhere: strand i is
 * i-th across the bundle (its first on the left, looking along it, as bundlePaths has it). So the ring is cut at the
 * seam between the last tap and the first, not across from b: a tap before b's way, counted round from the seam, comes
 * to it clockwise, one after it anticlockwise — the long way round if need be — the nearer b's way, the inner its
 * track. Nested, so they usually don't cross (taps in order round the wheel, as a table's are; a reader very near a
 * small wheel with many strands can still make two meet). Each turns off its track through a short fillet, tangent
 * to the track and to its run (no corner); a tap too near its turn for an arc bends out of its track along the radius.
 * Then on as true offsets, `gap` px apart, of one centreline: straight out of the loom, then along the edge's curve
 * (towards m's control) to b, so the bundle keeps its width. Paths in the order of `turns`. `inner`: tracks taken by the wheel's other buses (a band each, the
 * larger inside).
 */
export function loomPaths(cx: number, cy: number, r: number, turns: readonly number[], mx: number, my: number, bx: number, by: number, gap: number, inner = 0): string[] {
  return loomParts(cx, cy, r, turns, mx, my, bx, by, gap, inner).map((p) => `${p.ring} L${p.run.slice(1)}`);
}

/** loomPaths in two parts each: its ring (from the tap round the wheel and through its turn) and its run on to b. */
export function loomParts(
  cx: number,
  cy: number,
  r: number,
  turns: readonly number[],
  mx: number,
  my: number,
  bx: number,
  by: number,
  gap: number,
  inner = 0,
  exit?: number,
): { ring: string; run: string }[] {
  // (exit: the bundle leaves the ring in that direction whatever b's, as from a socket — the outputs-top probe)
  const phi = exit ?? Math.atan2(by - cy, bx - cx);
  const [ux, uy] = [Math.cos(phi), Math.sin(phi)];
  const n = turns.length;
  const wrap = (t: number) => ((t % 1) + 1) % 1;
  // the seam: halfway from the last tap round to the first (a lone strand: across from b, the short way)
  const out = wrap((phi + Math.PI / 2) / TAU);
  const seam = n > 1 ? turns[n - 1] + wrap(turns[0] - turns[n - 1]) / 2 : out + 0.5;
  // each tap's way round to b's, from the seam (clockwise positive: it comes anticlockwise), and its rank
  const way = turns.map((t) => (wrap(t - seam) - wrap(out - seam)) * TAU);
  // (a track each, the nearer b's way the inner, whichever side: near the axis a strand's turn crosses to the other)
  const rank = way.map((d, i) => way.filter((e, j) => Math.abs(e) < Math.abs(d) || (Math.abs(e) === Math.abs(d) && j < i)).length);
  // (across the bundle: by its place on the bus)
  const across = way.map((_, i) => (i - (n - 1) / 2) * gap);
  const track0 = r + (1.5 + inner) * gap;
  const outer = track0 + Math.max(0, ...rank) * gap;
  // a strand's turn off its track: a fillet this long each way (longer, it would sweep across the tracks still
  // coming round outside it)
  const fillet = 1.5 * gap;
  const d = Math.hypot(bx - cx, by - cy) || 1;
  // (where the bundle stops running straight out: past the turns, and well short of b)
  const reach = Math.max(outer + fillet + 2, Math.min(outer + 60, r + 0.5 * (d - r)));
  const g = { x: cx + ux * reach, y: cy + uy * reach };
  const b = { x: bx, y: by };
  // on along the edge's curve — never back: a control behind where the bundle gathered would loop it
  const q = { x: 2 * mx - (cx + bx) / 2, y: 2 * my - (cy + by) / 2 };
  const ahead = exit === undefined && (q.x - cx) * ux + (q.y - cy) * uy > reach + 4;
  const k = ahead ? q : { x: (g.x + bx) / 2, y: (g.y + by) / 2 };
  // the centreline: straight out of the loom to g, then on round to b, leaving g along the straight (no corner there)
  const lead = Math.min(exit === undefined ? 60 : 120, 0.5 * Math.hypot(bx - g.x, by - g.y));
  const curve = sampleCubic(g, { x: g.x + ux * lead, y: g.y + uy * lead }, k, b);
  return way.map((w, i) => {
    const R = track0 + rank[i] * gap;
    const o = across[i];
    const a = w + phi;
    // where its track meets its run (the run: the centreline moved o across, straight out until g)
    const psi = Math.asin(Math.max(-0.95, Math.min(0.95, o / R)));
    const corner = phi + psi;
    const dir = Math.sign(corner - a) || 1;
    const [px, py] = [cx + R * Math.cos(corner), cy + R * Math.sin(corner)];
    const B = { x: px + ux * fillet, y: py + uy * fillet };
    const run = [B, ...offsetPoints(curve, o, { b: true })];
    const tap = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    const [tx, ty] = [cx + R * Math.cos(a), cy + R * Math.sin(a)];
    const h = 0.55 * fillet;
    let ring = `M ${v(tap.x)} ${v(tap.y)} L ${v(tx)} ${v(ty)} `;
    if (Math.abs(corner - a) * R <= fillet) {
      // a tap too near its turn for an arc: on out of its track along the radius and round into the run
      const [ox, oy] = [Math.cos(a), Math.sin(a)];
      ring += `C ${v(tx + ox * h)} ${v(ty + oy * h)} ${v(B.x - ux * h)} ${v(B.y - uy * h)} ${v(B.x)} ${v(B.y)}`;
    } else {
      const end = corner - (dir * fillet) / R;
      const [ex, ey] = [cx + R * Math.cos(end), cy + R * Math.sin(end)];
      // (round its way; a long way round in two halves, an arc flag can't say more than a half turn)
      const half = (a + end) / 2;
      const [hx, hy] = [cx + R * Math.cos(half), cy + R * Math.sin(half)];
      const sweep = dir > 0 ? 1 : 0;
      const [kx, ky] = [-Math.sin(end) * dir, Math.cos(end) * dir];
      ring += `A ${v(R)} ${v(R)} 0 0 ${sweep} ${v(hx)} ${v(hy)} A ${v(R)} ${v(R)} 0 0 ${sweep} ${v(ex)} ${v(ey)} `;
      ring += `C ${v(ex + kx * h)} ${v(ey + ky * h)} ${v(B.x - ux * h)} ${v(B.y - uy * h)} ${v(B.x)} ${v(B.y)}`;
    }
    return { ring, run: `M ${line(run)}` };
  });
}

/** An arc's points (SVG's endpoint form, a circle: rx = ry, no rotation) from p0 to p1, about every STEP px. */
function arcPoints(p0: Pt, r: number, large: boolean, sweep: boolean, p1: Pt): Pt[] {
  // (the centre, from the endpoints: SVG implementation notes F.6.5, with a radius too small for the chord grown to fit)
  const [dx, dy] = [(p0.x - p1.x) / 2, (p0.y - p1.y) / 2];
  const rr = Math.max(r, Math.hypot(dx, dy));
  const k = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, (rr * rr - dx * dx - dy * dy) / (dx * dx + dy * dy || 1)));
  const c = { x: k * dy + (p0.x + p1.x) / 2, y: -k * dx + (p0.y + p1.y) / 2 };
  const a0 = Math.atan2(p0.y - c.y, p0.x - c.x);
  let span = Math.atan2(p1.y - c.y, p1.x - c.x) - a0;
  if (sweep && span < 0) span += TAU;
  if (!sweep && span > 0) span -= TAU;
  const n = Math.max(2, Math.ceil((Math.abs(span) * rr) / STEP));
  return Array.from({ length: n }, (_, i) => {
    const a = a0 + (span * (i + 1)) / n;
    return { x: c.x + rr * Math.cos(a), y: c.y + rr * Math.sin(a) };
  });
}

/** The points along a path as this module and geometry.ts write them (M, L, Q, C, A with absolute coordinates). */
function pathPoints(d: string): Pt[] {
  const tok = d
    .replace(/([MLQCA])/g, ' $1 ')
    .trim()
    .split(/[\s,]+/);
  const out: Pt[] = [];
  const last = () => out[out.length - 1] ?? { x: 0, y: 0 };
  let cmd = 'M';
  for (let i = 0; i < tok.length;) {
    if (/^[MLQCA]$/.test(tok[i])) cmd = tok[i++];
    const num = () => +tok[i++];
    if (cmd === 'M' || cmd === 'L') out.push({ x: num(), y: num() });
    else if (cmd === 'Q') {
      const [q, b] = [
        { x: num(), y: num() },
        { x: num(), y: num() },
      ];
      out.push(...sampleQuad(last(), q, b).slice(1));
    } else if (cmd === 'C') {
      const [c1, c2, b] = [
        { x: num(), y: num() },
        { x: num(), y: num() },
        { x: num(), y: num() },
      ];
      out.push(...sampleCubic(last(), c1, c2, b).slice(1));
    } else if (cmd === 'A') {
      const r = num();
      i += 2;
      const [large, sweep] = [num() === 1, num() === 1];
      out.push(...arcPoints(last(), r, large, sweep, { x: num(), y: num() }));
    } else i++;
  }
  return out;
}

/**
 * A path drawn as a wave along it (what sound looks like on an edge, whatever way the edge runs: a spline, a ref's end
 * locked to its segment, a loom): `amp` px either side, about one cycle every `period` px (a whole number of them),
 * faded in and out at its ends so it leaves and meets the nodes straight.
 */
export function rippled(d: string, amp = 2.5, period = 11): string {
  const pts = pathPoints(d);
  const along: number[] = [0];
  for (let i = 1; i < pts.length; i++) along.push(along[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const length = along[along.length - 1];
  if (pts.length < 2 || length < 1) return d;
  const turns = Math.max(1, Math.round(length / period));
  const n = Math.max(8, Math.ceil((length / period) * 6));
  const out: Pt[] = [];
  for (let k = 0, j = 1; k <= n; k++) {
    const s = (length * k) / n;
    while (j < pts.length - 1 && along[j] < s) j++;
    const [p, q] = [pts[j - 1], pts[j]];
    const seg = along[j] - along[j - 1] || 1;
    const u = Math.max(0, Math.min(1, (s - along[j - 1]) / seg));
    const t = s / length;
    const w = amp * Math.sin(t * turns * TAU) * Math.min(1, t * 10, (1 - t) * 10);
    const [nx, ny] = [-(q.y - p.y) / seg, (q.x - p.x) / seg];
    out.push({ x: p.x + (q.x - p.x) * u + nx * w, y: p.y + (q.y - p.y) * u + ny * w });
  }
  return `M ${line(out)}`;
}
