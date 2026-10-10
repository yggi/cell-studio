/**
 * Prototypes for the edge mock-ups (docs/notes/edge-styles.md): an edge's payload drawn along it as if it travelled at a
 * constant speed (a wave by its pitch and level, a clock's pulse train, a level's ribbon). Not used by the app: what
 * was chosen moves into `src/layout/` (the bus's geometry already has: `wire.ts`).
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
 * shape, moved on by `phase` cycles (it travels along the flow); faded in and out at the ends, as rippled is (src/layout/wire.ts).
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
