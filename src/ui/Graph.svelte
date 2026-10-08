<script lang="ts">
  import { Background, Controls, SvelteFlow, ViewportPortal, type NodeTypes } from '@xyflow/svelte';
  import { noteColour } from './theme';
  import '@xyflow/svelte/dist/style.css';
  import { onDestroy, untrack } from 'svelte';
  import type { CompileResult, Shifts } from '../engine/program';
  import { isCellNode, type GraphModel } from '../engine/graph';
  import type { LiveState } from '../engine/live';
  import { drawn, type Routing } from '../engine/routing';
  import { setGraphContext } from './context';
  import { snapshotOf } from './snapshot';
  import { GraphLayout } from './state/graphLayout.svelte';
  import CellNode from './CellNode.svelte';
  import VoiceNode from './VoiceNode.svelte';
  import JunctionNode from './JunctionNode.svelte';
  import FitView from './FitView.svelte';
  import CellSheet from './CellSheet.svelte';
  import PulseEdge from './PulseEdge.svelte';
  import MeterEdge from './MeterEdge.svelte';
  import MaterialNode from './MaterialNode.svelte';
  import ScopeNode from './ScopeNode.svelte';
  import SunNode from './SunNode.svelte';
  import GraphLegend from './GraphLegend.svelte';
  import BeltEdge from './BeltEdge.svelte';
  import './edges.css';
  import type { LiveSource } from '../audio/live';
  import ForcesPanel from './ForcesPanel.svelte';
  import { clusterDisc } from '../layout/clusters';
  import { EXAMPLES } from '../examples';

  // each example's rows' order, chosen when the app was built (tools/examples-index.ts), by its graph's shape
  const EXAMPLE_ROWS = new Map(EXAMPLES.map((e) => [e.rows.key, e.rows.order]));

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

  // The piece as drawn: one snapshot (program, graph, shifts, routing), swapped whole with the nodes and edges made
  // from it (layout.sync), so nothing here, in a node or in an edge reads one piece's program with another's graph.
  const layout = new GraphLayout(
    untrack(() => snapshotOf(program, model, shifts, muted, routed)),
    () => ({ playing, live, moment: hasBelts ? liveEdges : null }),
    EXAMPLE_ROWS,
  );
  onDestroy(() => layout.destroy());
  const shown = $derived(layout.shown);

  // open a newly added cell as soon as it appears in the graph
  let focused = 0;
  $effect(() => {
    if (focus && focus.token !== focused && shown.model.nodes.some((n) => n.id === `cell:${focus.name}`)) {
      focused = focus.token;
      selected = `cell:${focus.name}`;
    }
  });

  // Tapping a node opens its detail sheet; the code is what it edits.
  let selected = $state<string | null>(null);
  // (a product's junction is not a cell: never selected)
  const selectedNode = $derived(selected ? shown.model.nodes.filter(isCellNode).find((n) => n.id === selected) : undefined);

  setGraphContext({
    get program() {
      return layout.shown.program;
    },
    get shifts() {
      return layout.shown.shifts;
    },
    get muted() {
      return layout.shown.muted;
    },
    get routed() {
      return layout.shown.routed;
    },
    get bends() {
      return layout.bends;
    },
    get taps() {
      return layout.taps;
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
      if (layout.shown.model.nodes.some((n) => n.id === id)) selected = id;
    },
    toggle: (id) => ontoggle(id),
    nudge: (sec) => nudge?.(sec),
    get epoch() {
      return epoch;
    },
    get cursor() {
      return cursor;
    },
    move: (id, phase, x, y) => layout.move(id, phase, x, y),
    turn: (name, shift) => onturn(name, shift),
    setFree: (spec, value) => onfree(spec, value),
    get sound() {
      return sound;
    },
  });

  const nodeTypes = { cell: CellNode, voice: VoiceNode, material: MaterialNode, scope: ScopeNode, sun: SunNode, junction: JunctionNode } as NodeTypes;
  const edgeTypes = { pulse: PulseEdge, belt: BeltEdge, meter: MeterEdge };

  let forcesOpen = $state(false);
  let legendOpen = $state(false);

  // clusters: the tags cells carry inside the piece (not the card's) — where their members are, now
  const clusters = $derived.by(() => {
    const byTag = new Map<string, { x: number; y: number; size: number }[]>();
    for (const n of layout.nodes) {
      const g = shown.model.nodes.find((m) => m.id === n.id);
      if (!g?.cell || g.petalOf || g.cell.note || !g.cell.tags.length) continue;
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
    for (const c of shown.program.cells.values()) if (c.step && !c.voice) key += `|${live.shifts(c.name)}`;
    return key;
  });

  // live edges glow and flow (as drawn: petals' edges are their parents')
  const liveDrawn = $derived(live ? drawn(shown.model, live) : null);
  // (a key that changes only when the live edges do, not every frame)
  const liveEdges = $derived(liveDrawn ? [...liveDrawn.edges].sort().join('|') : null);
  // The live edges as a set, which each edge reads for itself (PulseEdge): a step that changes them does not make the
  // whole edge list again for the flow to reconcile (#13). null: nothing plays.
  const liveEdgeSet = $derived<ReadonlySet<string> | null>(liveEdges === null ? null : new Set(liveEdges ? liveEdges.split('|') : []));
  const playing = $derived(liveEdges !== null);
  // (only a belt's stretch is drawn from the moment, and that is read when the list is made)
  const hasBelts = $derived([...shown.program.cells.values()].some((c) => typeof c.params.belt === 'number'));

  // the next piece, or the next version of this one: laid out, its nodes and edges made, swapped in at once
  $effect(() => {
    const next = snapshotOf(program, model, shifts, muted, routed);
    const o = opened;
    untrack(() => {
      layout.sync(next, o);
      if (selected && !next.model.nodes.some((n) => n.id === selected)) selected = null;
    });
  });
  // the edges again when what they're drawn with changes: playing or not, a meter's net laid again, a belt's stretch
  $effect(() => {
    void layout.shown;
    void layout.net;
    void playing;
    if (hasBelts) void liveEdges;
    untrack(() => layout.restyle());
  });
</script>

<div class="graph">
  <SvelteFlow
    bind:nodes={layout.nodes}
    bind:edges={layout.edges}
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
      if (targetNode) layout.dragStart(targetNode.id, targetNode.position.x, targetNode.position.y);
    }}
    onnodedrag={({ targetNode }) => {
      if (targetNode) layout.drag(targetNode.id, targetNode.position.x, targetNode.position.y);
    }}
    onnodedragstop={({ targetNode }) => {
      if (targetNode) layout.dragEnd(targetNode.id);
    }}
    nodeClickDistance={6}
    onnodeclick={({ node }) => {
      // (a product's junction is not a cell: nothing to open)
      if (node.type !== 'junction') selected = node.id;
    }}
  >
    <Background gap={28} size={1.5} />
    <Controls showLock={false} />
    <FitView token={layout.fitToken} />
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
    <div class="legend-wrap"><GraphLegend program={shown.program} shifts={shown.shifts} {source} /></div>
  {/if}
  {#if forcesOpen}
    <ForcesPanel options={layout.options} onchange={(k, v) => layout.setForce(k, v)} onreset={() => layout.resetForces()} onclose={() => (forcesOpen = false)} />
  {/if}
  <p class="hint">Tap a cell to open it. Drag to move. Hold to switch off.</p>
  {#if selectedNode}
    <!-- (read defensively: renaming moves the selection, and for a moment there's none) -->
    <CellSheet
      name={selectedNode?.cell.name ?? ''}
      isMeter={selectedNode?.kind === 'cell' && selectedNode.isMeter}
      {source}
      pinned={!!selectedNode && layout.pinned.has(selectedNode.id)}
      onpin={() => selectedNode && layout.togglePin(selectedNode.id)}
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
