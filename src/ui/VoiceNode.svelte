<script lang="ts">
  import { untrack } from 'svelte';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { VoiceFlowNode } from './types';
  import { getGraphContext, nodeState } from './context';
  import { longpress } from './kit/attach';
  import FreePills from './FreePills.svelte';
  import SideMarks from './SideMarks.svelte';
  import SpectrumWheel from './SpectrumWheel.svelte';
  import WaveGlyph from './WaveGlyph.svelte';
  import { effectiveShow } from '../layout/show';
  import CellGlyph from './CellGlyph.svelte';
  import EnvelopeCurve from './EnvelopeCurve.svelte';
  import { chipPlaces, envelopeBox, modifiersOf } from '../layout/voice';
  import { formatLabel } from '../layout/labels';

  let { id, data }: NodeProps<VoiceFlowNode> = $props();
  const ctx = getGraphContext();
  // (label templates: refilled when a table turns, not every frame)
  const stillShifts = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.heads.shifts) ?? still;
  });
  const state = $derived(nodeState(ctx, id));
  const freeCell = $derived(ctx.program.cells.get(data.name));
  const lambda = $derived(ctx.program.cells.get(data.name)?.lambda ?? null);
  const rawLabel = $derived(ctx.program.cells.get(data.name)?.label ?? null);
  const label = $derived(rawLabel ? formatLabel(ctx.program, data.name, rawLabel, stillShifts) : null);
  // an instrument shows its waveform (show=spectrum: its spectrum)
  const wave = $derived(effectiveShow(ctx.program, data.name).show !== 'spectrum');
  // one wheel (layout/voice.ts): its envelope a cap on its top, its other modifiers chips on its lower rim — one outline
  const whole = $derived(!data.petal);
  const c = $derived(data.size / 2);
  const cap = $derived(envelopeBox(data.size));
  const chips = $derived.by(() => {
    if (!whole) return [];
    const names = modifiersOf(ctx.program, data.name);
    return chipPlaces(data.size, names.length).map((p, i) => ({ ...p, name: names[i] }));
  });
  const capRect = $derived({ x: c - cap.width / 2, y: c - cap.top, w: cap.width, h: cap.height, r: Math.min(14, cap.height / 3) });
</script>

<div
  class="node voice"
  data-state={state}
  style="width: {data.size}px; height: {data.size}px"
  {@attach longpress(() => ctx.toggle(id))}
  title={wave ? `&${data.name}: its waveform` : `&${data.name}: spectrum — left / right channel; low at the top, high at the bottom`}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  {#if whole}
    <!-- (the outline of the whole: the cap, the disc and the chips stroked, then filled over, so one line goes round all) -->
    <svg class="frame" width={data.size} height={data.size} aria-hidden="true">
      <rect class="outline" x={capRect.x} y={capRect.y} width={capRect.w} height={capRect.h} rx={capRect.r} />
      <circle class="outline" cx={c} cy={c} r={c - 1} />
      {#each chips as ch (ch.name)}<circle class="outline" cx={c + ch.x} cy={c + ch.y} r={ch.r} />{/each}
      <rect class="body" x={capRect.x} y={capRect.y} width={capRect.w} height={capRect.h} rx={capRect.r} />
      <circle class="body" cx={c} cy={c} r={c - 1} />
      {#each chips as ch (ch.name)}<circle class="body" cx={c + ch.x} cy={c + ch.y} r={ch.r} />{/each}
    </svg>
    {#each chips as ch (ch.name)}
      <div class="chip" style="left: {c + ch.x - ch.r}px; top: {c + ch.y - ch.r}px" title="&{data.name}'s {ch.name}">
        <CellGlyph name={ch.name} isMeter={false} size={2 * ch.r} />
      </div>
    {/each}
  {/if}
  {#if wave}<WaveGlyph name={data.name} size={data.size} />{:else}<SpectrumWheel name={data.name} size={data.size} />{/if}
  {#if whole}
    <!-- (the envelope over the disc's top edge, which the cap reaches into) -->
    <svg class="frame" width={data.size} height={data.size} aria-hidden="true">
      <EnvelopeCurve voice={data.name} x={capRect.x} y={capRect.y} width={capRect.w} height={capRect.h} />
    </svg>
  {/if}
  {#if !data.petal}<div class="name" title={lambda ? `&(${lambda})` : undefined}>
      {#if label}<span class="label">{@html label}</span> <span class="summary">&amp;{data.name}</span>
      {:else}{lambda ? `&(${lambda.length > 14 ? lambda.slice(0, 13) + '…' : lambda})` : '&' + data.name} <span class="summary">{data.summary}</span>{/if}
    </div>{/if}
  {#if !data.petal}<SideMarks name={data.name} />{/if}
  {#if data.pinned}<span class="pin" title="Pinned"></span>{/if}
  {#if freeCell?.frees.length && !data.petal}<FreePills frees={freeCell.frees} name={data.name} />{/if}
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .voice {
    border-radius: 50%;
  }
  .frame {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }
  .outline {
    fill: none;
    stroke: var(--wheel-ref);
    stroke-width: 3;
  }
  .body {
    fill: var(--wheel-disc);
  }
  .chip {
    position: absolute;
    pointer-events: none;
  }
  .voice :global([data-wheel='wave']),
  .voice :global([data-wheel='spectrum']) {
    position: relative;
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
