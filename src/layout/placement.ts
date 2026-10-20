/**
 * Meters placed last (#27): once the layout has settled, each meter is put where its net costs least and held there,
 * room made round it.
 */
import { distanceToSegment } from './quality';
import { drawnPieces, hits, meterNet } from './nets';
import type { LayoutState, PhysNode } from './state';
import { placeJunctions } from './junctions';

/**
 * Meters last (#27): each meter that steps cells is put where its net (meterNet) costs least — short traces that
 * cross no drawn edge and pass through no wheel — and held there. Which face of the drawing it sits in, inside a
 * closed cycle or outside it, decides which cells it can reach cleanly, so a face too small for it still counts
 * (crowding costs a little): its wheels are pushed apart to make room (makeRoom). Call after the layout settles.
 */
export function placeMeters(s: LayoutState): void {
  // (not a table of sections: its sub-nets leave from its bulbs, and it stays where its own edges put it)
  const meters = [...new Set(s.grounds.filter((g) => !g.bulb).map((g) => g.meter))];
  for (const m of meters) {
    const node = s.byId.get(m);
    // (one the user moved stays where they put it)
    if (!node || (node.fx != null && !s.placedMeters.has(m))) continue;
    const cells = [...new Set(s.grounds.filter((g) => g.meter === m).map((g) => g.cell))].filter((id) => s.byId.has(id)).map((id) => s.byId.get(id)!);
    // (a product's junction under its voice too, where it hangs now: junctions.ts)
    placeJunctions(s);
    const hung = [...s.junctions.values()].filter((j) => j.x !== undefined);
    const others = [...s.byId.values(), ...hung].filter((n) => n.id !== m && n.role !== 'tag');
    if (!others.length || !cells.length) continue;
    const pieces = drawnPieces(s, (a, b) => a === m || b === m);
    // what the net would cost between its cells (as meterNet costs it), wherever the meter is
    const joined = new Set(s.links.map((l) => [l.source, l.target].sort().join('|')));
    const between = cells.map((a) =>
      cells.map((b) => {
        if (a === b) return 0;
        const len = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
        return len * (1 + 2 * hits(s, a.x ?? 0, a.y ?? 0, a.radius, a.id, b.id, pieces, 4)) * (joined.has([a.id, b.id].sort().join('|')) ? 3 : 1);
      }),
    );
    // its belts (to the cells it drives through a spring): drawn over the wheels, two runs, so every edge or wheel one
    // would cross counts twice
    const belted = s.links
      .filter((l) => l.belt && l.target === m)
      .map((l) => s.byId.get(l.source))
      .filter((n): n is PhysNode => !!n);
    const beltCost = (x: number, y: number) =>
      belted.reduce((sum, c) => {
        const [cx, cy] = [c.x ?? 0, c.y ?? 0];
        const over = others.filter((o) => o !== c && distanceToSegment(o.x ?? 0, o.y ?? 0, x, y, cx, cy) < o.radius).length;
        return sum + Math.hypot(cx - x, cy - y) * (1 + 4 * (hits(s, x, y, node.radius, m, c.id, pieces, 4) + over));
      }, 0);
    const xs = others.map((n) => n.x ?? 0);
    const ys = others.map((n) => n.y ?? 0);
    const reach = node.radius * 2 + s.opts.collidePad;
    const [x0, x1, y0, y1] = [Math.min(...xs) - reach, Math.max(...xs) + reach, Math.min(...ys) - reach, Math.max(...ys) + reach];
    const step = Math.max(40, Math.max(x1 - x0, y1 - y0) / 40);
    let best: { x: number; y: number; cost: number; crowd: number } | null = null;
    // (a meter held at a height, the tower layout: sought along its row only)
    const held = s.opts.heightPull ? undefined : s.opts.heights?.get(m);
    const [ya, yb] = held === undefined ? [y0, y1] : [held, held];
    for (let y = ya; y <= yb; y += step)
      for (let x = x0; x <= x1; x += step) {
        // (not on a wheel; nearer than it should be is crowding — room is made for it)
        let crowd = 0;
        let on = false;
        for (const o of others) {
          const d = Math.hypot((o.x ?? 0) - x, (o.y ?? 0) - y);
          // (a meter placed already, or a junction, is held: nothing would push the two apart, so it is kept clear of whole)
          if (d < (node.radius + o.radius) * (s.placedMeters.has(o.id) || s.junctions.has(o.id) ? 1 : 0.6)) on = true;
          crowd += Math.max(0, node.radius + o.radius + s.opts.collidePad - d);
        }
        if (on) continue;
        // the net's cost from here: a spanning tree (Prim's) over the meter and its cells
        const to = cells.map((c) => Math.hypot((c.x ?? 0) - x, (c.y ?? 0) - y) * (1 + 2 * hits(s, x, y, node.radius, m, c.id, pieces, 4)));
        const near = [...to];
        const done = cells.map(() => false);
        let cost = crowd * 2 + beltCost(x, y);
        for (let k = 0; k < cells.length; k++) {
          let i = -1;
          for (let c = 0; c < cells.length; c++) if (!done[c] && (i < 0 || near[c] < near[i])) i = c;
          done[i] = true;
          cost += near[i];
          for (let c = 0; c < cells.length; c++) if (!done[c]) near[c] = Math.min(near[c], between[i][c]);
        }
        if (!best || cost < best.cost) best = { x, y, cost, crowd };
      }
    if (!best) continue;
    node.x = node.fx = best.x;
    node.y = node.fy = best.y;
    node.vx = node.vy = 0;
    s.placedMeters.add(m);
    if (best.crowd > 0) makeRoom(s, m);
  }
  meterNet(s);
}

/**
 * Room round a placed meter: wheels closer than they may be are pushed apart, the meter held — a little at a
 * time, so each moves out of the way along where it was (the drawing keeps its faces).
 */
function makeRoom(s: LayoutState, meter: string): void {
  // (a product's junction hangs under its voice: pushed, its voice moves, and it with it)
  const hung = [...s.junctions.values()].filter((j) => j.x !== undefined);
  const nodes = [...s.byId.values(), ...hung].filter((n) => n.role !== 'tag');
  const body = (n: PhysNode) => (n.rides ? (s.byId.get(n.rides) ?? n) : n);
  const pinned = (n: PhysNode) => n.id === meter || s.placedMeters.has(n.id) || n.fx != null;
  const move = (n: PhysNode, dx: number, dy: number) => {
    for (const m of new Set([n, body(n)])) {
      m.x = (m.x ?? 0) + dx;
      m.y = (m.y ?? 0) + dy;
    }
  };
  for (let round = 0; round < 60; round++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const [a, b] = [nodes[i], nodes[j]];
        if (body(a) === body(b)) continue;
        const [pa, pb] = [pinned(body(a)), pinned(body(b))];
        if (pa && pb) continue;
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const d = Math.hypot(dx, dy) || 1;
        const short = a.radius + b.radius + s.opts.collidePad - d;
        if (short <= 0.5) continue;
        moved = true;
        const [ux, uy] = [dx / d, dy / d];
        const [sa, sb] = pa ? [0, 1] : pb ? [1, 0] : [0.5, 0.5];
        move(a, -ux * short * sa * 0.5, -uy * short * sa * 0.5);
        move(b, ux * short * sb * 0.5, uy * short * sb * 0.5);
      }
    if (!moved) break;
    placeJunctions(s);
  }
}
