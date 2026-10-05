<script lang="ts">
  /** An oscilloscope in the graph: a round screen, a cathode-ray tube (the details show it unconstrained). */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import ScopeView from './ScopeView.svelte';
  let { data }: NodeProps = $props();
  const d = $derived(data as { name: string });
</script>

<div class="node-scope">
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <ScopeView name={d.name} w={200} h={200} round />
  <span class="name">&{d.name}</span>
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .node-scope {
    position: relative;
    width: 200px;
    height: 200px;
  }
  .name {
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translate(-50%, 6px);
    font: 600 12px var(--font-code);
    color: var(--text-muted);
    white-space: nowrap;
  }
</style>
