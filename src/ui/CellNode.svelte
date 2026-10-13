<script lang="ts">
  import { untrack } from 'svelte';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { CellFlowNode } from './types';
  import CellGlyph from './CellGlyph.svelte';
  import { bulbAt, getGraphContext, nodeState } from './context';
  import { longpress } from './kit/attach';
  import FreePills from './FreePills.svelte';
  import GateMeter from './GateMeter.svelte';
  import KitGlyph from './KitGlyph.svelte';
  import { VOICE_KIT } from '../engine/compiler/declare';
  import { gateOf } from '../layout/gate';
  import { glyphOf, soundHeadOf } from '../layout/wheels';
  import SideMarks from './SideMarks.svelte';
  import SpectrumWheel from './SpectrumWheel.svelte';
  import WaveGlyph from './WaveGlyph.svelte';
  import { hubLabel } from '../layout/cellview';
  import { formatLabel } from '../layout/labels';
  import { meterColour } from './theme';

  let { id, data }: NodeProps<CellFlowNode> = $props();
  const ctx = getGraphContext();
  // (label templates: refilled when a table turns, not every frame)
  const stillShifts = $derived.by(() => {
    void ctx.turned;
    const still = ctx.shifts;
    return untrack(() => ctx.heads.shifts) ?? still;
  });
  const state = $derived(nodeState(ctx, id));
  const freeCell = $derived(ctx.program.cells.get(data.name));
  // mixes and the sound card are signals: a mix shows its waveform (as a read head does), the sound card its spectrum
  const cell = $derived(ctx.program.cells.get(data.name));
  const gate = $derived(gateOf(ctx.program, data.name));
  // (what it draws: layout/wheels.ts; a read head of a sound tape plays back sound — its waveform, with where it reads)
  const glyph = $derived(glyphOf(ctx.program, data.name));
  const soundHead = $derived(soundHeadOf(ctx.program, data.name));
  const signal = $derived(!!cell && (!!cell.mix || cell.sink || soundHead));
  const at = $derived(cell?.params.at);
  const hub = $derived(
    soundHead
      ? { big: typeof at === 'number' ? `${+at.toFixed(2)}s` : typeof at === 'string' ? `&${at}` : 'head', small: 'head' }
      : signal
        ? hubLabel(ctx.program, data.name, ctx.shifts, false, null)
        : null,
  );
  // label=: the name shown (a template, filled in live); a cell that is only a label is a note, in the margin
  const shown = $derived(stillShifts);
  const label = $derived(cell?.label ? formatLabel(ctx.program, data.name, cell.label, shown) : null);
  // the drums' kit the grooves read (unnamed, VOICE_KIT): named drums
  const drumsKit = $derived(data.name === VOICE_KIT);
</script>

<div
  class="node cell"
  class:meter={data.isMeter}
  data-state={state}
  style="width: {data.size}px; height: {data.size}px"
  style:--meter={data.meterIndex !== undefined ? meterColour(data.meterIndex) : undefined}
  {@attach longpress((at) => ctx.toggle(bulbAt(at) ?? id))}
>
  <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
  <!-- (a gate is a mix as read, but draws a level meter: its notes as bars, #234) -->
  <!-- (the tower layout: a selector is drawn by its pill, TapLooms.svelte — its node keeps its name) -->
  {#if ctx.pills?.has(id)}
    <!-- (no wheel) -->
  {:else if glyph === 'gate' && gate}
    <GateMeter notes={gate.trigger} levels={gate.levels} gain={gate.gain} size={data.size} label="&{data.name}: a gate, its notes as bars" />
  {:else if glyph === 'kit'}
    <KitGlyph name={data.name} size={data.size} />
  {:else if glyph === 'wave'}
    <WaveGlyph name={data.name} size={data.size} caption={hub ? `${hub.big} ${hub.small}` : null} />
  {:else if glyph === 'spectrum' && hub}
    <SpectrumWheel name={data.name} size={data.size} {hub} />
  {:else}
    <CellGlyph name={data.name} isMeter={data.isMeter} size={data.size} />
  {/if}
  {#if !data.petal}<div
      class="name"
      style:--below="{data.below ?? 0}px"
      class:lambda={!!cell?.lambda}
      title={cell?.lambda ? `&(${cell.lambda})` : label ? `&${data.name}` : undefined}
    >
      {#if drumsKit}drums
      {:else if label}<span class="label">{@html label}</span><small>&amp;{data.name}</small>
      {:else}{cell?.lambda ? `&(${cell.lambda.length > 14 ? cell.lambda.slice(0, 13) + '…' : cell.lambda})` : '&' + data.name}{/if}
    </div>{/if}
  {#if !data.petal}<SideMarks name={data.name} />{/if}
  {#if data.pinned}<span class="pin" title="Pinned"></span>{/if}
  {#if freeCell?.frees.length && !data.petal}<FreePills frees={freeCell.frees} name={data.name} />{/if}
  <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
</div>

<style>
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
  .cell {
    border-radius: 50%;
  }
  .name {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translate(-50%, calc(6px + var(--below, 0px)));
    white-space: nowrap;
    font: 600 13px/1.2 var(--font-code);
    color: var(--text);
    background: var(--surface);
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid transparent;
  }
  .meter .name {
    color: var(--meter, var(--accent));
  }
  [data-state='live'] .name {
    border-color: var(--accent);
  }
  [data-state='off'] .name {
    text-decoration: line-through;
  }
  .name.lambda {
    font-style: italic;
    opacity: 0.85;
  }
</style>
