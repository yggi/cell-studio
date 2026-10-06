<script lang="ts">
  import { untrack } from 'svelte';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { VoiceFlowNode } from './types';
  import { getGraphContext, nodeState } from './context';
  import { longpress } from './kit/attach';
  import FreePills from './FreePills.svelte';
  import SpectrumWheel from './SpectrumWheel.svelte';
  import WaveGlyph from './WaveGlyph.svelte';
  import { effectiveShow } from '../layout/show';
  import { formatLabel } from '../layout/labels';

  let { id, data }: NodeProps<VoiceFlowNode> = $props();
  const ctx = getGraphContext();
  // (label templates: refilled when a table turns, not every frame)
  const stillShifts = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.live?.shifts) ?? still;
  });
  const state = $derived(nodeState(ctx, id));
  const freeCell = $derived(ctx.program.cells.get(data.name));
  const lambda = $derived(ctx.program.cells.get(data.name)?.lambda ?? null);
  const rawLabel = $derived(ctx.program.cells.get(data.name)?.label ?? null);
  const label = $derived(rawLabel ? formatLabel(ctx.program, data.name, rawLabel, stillShifts) : null);
  const wave = $derived(effectiveShow(ctx.program, data.name).show === 'wave');
</script>

<div
  class="node voice"
  data-state={state}
  style="width: {data.size}px; height: {data.size}px"
  {@attach longpress(() => ctx.toggle(id))}
  title="&{data.name}: spectrum — left / right channel; low at the top, high at the bottom"
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  {#if wave}<WaveGlyph name={data.name} size={data.size} />{:else}<SpectrumWheel name={data.name} size={data.size} />{/if}
  {#if !data.petal}<div class="name" title={lambda ? `&(${lambda})` : undefined}>
    {#if label}<span class="label">{@html label}</span> <span class="summary">&amp;{data.name}</span>
    {:else}{lambda ? `&(${lambda.length > 14 ? lambda.slice(0, 13) + '…' : lambda})` : '&' + data.name} <span class="summary">{data.summary}</span>{/if}
  </div>{/if}
  {#if data.pinned}<span class="pin" title="Pinned"></span>{/if}
  {#if freeCell?.frees.length && !data.petal}<FreePills frees={freeCell.frees} name={data.name} />{/if}
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .voice {
    border-radius: 50%;
  }
  .label {
    font: 700 13px var(--font-ui);
    color: var(--text);
  }
  .name {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translate(-50%, 6px);
    white-space: nowrap;
    font: 600 13px/1.2 var(--font-code);
    color: var(--accent);
    background: var(--surface);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
  }
  .summary {
    color: var(--text-muted);
    font-weight: 500;
    font-size: 11px;
  }
  [data-state='live'] .name {
    border-color: var(--accent);
  }
  [data-state='off'] .name {
    text-decoration: line-through;
  }
</style>
