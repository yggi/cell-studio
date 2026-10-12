<script lang="ts">
  /**
   * One real wheel for the mock-ups (Mockups.svelte): an example's cell, drawn by the component the graph would use
   * (its glyph or spectrum alone; a turntable or a plugin's wheel as its node), stopped or at a moment of play.
   */
  import { untrack } from 'svelte';
  import { SvelteFlow, type NodeTypes } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import { setGraphContext } from '../../../src/ui/context';
  import MaterialNode from '../../../src/ui/MaterialNode.svelte';
  import PluginNode from '../../../src/ui/PluginNode.svelte';
  import CellGlyph from '../../../src/ui/CellGlyph.svelte';
  import SpectrumWheel from '../../../src/ui/SpectrumWheel.svelte';
  import { compileSource } from '../../../src/engine/compile';
  import { codeShifts } from '../../../src/engine/program';
  import { buildGraph } from '../../../src/layout/drawn';
  import { liveAt } from '../../../src/engine/live';
  import { PRESETS, type PresetKey } from '../../../src/engine/presets';
  import { routing } from '../../../src/engine/routing';
  import { flowNodeOf } from '../../../src/ui/flownode';
  import type { FlowNode } from '../../../src/ui/types';
  import { madeUpSound } from '../sound';

  let props: { piece: PresetKey; name: string; size?: number; playing?: boolean; t?: number } = $props();
  const { piece, name, size = 128, playing = false, t = 3 } = untrack(() => props);
  const program = compileSource(PRESETS[piece].source);
  const shifts = codeShifts(program);
  const muted = new Set<string>();
  const live = playing ? liveAt(program, shifts, muted, t) : null;
  setGraphContext({
    program,
    muted,
    routed: routing(program, muted),
    state: live ? 'playing' : 'stopped',
    playing: !!live,
    heads: live ?? liveAt(program, shifts, muted, 0),
    lit: live,
    liveEdges: live ? live.edges : null,
    turned: live ? 'live' : '',
    shifts: live ? live.shifts : shifts,
    turn() {},
    setFree() {},
    open() {},
    bends: new Map(),
    toggle() {},
    nudge() {},
    cursor: 0,
    epoch: 0,
    move() {},
    sound: madeUpSound(() => playing),
  });
  const g = buildGraph(program).nodes.find((n) => n.cell?.name === name);
  if (!g) throw new Error(`mock-ups: no &${name} in ${piece}`);
  const node = flowNodeOf(g, { x: 0, y: 0 }, false, undefined, undefined, program);
  const cell = program.cells.get(name)!;
  const kind = node.type === 'material' || node.type === 'plugin' ? 'node' : node.type === 'voice' || cell.mix || cell.sink ? 'spectrum' : 'cell';
  const own = node.data.size;
  const box = own + 40;
  const nodes = [{ ...node, position: { x: box / 2, y: box / 2 }, draggable: false } as FlowNode];
  const nodeTypes = { material: MaterialNode, plugin: PluginNode } as NodeTypes;
</script>

{#if kind === 'cell'}<CellGlyph {name} isMeter={'isMeter' in node.data && node.data.isMeter} {size} />
{:else if kind === 'spectrum'}<SpectrumWheel {name} {size} />
{:else}
  <div class="flow" style:width="{box}px" style:height="{box + 24}px">
    <SvelteFlow
      {nodes}
      edges={[]}
      {nodeTypes}
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
{/if}

<style>
  .flow :global(.svelte-flow) {
    background: transparent;
  }
</style>
