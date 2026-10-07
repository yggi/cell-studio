<script lang="ts">
  import { Background, Controls, SvelteFlow, ViewportPortal, type Edge, type NodeTypes } from '@xyflow/svelte';
  import { noteColour } from './theme';
  import '@xyflow/svelte/dist/style.css';
  import { onDestroy, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import type { CompileResult, Shifts } from '../engine/program';
  import { structureKey, type GraphEdge, type GraphModel, type GraphNode } from '../engine/graph';
  import type { LiveState } from '../engine/live';
  import { drawn, edgeStateOf, type Routing } from '../engine/routing';
  import { DEFAULT_LAYOUT, ForceLayout, type LayoutOptions, type MeterTrace } from '../layout/physics';
  import type { FlowNode } from './types';
  import { setGraphContext } from './context';
  import { flowNodeOf, PETAL, physical } from './flownode';
  import CellNode from './CellNode.svelte';
  import VoiceNode from './VoiceNode.svelte';
  import FitView from './FitView.svelte';
  import CellSheet from './CellSheet.svelte';
  import PulseEdge from './PulseEdge.svelte';
  import MeterEdge from './MeterEdge.svelte';
  import MaterialNode from './MaterialNode.svelte';
  import ScopeNode from './ScopeNode.svelte';
  import SunNode from './SunNode.svelte';
  import GraphLegend from './GraphLegend.svelte';
  import BeltEdge from './BeltEdge.svelte';
  import { flowEdgeOf, meterEdgeOf } from './flowedge';
  import './edges.css';
  import { pulleys } from '../layout/belts';
  import { physicsOf } from '../engine/clocking';
  import type { LiveSource } from '../audio/live';
  import ForcesPanel from './ForcesPanel.svelte';
  import { clusterDisc } from '../layout/clusters';
  import { isGround, meterIndex } from '../layout/meters';

  let {
    model,
    program,
    muted,
    routed,
    live,
    shifts,
    ontoggle,
    onturn,
    onshowcode,
    source,
    sound,
    onedit,
    onadd,
    onrename,
    onfree,
    nudge,
    cursor = 0,
    epoch = 0,
    fixed = null,
    opened = 0,
    focus,
  }: {
    model: GraphModel;
    program: CompileResult;
    muted: ReadonlySet<string>;
    routed: Routing;
    live: LiveState | null;
    shifts: Shifts;
    ontoggle: (id: string) => void;
    onturn: (name: string, shift: number) => void;
    onshowcode: (name: string) => void;
    source: string;
    /** The sound while it plays, and hands on it (the Player). */
    sound: LiveSource;
    /** Write a changed source (the editor edits the code). */
    onedit: (source: string) => void;
    /** Add a new cell. */
    onadd: () => void;
    /** Rename: the new source, and the cell's new name (its sheet follows it). */
    onrename: (source: string, to: string) => void;
    /** An example's fixed layout: cell name → [column, row], pinned when it loads. */
    fixed?: Readonly<Record<string, readonly [number, number]>> | null;
    /** Counts the pieces opened: a new one is laid out afresh and framed (an edit keeps what's on screen). */
    opened?: number;
    /** A free(…) slider moved. */
    onfree: (spec: import('../engine/ast').FreeSpec, value: number | string) => void;
    nudge?: (seconds: number) => void;
    /** Where play starts (stopped). */
    cursor?: number;
    /** Counts resets (reload from code). */
    epoch?: number;
    /** A cell to open in the detail sheet once it exists (after adding it). */
    focus: { name: string; token: number } | null;
  } = $props();

  // open a newly added cell as soon as it appears in the graph
  let focused = 0;
  $effect(() => {
    if (focus && focus.token !== focused && model.nodes.some((n) => n.id === `cell:${focus.name}`)) {
      focused = focus.token;
      selected = `cell:${focus.name}`;
    }
  });

  // Tapping a node opens its detail sheet; the code is what it edits.
  let selected = $state<string | null>(null);
  const selectedNode = $derived(selected ? model.nodes.find((n) => n.id === selected) : undefined);

  setGraphContext({
    get program() {
      return program;
    },
    get bends() {
      return bends;
    },
    get muted() {
      return muted;
    },
    get routed() {
      return routed;
    },
    get live() {
      return live;
    },
    get liveEdges() {
      return liveEdgeSet;
    },
    get turned() {
      return turned;
    },
    open(name: string) {
      const id = `cell:${name}`;
      if (model.nodes.some((n) => n.id === id)) selected = id;
    },
    get shifts() {
      return shifts;
    },
    toggle: (id) => ontoggle(id),
    tapePos: (name) => sound.tapePos(name),
    nudge: (sec) => nudge?.(sec),
    get epoch() {
      return epoch;
    },
    get cursor() {
      return cursor;
    },
    tapeLevel: (name) => sound.tapeLevel(name),
    strike: (name, x, i) => sound.strike(name, x, i),
    resonance: (name) => sound.resonance(name),
    waveform: (name) => sound.waveform(name),
    freqs: (name) => sound.freqs(name),
    damp: (name, on) => sound.damp(name, on),
    bow: (name, a) => sound.bow(name, a),
    scrub: (name, u) => sound.scrub(name, u),
    grab: (name, speed) => sound.grab(name, speed),
    move(id, phase, x, y) {
      if (phase === 'start') layout.dragStart(id, x, y);
      else if (phase === 'move') layout.drag(id, x, y);
      else {
        layout.dragEnd(id, true);
        pinned.add(id);
        fixedPinned.add(id); // (its place, not a user's pin mark)
      }
    },
    turn: (name, shift) => onturn(name, shift),
    setFree: (spec, value) => onfree(spec, value),
    spectrum: (voice) => sound.spectrum(voice),
    note: (voice) => sound.note(voice),
  });

  const nodeTypes = { cell: CellNode, voice: VoiceNode, material: MaterialNode, scope: ScopeNode, sun: SunNode } as NodeTypes;
  let nodes = $state.raw<FlowNode[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let fitToken = $state(0);
  let dragging: string | null = null;
  let lastKey = '';
  const pinned = new SvelteSet<string>();

  // Each physics tick copies simulated positions into the flow nodes.
  // The node under the pointer is left alone: Svelte Flow owns it while dragging.
  // where each edge's spline bends (it slips off nodes it would rest on)
  let bends = $state.raw(new Map<string, { x: number; y: number }>());
  // unnamed cells are petals: not simulated, hung on an arc above their parent
  let petalSlot = new Map<string, { parent: string; i: number; n: number }>();
  function posOf(id: string): { x: number; y: number } | undefined {
    const slot = petalSlot.get(id);
    if (!slot) return layout.position(id);
    const p = layout.position(slot.parent);
    if (!p) return undefined;
    const parentSize = nodes.find((x) => x.id === slot.parent)?.data.size ?? 128;
    // fanned out on the outer side (away from the centre line): the flow runs up and down, labels hang below
    const outward = p.x < -20 ? Math.PI : 0;
    const a = outward + (slot.i - (slot.n - 1) / 2) * (slot.n > 3 ? 0.55 : 0.68);
    const d = (parentSize as number) / 2 + PETAL / 2 + 2;
    return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d };
  }
  // each meter's net (its traces to the cells it steps, through each other), as laid once the layout comes to rest
  let net = $state.raw<readonly MeterTrace[]>([]);
  const sameNet = (a: readonly MeterTrace[], b: readonly MeterTrace[]) => a.length === b.length && a.every((t, i) => t.id === b[i].id);
  // a tape's turn (where the layout faced its heads), to the degree: its node is redrawn only when that changes
  const turnOf = (id: string) => {
    const t = layout.tapeTurn(id);
    return t === undefined ? undefined : Math.round(t);
  };
  const layout = new ForceLayout(() => {
    nodes = nodes.map((n): FlowNode => {
      const turn = n.type === 'material' ? turnOf(n.id) : undefined;
      const turned = n.type === 'material' && turn !== undefined && turn !== n.data.turn ? { ...n, data: { ...n.data, turn } } : n;
      if (n.id === dragging) return turned;
      const p = posOf(n.id);
      return p ? { ...turned, position: p } : turned;
    });
    bends = layout.bends();
  });
  // (at rest again — after a drag, an edit — the meter's net is laid again from where things are; the meter stays put)
  layout.onSettle(() => {
    const laid = layout.meterNet();
    if (!sameNet(laid, net)) net = laid;
  });
  onDestroy(() => layout.destroy());

  // the forces, adjustable live
  let forcesOpen = $state(false);
  let legendOpen = $state(false);
  let forceOptions = $state({ ...layout.options });
  const setForce = (key: keyof LayoutOptions, value: number) => {
    layout.setOptions({ [key]: value });
    forceOptions = { ...layout.options };
  };
  const resetForces = () => {
    const { live: _live, radius: _radius, ...defaults } = DEFAULT_LAYOUT;
    layout.setOptions(defaults);
    forceOptions = { ...layout.options };
  };

  // the rings cells wear for the meter that steps them (the edges to it aren't drawn), and each meter's colour
  const meters = $derived({ index: meterIndex(model) });

  function toFlowNode(g: GraphNode): FlowNode {
    // an example's own fixed layout isn't marked: only what the user pinned
    return flowNodeOf(g, posOf(g.id) ?? { x: 0, y: 0 }, pinned.has(g.id) && !fixedPinned.has(g.id), turnOf(g.id), meters);
  }

  // clusters: the tags cells carry inside the piece (not the card's) — where their members are, now
  const clusters = $derived.by(() => {
    const byTag = new Map<string, { x: number; y: number; size: number }[]>();
    for (const n of nodes) {
      const g = model.nodes.find((m) => m.id === n.id);
      if (!g || g.petalOf || g.cell.note || !g.cell.tags.length) continue;
      const size = (n.data as { size?: number }).size ?? 128;
      for (const t of g.cell.tags) (byTag.get(t) ?? byTag.set(t, []).get(t)!).push({ x: n.position.x, y: n.position.y, size });
    }
    const tags = [...byTag.keys()].sort();
    return [...byTag].map(([tag, ms]) => {
      const { x, y, r } = clusterDisc(ms, 90, 120);
      // its name: where its tag node is (a node of the layout, keeping cells and edges off it)
      const at = layout.position(`tag:${tag}`) ?? { x, y: y - r };
      return { tag, x, y, r, nx: at.x, ny: at.y, colour: noteColour(((tags.indexOf(tag) * 7) % 12) * 30) };
    });
  });

  // the shifts of the tables that turn, as now: a key that changes only when one does
  const turned = $derived.by(() => {
    if (!live) return 'still';
    let key = 'playing';
    for (const c of program.cells.values()) if (c.step && !c.voice) key += `|${live.shifts(c.name)}`;
    return key;
  });

  // Edge styling follows routing (as drawn: petals' edges are their parents'): live edges glow and flow, the rest fade.
  const routedDrawn = $derived(drawn(model, routed));
  const liveDrawn = $derived(live ? drawn(model, live) : null);
  // (a key that changes only when the live edges do, not every frame)
  const liveEdges = $derived(liveDrawn ? [...liveDrawn.edges].sort().join('|') : null);
  // The live edges as a set, which each edge reads for itself (PulseEdge): a step that changes them does not make the
  // whole edge list again for the flow to reconcile (#13). null: nothing plays.
  const liveEdgeSet = $derived<ReadonlySet<string> | null>(liveEdges === null ? null : new Set(liveEdges ? liveEdges.split('|') : []));
  const playing = $derived(liveEdges !== null);
  // (only a belt's stretch is drawn from the moment, and that is read when the list is made)
  const hasBelts = $derived([...program.cells.values()].some((c) => typeof c.params.belt === 'number'));
  const NO_LIVE = { nodes: new Set<string>(), edges: new Set<string>() };

  const edgeTypes = { pulse: PulseEdge, belt: BeltEdge, meter: MeterEdge };

  // each edge's place in a net (a table read by several: one trunk, a branch to each reader)
  const netPlaces = $derived(new Map(model.nets.flatMap((n) => n.taps.map((id, i) => [id, { id: n.id, trunk: i === 0 }] as const))));

  function toFlowEdge(e: GraphEdge): Edge {
    // off, unrouted, on, idle, live: one rule for edges and nodes (engine/routing.ts). Here without the live set: while
    // playing an edge that is routed is idle, and PulseEdge makes it live when it is (each edge reads that for itself)
    const state = edgeStateOf(e, muted, routedDrawn, playing ? NO_LIVE : null);
    // a belted cell's step: a belt, its pulleys by the ratio, its stretch as it is now
    const driven = model.nodes.find((n) => n.id === e.source);
    if (e.belt && driven) {
      const sizeOf = (id: string) => ((nodes.find((n) => n.id === id)?.data as { size?: number })?.size ?? 140) / 2;
      const rate = program.clocks.get(driven.cell.name)?.belt?.rate ?? 1;
      const [rDriver, rDriven] = pulleys(sizeOf(e.target), sizeOf(e.source), rate);
      const st = live ? physicsOf(program, shifts, driven.cell.name)?.state?.(live.seconds) : undefined;
      return flowEdgeOf(e, state, program, { rDriver, rDriven, stretch: st?.stretch ?? 0, slipping: st?.slipping ?? false });
    }
    // (the wheels' sizes at its ends: a braid's edge meets its segment, a table's strands leave their entries)
    const size = (id: string) => (nodes.find((n) => n.id === id)?.data as { size?: number } | undefined)?.size ?? 0;
    return flowEdgeOf(e, state, program, undefined, { from: size(e.from), to: size(e.to) }, netPlaces.get(e.id));
  }

  $effect(() => {
    const m = model;
    void routedDrawn;
    void muted;
    void playing;
    if (hasBelts) void liveEdges;
    // (a meter's edges are ground — layout/meters.ts — and its net is drawn instead)
    const byId = new Map(m.nodes.map((n) => [n.id, n]));
    const laid = net;
    const index = meterIndex(m);
    untrack(() => (edges = [...m.edges.filter((e) => !isGround(e, byId)).map((e) => toFlowEdge(e)), ...laid.map((t) => meterEdgeOf(t, index.get(t.meter) ?? 0))]));
  });

  // an example's fixed layout: pinned when the example changes; released when it does again
  let lastFixed: typeof fixed | undefined = undefined;
  const fixedPinned = new Set<string>();
  let lastOpened = -1;
  $effect(() => {
    const m = model;
    const f = fixed;
    const o = opened;
    untrack(() => {
      // a piece just opened: forget where the last one's cells were (even ones of the same name)
      const justOpened = o !== lastOpened;
      if (justOpened) {
        lastOpened = o;
        layout.forget();
        // framed again once it has come to rest (clusters and tags keep growing it after the first frame)
        const off = layout.onSettle(() => {
          off();
          fitToken++;
        });
        for (const id of [...pinned]) if (!fixedPinned.has(id)) pinned.delete(id);
      }
      const key = structureKey(m);
      const structural = key !== lastKey;
      lastKey = key;
      for (const id of [...pinned]) if (!m.nodes.some((n) => n.id === id)) pinned.delete(id);
      // petals hang from their parent: the physics only sees the named cells
      const kids = new Map<string, string[]>();
      for (const n of m.nodes) if (n.petalOf) kids.set(n.petalOf, [...(kids.get(n.petalOf) ?? []), n.id]);
      petalSlot = new Map([...kids].flatMap(([parent, ids]) => ids.map((id, i) => [id, { parent, i, n: ids.length }] as const)));
      const diff = layout.setGraph({ ...m, nodes: m.nodes.filter((n) => !n.petalOf) }, structural);
      // Mostly new graph (first load, preset switch): settle before first paint, then frame it.
      const fresh = justOpened || diff.added > diff.total / 2;
      const newExample = f !== lastFixed;
      if (newExample) {
        lastFixed = f;
        for (const id of fixedPinned) {
          layout.unpin(id);
          pinned.delete(id);
        }
        fixedPinned.clear();
        // pin its cells where it says, then let the rest settle round them
        if (f) {
          const col = DEFAULT_LAYOUT.layerGap * 1.1;
          for (const [name, [c, r]] of Object.entries(f)) {
            const id = `cell:${name}`;
            if (!m.nodes.some((n) => n.id === id && !n.petalOf)) continue;
            layout.dragStart(id, c * col, r * DEFAULT_LAYOUT.layerGap);
            layout.dragEnd(id, true);
            pinned.add(id);
            fixedPinned.add(id);
          }
        }
      }
      if (fresh || (newExample && f)) {
        layout.tick(220);
        // meters last: where most of their edges cross nothing; those are drawn (layout/meters.ts)
        layout.layNet();
        net = layout.meterNet();
      }
      // turntables stay where they were first laid out (pinned): the rest flows round them
      if (justOpened)
        for (const g of m.nodes)
          if (physical(g)) {
            const p = layout.position(g.id);
            if (!p) continue;
            layout.dragStart(g.id, p.x, p.y);
            layout.dragEnd(g.id, true);
            pinned.add(g.id);
            fixedPinned.add(g.id);
          }
      nodes = m.nodes.map(toFlowNode);
      if (fresh || (newExample && f)) fitToken++;
      if (selected && !m.nodes.some((n) => n.id === selected)) selected = null;
    });
  });

  function togglePin(id: string) {
    const on = !pinned.has(id);
    if (on) {
      pinned.add(id);
      const p = layout.position(id);
      if (p) {
        layout.dragStart(id, p.x, p.y);
        layout.dragEnd(id, true);
      }
    } else {
      pinned.delete(id);
      layout.unpin(id);
    }
    nodes = nodes.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, pinned: on } } as FlowNode) : n));
  }
