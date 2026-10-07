<script lang="ts">
  import { untrack } from 'svelte';
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { CellFlowNode } from './types';
  import CellGlyph from './CellGlyph.svelte';
  import { getGraphContext, nodeState } from './context';
  import { longpress } from './kit/attach';
  import FreePills from './FreePills.svelte';
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
    return untrack(() => ctx.live?.shifts) ?? still;
  });
  const state = $derived(nodeState(ctx, id));
  const freeCell = $derived(ctx.program.cells.get(data.name));
  // mixes and the sound card are signals: a mix shows its waveform (as a read head does), the sound card its spectrum
  const cell = $derived(ctx.program.cells.get(data.name));
  // (a read head of a sound tape: what it plays back is sound — its waveform, with where it reads)
  const soundHead = $derived(!!cell && typeof cell.params.play === 'string' && ctx.program.tapes.some((t) => t.name === cell.params.play));
  const signal = $derived(!!cell && (!!cell.mix || cell.sink || soundHead));
  const at = $derived(cell?.params.at);
  const hub = $derived(
    soundHead
      ? { big: typeof at === 'number' ? `${+at.toFixed(2)}s` : typeof at === 'string' ? `&${at}` : 'head', small: 'head' }
      : signal
        ? hubLabel(ctx.program, data.name, ctx.shifts, false, null)
        : null,
  );
  // label=: the name shown (a template, filled in live); a cell that is only a label is a note in the graph
  const shown = $derived(stillShifts);
  const label = $derived(cell?.label ? formatLabel(ctx.program, data.name, cell.label, shown) : null);
  const note = $derived(!!cell?.note);
</script>

{#if note}
  <!-- a note is for reading: it never fades with the sound (unless switched off) -->
  <div class="node notecard" data-state={state === 'off' ? 'off' : 'on'} {@attach longpress(() => ctx.toggle(id))}>
    <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
    <p>{@html label}</p>
    <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
  </div>
{:else}
  <div
    class="node cell"
    class:meter={data.isMeter}
    data-state={state}
    style="width: {data.size}px; height: {data.size}px"
    style:--meter={data.meterIndex !== undefined ? meterColour(data.meterIndex) : undefined}
    {@attach longpress(() => ctx.toggle(id))}
  >
    <Handle type="target" position={Position.Top} class="center-handle" isConnectable={false} />
    {#if soundHead || (cell?.mix && !cell.sink)}
      <WaveGlyph name={data.name} size={data.size} caption={hub ? `${hub.big} ${hub.small}` : null} />
    {:else if signal && hub}
      <SpectrumWheel name={data.name} size={data.size} {hub} />
    {:else}
      <CellGlyph name={data.name} isMeter={data.isMeter} size={data.size} />
    {/if}
    {#if !data.petal}<div class="name" class:lambda={!!cell?.lambda} title={cell?.lambda ? `&(${cell.lambda})` : label ? `&${data.name}` : undefined}>
        {#if label}<span class="label">{@html label}</span><small>&amp;{data.name}</small>
        {:else}{cell?.lambda ? `&(${cell.lambda.length > 14 ? cell.lambda.slice(0, 13) + '…' : cell.lambda})` : '&' + data.name}{/if}
      </div>{/if}
    {#if data.pinned}<span class="pin" title="Pinned"></span>{/if}
    {#if freeCell?.frees.length && !data.petal}<FreePills frees={freeCell.frees} name={data.name} />{/if}
    <Handle type="source" position={Position.Bottom} class="center-handle" isConnectable={false} />
  </div>
{/if}

<style>
  /* a note: a card that reads at a glance — solid, high contrast, the rainbow at its edge */
  .notecard {
    position: relative;
    width: 220px;
    padding: 10px 12px 10px 16px;
    border-radius: var(--radius);
    background: var(--surface-2);
    border: 1px solid var(--line);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .notecard::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: var(--rainbow);
    background-size: 100% 100%;
    filter: saturate(0.9);
  }
  .notecard p {
    margin: 0;
    font: 500 13.5px/1.45 var(--font-ui);
    color: var(--text);
  }
  .notecard :global(b) {
    color: var(--accent);
  }
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
    transform: translate(-50%, 6px);
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
