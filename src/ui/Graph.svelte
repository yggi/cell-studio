<script lang="ts">
  import { Background, Controls, SvelteFlow, ViewportPortal, type NodeTypes } from '@xyflow/svelte';
  import { VOICE_KIT } from '../engine/compiler/declare';
  import { noteColour, partColour } from './theme';
  import '@xyflow/svelte/dist/style.css';
  import { onDestroy, untrack } from 'svelte';
  import type { CompileResult, Shifts } from '../engine/program';
  import { isCellNode, type GraphModel } from '../engine/graph';
  import type { LiveState } from '../engine/live';
  import { drawn, type Routing } from '../engine/routing';
  import { refsOf } from '../engine/readers';
  import { bulbAt, setGraphContext, type RowKeys } from './context';
  import { snapshotOf } from './snapshot';
  import { GraphLayout } from './state/graphLayout.svelte';
  import CellNode from './CellNode.svelte';
  import VoiceNode from './VoiceNode.svelte';
  import JunctionNode from './JunctionNode.svelte';
  import SocketNode from './SocketNode.svelte';
  import FitView from './FitView.svelte';
  import CellSheet from './CellSheet.svelte';
  import PulseEdge from './PulseEdge.svelte';
  import MeterEdge from './MeterEdge.svelte';
  import MaterialNode from './MaterialNode.svelte';
  import PluginNode from './PluginNode.svelte';
  import GraphLegend from './GraphLegend.svelte';
  import BeltEdge from './BeltEdge.svelte';
  import './edges.css';
  import type { LiveSource } from '../audio/live';
  import type { TransportState } from '../audio/transport';
  import { clusterDisc } from '../layout/clusters';
  import { EXAMPLES } from '../examples';
  import Margin, { MARGIN_WIDTH } from './Margin.svelte';
  import { isSide, sideEntries } from '../layout/side';
  import { channelColour } from './theme';
  import type { SideMark } from './context';
  import TowerAxis, { TOWER_WIDTH } from './TowerAxis.svelte';
  import FlowViewport from './FlowViewport.svelte';
  import TowerStrips, { STRIP, STRIP_OPEN } from './TowerStrips.svelte';
  import TapLooms from './TapLooms.svelte';
  import { towerIns } from '../layout/towerlayout';
  import { pillAnchor } from '../layout/taploom';
  import type { Viewport } from '@xyflow/svelte';

  // (?tower: the tower open from the start, ?towerCell=tune its line, as if selected: the gallery's pictures)
  const QUERY = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const towerCell = QUERY?.get('towerCell') ?? null;
  // (?layout=tower: the tower layout from the start, docs/notes/tower-strip.md; ?strips: its strips opened)
  const LAYOUT = QUERY?.get('layout') === 'tower' ? 'tower' : 'flow';

  // each example's rows' order, chosen when the app was built (tools/examples-index.ts), by its graph's shape
  const EXAMPLE_ROWS = new Map(EXAMPLES.map((e) => [e.rows.key, e.rows.order]));

  let {
    model,
    program,
    muted,
    routed,
    heads,
    transport,
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
    refit = 0,
    growing = false,
    focus,
    onsheet,
    played,
    rows,
    onlayout,
    ontime,
  }: {
    model: GraphModel;
    program: CompileResult;
    muted: ReadonlySet<string>;
    routed: Routing;
    /** Where everything is at the transport's time (always there). */
    heads: LiveState;
    transport: TransportState;
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
    /** Counts requests to frame the graph again (a fold watched as it runs: the camera follows it). */
    refit?: number;
    /** A conversion playing (#390): each version laid out gently from the last, the view framed only when it must. */
    growing?: boolean;
    /** A free(…) slider moved. */
    onfree: (spec: import('../engine/ast').FreeSpec, value: number | string) => void;
    nudge?: (seconds: number) => void;
    /** Where play starts (stopped). */
    cursor?: number;
    /** Counts resets (reload from code). */
    epoch?: number;
    /** A cell to open in the detail sheet once it exists (after adding it). */
    focus: { name: string; token: number } | null;
    /** Told which cell's sheet is open (null: none): the cell the keys play unless one is chosen (state/keys.svelte.ts). */
    onsheet?: (name: string | null) => void;
    /** Cells sounding from the keys (graph ids): drawn live. */
    played?: ReadonlySet<string>;
    /** A cell's rows played live (the piano roll's keys, #251). */
    rows?: RowKeys;
    /** Told the layout on mounting (the sidebar's forces), null when it goes. */
    onlayout?: (layout: GraphLayout | null) => void;
    /** On a wide screen: show the time view in the graph's pane (a button in the toolbar). */
    ontime?: () => void;
  } = $props();

  // The piece as drawn: one snapshot (program, graph, shifts, routing), swapped whole with the nodes and edges made
  // from it (layout.sync), so nothing here, in a node or in an edge reads one piece's program with another's graph.
  const layout: GraphLayout = new GraphLayout(
    untrack(() => snapshotOf(program, model, shifts, muted, routed)),
    () => ({ lit, live, moment: hasBelts ? liveEdges : null }),
    EXAMPLE_ROWS,
    LAYOUT,
  );
  onDestroy(() => layout.destroy());
  // (the sidebar's forces move this layout)
  $effect(() => {
    untrack(() => onlayout?.(layout));
    return () => untrack(() => onlayout?.(null));
  });
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
  // (or a bulb on a wheel: the cell it splices, which has no node of its own — decision 014, 016)
  const selectedName = $derived(selectedNode?.cell.name ?? (selected && shown.model.bulbs.has(selected.slice('cell:'.length)) ? selected.slice('cell:'.length) : undefined));
  $effect(() => {
    const name = selectedName ?? null;
    untrack(() => onsheet?.(name));
  });
  // (gone, no sheet is open: the keys stop following one)
  $effect(() => () => untrack(() => onsheet?.(null)));

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
    get state() {
      return transport;
    },
    get playing() {
      return transport === 'playing';
    },
    get heads() {
      return heads;
    },
    get pills() {
      return pills;
    },
    get towered() {
      return towered;
    },
    get wheels() {
      return wheels;
    },
    anchor: (node, other, from, meter) => {
      const l = pillsBy.get(node);
      return l && pillAnchor(l, other, from, meter);
    },
    get lit() {
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
      if (layout.shown.model.nodes.some((n) => n.id === id) || layout.shown.model.bulbs.has(name)) selected = id;
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
    get played() {
      return played;
    },
    get rows() {
      return rows;
    },
    // (only while the margin is open: a mark with no margin to read it in is noise)
    marksOf: (name) => (hasMargin ? (marks.get(name) ?? []) : []),
    get sideLit() {
      // (the entry pointed at in the margin, else a note or scope whose sheet is open)
      return sideLit ?? (selected && shown.model.nodes.some((n) => n.id === selected && isSide(n)) ? selected : null);
    },
  });

  // the margin (layout/side.ts): what each cell wears for the notes and scopes about it
  const marks = $derived.by(() => {
    const out = new Map<string, SideMark[]>();
    for (const e of sideEntries(shown.model)) {
      const chans = refsOf(shown.program.cells.get(e.name));
      for (const id of e.about) {
        const name = id.slice('cell:'.length);
        const k = chans.indexOf(name);
        (out.get(name) ?? out.set(name, []).get(name)!).push(e.kind === 'note' ? { entry: e.id, mark: e.mark } : { entry: e.id, mark: 0, colour: channelColour(Math.max(0, k)) });
      }
    }
    return out;
  });
  const hasSide = $derived(shown.model.nodes.some(isSide));
  // (a tap away, as the tower is: closed by default at every width, so the graph keeps its room; ?margin opens it, for
  // the gallery's pictures)
  let marginOpen = $state(typeof location !== 'undefined' && new URLSearchParams(location.search).has('margin'));
  const hasMargin = $derived(hasSide && marginOpen);
  // (framed again when the margin opens or closes)
  let sideFits = $state(0);
  let sideLit = $state<string | null>(null);

  const nodeTypes = { cell: CellNode, voice: VoiceNode, material: MaterialNode, plugin: PluginNode, junction: JunctionNode, socket: SocketNode } as NodeTypes;
  const edgeTypes = { pulse: PulseEdge, belt: BeltEdge, meter: MeterEdge };

  let legendOpen = $state(false);
  // the tower layout (towerlayout.ts): the graph by the tower, the sound card its strip at the right (TowerStrips.svelte)
  const towered = $derived(layout.mode === 'tower');
  const pills = $derived(towered ? new Set(layout.looms.map((l) => l.table)) : undefined);
  // (where every wheel is now, and its name under it: an edge's label keeps off them — a name as a disc as wide as it)
  const wheels = $derived(
    layout.nodes.flatMap((n) => {
      const data = n.data as { size?: number; name?: string };
      const size = n.measured?.width ?? data.size;
      if (!size) return [];
      const name = data.name ? Math.max(24, (data.name.length + 1) * 4.4 + 8) : 0;
      return [{ x: n.position.x, y: n.position.y, r: size / 2 }, ...(name ? [{ x: n.position.x, y: n.position.y + size / 2 + 16, r: name }] : [])];
    }),
  );
  const pillsBy = $derived(new Map(towered ? layout.looms.map((l) => [l.table, l] as const) : []));
  let stripsOpen = $state(QUERY?.has('strips') ?? false);
  const stripW = $derived(stripsOpen ? STRIP_OPEN : STRIP);
  let flowW = $state(0);
  // what goes into the card, where its wire leaves now (its top)
  const ins = $derived(
    towered
      ? towerIns(layout.outs, shown.program, (id) => {
          const n = layout.nodes.find((m) => m.id === id);
          return n && { ...n.position, height: n.measured?.height };
        })
      : [],
  );
  // the frequency tower beside the graph (TowerAxis.svelte), in the signal path's layout
  let towerOpen = $state(QUERY?.has('tower') ?? false);
  // (the flow's pan and zoom, for the tower drawn beside it; framed again when the tower opens or closes)
  let viewport = $state<Viewport>({ x: 0, y: 0, zoom: 1 });
  let towerFits = $state(0);
  // a cell's card on a wide screen (CellSheet.svelte: 380 px, 16 px from the window's right) covers the graph's right
  // edge: the tower stands left of it and the graph makes room there; with too little room left, it waits for the card
  let graphEl = $state<HTMLDivElement>();
  let graphW = $state(0);
  let cardCover = $state(0);
  $effect(() => {
    void graphW;
    const carded = !!selectedName && !!graphEl && matchMedia('(min-width: 900px)').matches;
    cardCover = carded ? Math.max(0, graphEl!.getBoundingClientRect().right - (innerWidth - 396) + 8) : 0;
  });
  // (with a card beside it the tower waits unless 240 px of graph are left; with none it shows at any width, a phone's included)
  const towerShown = $derived(!towered && towerOpen && (cardCover === 0 || graphW - (hasMargin ? MARGIN_WIDTH : 0) - cardCover - TOWER_WIDTH >= 240));
  // (a card opened or closed beside the tower: the graph is framed again in the room left, so no cell is cut off)
  let lastCover = 0;
  $effect(() => {
    const cover = towerShown ? cardCover : 0;
    if (cover === lastCover) return;
    lastCover = cover;
    untrack(() => towerFits++);
  });

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
    // (a tag the taps of a selector step: its section's tint, as its strands wear it — a pastel shade of the rainbow;
    // else a hue of its own)
    const sections = new Map<string, { k: number; n: number }>();
    for (const table of new Set(shown.program.taps?.values() ?? [])) {
      const taps = [...(shown.program.taps ?? [])].flatMap(([tap, t]) => (t === table ? [tap] : []));
      taps.forEach((tap, k) => sections.set(tap, { k, n: taps.length }));
    }
    const sectionOf = new Map<string, { k: number; n: number }>();
    for (const tag of tags) {
      const votes = new Map<string, number>();
      for (const e of shown.model.edges) {
        const s = e.bulb ? sections.get(e.bulb) : undefined;
        if (s && shown.model.nodes.find((m) => m.id === e.to)?.cell?.tags.includes(tag)) votes.set(e.bulb!, (votes.get(e.bulb!) ?? 0) + 1);
      }
      const best = [...votes].sort((a, b) => b[1] - a[1])[0];
      if (best) sectionOf.set(tag, sections.get(best[0])!);
    }
    const colourOf = (tag: string) => {
      const s = sectionOf.get(tag);
      return s ? `color-mix(in oklab, ${partColour(s.k, s.n)} 65%, var(--meter-0))` : noteColour(((tags.indexOf(tag) * 7) % 12) * 30);
    };
    return [...byTag].map(([tag, ms]) => {
      const { x, y, r } = clusterDisc(ms, 90, 120);
      // its name: where its tag node is (a node of the layout, keeping cells and edges off it)
      const at = layout.position(`tag:${tag}`) ?? { x, y: y - r };
      return { tag, x, y, r, nx: at.x, ny: at.y, colour: colourOf(tag) };
    });
  });

  // the shifts of the tables that turn, as now: a key that changes only when one does
  const turned = $derived.by(() => {
    let key = 'turned';
    for (const c of shown.program.cells.values()) if (c.step && !c.voice) key += `|${heads.shifts(c.name)}`;
    return key;
  });
  // (what is lit: the routing at the transport's time; stopped, nothing is)
  const live = $derived(transport === 'stopped' ? null : heads);

  // live edges glow and flow (as drawn: petals' edges are their parents')
  const liveDrawn = $derived(live ? drawn(shown.model, live) : null);
  // (a key that changes only when the live edges do, not every frame)
  const liveEdges = $derived(liveDrawn ? [...liveDrawn.edges].sort().join('|') : null);
  // The live edges as a set, which each edge reads for itself (PulseEdge): a step that changes them does not make the
  // whole edge list again for the flow to reconcile (#13). null: nothing plays.
  const liveEdgeSet = $derived<ReadonlySet<string> | null>(liveEdges === null ? null : new Set(liveEdges ? liveEdges.split('|') : []));
  const lit = $derived(liveEdges !== null);
  // (only a belt's stretch is drawn from the moment, and that is read when the list is made)
  const hasBelts = $derived([...shown.program.cells.values()].some((c) => typeof c.params.belt === 'number'));

  // the next piece, or the next version of this one: laid out, its nodes and edges made, swapped in at once
  $effect(() => {
    const next = snapshotOf(program, model, shifts, muted, routed);
    const o = opened;
    untrack(() => {
      layout.sync(next, o, growing);
      if (selected && !next.model.nodes.some((n) => n.id === selected)) selected = null;
    });
  });
  // the edges again when what they're drawn with changes: lit or not, a meter's net laid again, a belt's stretch
  $effect(() => {
    void layout.shown;
    void layout.net;
    void lit;
    if (hasBelts) void liveEdges;
    untrack(() => layout.restyle());
  });
