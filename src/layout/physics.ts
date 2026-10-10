/**
 * Force-directed layout for the cell graph (d3-force), independent of the
 * renderer. Nodes keep their simulated state across graph edits, so editing
 * code nudges the picture instead of rebuilding it. Depth is a soft radial
 * force: the root grid sits at the centre and cells ring outward along their
 * over= chains — but everything still moves freely.
 *
 * ForceLayout holds the layout's state (state.ts) and runs it, phase by phase: the start (start.ts, insertion.ts),
 * the forces (forces.ts, aims.ts, nets.ts: stepNets), the nets (nets.ts) and the meters placed last (placement.ts),
 * under the options (options.ts).
 */
import { forceX, forceY, forceCollide, forceLink, forceManyBody, forceSimulation, type Simulation } from 'd3-force';
import type { GraphModel } from '../engine/graph';
import { drawnCrossings, layoutQuality, type LayoutQuality } from './quality';
import { groundsOf } from './meters';
import { openBelt, pulleys } from './belts';
import { strengthOf } from './weights';
import { BELT_LENGTH, BELT_PULL, DEFAULT_LAYOUT, GROUND_PULL, linkPull, type LayoutOptions } from './options';
import type { LayoutState, MeterTrace, PhysLink, PhysNode } from './state';
import { nodeAt, positionOf } from './state';
import { folded, junctionNodes, placeJunctions, settleJunctions } from './junctions';
import { rowsKey, startNodes, startPlaces } from './start';
import { Insertion } from './insertion';
import { forceUncross, stepAbout, stepBends, stepClusters, stepExclusion, stepKinds, stepSpread } from './forces';
import { aims, fitTurns, stepAims } from './aims';
import { hops, meterNet, netTree, stepNets, taps } from './nets';
import { placeMeters } from './placement';

export interface GraphDiff {
  added: number;
  removed: number;
  total: number;
  structural: boolean;
}

export class ForceLayout {
  private readonly s: LayoutState;
  /** The rows' order of the last fresh graph (rowOrderFor): an edit keeps it, as it keeps the positions. */
  private rowChoice = 0;
  private readonly sim: Simulation<PhysNode, PhysLink>;
  private readonly insertion: Insertion;
  private settleListeners: (() => void)[] = [];
  /** How far a fresh graph has grown, in ticks. */
  private growing = Infinity;

  constructor(onTick: () => void = () => {}, opts: Partial<LayoutOptions> = {}) {
    this.s = {
      opts: { ...DEFAULT_LAYOUT, ...opts },
      byId: new Map(),
      links: [],
      springs: [],
      junctions: new Map(),
      rims: new Map(),
      ends: new Map(),
      rankY: new Map(),
      degree: new Map(),
      colX: new Map(),
      bendAt: new Map(),
      size: 1,
      explains: [],
      faces: [],
      turns: new Map(),
      nets: [],
      edgeEnds: new Map(),
      drawnNets: [],
      drawnEnds: new Map(),
      grounds: [],
      net: [],
      placedMeters: new Set(),
    };
    const o = this.s.opts;
    this.sim = forceSimulation<PhysNode, PhysLink>([])
      .alphaMin(0.01)
      .velocityDecay(0.45)
      // every edge contracts a little
      .force(
        'link',
        forceLink<PhysNode, PhysLink>([]).id((d) => d.id),
      )
      // every node repels a little, near field only: neighbours, not the whole graph
      .force('charge', forceManyBody<PhysNode>())
      // nodes don't overlap, labels included (this isn't tension: it only acts on contact)
      .force('collide', forceCollide<PhysNode>().strength(0.95).iterations(2))
      // (first: the scale for this tick, while a fresh graph grows)
      .force('grow', () => this.growStep())
      .force(
        'uncross',
        forceUncross(
          () => this.s.opts.uncross,
          (n) => (n.rides ? this.s.byId.get(n.rides) : n),
        ) as never,
      )
      // mass: a heavy node takes less of each push (inertia); d3 has none, so its velocity is scaled down
      .force('mass', () => {
        if (!this.s.opts.inertia) return;
        for (const n of this.sim.nodes()) {
          const k = 1 / Math.sqrt(1 + this.s.opts.inertia * ((n.mass ?? 1) - 1));
          n.vx = (n.vx ?? 0) * k;
          n.vy = (n.vy ?? 0) * k;
        }
      })
      // the sound card drifts up-centre, the meter down-centre (a slight pull, not a pin); all else gently centred
      .force(
        'endsX',
        forceX<PhysNode>((d) => this.s.ends.get(d.id)?.x ?? this.s.colX.get(d.id) ?? 0),
      )
      // every node drifts to the height of its rank in the signal path (y only: x stays free)
      .force(
        'rankY',
        forceY<PhysNode>((d) => this.s.rankY.get(d.id) ?? 0),
      )
      // edges' midpoints: drawn back to the straight line, slipping off any node they would rest on
      .force('bends', () => stepBends(this.s))
      // each net: springs along its tree, and wheels kept off its joins
      .force('nets', (alpha: number) => stepNets(this.s, alpha))
      // the edges at a node spread round it; time and sound apart; tagged cells in clusters
      .force('spread', (alpha: number) => stepSpread(this.s, alpha))
      .force('kinds', (alpha: number) => stepKinds(this.s, alpha))
      .force('clusters', (alpha: number) => stepClusters(this.s, alpha))
      // a note drifts towards the cells it explains (and only it: they don't feel it)
      .force('about', (alpha: number) => stepAbout(this.s, alpha))
      // a tape turns so its heads face what they connect to, and those turn round it towards their heads
      .force('aims', (alpha: number) => stepAims(this.s, alpha))
      // turntables: nothing overlaps them — a node that would is set at their edge
      .force('exclusion', () => stepExclusion(this.s))
      .on('tick', () => {
        this.insertion.step();
        placeJunctions(this.s);
        onTick();
      })
      .on('end', () => {
        // (at rest: the products' junctions where their wires cross least, shown at once)
        if (this.s.junctions.size) {
          settleJunctions(this.s, (l) => this.beltRuns(l));
          onTick();
        }
        this.settleListeners.forEach((f) => f());
      });
    this.insertion = new Insertion(this.s, this.sim);
    this.applyOptions();
    if (!o.live) this.sim.stop();
  }

