/** SVG path helpers for the cell wheels. Angles are in turns, 0 = 12 o'clock, clockwise. */

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
  return [
    `M ${f(ax)} ${f(ay)}`,
    `A ${f(r1)} ${f(r1)} 0 ${large} 1 ${f(bx)} ${f(by)}`,
    `L ${f(c2x)} ${f(c2y)}`,
    `A ${f(r0)} ${f(r0)} 0 ${large} 0 ${f(dx)} ${f(dy)}`,
    'Z',
  ].join(' ');
}
