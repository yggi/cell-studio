<script lang="ts">
  import { liveAt } from '@yggi/cells/engine/live';
  /**
   * One edge in one state, on two bare nodes: the real edge component with the context the graph gives it
   * (what plays now, the note on the voice, where the layout bends it). `state`: as engine/routing.ts names them;
   * `live` is an idle edge that the live set names. Belts take their stretch, a meter's trace its beat.
   */
  import { untrack } from 'svelte';
  import { SvelteFlow, type NodeTypes } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { setGraphContext } from '../../../src/ui/context';
  import { flowEdgeOf, meterEdgeOf } from '../../../src/ui/flowedges';
  import PulseEdge from '../../../src/ui/PulseEdge.svelte';
  import BeltEdge from '../../../src/ui/BeltEdge.svelte';
  import MeterEdge from '../../../src/ui/MeterEdge.svelte';
  import { pulleys } from '../../../src/layout/belts';
  import { madeUpSound } from '../sound';
  import DotNode from './DotNode.svelte';
  import type { EdgeFixture } from './fixtures';

  export type Column = {
    label: string;
    state: 'off' | 'unrouted' | 'on' | 'idle' | 'live';
    /** The note on the voice, Hz (a live edge takes its colour). */
    note?: number;
    /** The layout's bend: how far the edge's middle is pushed sideways, px. */
    bend?: number;
    /** A belt's stretch, and whether it slips. */
    stretch?: number;
    slipping?: boolean;
    /** A meter's place in its cycle, in beats (none: stopped). */
    beat?: number;
    /** Drawn as the tower layout draws it (a plain wire a sigmoid, from the lower end's top to the upper's bottom). */
    towered?: boolean;
  };
  let props: { fixture: EdgeFixture; column: Column } = $props();
  const { fixture: f, column: c } = untrack(() => props);
  const nodeTypes = { dot: DotNode } as unknown as NodeTypes;
  const edgeTypes = { pulse: PulseEdge, belt: BeltEdge, meter: MeterEdge };

  const WIDTH = 168;
  const belt = f.edge.port === 'step' && typeof f.piece.program.cells.get(f.edge.source.slice('cell:'.length))?.params.belt === 'number';
  // (a belt's wheels are drawn at a size where their pulleys show)
  const [w, h] = belt ? [110, 110] : [66, 28];
  const GAP = belt ? 70 : 96;
  const top = { x: WIDTH / 2 - (belt ? 0 : 14), y: 14 + h / 2 };
  const bottom = { x: WIDTH / 2 + (belt ? 0 : 14), y: top.y + h + GAP };
  const height = bottom.y + h / 2 + 14;
  // a tape's heads: the handles its edges meet
  const nameOf = (id: string) => id.slice('cell:'.length);
  const e = { ...f.edge, id: `${f.edge.id}@${c.label}` };
  const node = (id: string, p: { x: number; y: number }, sources: string[], targets: string[]) => ({
    id,
    type: 'dot',
    position: p,
    draggable: false,
    data: { name: nameOf(id), w, h, round: belt, sources, targets },
  });
  const nodes = [
    node(f.edge.source, top, f.edge.port === 'play' ? [`head-${nameOf(f.edge.target)}`] : [], []),
    node(f.edge.target, bottom, [], f.edge.port === 'write' ? ['head-write'] : []),
  ];
  const meterTrace = f.meter && { id: e.id, a: f.edge.source, b: f.edge.target, meter: `cell:${f.meter.name}` };
  const rate = f.piece.program.clocks.get(nameOf(f.edge.source))?.belt?.rate ?? 1;
  const [rDriver, rDriven] = pulleys(w / 2, h / 2, rate);
  const edges = [
    meterTrace
      ? meterEdgeOf(meterTrace, f.meter!.index)
      : flowEdgeOf(e, c.state === 'live' ? 'idle' : c.state, f.piece.program, belt ? { rDriver, rDriven, stretch: c.stretch ?? 0, slipping: c.slipping ?? false } : undefined),
  ];
  // (the layout hands each edge its bend; here a fixed one)
  const mid = { x: (top.x + bottom.x) / 2 + (c.bend ?? 0), y: (top.y + bottom.y) / 2 };
  const playing = c.state === 'idle' || c.state === 'live' || c.beat !== undefined;
  const live = playing ? (f.meter ? { ...f.piece.live, beatAt: new Map([[f.meter.name, c.beat ?? 0]]) } : f.piece.live) : null;
  // (a live column whose source has no playhead at this moment: the edge is forced live, but what it shows there is a
  // fallback, not what the app draws — the app makes an edge live only while its source sounds)
  const silent = c.state === 'live' && !!live && !f.meter && f.edge.band !== 'sync' && f.edge.band !== 'none' && live.cells.get(nameOf(f.edge.from))?.local == null;
  setGraphContext({
    program: f.piece.program,
    muted: new Set(),
    routed: f.piece.routed,
    state: playing ? 'playing' : 'stopped',
    playing,
    heads: live ?? liveAt(f.piece.program, f.piece.shifts, new Set(), 0),
    lit: live,
    liveEdges: playing ? new Set(c.state === 'live' ? [e.id] : []) : null,
    turned: playing ? 'live' : '',
    shifts: f.piece.shifts,
    turn() {},
    setFree() {},
    open() {},
    bends: new Map([[e.id, mid]]),
    towered: c.towered,
    toggle() {},
    nudge() {},
    cursor: 0,
    epoch: 0,
    move() {},
    sound: { ...madeUpSound(() => playing), note: () => (playing ? (c.note ?? 261.63) : null) },
  });
</script>

<div class="cell" data-state={c.state}>
  <div class="flow" style:width="{WIDTH}px" style:height="{height}px">
    <SvelteFlow
      {nodes}
      {edges}
      {nodeTypes}
      {edgeTypes}
      nodeOrigin={[0.5, 0.5]}
      colorMode="dark"
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      nodesConnectable={false}
      elementsSelectable={false}
      viewport={{ x: 0, y: 0, zoom: 1 }}
      proOptions={{ hideAttribution: true }}
    />
  </div>
  <div class="cap" class:silent title={silent ? 'its source is silent at this moment: a fallback, not what the app draws' : undefined}>
    {c.label}{silent ? ' · silent' : ''}
  </div>
</div>

<style>
  .cell {
    display: grid;
    justify-items: center;
  }
  .flow :global(.svelte-flow) {
    background: transparent;
  }
  /* the graph's own edge styles (Graph.svelte) apply under .graph: here too */
  .cap {
    font: 11px var(--font-ui);
    color: var(--text-muted);
  }
  .cap.silent {
    color: var(--warning);
  }
</style>