  /** A tape's turn, degrees (screen: 0 to the right, clockwise): where its write head is drawn. */
  tapeTurn(id: string): number | undefined {
    const t = this.s.turns.get(id);
    return t === undefined ? undefined : (t * 180) / Math.PI;
  }

  /** The options in force (for the options view). */
  get options(): Readonly<LayoutOptions> {
    return this.s.opts;
  }

  /** Change forces live (the options view): they apply at once and the layout re-settles. */
  setOptions(next: Partial<LayoutOptions>): void {
    this.s.opts = { ...this.s.opts, ...next };
    this.applyOptions();
    this.reheat(0.4);
  }

  /** One tick of the growing: the scale for it, and the heat kept up while it gathers and grows (the library's way). */
  private growStep(): void {
    if (this.growing >= this.s.opts.growGather + this.s.opts.growTicks) return;
    const t = Math.max(0, this.growing - this.s.opts.growGather) / this.s.opts.growTicks;
    const s0 = this.s.opts.growStart;
    this.s.size = s0 + (1 - s0) * t * t * (3 - 2 * t);
    this.growing++;
    if (this.growing >= this.s.opts.growGather + this.s.opts.growTicks) this.s.size = 1;
    this.applyOptions();
    this.sim.alpha(Math.max(this.sim.alpha(), 0.5));
  }

  private applyOptions(): void {
    const o = this.s.opts;
    (this.sim.force('link') as ReturnType<typeof forceLink<PhysNode, PhysLink>>)
      // (a belt is drawn over the wheels: short and stiff, so its turntables sit side by side and it crosses little)
      // (a loom round either end lengthens the spring by its reach: the wheels' rooms grow, so do their springs)
      .distance(
        (l) =>
          this.s.size *
          ((l.tag || l.muxed ? o.linkDistance * 1.6 : l.part ? o.linkDistance * o.partLength : l.belt ? o.linkDistance * BELT_LENGTH : o.linkDistance) +
            ((l.source as PhysNode).loom ?? 0) +
            ((l.target as PhysNode).loom ?? 0)),
      )
      .strength((l) => (l.tag ? 0.12 : l.ground ? GROUND_PULL * (1 - o.netPull) : l.belt ? BELT_PULL : linkPull(l, o) * (l.net ? 1 - o.netPull : 1)));
    // busy nodes push a little harder: more room around hubs, fewer edges squeezed past them
    (this.sim.force('charge') as ReturnType<typeof forceManyBody<PhysNode>>)
      .strength(
        (d) =>
          this.s.size *
          (d.role === 'tag' ? o.charge * 3 : o.charge * (1 + o.degreeRepel * Math.max(0, (this.s.degree.get(d.id) ?? 1) - 1)) * (1 + o.massRepel * ((d.mass ?? 1) - 1))),
      )
      .distanceMax(o.repelRange * this.s.size);
    (this.sim.force('collide') as ReturnType<typeof forceCollide<PhysNode>>).radius((d) => (d.radius + o.collidePad) * this.s.size);
    // sideways: &bar and &out to the centre line, the rest gently to their columns (else to the centre)
    (this.sim.force('endsX') as ReturnType<typeof forceX<PhysNode>>).strength((d) => (this.s.ends.has(d.id) ? o.endPull : this.s.colX.has(d.id) ? o.columnPull : o.centre));
    (this.sim.force('rankY') as ReturnType<typeof forceY<PhysNode>>).strength(o.rankPull);
  }

