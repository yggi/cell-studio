<script lang="ts">
  /** A bare node for the edge sheet: a pill with the cell's name (a disc, for a belt's pulleys); the edge is what is shown. */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';

  let { data }: NodeProps = $props();
  const d = $derived(data as { name: string; w: number; h: number; round: boolean; sources: string[]; targets: string[] });
</script>

<div class="dot" class:round={d.round} style:width="{d.w}px" style:height="{d.h}px">
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  {#each d.targets as id (id)}<Handle type="target" {id} position={Position.Top} class="center-handle" isConnectable={false} />{/each}
  <span>{d.name}</span>
  {#each d.sources as id (id)}<Handle type="source" {id} position={Position.Bottom} class="center-handle" isConnectable={false} />{/each}
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .dot {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    border: 2px solid var(--line);
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--text-muted);
    font: 700 12px var(--font-code);
  }
  .round {
    background: var(--surface);
  }
</style>
