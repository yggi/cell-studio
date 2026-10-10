/**
 * Prototypes for the edge mock-ups (docs/notes/edge-styles.md): a bus as true offsets of one centreline (constant width
 * through every bend), its strands turning off the loom's ring with a fillet instead of a corner, and an edge's payload
 * drawn along it as if it travelled at a constant speed (a wave by its pitch and level, a clock's pulse train). Not used by
 * the app: what is chosen moves into `src/layout/geometry.ts`.
 */
type P = { x: number; y: number };
const TAU = Math.PI * 2;
const v1 = (n: number) => n.toFixed(1);

/** Points along the quadratic a → b with control c, about `step` px apart. */
export function sampleQuad(a: P, c: P, b: P, step = 3): P[] {
  const n = Math.max(4, Math.ceil((Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y)) / step));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });
}

/** The unit normal (the tangent turned a quarter, as strandPath's) at each point of a polyline. */
function normals(pts: P[]): P[] {
  return pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / l, y: (b.x - a.x) / l };
  });
}

/** A polyline moved `o` px along its normal at every point: a strand beside the centreline, the same distance all along. */
export function offset(pts: P[], o: number): P[] {
  const ns = normals(pts);
  return pts.map((p, i) => ({ x: p.x + ns[i].x * o, y: p.y + ns[i].y * o }));
}

export const toPath = (pts: P[]) => `M ${pts.map((p) => `${v1(p.x)} ${v1(p.y)}`).join(' L ')}`;

/** A spline's strands (a chord's bus, a hop): offsets of the one curve through m. */
export function bundle(a: P, m: P, b: P, offsets: number[]): string[] {
  const c = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
  const centre = sampleQuad(a, c, b);
  return offsets.map((o) => toPath(offset(centre, o)));
}

/**
 * The loom as loomParts lays it (the same tracks, ranks and seam), its strands drawn anew: round its track, off it
 * through a fillet `fillet` px long (tangent to the track and to the run, no corner), then on as an offset of one
 * centreline (straight out of the ring, then the curve to b): so the bundle keeps its width through every bend.
 */
