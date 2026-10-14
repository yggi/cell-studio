<script lang="ts">
  /**
   * A product's junction (engine/graph.ts, docs/notes/nets.md decision 2): an unnamed gate (#234), drawn as a small
   * gate meter — its terms in, its notes out to its voice (`is`), whose sound goes on into the mix. Not a cell: nothing
   * to open, turn or switch off; it is in the sound while its voice goes into its mix (the flow it stands for), live
   * while that is.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { JunctionFlowNode } from './types';
  import { getGraphContext } from './context';
  import { cellId, edgeId } from '@yggi/cells/engine/ids';
  import GateMeter from './GateMeter.svelte';

  let { data }: NodeProps<JunctionFlowNode> = $props();
  const ctx = getGraphContext();
  const flow = $derived(edgeId(cellId(data.voice), cellId(data.mix)));
  const state = $derived(
    ctx.muted.has(cellId(data.voice)) || ctx.muted.has(cellId(data.mix))
      ? 'off'
      : !ctx.lit
        ? 'on'
        : !ctx.routed.edges.has(flow)
          ? 'unrouted'
          : ctx.lit.edges.has(flow)
            ? 'live'
            : 'idle',
  );
</script>

<div class="junction" data-state={state} style:--size="{data.size}px" title="&{data.voice} in &{data.mix}">
  <GateMeter notes={data.notes} levels={data.levels} gain={data.gain} size={data.size} label="&{data.voice} in &{data.mix}: its notes as bars" />
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .junction {
    position: relative;
    width: var(--size);
    height: var(--size);
    transition: opacity 200ms ease;
  }
  .junction > :global(svg) {
    display: block;
  }
  .junction[data-state='idle'] {
    opacity: 0.6;
  }
  .junction[data-state='unrouted'],
  .junction[data-state='off'] {
    opacity: 0.3;
  }
</style>
