<script lang="ts" module>
  /** A wheel this small (px across) or smaller names itself round its rim when another is close under it … */
  const RIM_NAMED = 96;
  /** … closer than this, rim to rim (px): its name's pill would land on it. */
  const RIM_ROOM = 34;
</script>

<script lang="ts">
  import { Background, Controls, SvelteFlow, ViewportPortal, type NodeTypes } from '@xyflow/svelte';
  import { VOICE_KIT } from '@yggi/cells/engine/compiler/declare';
  import { noteColour, partColour, sectionTint, sectionTintRgb } from './theme';
  import '@xyflow/svelte/dist/style.css';
  import { onDestroy, untrack } from 'svelte';
  import type { CompileResult, Shifts } from '@yggi/cells/engine/program';
  import { isCellNode, type GraphModel } from '@yggi/cells/engine/graph';
  import type { LiveState } from '@yggi/cells/engine/live';
  import { drawn, type Routing } from '@yggi/cells/engine/routing';
  import { refsOf } from '@yggi/cells/engine/readers';
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
  import FlowViewport from './FlowViewport.svelte';
  import { TOWER_PX, towerScale } from '../layout/towerscale';
  import TowerStrips from './TowerStrips.svelte';
  import { strip as stripWidth } from './state/strip.svelte';
  import TowerSky, { SKY_MODES, type SkyMode } from './TowerSky.svelte';
  import { nodeSections, sectionRgb, tagSections } from './sections';
  import { towerStructure } from '../layout/tower';
  import { minimap } from '../layout/minimap';
  import { bulbHosts } from '../layout/drawn';
  import { headPoint, UNTURNED } from '../layout/tape';
  import SectionLooms from './SectionLooms.svelte';
  import { towerIns, towerY } from '../layout/towerlayout';
  import FlyTo from './FlyTo.svelte';
  import PinchZoom from './PinchZoom.svelte';
  import { outTint } from './heard';
  import PanBounds from './PanBounds.svelte';
  import { pillAnchor } from '../layout/sectionloom';
  import type { Viewport } from '@xyflow/svelte';

  const QUERY = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  // (the tower layout by default, docs/notes/tower-sky.md; ?layout=flow: the signal path's from the start; ?strips: the
  // strip opened)
  const LAYOUT = QUERY?.get('layout') === 'flow' ? 'flow' : 'tower';

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
    locked,
    focus,
    onsheet,
    played,
    rows,
    onlayout,
    unsheet = 0,
    sheetHidden = false,
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
    /**
     * Read only (a MIDI file's machine, #390): opening a cell, switching, turning, a free value or adding a cell does
     * nothing but this (it says to convert first). Moving a cell still moves it.
     */
    locked?: () => void;
    /** A free(…) slider moved. */
    onfree: (spec: import('@yggi/cells/engine/ast').FreeSpec, value: number | string) => void;
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
    /** Counts asks to close the sheet open (the inspector closed round it). */
    unsheet?: number;
    /** The sheet kept, not shown (a wide screen's inspector on another page). */
    sheetHidden?: boolean;
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
  /** Open a cell's sheet (read only: says to convert first). */
  // (asked again for the cell already open, say so again: the inspector shows its page)
  const select = (id: string) => (locked ? locked() : id === selected ? onsheet?.(selectedName ?? null) : void (selected = id));
  let unsheeted = untrack(() => unsheet);
  $effect(() => {
    if (unsheet === unsheeted) return;
    unsheeted = unsheet;
    selected = null;
  });
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
    get readers() {
      return layout.readers;
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
    get rimNamed() {
      return rimNamed;
    },
    get sections() {
      return sectionTints;
    },
    anchor: (node, other, from, meter) => {
      const l = pillsBy.get(node);
      return l && pillAnchor(l, other, from, meter);
    },
    centre: (node) => centres.get(node),
    head: (node, handle) => {
      const n = layout.nodes.find((m) => m.id === node);
      const cell = n && shown.program.cells.get((n.data as { name: string }).name);
      if (!n || !cell) return undefined;
      const { size, turn } = n.data as { size: number; turn?: number };
      const name = handle.slice('head-'.length);
      const hosted = bulbHosts(shown.program).get(name) === cell.name;
      const at = headPoint(cell, shown.program.cells.values(), size, turn ?? UNTURNED, handle === 'head-write' ? null : { name, bulb: hosted });
      return { x: n.position.x + at.x, y: n.position.y + at.y };
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
      if (layout.shown.model.nodes.some((n) => n.id === id) || layout.shown.model.bulbs.has(name)) select(id);
    },
    toggle: (id) => (locked ? locked() : ontoggle(id)),
    nudge: (sec) => nudge?.(sec),
    get epoch() {
      return epoch;
    },
    get cursor() {
      return cursor;
    },
    move: (id, phase, x, y) => layout.move(id, phase, x, y),
    turn: (name, shift) => (locked ? locked() : onturn(name, shift)),
    setFree: (spec, value) => (locked ? locked() : onfree(spec, value)),
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
  // (a small wheel with another close under it, where its name's pill would land: its name round its rim instead)
  const rimNamed = $derived.by(() => {
    const out = new Set<string>();
    const at = layout.nodes.map((n) => ({ id: n.id, type: n.type, x: n.position.x, y: n.position.y, r: (n.measured?.width ?? (n.data as { size?: number }).size ?? 0) / 2 }));
    for (const a of at) {
      if (a.type !== 'cell' || !a.r || a.r * 2 > RIM_NAMED) continue;
      if (at.some((b) => b !== a && b.r && Math.abs(b.x - a.x) < a.r + b.r && b.y > a.y && b.y - b.r - (a.y + a.r) < RIM_ROOM)) out.add(a.id);
    }
    return out;
  });
  // (each node's centre, as the layout places it: where its edges end)
  const centres = $derived(new Map(layout.nodes.map((n) => [n.id, n.position] as const)));
  const pillsBy = $derived(new Map(towered ? layout.looms.map((l) => [l.table, l] as const) : []));
  // the strip's width (state/strip.svelte.ts): one for the graph and the time view
  const stripW = $derived(stripWidth.width);
  let flowW = $state(0);
  let flowEl = $state<HTMLDivElement>();
  // what goes into the card, where its wire leaves now (its top)
  const ins = $derived(
    towered
      ? towerIns(layout.outs, shown.program, (id) => {
          const n = layout.nodes.find((m) => m.id === id);
          return n && { ...n.position, height: n.measured?.height };
        })
      : [],
  );
  // the audible sky behind the graph (TowerSky.svelte): each socket a spire, lighting it in its section's colour
  // (each out in its source's note, as its socket and wire are: heard.ts outRgb; the strip's sum the same)
  // (`?sky=tint|rainbow` the other options, `?sky=off` none: docs/notes/tower-sky.md)
  const skyMode = QUERY?.get('sky') ?? 'mix';
  // (each node's section: a selector's section upstream of it, or its tag's)
  const sections = $derived(nodeSections(shown.program, shown.model));
  // (an out's own colour, steady: its section's, else its base note's — its spire's mast, its share of the strip)
  const tintOf = (source: string) => {
    return outTint(shown.program, source, sectionOrRainbow(source));
  };
  // (an out in no section takes a place in the rainbow of its own, by its lane's order, as if it were one)
  const sectionOrRainbow = (source: string) => sectionRgb(shown.model, sections, `cell:${source}`) ?? laneRainbow.get(source) ?? null;
  const laneRainbow = $derived.by(() => {
    const sources = [...new Set(strip?.lanes.map((l) => l.source.slice('cell:'.length)) ?? [])];
    return new Map(sources.flatMap((s, k) => (sources.length > 1 ? [[s, sectionTintRgb(k, sources.length)] as const] : [])));
  });
  const sky = $derived(towered && SKY_MODES.includes(skyMode as SkyMode));
  const spires = $derived(
    sky
      ? layout.nodes.flatMap((n) => {
          if (n.type !== 'socket') return [];
          const source = (n.data as { source: string }).source;
          return [{ id: n.id, x: n.position.x, y: n.position.y, source, section: sectionOrRainbow(source) }];
        })
      : [],
  );
  // each node's section's tint (a selector's section upstream of it, or its tag's): its wheel's accents wear it
  const sectionTints = $derived(new Map([...sections].map(([id, s]) => [id, sectionTint(s.k, s.n)] as const)));
  // the strip as a minimap (layout/minimap.ts): a lane each out, in its sections' order, then the graph's
  const strip = $derived.by(() => {
    if (!towered || !layout.drawnModel) return null;
    // (a read head drawn on its tape: where its tape is)
    const x = (id: string) => layout.position(id)?.x ?? layout.position(`cell:${bulbHosts(shown.program).get(id.slice('cell:'.length)) ?? ''}`)?.x ?? 0;
    return minimap(layout.drawnModel, (source) => (sections.get(source)?.k ?? 1e3) * 1e6 + x(source));
  });
  // the structure on the strip (TowerStrips.svelte): each stepped cell at its rate, the tables nothing steps at the
  // bottom (-Infinity), each showing its spectrum of values
  const structure = $derived(towered ? towerStructure(shown.program, shown.model) : []);
  // (the flow's pan and zoom, for the strip and the sky drawn beside and behind it)
  let viewport = $state<Viewport>({ x: 0, y: 0, zoom: 1 });
  // the tower's bounds, which the view can't be panned beyond: 20 kHz at the top, the lowest node at the bottom, the
  // nodes left and right (a margin round them, more on the right, under the strip); kept while the nodes move less than
  // a step (the bounds set again each tick would cost)
  let extent: [[number, number], [number, number]] | undefined;
  const translateExtent = $derived.by(() => {
    if (!towered || !layout.nodes.length) return (extent = undefined);
    const xs = layout.nodes.map((n) => n.position.x);
    const ys = layout.nodes.map((n) => n.position.y);
    const step = (v: number) => Math.round(v / 50) * 50;
    const next: [[number, number], [number, number]] = [
      [step(Math.min(...xs) - 300), step(Math.min(towerY(Math.log10(20000), layout.zone), Math.min(...ys) - 60))],
      [step(Math.max(...xs) + 500), step(Math.max(...ys) + 200)],
    ];
    if (extent && extent.flat().every((v, i) => v === next.flat()[i])) return extent;
    return (extent = next);
  });
  // (a tap on the strip: the view moves to that node)
  let flyTo = $state<{ x: number; y: number } | null>(null);
  // (a pinch on the strip: the view zoomed about it, the strip taking the gesture itself)
  let pinched = $state<{ factor: number; x: number; y: number; n: number } | null>(null);
  let pinches = 0;
  // the graph and its strip side by side: when the split between them moves (a drag's end, a collapse) or the pane
  // does (the inspector opening beside it), the graph is framed again in the room it has (after SPLIT_SETTLE ms still:
  // not at every step of a drag)
  let graphW = $state(0);
  const SPLIT_SETTLE = 150;
  let splitFits = $state(0);
  let lastSplit = untrack(() => `${stripW} ${graphW}`);
  $effect(() => {
    const w = `${stripW} ${graphW}`;
    if (w === lastSplit) return;
    const t = setTimeout(() => {
      lastSplit = w;
      splitFits++;
    }, SPLIT_SETTLE);
    return () => clearTimeout(t);
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
    // (a tag the sections of a selector step: its section's tint, as its strands wear it — a pastel shade of the rainbow;
    // else a hue of its own)
    const sectionOf = tagSections(shown.program, shown.model);
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

<div class="graph" class:margined={hasMargin} class:stripped={towered} class:sky style:--strip-width="{stripW}px" style:--margin-width="{MARGIN_WIDTH}px" bind:clientWidth={graphW}>
  {#if hasMargin}<Margin model={shown.model} heightOf={(id) => layout.position(id)?.y} settled={layout.fitToken} onlight={(id) => (sideLit = id)} />{/if}
  <div class="flow" bind:clientWidth={flowW} bind:this={flowEl}>
    {#if sky}<TowerSky {spires} {viewport} zone={layout.zone} mode={skyMode as SkyMode} />{/if}
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
        if (node.type === 'socket') return select(`cell:${(node.data as { source: string }).source}`);
        const hit = bulbAt(event.target);
        if (node.type !== 'junction' && (hit || node.id !== `cell:${VOICE_KIT}`)) select(hit ?? node.id);
      }}
    >
      <Background gap={28} size={1.5} />
      <Controls showLock={false} />
      <FitView token={layout.fitToken + sideFits + splitFits + refit} calm={growing} />
      <FlyTo to={flyTo} />
      <PinchZoom zoom={pinched} />
      <PanBounds extent={translateExtent} />
      {#if towered}<FlowViewport onchange={(v) => (viewport = v)} />{/if}
      {#if towered}
        {#if layout.looms.length}<ViewportPortal target="back"><SectionLooms looms={layout.looms} /></ViewportPortal>{/if}
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
    <TowerStrips
      {ins}
      {structure}
      map={strip}
      layers={layout.layers}
      rows={layout.rows}
      {viewport}
      scale={towerScale({ perDecade: TOWER_PX * viewport.zoom, offset: viewport.y, zone: layout.zone })}
      width={stripW}
      onresize={(w) => stripWidth.resize(w)}
      {tintOf}
      sectionOf={(source) => sections.get(source)?.k}
      focus={selectedName ?? null}
      onzoom={(z) => {
        const r = flowEl?.getBoundingClientRect();
        if (r) pinched = { factor: z.factor, x: z.x - r.left, y: z.y - r.top, n: ++pinches };
      }}
      ontoggle={() => stripWidth.toggle()}
      onfocus={(id) => {
        const p = layout.position(id);
        if (p) flyTo = { x: p.x, y: p.y };
      }}
    />
  {/if}
  <div class="toolbar">
    {#if !locked}<button class="add-cell" onclick={onadd} title="Add a cell (blank: the chromatic default)">+ cell</button>{/if}
    <button class="forces-toggle" class:on={legendOpen} onclick={() => (legendOpen = !legendOpen)} aria-pressed={legendOpen} title="What the colours and values mean">legend</button
    >
    <button
      class="forces-toggle"
      class:on={towered}
      onclick={() => layout.setMode(towered ? 'flow' : 'tower')}
      aria-pressed={towered}
      title="Lay the graph out by the frequency tower: each cell at its time scale, the sound card a strip at the right">tower layout</button
    >
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
  <p class="hint">{locked ? 'A MIDI file’s machine, as it plays: convert it to cells to open or change a cell.' : 'Tap a cell to open it. Drag to move. Hold to switch off.'}</p>
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
      hidden={sheetHidden}
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
  /* (the tower layout: its strip at the right, the graph beside it) */
  .graph.stripped .flow {
    right: var(--strip-width);
  }
  /* (the sky under the graph: the flow's own ground made clear over it) */
  .graph.sky .flow {
    background: var(--bg);
  }
  .graph.sky :global(.svelte-flow) {
    --xy-background-color: transparent;
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