</script>

<div class="graph">
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    nodeOrigin={[0.5, 0.5]}
    nodesConnectable={false}
    elementsSelectable={false}
    onbeforedelete={async () => false}
    colorMode="dark"
    minZoom={0.15}
    maxZoom={2.5}
    onnodedragstart={({ targetNode }) => {
      if (!targetNode) return;
      dragging = targetNode.id;
      layout.dragStart(targetNode.id, targetNode.position.x, targetNode.position.y);
    }}
    onnodedrag={({ targetNode }) => {
      if (targetNode) layout.drag(targetNode.id, targetNode.position.x, targetNode.position.y);
    }}
    onnodedragstop={({ targetNode }) => {
      if (targetNode) layout.dragEnd(targetNode.id, pinned.has(targetNode.id));
      dragging = null;
    }}
    nodeClickDistance={6}
    onnodeclick={({ node }) => (selected = node.id)}
  >
    <Background gap={28} size={1.5} />
    <Controls showLock={false} />
    <FitView token={fitToken} />
    <!-- clusters: cells tagged alike inside the piece (tags=), washed and named behind their members -->
    <ViewportPortal target="back">
      {#each clusters as c (c.tag)}
        <div class="cluster" style:left="{c.x}px" style:top="{c.y}px" style:width="{c.r * 2}px" style:height="{c.r * 2}px" style:--hue={c.colour}></div>
        <div class="cluster-name" style:left="{c.nx}px" style:top="{c.ny}px" style:--hue={c.colour}>{c.tag}</div>
      {/each}
    </ViewportPortal>
  </SvelteFlow>
  <div class="toolbar">
    <button class="add-cell" onclick={onadd} title="Add a cell (blank: the chromatic default)">+ cell</button>
    <button class="forces-toggle" class:on={forcesOpen} onclick={() => (forcesOpen = !forcesOpen)} aria-pressed={forcesOpen} title="Layout forces">forces</button>
    <button class="forces-toggle" class:on={legendOpen} onclick={() => (legendOpen = !legendOpen)} aria-pressed={legendOpen} title="What the colours and values mean">legend</button
    >
  </div>
  {#if legendOpen}
    <div class="legend-wrap"><GraphLegend {program} {shifts} {source} /></div>
  {/if}
  {#if forcesOpen}
    <ForcesPanel options={forceOptions} onchange={setForce} onreset={resetForces} onclose={() => (forcesOpen = false)} />
  {/if}
  <p class="hint">Tap a cell to open it. Drag to move. Hold to switch off.</p>
  {#if selectedNode}
    <!-- (read defensively: renaming moves the selection, and for a moment there's none) -->
    <CellSheet
      name={selectedNode?.cell.name ?? ''}
      isMeter={selectedNode?.kind === 'cell' && selectedNode.isMeter}
      {source}
      pinned={!!selectedNode && pinned.has(selectedNode.id)}
      onpin={() => selectedNode && togglePin(selectedNode.id)}
      onshowcode={() => {
        const n = selectedNode?.cell.name ?? '';
        selected = null;
        onshowcode(n);
      }}
      onclose={() => (selected = null)}
      {onedit}
      {onrename}
    />
  {/if}
</div>

<style>
  .graph {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .hint {
    position: absolute;
    left: 56px;
    right: 80px;
    bottom: 10px;
    margin: 0;
    font-size: 13px;
    line-height: 1.3;
    color: var(--text-muted);
    pointer-events: none;
  }
  .graph :global(.svelte-flow) {
    --xy-background-color: var(--bg);
    --xy-background-pattern-color: var(--line);
    --xy-controls-button-background-color: var(--surface);
    --xy-controls-button-background-color-hover: var(--surface-2);
    --xy-controls-button-color: var(--text);
    --xy-controls-button-border-color: var(--line);
    --xy-node-background-color: transparent;
    --xy-node-border: none;
    --xy-node-boxshadow-hover: none;
    --xy-node-boxshadow-selected: none;
  }
  .graph :global(.svelte-flow__node) {
    padding: 0;
    border: 0;
    background: transparent;
    width: auto;
    box-shadow: none;
    border-radius: 0;
  }
  .toolbar {
    position: absolute;
    left: var(--space-2);
    top: var(--space-2);
    z-index: 5;
    display: flex;
    gap: var(--space-2);
  }
  .forces-toggle {
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--text-muted);
    font: 600 var(--text-sm) var(--font-ui);
    cursor: pointer;
  }
  .forces-toggle.on {
    border-color: var(--accent);
    color: var(--accent);
  }
  .add-cell {
    min-height: 32px;
    padding: 0 12px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--accent);
    background: var(--surface);
    color: var(--accent);
    font: 700 var(--text-sm) var(--font-ui);
    cursor: pointer;
  }
  /* clusters (rendered in the flow's viewport: global, since the portal lives outside this component; the wash, .cluster, is in app.css) */
  :global(.cluster-name) {
    position: absolute;
    transform: translate(-50%, -50%);
    padding: 4px 14px;
    border-radius: 999px;
    border: 1.5px solid var(--hue);
    background: color-mix(in oklab, var(--hue) 22%, var(--surface));
    color: var(--text);
    font: 800 44px var(--font-ui); /* (read at the zoom a whole piece fits in) */
    white-space: nowrap;
    pointer-events: none;
  }
  .legend-wrap {
    position: absolute;
    z-index: 20;
    top: 56px;
    left: 12px;
  }
</style>
