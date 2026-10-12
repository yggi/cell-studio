/**
 * The tower layout's own forces (docs/notes/tower-strip.md), for nodes held at a height (`LayoutOptions.heights`):
 * d3's collision pushes along the line between two centres, and a held node drops the vertical part of it, so two
 * held nodes one above the other would stay overlapped. `sideCollide` pushes them apart sideways only, as far as their
 * rooms need at the height between them. `rowClear` pushes a free node (one with no height) up or down off the rows
 * the sound wires run along (`wireRows`: each a wire's height, running the graph's whole width to both strips), so no
 * wire passes over it; a held node can't move off a row, its wire goes round it (TowerWires.svelte).
 */
import type { LayoutState } from './state';

export function stepHeld(s: LayoutState, alpha: number): void {
  const o = s.opts;
  const held = o.heights;
  if (!held) return;
  const nodes = [...s.byId.values()].filter((n) => n.role !== 'tag' && n.x !== undefined && n.y !== undefined);
  if (o.sideCollide > 0)
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const [a, b] = [nodes[i], nodes[j]];
        if (!held.has(a.id) && !held.has(b.id)) continue;
        const room = (a.radius + b.radius + 2 * o.collidePad) * s.size;
        const dy = Math.abs(b.y! - a.y!);
        if (dy >= room) continue;
        const need = Math.sqrt(room * room - dy * dy);
        const dx = b.x! - a.x!;
        if (Math.abs(dx) >= need) continue;
        // (exactly in line: apart by their ids, so the same way every time)
        const side = dx !== 0 ? Math.sign(dx) : a.id < b.id ? 1 : -1;
        const push = (need - Math.abs(dx)) * 0.5 * o.sideCollide;
        a.vx = (a.vx ?? 0) - side * push;
        b.vx = (b.vx ?? 0) + side * push;
      }
  const rows = o.wireRows;
  if (o.rowClear > 0 && rows?.length)
    for (const n of nodes) {
      if (held.has(n.id) || n.rides) continue;
      // (its body: its wheel, not its label's room)
      const body = n.radius * 0.7 * s.size;
      for (const y of rows) {
        const d = n.y! - y;
        if (Math.abs(d) >= body) continue;
        n.vy = (n.vy ?? 0) + (d >= 0 ? 1 : -1) * (body - Math.abs(d)) * o.rowClear * alpha;
      }
    }
}
