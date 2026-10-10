/**
 * A start by insertion (LayoutOptions.insert; off by default): a fresh graph taken in one cell at a time, from its
 * drains, the forces on the cells taken in so far.
 */
import type { forceLink, Simulation } from 'd3-force';
import type { GraphModel } from '../engine/graph';
import type { forceUncross } from './forces';
import { jitter } from './start';
import type { LayoutState, PhysLink, PhysNode } from './state';

/**
 * Laid out by insertion (the owner's idea): a fresh graph starts from its drains — the sound card, a scope — and
 * takes in its cells one at a time, each next to the ones it is joined to already, in the order a walk from the
 * drains along the drawn edges meets them; what no drawn edge reaches (a meter: its edges are ground) comes last.
 * While it grows, the forces see only the cells taken in so far (`byId` is theirs; `all` holds the rest).
 */
export class Insertion {
  private pending: string[] = [];
  private all: Map<string, PhysNode> | null = null;
  private insertClock = 0;
  private insertEvery = 1;
  private adjacent = new Map<string, string[]>();
  private simLinks: PhysLink[] = [];
  private crossLinks: { source: PhysNode; target: PhysNode }[] = [];

  constructor(
    private readonly s: LayoutState,
    private readonly sim: Simulation<PhysNode, PhysLink>,
  ) {}

  start(model: GraphModel, grounds: ReadonlySet<string>): void {
    const all = new Map(this.s.byId);
    const cells = model.nodes.filter((n) => all.has(n.id));
    const drawn = new Map<string, string[]>();
    const adjacent = new Map<string, string[]>();
    const join = (m: Map<string, string[]>, a: string, b: string) => {
      (m.get(a) ?? m.set(a, []).get(a)!).push(b);
      (m.get(b) ?? m.set(b, []).get(b)!).push(a);
    };
    for (const e of model.edges) {
      if (e.port === 'about' || !all.has(e.source) || !all.has(e.target) || e.source === e.target) continue;
      join(adjacent, e.source, e.target);
      if (!grounds.has(e.id)) join(drawn, e.source, e.target);
    }
    const cellOf = (n: (typeof cells)[number]) => n.cell as { sink?: boolean; note?: boolean; params?: Record<string, unknown>; map?: { kind: string } | null };
    const drains = cells.filter((n) => cellOf(n).sink || cellOf(n).map?.kind === 'midi' || typeof cellOf(n).params?.scope === 'string').map((n) => n.id);
    // (a walk from the drains, breadth first, the busiest neighbour first)
    const order: string[] = [];
    const seen = new Set<string>();
    const queue = drains.length ? [...drains] : cells.slice(0, 1).map((n) => n.id);
    for (const id of queue) seen.add(id);
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const nb of [...(drawn.get(id) ?? [])].sort((a, b) => (drawn.get(b)?.length ?? 0) - (drawn.get(a)?.length ?? 0)))
        if (!seen.has(nb)) {
          seen.add(nb);
          queue.push(nb);
        }
    }
    // then what the walk didn't reach: cells, then meters, then notes
    const rest = cells.filter((n) => !seen.has(n.id));
    const rank = (n: (typeof cells)[number]) => (cellOf(n).note ? 2 : (n as { isMeter?: boolean }).isMeter ? 1 : 0);
    order.push(...rest.sort((a, b) => rank(a) - rank(b)).map((n) => n.id));
    if (order.length < 3) return;
    this.all = all;
    this.adjacent = adjacent;
    this.simLinks = [...(this.sim.force('link') as ReturnType<typeof forceLink<PhysNode, PhysLink>>).links()];
    this.crossLinks = [...(this.sim.force('uncross') as unknown as ReturnType<typeof forceUncross>).current()];
    const first = drains.length || 1;
    this.pending = order.slice(first);
    this.insertEvery = Math.max(1, Math.floor(this.s.opts.insert / this.pending.length));
    this.insertClock = 0;
    // the drains in the middle, side by side
    const start = order.slice(0, first);
    start.forEach((id, i) => Object.assign(all.get(id)!, { x: (i - (start.length - 1) / 2) * this.s.opts.linkDistance, y: 0, vx: 0, vy: 0 }));
    this.activate(new Set(start));
  }

  /** The forces and the simulation on the cells taken in so far (a tag with them, once one of its cells is in). */
  private activate(on: ReadonlySet<string>): void {
    const all = this.all!;
    const tags = new Set([...on].flatMap((id) => (all.get(id)?.group ? [`tag:${all.get(id)!.group}`] : [])));
    const live = (id: string) => on.has(id) || tags.has(id);
    this.s.byId = new Map([...all].filter(([id]) => live(id)));
    this.sim.nodes([...this.s.byId.values()]);
    const idOf = (x: unknown) => (typeof x === 'object' ? (x as PhysNode).id : (x as string));
    (this.sim.force('link') as ReturnType<typeof forceLink<PhysNode, PhysLink>>).links(this.simLinks.filter((l) => live(idOf(l.source)) && live(idOf(l.target))));
    (this.sim.force('uncross') as unknown as ReturnType<typeof forceUncross>).links(this.crossLinks.filter((l) => live(l.source.id) && live(l.target.id)));
  }

  /** One step of the insertion: the next cell taken in, next to the ones it is joined to already. */
  step(): void {
    if (!this.all || this.insertClock++ % this.insertEvery) return;
    const id = this.pending.shift();
    const n = id ? this.all.get(id) : undefined;
    if (n) {
      const placed = [...this.s.byId.values()].filter((p) => p.role !== 'tag');
      const near = (this.adjacent.get(n.id) ?? []).map((a) => this.s.byId.get(a)).filter((p): p is PhysNode => !!p && p.role !== 'tag');
      const mid = (ps: PhysNode[]) => ({ x: ps.reduce((a, p) => a + (p.x ?? 0), 0) / ps.length, y: ps.reduce((a, p) => a + (p.y ?? 0), 0) / ps.length });
      const g = mid(placed);
      const c = near.length ? mid(near) : g;
      // (out from the middle of what's there, close beside its neighbours: measured, nearer gathers the clusters best)
      let [dx, dy] = [c.x - g.x, c.y - g.y];
      const l = Math.hypot(dx, dy);
      const a = (jitter(n.id, 7 + this.s.opts.seed) / 40 + 0.5) * 2 * Math.PI;
      [dx, dy] = l > 1 ? [dx / l, dy / l] : [Math.cos(a), Math.sin(a)];
      const reach = near.length ? this.s.opts.linkDistance * 0.4 : Math.max(...placed.map((p) => Math.hypot((p.x ?? 0) - g.x, (p.y ?? 0) - g.y))) + this.s.opts.linkDistance;
      Object.assign(n, { x: c.x + dx * reach + jitter(n.id, 3) * 0.5, y: c.y + dy * reach + jitter(n.id, 4) * 0.5, vx: 0, vy: 0 });
      this.activate(new Set([...this.s.byId.keys(), n.id]));
      this.sim.alpha(Math.max(this.sim.alpha(), 0.6));
    }
    if (!this.pending.length) this.end();
  }

  /** The insertion over (or cut short by a new graph): every cell in, the forces on all of them. */
  end(): void {
    if (!this.all) return;
    const ids = new Set(this.all.keys());
    this.activate(ids);
    this.all = null;
    this.pending = [];
  }
}
