import type { Edge } from '@xyflow/svelte';
import { SvelteSet } from 'svelte/reactivity';
import { structureKey, type GraphNode } from '../../engine/graph';
import type { LiveState } from '../../engine/live';
import { ForceLayout } from '../../layout/physics';
import { DEFAULT_LAYOUT, type LayoutOptions } from '../../layout/options';
import type { MeterTrace } from '../../layout/state';
import { meterIndex } from '../../layout/meters';
import { towerOf, towerRanks, zoneRanks } from '../../layout/tower';
import { flowRanks } from '../../layout/start';
import { gated } from '../../layout/gates';
import { flowNodeOf, PETAL, physical } from '../flownode';
import { flowEdgesOf } from '../flowedges';
import type { GraphSnapshot } from '../snapshot';
import type { FlowNode } from '../types';

/**
 * A probe: `?rows=tower` lays the graph out in rows by the frequency tower, `?rows=zones` in the tower's zones with the
 * signal path within each, every node where its output lives (layout/tower.ts, docs/notes/tower-rows.md).
 */
const ROWS = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('rows') : null;
/** A probe: `?gates=on` draws each selector as the sequencer that gates its parts' junctions (layout/gates.ts). */
const GATES = typeof location !== 'undefined' && new URLSearchParams(location.search).get('gates') === 'on';
/** A probe: `?junctions=bodies` lays each product's junction out as a node of its own (LayoutOptions.junctionBodies). */
const BODIES = typeof location !== 'undefined' && new URLSearchParams(location.search).get('junctions') === 'bodies';
/** What the edges are drawn with besides the snapshot (read when they are made, not tracked). */
export interface EdgeStyle {
  /** Not stopped (paused or playing): a routed edge is idle (PulseEdge makes it live), an unrouted one dimmed; stopped, nothing is. */
  readonly lit: boolean;
  readonly live: LiveState | null;
  /** Changes when a belt's stretch is to be drawn again (the live edges, on a piece with belts); else null. */
  readonly moment: string | null;
}

type Tap = { from: string; x: number; y: number; r: number } | null;

/**
 * The graph as laid out: the snapshot drawn (one piece's program and graph, `shown`), the flow's nodes and edges made
 * from it, and where they are (a `ForceLayout`, pins, petals' slots, the splines' bends, the nets' taps, the meters'
 * nets). `sync` takes the next snapshot and swaps all of it in one go, so a component never sees one piece's edges
 * with another's program.
 */
export class GraphLayout {
  /** What's drawn: replaced whole by `sync`. */
  shown = $state.raw<GraphSnapshot>() as GraphSnapshot;
  nodes = $state.raw<FlowNode[]>([]);
  edges = $state.raw<Edge[]>([]);
  /** Where each edge's spline bends (it slips off nodes it would rest on). */
  bends = $state.raw(new Map<string, { x: number; y: number }>());
  /** Where each bus's taps come from (a ratsnest, the readers its junctions: laid again as cells move). */
  taps = $state.raw(new Map<string, Tap>());
  /** Each meter's net (its traces to the cells it steps, through each other), as laid once the layout comes to rest. */
  net = $state.raw<readonly MeterTrace[]>([]);
  /** Counts the times the view is to be framed again (a piece opened, come to rest). */
  fitToken = $state(0);
  /** The forces, adjustable live. */
  options = $state.raw<LayoutOptions>({ ...DEFAULT_LAYOUT });
  /** Pinned by the user (or held where they were dropped, or a turntable: see `#placed`). */
  readonly pinned = new SvelteSet<string>();

  readonly #force: ForceLayout;
  readonly #style: () => EdgeStyle;
  // pinned as placed (a turntable where it was first laid, a cell moved by its axle): not a user's pin mark
  readonly #placed = new Set<string>();
  // unnamed cells are petals: not simulated, hung on an arc above their parent
  #petalSlot = new Map<string, { parent: string; i: number; n: number }>();
  #dragging: string | null = null;
  #lastKey = '';
  #lastOpened = -1;
  // what the edges were last made from (`restyle` makes them again only when one of these changes)
  #madeFrom: readonly unknown[] = [];

