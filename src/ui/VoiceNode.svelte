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
  import { bottomOf, chipPlaces, envelopeBox, modifiersOf, voiceOutline } from '../layout/voice';
  import { formatLabel } from '../layout/labels';
  import { drawnShifts } from '../layout/turning';

  let { id, data }: NodeProps<VoiceFlowNode> = $props();
  const ctx = getGraphContext();
  // (label templates: refilled when a table turns, not every frame; a played cell's own shift as written)
  const stillShifts = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return drawnShifts(ctx.program, still, untrack(() => ctx.heads.shifts) ?? still, data.name);
  });
  const state = $derived(nodeState(ctx, id));
  const freeCell = $derived(ctx.program.cells.get(data.name));
  const lambda = $derived(ctx.program.cells.get(data.name)?.lambda ?? null);
  const rawLabel = $derived(ctx.program.cells.get(data.name)?.label ?? null);
  const label = $derived(rawLabel ? formatLabel(ctx.program, data.name, rawLabel, stillShifts) : null);
  // an instrument shows its waveform (show=spectrum: its spectrum)
  const wave = $derived(effectiveShow(ctx.program, data.name).show !== 'spectrum');
  // one wheel (layout/voice.ts): its waveform's disc on top, its envelope in a band under it, its other modifiers chips on
  // its upper shoulders — one outline
  const whole = $derived(!data.petal);
  const c = $derived(data.size / 2);
  const band = $derived(envelopeBox(data.size));
  const outline = $derived(voiceOutline(data.size));
  const chips = $derived.by(() => {
    if (!whole) return [];
    const names = modifiersOf(ctx.program, data.name);
    return chipPlaces(data.size, names.length).map((p, i) => ({ ...p, name: names[i] }));
  });
  const bandRect = $derived({ x: c - band.width / 2, y: c + band.top, w: band.width, h: band.height });
  // (its section's tint, the selector's lane it is in: its outline, its envelope and its name's border wear it)
  const section = $derived(ctx.sections?.get(id));
</script>

<div
  class="node voice"
  class:sectioned={!!section}
  data-state={state}
  style="width: {data.size}px; height: {data.size}px"
  style:--section={section}
  {@attach longpress(() => ctx.toggle(id))}
  title={wave
    ? `&${data.name} (${data.summary}): its waveform, its envelope under it`
    : `&${data.name} (${data.summary}): spectrum — left / right channel; low at the top, high at the bottom`}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  {#if whole}
    <!-- (the outline of the whole: the hull and the chips stroked, then filled over, so one line goes round all) -->
    <svg class="frame" width={data.size} height={data.size} aria-hidden="true">
      <path class="outline" d={outline} />
      {#each chips as ch (ch.name)}<circle class="outline" cx={c + ch.x} cy={c + ch.y} r={ch.r} />{/each}
      <path class="body" d={outline} />
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
    <!-- (the envelope in the band under the disc) -->
    <svg class="frame" width={data.size} height={data.size} aria-hidden="true">
      <EnvelopeCurve voice={data.name} live={state === 'live'} x={bandRect.x} y={bandRect.y} width={bandRect.w} height={bandRect.h} />
    </svg>
  {/if}
  <!-- its name, one plate as every node's: its label over its name, or its name -->
  {#if !data.petal}<div class="name" style:top="{c + bottomOf(data.size)}px" class:lambda={!!lambda} title={lambda ? `&(${lambda})` : label ? `&${data.name}` : undefined}>
      {#if label}<span class="label">{@html label}</span><small>&amp;{data.name}</small>
      {:else}{lambda ? `&(${lambda.length > 14 ? lambda.slice(0, 13) + '…' : lambda})` : '&' + data.name}{/if}
    </div>{/if}
  {#if !data.petal}<SideMarks name={data.name} />{/if}
  {#if data.pinned}<span class="pin" title="Pinned"></span>{/if}
  {#if freeCell?.frees.length && !data.petal}<FreePills frees={freeCell.frees} name={data.name} />{/if}
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
  .voice {
    border-radius: 50%;
    /* (its lane's colour: its section's tint, else the accent) */
    --lane: var(--section, var(--accent));
  }
  .frame {
    position: absolute;
    inset: 0;
    overflow: visible;
    pointer-events: none;
  }
  .outline {
    fill: none;
    stroke: color-mix(in oklab, var(--lane) 55%, var(--wheel-ref));
    stroke-width: 3;
  }
  [data-state='live'] .outline {
    stroke: var(--lane);
  }
  [data-state='off'] .outline,
  [data-state='unrouted'] .outline {
    stroke: var(--wheel-ref);
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
  /* (the name: as a cell's, CellNode.svelte) */
  .label {
    display: block;
    font: 700 13px var(--font-ui);
    color: var(--text);
  }
  .label :global(b) {
    color: var(--accent);
  }
  .name small {
    display: block;
    font-size: 0.75em;
    opacity: 0.7;
  }
  .name {
    position: absolute;
    left: 50%;
    transform: translate(-50%, 6px);
    white-space: nowrap;
    font: 600 13px/1.2 var(--font-code);
    color: var(--text);
    background: var(--surface);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
  }
  [data-state='live'] .name {
    border-color: var(--accent);
  }
  .sectioned .name {
    border-color: color-mix(in oklab, var(--section) 45%, transparent);
  }
  .sectioned[data-state='live'] .name {
    border-color: var(--section);
  }
  [data-state='off'] .name {
    text-decoration: line-through;
  }
  .name.lambda {
    font-style: italic;
    opacity: 0.85;
  }
</style>