export function loomStrands(c: P, r: number, turns: readonly number[], m: P, b: P, gap: number, fillet = 10): string[] {
  const phi = Math.atan2(b.y - c.y, b.x - c.x);
  const [ux, uy] = [Math.cos(phi), Math.sin(phi)];
  const n = turns.length;
  const wrap = (t: number) => ((t % 1) + 1) % 1;
  const out = wrap((phi + Math.PI / 2) / TAU);
  const seam = n > 1 ? turns[n - 1] + wrap(turns[0] - turns[n - 1]) / 2 : out + 0.5;
  const way = turns.map((t) => (wrap(t - seam) - wrap(out - seam)) * TAU);
  const rank = way.map((d, i) => way.filter((e, j) => Math.abs(e) < Math.abs(d) || (Math.abs(e) === Math.abs(d) && j < i)).length);
  const across = way.map((_, i) => (i - (n - 1) / 2) * gap);
  const track0 = r + 1.5 * gap;
  const outer = track0 + Math.max(0, ...rank) * gap;
  const d = Math.hypot(b.x - c.x, b.y - c.y) || 1;
  const reach = Math.max(outer + fillet + 12, Math.min(outer + 60, r + 0.5 * (d - r)));
  const g = { x: c.x + ux * reach, y: c.y + uy * reach };
  const q = { x: 2 * m.x - (c.x + b.x) / 2, y: 2 * m.y - (c.y + b.y) / 2 };
  const ahead = (q.x - c.x) * ux + (q.y - c.y) * uy > reach + 4;
  const k = ahead ? q : { x: (g.x + b.x) / 2, y: (g.y + b.y) / 2 };
  // the centreline: straight out from the ring to g, then on round to b
  const straight = Array.from({ length: Math.ceil((reach - r) / 3) + 1 }, (_, i) => {
    const s = r + ((reach - r) * i) / Math.ceil((reach - r) / 3);
    return { x: c.x + ux * s, y: c.y + uy * s };
  });
  const centre = [...straight, ...sampleQuad(g, k, b).slice(1)];
  const along = (p: P) => (p.x - c.x) * ux + (p.y - c.y) * uy;
  return way.map((w, i) => {
    const a = w + phi;
    const R = track0 + rank[i] * gap;
    const o = across[i];
    const psi = Math.asin(Math.max(-0.95, Math.min(0.95, o / R)));
    const corner = phi + psi;
    const dir = Math.sign(corner - a) || 1;
    // (the arc stops short of the corner by the fillet, and the run starts that far past it)
    // (every run starts at one distance out, so the bundle leaves the loom square: an inner track's fillet is longer and
    // gentler, an outer one's tighter — nested, like a harness bending round one corner)
    const F = outer + fillet - R * Math.cos(psi);
    const back = Math.min(Math.abs(corner - a), F / R);
    const aEnd = corner - dir * back;
    const tap = { x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) };
    const onTrack = { x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) };
    const A = { x: c.x + R * Math.cos(aEnd), y: c.y + R * Math.sin(aEnd) };
    const sweep = dir > 0 ? 1 : 0;
    const span = Math.abs(aEnd - a);
    const half = (a + aEnd) / 2;
    const H = { x: c.x + R * Math.cos(half), y: c.y + R * Math.sin(half) };
    const arc = span > 1e-3 ? `A ${v1(R)} ${v1(R)} 0 0 ${sweep} ${v1(H.x)} ${v1(H.y)} A ${v1(R)} ${v1(R)} 0 0 ${sweep} ${v1(A.x)} ${v1(A.y)}` : '';
    const run = offset(centre, o);
    const start = outer + fillet;
    const from = run.findIndex((p, j) => j >= straight.length - 1 || along(p) >= start);
    const B = run[from];
    // (tangent to the track where the arc ends, along the run where it starts)
    const tA = { x: -Math.sin(aEnd) * dir, y: Math.cos(aEnd) * dir };
    const h = 0.55 * F;
    const fil = `C ${v1(A.x + tA.x * h)} ${v1(A.y + tA.y * h)} ${v1(B.x - ux * h)} ${v1(B.y - uy * h)} ${v1(B.x)} ${v1(B.y)}`;
    return `M ${v1(tap.x)} ${v1(tap.y)} L ${v1(onTrack.x)} ${v1(onTrack.y)} ${arc} ${fil} L${toPath(run.slice(from + 1)).slice(1)}`;
  });
}

/** One cycle of a sound's shape, at x in [0, 1): −1 … 1. */
export type Shape = 'sine' | 'tri' | 'saw' | 'square';
const SHAPES: Record<Shape, (x: number) => number> = {
  sine: (x) => Math.sin(x * TAU),
  tri: (x) => 1 - 4 * Math.abs(((x + 0.25) % 1) - 0.5),
  saw: (x) => 2 * ((x + 0.5) % 1) - 1,
  square: (x) => (x % 1 < 0.5 ? 1 : -1),
};

/**
 * A spline through m with its payload drawn on it as a wave: `amp` px either side, a cycle every `period` px, of a
 * shape, moved on by `phase` cycles (it travels along the flow); faded in and out at the ends, as ripplePath is.
 */
export function wavePath(a: P, m: P, b: P, amp: number, period: number, shape: Shape = 'sine', phase = 0): string {
  const c = { x: 2 * m.x - (a.x + b.x) / 2, y: 2 * m.y - (a.y + b.y) / 2 };
  const centre = sampleQuad(a, c, b, 1);
  const ns = normals(centre);
  let s = 0;
  const pts = centre.map((p, i) => {
    if (i) s += Math.hypot(p.x - centre[i - 1].x, p.y - centre[i - 1].y);
    const t = i / (centre.length - 1);
    const y = amp * SHAPES[shape](((s / period - phase) % 1) + 1) * Math.min(1, t * 10, (1 - t) * 10);
    return { x: p.x + ns[i].x * y, y: p.y + ns[i].y * y };
  });
  return toPath(pts);
}

/** The visual speed every payload travels at along its wire (px a second): what is s px along it left the source s/v ago. */
export const SPEED = 90;

/**
 * A sound's wavelength on its wire: one speed for all, compressed so the audible range fits (an octave up, ×1/√2):
 * C4 at 14 px, between 5 and 28 px.
 */
export const wavelength = (hz: number) => Math.max(5, Math.min(28, 14 * Math.pow(2, -0.5 * Math.log2(hz / 261.63))));
