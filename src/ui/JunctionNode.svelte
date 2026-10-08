<script lang="ts">
  /**
   * A product's junction (engine/graph.ts, docs/notes/nets.md decision 2): a dot where a product's wires meet — its
   * terms in, its voice (`is`, dotted) and its sound out into the mix. Not a cell: nothing to open, turn or switch off;
   * it is in the sound while its voice goes into its mix (the flow it stands for), live while that is.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { JunctionFlowNode } from './types';
  import { getGraphContext } from './context';
  import { cellId, edgeId } from '../engine/ids';

  let { data }: NodeProps<JunctionFlowNode> = $props();
  const ctx = getGraphContext();
  const flow = $derived(edgeId(cellId(data.voice), cellId(data.mix)));
  const state = $derived(
    ctx.muted.has(cellId(data.voice)) || ctx.muted.has(cellId(data.mix))
      ? 'off'
      : !ctx.routed.edges.has(flow)
        ? 'unrouted'
        : !ctx.live
          ? 'on'
          : ctx.live.edges.has(flow)
            ? 'live'
            : 'idle',
  );
</script>

<div class="junction" data-state={state} style:--size="{data.size}px" title="&{data.voice} in &{data.mix}">
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .junction {
    position: relative;
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    background: var(--edge);
    border: 2px solid var(--bg);
    box-sizing: border-box;
    transition: opacity 200ms ease;
  }
  .junction[data-state='live'] {
    background: var(--accent);
  }
  .junction[data-state='idle'] {
    opacity: 0.6;
  }
  .junction[data-state='unrouted'],
  .junction[data-state='off'] {
    opacity: 0.3;
  }
</style>