  /** `rowOrders`: rows' orders chosen ahead (the examples': tools/examples-index.ts). `style`: read when edges are made. */
  constructor(first: GraphSnapshot, style: () => EdgeStyle, rowOrders?: LayoutOptions['rowOrders']) {
    this.shown = first;
    this.#style = style;
    // Each physics tick copies simulated positions into the flow nodes. The node under the pointer is left alone:
    // Svelte Flow owns it while dragging.
    this.#force = new ForceLayout(() => this.#tick(), rowOrders ? { rowOrders } : {});
    this.options = { ...this.#force.options };
    // (at rest again — after a drag, an edit — the meter's net is laid again from where things are; the meter stays put)
    this.#force.onSettle(() => {
      const laid = this.#force.meterNet();
      if (!sameNet(laid, this.net)) this.net = laid;
    });
  }

  /**
   * Take the next snapshot: lay it out (a piece just opened, `opened` changed: afresh, and framed once it has come to
   * rest; an edit: from where things are) and make its nodes and edges, all at once.
   */
  sync(given: GraphSnapshot, opened: number): void {
    // (a probe: `?gates=on` draws the arrangement as gates, layout/gates.ts)
    const next = GATES ? { ...given, model: gated(given.model) } : given;
    const m = next.model;
    const layout = this.#force;
    if (BODIES && !layout.options.junctionBodies) layout.setOptions({ junctionBodies: 1 });
    // (a probe: the rows by the frequency tower instead of the signal path, docs/notes/multiscale.md)
    if (ROWS === 'tower') layout.setOptions({ ranks: towerRanks(towerOf(next.program, m)) });
    if (ROWS === 'zones') layout.setOptions({ ranks: zoneRanks(towerOf(next.program, m, 'emit'), flowRanks(m)) });
    // a piece just opened: forget where the last one's cells were (even ones of the same name)
    const justOpened = opened !== this.#lastOpened;
    if (justOpened) {
      this.#lastOpened = opened;
      layout.forget();
      // framed again once it has come to rest (clusters and tags keep growing it after the first frame)
      const off = layout.onSettle(() => {
        off();
        this.fitToken++;
      });
      for (const id of [...this.pinned]) if (!this.#placed.has(id)) this.pinned.delete(id);
    }
    const key = structureKey(m);
    const structural = key !== this.#lastKey;
    this.#lastKey = key;
    for (const id of [...this.pinned]) if (!m.nodes.some((n) => n.id === id)) this.pinned.delete(id);
    // petals hang from their parent: the physics only sees the named cells
    const kids = new Map<string, string[]>();
    for (const n of m.nodes) if (n.petalOf) kids.set(n.petalOf, [...(kids.get(n.petalOf) ?? []), n.id]);
    this.#petalSlot = new Map([...kids].flatMap(([parent, ids]) => ids.map((id, i) => [id, { parent, i, n: ids.length }] as const)));
    const diff = layout.setGraph({ ...m, nodes: m.nodes.filter((n) => !n.petalOf) }, structural);
    // Mostly new graph (first load, preset switch): settle before first paint, then frame it.
    const fresh = justOpened || diff.added > diff.total / 2;
    if (fresh) {
      layout.tick(220);
      // meters last: where most of their edges cross nothing; those are drawn (layout/meters.ts)
      layout.layNet();
      this.net = layout.meterNet();
    }
    // turntables stay where they were first laid out (pinned): the rest flows round them
    if (justOpened)
      for (const g of m.nodes)
        if (physical(g)) {
          const p = layout.position(g.id);
          if (!p) continue;
          this.#pinAt(g.id, p.x, p.y);
          this.#placed.add(g.id);
        }
    // (the nodes and edges of the new snapshot, and the snapshot itself: one swap)
    this.shown = next;
    const meters = { index: meterIndex(m) };
    // (an example's own place isn't marked pinned: only what the user pinned)
    this.nodes = m.nodes.map((g: GraphNode) =>
      flowNodeOf(g, this.#posOf(g.id) ?? { x: 0, y: 0 }, this.pinned.has(g.id) && !this.#placed.has(g.id), this.#turnOf(g.id), meters, next.program),
    );
    this.#makeEdges();
    if (fresh) this.fitToken++;
  }

  /** Make the edges again if what they're drawn with changed (routing, lit, a meter's net, a belt's stretch). */
  restyle(): void {
    const s = this.#style();
    if (!same(this.#madeFrom, [this.shown, this.net, s.lit, s.moment])) this.#makeEdges();
  }

  #makeEdges(): void {
    const s = this.#style();
    this.#madeFrom = [this.shown, this.net, s.lit, s.moment];
    this.edges = flowEdgesOf(this.shown, { sizeOf: (id) => this.#sizeOf(id), net: this.net, lit: s.lit, live: s.live });
  }

  /** Where a node is now. */
  position(id: string): { x: number; y: number } | undefined {
    return this.#force.position(id);
  }

  /** Svelte Flow drags a node: it owns the node meanwhile; dropped, it stays if pinned. */
  dragStart(id: string, x: number, y: number): void {
    this.#dragging = id;
    this.#force.dragStart(id, x, y);
  }
  drag(id: string, x: number, y: number): void {
    this.#force.drag(id, x, y);
  }
  dragEnd(id: string): void {
    this.#force.dragEnd(id, this.pinned.has(id));
    this.#dragging = null;
  }

  /** A node moved by its axle (a turntable): start, move, end — where it ends, it stays (pinned). */
  move(id: string, phase: 'start' | 'move' | 'end', x: number, y: number): void {
    if (phase === 'start') this.#force.dragStart(id, x, y);
    else if (phase === 'move') this.#force.drag(id, x, y);
    else {
      this.#force.dragEnd(id, true);
      this.pinned.add(id);
      this.#placed.add(id); // (its place, not a user's pin mark)
    }
  }

  togglePin(id: string): void {
    const on = !this.pinned.has(id);
    if (on) {
      this.pinned.add(id);
      const p = this.#force.position(id);
      if (p) this.#pinAt(id, p.x, p.y);
    } else {
      this.pinned.delete(id);
      this.#force.unpin(id);
    }
    this.nodes = this.nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, pinned: on } } as FlowNode) : n));
  }

  setForce(key: keyof LayoutOptions, value: number): void {
    this.#force.setOptions({ [key]: value });
    this.options = { ...this.#force.options };
  }
  resetForces(): void {
    const { live: _live, radius: _radius, ...defaults } = DEFAULT_LAYOUT;
    this.#force.setOptions(defaults);
    this.options = { ...this.#force.options };
  }

  destroy(): void {
    this.#force.destroy();
  }

  #pinAt(id: string, x: number, y: number): void {
    this.#force.dragStart(id, x, y);
    this.#force.dragEnd(id, true);
    this.pinned.add(id);
  }

  #sizeOf(id: string): number | undefined {
    return (this.nodes.find((n) => n.id === id)?.data as { size?: number } | undefined)?.size;
  }

  #posOf(id: string): { x: number; y: number } | undefined {
    const slot = this.#petalSlot.get(id);
    if (!slot) return this.#force.position(id);
    const p = this.#force.position(slot.parent);
    if (!p) return undefined;
    const parentSize = this.#sizeOf(slot.parent) ?? 128;
    // fanned out on the outer side (away from the centre line): the flow runs up and down, labels hang below
    const outward = p.x < -20 ? Math.PI : 0;
    const a = outward + (slot.i - (slot.n - 1) / 2) * (slot.n > 3 ? 0.55 : 0.68);
    const d = parentSize / 2 + PETAL / 2 + 2;
    return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
  }

  // a tape's turn (where the layout faced its heads), to the degree: its node is redrawn only when that changes
  #turnOf(id: string): number | undefined {
    const t = this.#force.tapeTurn(id);
    return t === undefined ? undefined : Math.round(t);
  }

  #tick(): void {
    this.nodes = this.nodes.map((n): FlowNode => {
      const turn = n.type === 'material' ? this.#turnOf(n.id) : undefined;
      const turned = n.type === 'material' && turn !== undefined && turn !== n.data.turn ? { ...n, data: { ...n.data, turn } } : n;
      if (n.id === this.#dragging) return turned;
      const p = this.#posOf(n.id);
      return p ? { ...turned, position: p } : turned;
    });
    this.bends = this.#force.bends();
    this.taps = new Map([...this.#force.taps()].map(([id, t]) => [id, t && { ...t, r: (this.#sizeOf(t.from) ?? 0) / 2 }]));
    // (an example opens with its rows in the order chosen when the app was built: no trials)
  }
}

const sameNet = (a: readonly MeterTrace[], b: readonly MeterTrace[]) => a.length === b.length && a.every((t, i) => t.id === b[i].id);
const same = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);
