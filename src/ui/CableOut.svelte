<script lang="ts">
  /**
   * A wheel's output, where a patch cable is dragged from (#555, decision 069 §1: on top): shown on the tapped wheel of a
   * cell a cable can come from (layout/cables.ts `bandOf`: not a card or a note), unless the graph is read only. A dot,
   * its target a finger wide (44 px); dragged onto a jack, cells' `patch` writes the cable (ui/Graph.svelte).
   */
  import { Handle, Position, useUpdateNodeInternals } from '@xyflow/svelte';
  import { tick } from 'svelte';
  import { cellId } from '@yggi/cells/engine/ids';
  import { getGraphContext } from './context';
  import { bandOf } from '../layout/cables';

  let { node, name, size }: { node: string; name: string; size: number } = $props();
  const ctx = getGraphContext();
  const band = $derived(ctx.selected === cellId(name) && !ctx.locked ? bandOf(ctx.program, name) : null);
  // (a handle that comes and goes: the flow measured again, so a drag from it starts where it is drawn)
  const update = useUpdateNodeInternals();
  $effect(() => {
    void band;
    void tick().then(() => update(node));
  });
</script>

{#if band}
  <Handle
    type="source"
    id="out"
    position={Position.Top}
    class="cable-out {band}"
    style="left: {size / 2}px; top: 0"
    isConnectableEnd={false}
    title="&{name}'s output: drag a cable onto a jack"
  />
{/if}

<style>
  :global(.svelte-flow__handle.cable-out) {
    width: 44px;
    height: 44px;
    border: none;
    border-radius: 50%;
    background: transparent;
    transform: translate(-50%, -50%);
    cursor: crosshair;
    z-index: 5;
  }
  :global(.svelte-flow__handle.cable-out)::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 14px;
    height: 14px;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background: var(--text-muted);
    border: 3px solid var(--bg);
  }
  :global(.svelte-flow__handle.cable-out.audio)::after {
    background: var(--accent);
  }
</style>