</script>

<div
  class="graph"
  class:margined={hasMargin}
  class:towered={towerShown}
  class:stripped={towered}
  style:--strip-width="{stripW}px"
  style:--margin-width="{MARGIN_WIDTH}px"
  style:--tower-width="{TOWER_WIDTH + cardCover}px"
  bind:this={graphEl}
  bind:clientWidth={graphW}
>
  {#if hasMargin}<Margin model={shown.model} heightOf={(id) => layout.position(id)?.y} settled={layout.fitToken} onlight={(id) => (sideLit = id)} />{/if}
  <div class="flow" bind:clientWidth={flowW}>
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
      onnodeclick={({ node, event }) => {
        // (a product's junction is not a cell: nothing to open; a bulb on a wheel is the cell it splices)
        // (the drums' kit the grooves read has no line of its own: a drum on it opens, the kit doesn't)
        // (a socket into the card opens what goes into it)
        if (node.type === 'socket') return void (selected = `cell:${(node.data as { source: string }).source}`);
        const hit = bulbAt(event.target);
        if (node.type !== 'junction' && (hit || node.id !== `cell:${VOICE_KIT}`)) selected = hit ?? node.id;
      }}
    >
      <Background gap={28} size={1.5} />
      <Controls showLock={false} />
      <FitView token={layout.fitToken + sideFits + towerFits + refit} calm={growing} />
      {#if towerOpen || towered}<FlowViewport onchange={(v) => (viewport = v)} />{/if}
      {#if towered}
        {#if layout.looms.length}<ViewportPortal target="back"><TapLooms looms={layout.looms} /></ViewportPortal>{/if}
      {/if}
      <!-- clusters: cells tagged alike inside the piece (tags=), washed and named behind their members -->
      <ViewportPortal target="back">
        {#each clusters as c (c.tag)}
          <div class="cluster" style:left="{c.x}px" style:top="{c.y}px" style:width="{c.r * 2}px" style:height="{c.r * 2}px" style:--hue={c.colour}></div>
          <div class="cluster-name" style:left="{c.nx}px" style:top="{c.ny}px" style:--hue={c.colour}>{c.tag}</div>
        {/each}
      </ViewportPortal>
    </SvelteFlow>
  </div>
  {#if towered}
    <TowerStrips {ins} {viewport} open={stripsOpen} ontoggle={() => (stripsOpen = !stripsOpen)} />
  {/if}
  {#if towerShown}
    <TowerAxis model={shown.model} program={shown.program} nodes={layout.nodes} {viewport} focus={selectedName ?? towerCell} right={cardCover} />
  {/if}
  <div class="toolbar">
    <button class="add-cell" onclick={onadd} title="Add a cell (blank: the chromatic default)">+ cell</button>
    <button class="forces-toggle" class:on={legendOpen} onclick={() => (legendOpen = !legendOpen)} aria-pressed={legendOpen} title="What the colours and values mean">legend</button
    >
    <button
      class="forces-toggle"
      class:on={towered}
      onclick={() => layout.setMode(towered ? 'flow' : 'tower')}
      aria-pressed={towered}
      title="Lay the graph out by the frequency tower: each cell at its time scale, the sound card a strip at the right">tower layout</button
    >
    {#if !towered}<button
        class="forces-toggle"
        class:on={towerOpen}
        onclick={() => {
          towerOpen = !towerOpen;
          towerFits++;
        }}
        aria-pressed={towerOpen}
        title="Each cell's time scale, from the constant to the audible">tower</button
      >{/if}
    {#if ontime}<button class="forces-toggle" onclick={ontime} title="The piece in time: a tracker of its notes, its scalogram and its sound">time</button>{/if}
    {#if hasSide}<button
        class="forces-toggle"
        class:on={marginOpen}
        onclick={() => {
          marginOpen = !marginOpen;
          sideFits++;
        }}
        aria-pressed={marginOpen}
        title="The piece's notes and scopes, beside the graph">notes</button
      >{/if}
  </div>
  {#if legendOpen}
    <div class="legend-wrap"><GraphLegend program={shown.program} shifts={shown.shifts} {source} /></div>
  {/if}
  <p class="hint">Tap a cell to open it. Drag to move. Hold to switch off.</p>
  {#if selectedName}
    <!-- (read defensively: renaming moves the selection, and for a moment there's none) -->
    <CellSheet
      name={selectedName ?? ''}
      isMeter={selectedNode?.kind === 'cell' && selectedNode.isMeter}
      {source}
      {opened}
      pinned={!!selectedNode && layout.pinned.has(selectedNode.id)}
      onpin={() => selectedNode && layout.togglePin(selectedNode.id)}
      onshowcode={() => {
        const n = selectedName ?? '';
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
  .flow {
    position: absolute;
    inset: 0;
  }
  /* (the margin takes its column beside the graph: layout/side.ts) */
  .graph.margined .flow {
    left: var(--margin-width);
  }
  .graph.margined .hint {
    left: calc(var(--margin-width) + 56px);
  }
  /* (the tower takes its strip beside the graph: nothing is laid under it) */
  .graph.towered .flow {
    right: var(--tower-width);
  }
  .graph.towered .hint {
    right: calc(var(--tower-width) + 16px);
  }
  /* (the tower layout: its strip at the right, the graph beside it) */
  .graph.stripped .flow {
    right: var(--strip-width);
  }
  .graph.stripped .hint {
    right: calc(var(--strip-width) + 16px);
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
