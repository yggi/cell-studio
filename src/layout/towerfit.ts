/**
 * The tower and the graph, balanced (docs/notes/tower-rows.md: the tower balanced): the graph's heights read as a
 * function of the tower's. A monotone fit (isotonic regression, pool adjacent violators) of where each node sits in the
 * graph against where it sits on the tower: the axis is drawn by it, so a zone spans the heights its nodes take (where
 * the graph is dense the zone's band is wide), and a node is pulled, weakly, to the height its time scale has on it.
 * Pure geometry: the layout and the axis read the same fit.
 */

/** A fit: the graph's height (y, down positive) for a height on the tower (decades). */
export type TowerFit = (decades: number) => number;

/**
 * The monotone fit of the graph's heights `y` (down positive: higher on the tower is further up, so smaller y) against
 * the tower's `at` (decades): points with a finite height on the tower, each node weighed alike. Between the points it
 * interpolates, beyond them it holds the end. Null with fewer than two distinct heights on the tower.
 */
export function towerFit(points: readonly { readonly at: number; readonly y: number }[]): TowerFit | null {
  // (nodes at one height on the tower are one point, weighed by how many)
  const by = new Map<number, { y: number; w: number }>();
  for (const p of points)
    if (Number.isFinite(p.at) && Number.isFinite(p.y)) {
      const g = by.get(p.at) ?? by.set(p.at, { y: 0, w: 0 }).get(p.at)!;
      g.y += p.y;
      g.w++;
    }
  if (by.size < 2) return null;
  const ps = [...by].map(([at, g]) => ({ at, y: g.y / g.w, w: g.w })).sort((a, b) => a.at - b.at);
  // pool adjacent violators, on −y so it must not decrease as the tower rises; a pooled block is flat across its span
  const blocks: { lo: number; hi: number; v: number; w: number }[] = [];
  for (const p of ps) {
    blocks.push({ lo: p.at, hi: p.at, v: -p.y, w: p.w });
    while (blocks.length > 1 && blocks[blocks.length - 2].v >= blocks[blocks.length - 1].v) {
      const b = blocks.pop()!;
      const a = blocks.pop()!;
      const w = a.w + b.w;
      blocks.push({ lo: a.lo, hi: b.hi, v: (a.v * a.w + b.v * b.w) / w, w });
    }
  }
  const knots = blocks.flatMap((b) =>
    b.hi > b.lo
      ? [
          { at: b.lo, y: -b.v },
          { at: b.hi, y: -b.v },
        ]
      : [{ at: b.lo, y: -b.v }],
  );
  return (d) => {
    if (knots.length === 1 || d <= knots[0].at) return knots[0].y;
    const last = knots[knots.length - 1];
    if (d >= last.at) return last.y;
    let i = 1;
    while (knots[i].at < d) i++;
    const [a, b] = [knots[i - 1], knots[i]];
    return a.y + ((b.y - a.y) * (d - a.at)) / (b.at - a.at);
  };
}
