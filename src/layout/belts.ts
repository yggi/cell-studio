/**
 * A belt between two pulleys, drawn as a real one is: its two runs are the outer tangents
 * of the two circles (an open belt). Pulleys sized by the step ratio: a cell stepped at half
 * its driver's rate (step=&bar/2) has a pulley twice the size.
 */
export type P = { x: number; y: number };

/** The two runs of an open belt round pulleys (c1, r1) and (c2, r2); null when one sits inside the other. */
export function openBelt(c1: P, r1: number, c2: P, r2: number): [[P, P], [P, P]] | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  if (d <= Math.abs(r1 - r2) + 1e-6) return null;
  const theta = Math.atan2(dy, dx);
  const phi = Math.acos((r1 - r2) / d);
  const run = (sign: 1 | -1): [P, P] => {
    const a = theta + sign * phi;
    return [
      { x: c1.x + r1 * Math.cos(a), y: c1.y + r1 * Math.sin(a) },
      { x: c2.x + r2 * Math.cos(a), y: c2.y + r2 * Math.sin(a) },
    ];
  };
  return [run(1), run(-1)];
}

/** Pulley sizes: the driver's a third of its wheel, the driven one by the ratio (rate: its steps per driver step). */
export function pulleys(driverR: number, drivenR: number, rate: number): [number, number] {
  const a = driverR * 0.32;
  const clamp = (r: number, own: number) => Math.max(own * 0.16, Math.min(own * 0.46, r));
  return [clamp(a, driverR), clamp(a / Math.max(1e-3, rate), drivenR)];
}

/** A run as a path, sagging by `sag` (px) at its middle, towards `side` (+1/−1 of its left normal). */
export function runPath(a: P, b: P, sag: number, side: 1 | -1): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (-(b.y - a.y) / len) * side;
  const ny = ((b.x - a.x) / len) * side;
  return `M${a.x},${a.y} Q${mx + nx * sag * 2},${my + ny * sag * 2} ${b.x},${b.y}`;
}