  /** Forget every position: the next graph is laid out afresh (a piece just opened). */
  forget(): void {
    this.insertion.end();
    this.s.byId.clear();
    this.s.placedMeters.clear();
    this.s.net = [];
    this.s.bendAt.clear();
  }

  /**
   * The rows' order for a fresh graph: as the options say, or (rowOrder 3) the one of the sweeps and insertion that
   * lays it out with fewer crossings — tried, each in a layout of its own, for `trial` ticks.
   */
  private rowOrderFor(model: GraphModel): number {
    if (this.s.opts.rowOrder !== 3) return this.s.opts.rowOrder;
    return this.s.opts.rowOrders.get(rowsKey(model)) ?? bestRowOrder(model, this.s.opts);
  }

  /** Merge a new graph in. Existing nodes keep position and velocity. */
  setGraph(drawn: GraphModel, structural = true): GraphDiff {
    this.insertion.end();
    // (as drawn: a product's wires at its junction; the forces lay the graph with each junction folded into its voice,
    // and the junctions are set on their voices' rims after each tick: junctions.ts)
    this.s.drawnNets = drawn.nets ?? [];
    this.s.drawnEnds = new Map(drawn.edges.map((e) => [e.id, e.to]));
    let model = folded(drawn);
    this.s.nets = model.nets ?? [];
    this.s.edgeEnds = new Map(model.edges.map((e) => [e.id, e.to]));
    // petals (unnamed cells) hang from their parent: the physics only sees named cells
    model = { ...model, nodes: model.nodes.filter((n) => !(n as { petalOf?: string }).petalOf) };
    const parentOf = new Map<string, string>();
    for (const e of model.edges) if (e.port !== 'about' && !parentOf.has(e.target)) parentOf.set(e.target, e.source);
    // (a meter's edges aren't drawn — its cells wear its ring, meters.ts — so they neither count nor pull)
    const groundIds = groundsOf(model);
    const ground = (e: (typeof model.edges)[number]) => groundIds.has(e.id);
    this.s.degree = new Map();
    for (const e of model.edges)
      if (e.source !== e.target && e.port !== 'about' && !ground(e)) for (const id of [e.source, e.target]) this.s.degree.set(id, (this.s.degree.get(id) ?? 0) + 1);
    // mostly new (a different example that happens to share &bar, &mix, &out): lay it all out afresh
    const fresh = model.nodes.filter((n) => !this.s.byId.has(n.id)).length > model.nodes.length / 2;
    if (fresh) this.s.bendAt.clear(); // a fresh graph: no bends left over from the last one
    const start = startPlaces(this.s, model, fresh, () => (fresh ? (this.rowChoice = this.rowOrderFor(drawn)) : this.rowChoice));
    const { next, added, tagLinks } = startNodes(this.s, model, fresh, parentOf, start);

    const removed = [...this.s.byId.keys()].filter((id) => !next.has(id)).length;
    this.s.byId.clear();
    for (const [k, v] of next) this.s.byId.set(k, v);

    // (a net at delays is a star from its owner, which its edges' own springs already are: measured, as the net's
    // springs Frère Jacques crosses more, 1 → 1.7 — docs/notes/nets.md, step 6)
    const busTaps = new Set(this.s.nets.flatMap((n) => (n.port === 'step' || n.delayed ? [] : n.taps)));
    const links: PhysLink[] = model.edges
      // (a note's links, about=, are not springs: they only draw a note towards what it explains, see stepAbout)
      .filter((e) => e.port !== 'about' && !ground(e) && next.has(e.source) && next.has(e.target) && e.source !== e.target)
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        count: e.count,
        part: e.port === 'braid' || e.port === 'over',
        belt: !!e.belt,
        strength: strengthOf(e),
        net: busTaps.has(e.id),
      }));

    // a fresh graph grows (the library's way): it starts small, drawn in round its middle, and gathers before it grows
    if (fresh && this.s.opts.grow) {
      const s0 = this.s.opts.growStart;
      const k = 1 - this.s.opts.growShrink * (1 - s0);
      for (const p of next.values()) {
        p.x = (p.x ?? 0) * k;
        p.y = (p.y ?? 0) * k;
      }
      this.s.size = s0;
      this.growing = 0;
    }
    this.sim.nodes([...next.values()]);
    this.s.faces = this.s.faces.filter((f) => next.has(f.tape) && next.has(f.to));
    // a meter's edges (ground): kept aside, to be drawn where they cross nothing once the meter is placed
    // (a tap's steps: a net of their own, from the tap's bulb on its table — decision 016)
    this.s.grounds = model.edges
      .filter((e) => ground(e) && next.has(e.source) && next.has(e.target))
      .map((e) => ({ id: e.id, meter: e.target, cell: e.source, ...(e.bulb && e.bulbAt ? { bulb: e.bulb, at: { ...e.bulbAt } } : {}) }));
    this.s.net = this.s.net.filter((t) => next.has(t.a) && next.has(t.b) && this.s.grounds.some((g) => g.meter === t.meter && g.bulb === t.bulb));
    // the tapes turned to where everything is now (an edit that doesn't move anything doesn't turn them)
    this.s.turns = fitTurns(this.s, (id) => this.position(id));
    this.s.explains = model.edges
      .filter((e) => e.port === 'about' && next.has(e.source) && next.has(e.target))
      .map((e) => ({ note: next.get(e.source)!, cell: next.get(e.target)! }));
    // a hub's edges into a cluster: each keeps part of its pull, the cluster's tag takes the rest, once per hub (`mux`)
    // (none at all when it's off: d3 balances each spring by how many its ends have, so even a slack one would count)
    const muxLinks = new Map<string, PhysLink>();
    for (const l of this.s.opts.mux > 0 ? links : []) {
      const [a, b] = [next.get(l.source as string)!, next.get(l.target as string)!];
      if (!a.group === !b.group) continue;
      const [hub, cell] = a.group ? [b, a] : [a, b];
      if (hub.role === 'tag' || !next.has(`tag:${cell.group}`)) continue;
      l.keep = 0;
      const id = `${hub.id}=>tag:${cell.group}`;
      const m = muxLinks.get(id) ?? { id, source: hub.id, target: `tag:${cell.group}`, count: 0, part: false, muxed: true };
      m.count += 1;
      muxLinks.set(id, m);
    }
    // a meter's edges (ground): springs that aren't drawn, so a meter settles among the cells it steps
    const groundLinks: PhysLink[] = this.s.grounds.map((g) => ({ id: `${g.id}~ground`, source: g.cell, target: g.meter, count: 1, part: false, ground: true }));
    this.sim.force<ReturnType<typeof forceLink<PhysNode, PhysLink>>>('link')!.links([...links, ...tagLinks, ...groundLinks, ...muxLinks.values()]);
    // (a scope watches: its edges neither untangle the music's layout nor count as its crossings)
    const scopes = new Set(model.nodes.filter((n) => typeof (n as { cell?: { params?: Record<string, unknown> } }).cell?.params?.scope === 'string').map((n) => n.id));
    const watcher = (id: string) => scopes.has(id);
    const idOf = (x: unknown) => (typeof x === 'object' ? (x as PhysNode).id : (x as string));
    const own = links.filter((l) => !watcher(idOf(l.source)) && !watcher(idOf(l.target)));
    this.s.springs = own.map((l) => ({
      id: l.id,
      source: typeof l.source === 'object' ? (l.source as PhysNode).id : (l.source as string),
      target: typeof l.target === 'object' ? (l.target as PhysNode).id : (l.target as string),
      belt: l.belt,
      strength: l.strength,
    }));
    // (as drawn: a product's wires at its junction, its `is` too)
    this.s.junctions = junctionNodes(this.s, drawn);
    for (const id of [...this.s.rims.keys()]) if (!this.s.junctions.has(id)) this.s.rims.delete(id);
    const placedIds = (id: string) => next.has(id) || this.s.junctions.has(id);
    this.s.links = drawn.edges
      .filter((e) => e.port !== 'about' && !ground(e) && placedIds(e.source) && placedIds(e.target) && e.source !== e.target)
      .filter((e) => !watcher(e.source) && !watcher(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, belt: !!e.belt, strength: strengthOf(e), is: e.port === 'is' }));
    placeJunctions(this.s);
    // crossings untangled as drawn: a product's wires at its junction (a push on a junction moves its voice)
    (this.sim.force('uncross') as unknown as ReturnType<typeof forceUncross>).links(
      this.s.links.filter((l) => !l.is).map((l) => ({ source: nodeAt(this.s, l.source)!, target: nodeAt(this.s, l.target)! })),
    );
    for (const id of [...this.s.bendAt.keys()]) if (!this.s.links.some((l) => l.id === id)) this.s.bendAt.delete(id);
    if (structural) this.reheat(fresh ? 1 : added > 0 || removed > 0 ? 0.7 : 0.3); // a fresh graph settles from scratch, like a new layout
    if (fresh && this.s.opts.insert > 0) this.insertion.start(model, groundIds);
    // forceX/Y cache their targets: refresh them for the new ends
    this.sim.force(
      'endsX',
      (this.sim.force('endsX') as ReturnType<typeof forceX<PhysNode>>).x((d) => this.s.ends.get(d.id)?.x ?? this.s.colX.get(d.id) ?? 0),
    );
    this.applyOptions();
    this.sim.force(
      'rankY',
      (this.sim.force('rankY') as ReturnType<typeof forceY<PhysNode>>).y((d) => this.s.rankY.get(d.id) ?? 0),
    );
    return { added, removed, total: next.size, structural };
  }

  /** Where everything is now, as quality.ts reads it: the nodes (a tag's name hides edges, but isn't a cell) and the edges as drawn. */
  private placed() {
    const nodes = [
      ...[...this.s.byId.values()].map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, r: n.radius, tags: n.tags, label: n.role === 'tag' })),
      // (a product's junction hides the edges under its dot, but it is part of its voice, not a cell)
      ...[...this.s.junctions.values()].flatMap((n) => (n.x === undefined ? [] : [{ id: n.id, x: n.x, y: n.y ?? 0, r: n.radius, label: true, of: n.rides }])),
    ];
    // (a bus's tap that comes on from another reader: drawn from there, straight)
    const joins = hops(this.s);
    const edges = [
      ...this.s.links.map((l) => {
        const h = joins.get(l.id);
        return h
          ? { a: h.from, b: h.to, mid: undefined, weight: l.strength }
          : { a: l.source, b: l.target, mid: this.s.bendAt.get(l.id) as { x: number; y: number } | undefined, runs: this.beltRuns(l), weight: l.strength };
      }),
      // (a meter's net: straight traces)
      // (a tap's, from its bulb: crossing another tap's counts, though both leave the same wheel)
      ...this.s.net.map((t) => {
        const o = t.at && this.s.byId.get(t.a);
        return o ? { a: `${t.a}@${t.bulb}`, b: t.b, from: { x: (o.x ?? 0) + t.at!.x, y: (o.y ?? 0) + t.at!.y }, weight: 2 } : { a: t.a, b: t.b, mid: undefined, weight: 2 };
      }),
    ];
    return { nodes, edges };
  }

  /** A belt's two runs as BeltEdge draws them (the outer tangents of its pulleys; their ratio taken as 1). */
  private beltRuns(l: { source: string; target: string; belt?: boolean }): [number, number, number, number][] | undefined {
    if (!l.belt) return undefined;
    const driven = this.s.byId.get(l.source);
    const driver = this.s.byId.get(l.target);
    if (!driven || !driver) return undefined;
    const [rDriver, rDriven] = pulleys(driver.radius, driven.radius, 1);
    const runs = openBelt({ x: driver.x ?? 0, y: driver.y ?? 0 }, rDriver, { x: driven.x ?? 0, y: driven.y ?? 0 }, rDriven);
    return runs?.map(([a, b]) => [a.x, a.y, b.x, b.y]);
  }

  /**
   * Lays each meter's net (meterNet) where the layout has put everything. A meter is laid out with the rest: the
   * cells it steps hold it by springs that aren't drawn (ground), so it settles among them. Call after it settles.
   */
  layNet(): void {
    if (this.s.opts.placeLast) this.placeMeters();
    // (the products' junctions, where their wires cross least: junctions.ts)
    settleJunctions(this.s, (l) => this.beltRuns(l));
    this.meterNet();
  }

  /** Meters last (placement.ts: placeMeters). Call after the layout settles. */
  placeMeters(): void {
    placeMeters(this.s);
  }

  /** Each meter's net (nets.ts: meterNet), worked out from where everything is now; call once the layout is at rest. */
  meterNet(): readonly MeterTrace[] {
    return meterNet(this.s);
  }

  /** Crossings as drawn (quality.ts: drawnCrossings). */
  drawnCrossings(): number {
    const { nodes, edges } = this.placed();
    return drawnCrossings(nodes, edges);
  }

  /** How good the layout is now, in numbers (quality.ts). */
  quality(): LayoutQuality {
    const { nodes, edges } = this.placed();
    return layoutQuality(nodes, edges, aims(this.s));
  }

  /** The point an edge's spline passes through halfway (its ends' midpoint when straight). */
  bend(id: string): { x: number; y: number } | undefined {
    const m = this.s.bendAt.get(id);
    return m ? { x: m.x, y: m.y } : undefined;
  }

  /** All bends, for drawing. */
  bends(): Map<string, { x: number; y: number }> {
    const out = new Map([...this.s.bendAt].map(([k, v]) => [k, { x: v.x, y: v.y }]));
    return out;
  }

  /** A net's tree as things stand now (nets.ts: netTree). By tap (edge id): the node it comes from, and its reader. */
  netTree(net: GraphModel['nets'][number]): Map<string, { from: string; to: string }> {
    return netTree(this.s, net, this.s.drawnEnds);
  }

  /** Where each tap of a bus comes from, for drawing (nets.ts: taps). */
  taps(): Map<string, { from: string; x: number; y: number } | null> {
    return taps(this.s);
  }

  reheat(alpha = 0.5): void {
    this.sim.alpha(Math.max(this.sim.alpha(), alpha));
    if (this.s.opts.live) this.sim.restart();
  }

  /** Run the simulation synchronously (pre-settle before first paint, or tests). */
  tick(n = 1): void {
    for (let i = 0; i < n; i++) {
      this.insertion.step();
      this.sim.tick(1);
      placeJunctions(this.s);
    }
  }

  position(id: string): { x: number; y: number } | undefined {
    return positionOf(this.s, id);
  }

  get alpha(): number {
    return this.sim.alpha();
  }

  dragStart(id: string, x: number, y: number): void {
    const p = this.s.byId.get(id);
    if (!p) return;
    p.fx = x;
    p.fy = y;
    this.sim.alphaTarget(0.3);
    if (this.s.opts.live) this.sim.restart();
  }

  drag(id: string, x: number, y: number): void {
    const p = this.s.byId.get(id);
    if (!p) return;
    p.fx = x;
    p.fy = y;
  }

  /** Release a dragged node back into the simulation, or keep it pinned. */
  dragEnd(id: string, pin = false): void {
    const p = this.s.byId.get(id);
    this.sim.alphaTarget(0);
    if (!p || pin) return;
    p.fx = null;
    p.fy = null;
  }

  isPinned(id: string): boolean {
    const p = this.s.byId.get(id);
    return p?.fx != null;
  }

  unpin(id: string): void {
    const p = this.s.byId.get(id);
    if (!p) return;
    p.fx = null;
    p.fy = null;
    this.reheat(0.3);
  }

  onSettle(f: () => void): () => void {
    this.settleListeners.push(f);
    return () => (this.settleListeners = this.settleListeners.filter((g) => g !== f));
  }

  destroy(): void {
    this.sim.stop();
    this.sim.on('tick', null).on('end', null);
    this.settleListeners = [];
  }
}

/**
 * The rows' order (layered.ts: 0 the sweeps, 1 insertion then the sweeps) that lays a fresh graph out with fewer
 * crossings: each tried, in a layout of its own, for `trial` ticks.
 */
export function bestRowOrder(model: GraphModel, opts: Partial<LayoutOptions> = {}): 0 | 1 {
  const o = { ...DEFAULT_LAYOUT, ...opts };
  let best: { order: 0 | 1; crossings: number; cost: number } = { order: 0, crossings: Infinity, cost: Infinity };
  for (const order of [0, 1] as const) {
    const t = new ForceLayout(undefined, { ...o, live: false, rowOrder: order });
    t.setGraph(model);
    t.tick(o.trial);
    t.layNet();
    const q = t.quality();
    t.destroy();
    if (q.crossings < best.crossings || (q.crossings === best.crossings && q.cost < best.cost)) best = { order, crossings: q.crossings, cost: q.cost };
  }
  return best.order;
}
