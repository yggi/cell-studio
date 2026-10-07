<script lang="ts">
  import { noteColour } from './theme';
  import { freqHue } from '../engine/helix';
  /**
   * An edge drawn by what it carries (its band, docs/notes/nets.md), from what is read to the cell that reads it:
   *  - sync (a clock's ticks): dotted, a pulse per step of the cell it drives
   *  - CV (pitch, level, a table): solid; a table read through over= is a bus, a strand per entry in its wheel's colours
   *  - audio (sound): a wave along it
   * While playing, a live edge into a voice or a mix takes the colour of the note sounding now, with a pulse per step.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { ripplePath, splinePoint, strandPath } from '../layout/geometry';
  import { cellView } from '../layout/cellview';
  import { getGraphContext } from './context';
  import { pitchHue } from '../theory/modes';

  let { id, sourceX, sourceY, targetX, targetY, data, label, markerEnd, style }: EdgeProps = $props();
  const ctx = getGraphContext();
  const d = $derived(data as { kind: string; band: string; width: number; table: string | null; phaseCell: string | null; voice: string | null; off?: boolean; state?: string });
  // The edge's state as drawn: the list says off / unrouted / on / idle (idle: routed, playing); an idle edge is live
  // when the live set says so — each edge reads that for itself, so the list isn't remade at every step (#13).
  const state = $derived(d.state === 'idle' && ctx.liveEdges?.has(id) ? 'live' : (d.state ?? 'on'));
  const isLive = $derived(state === 'live');

  // a quadratic spline through the layout's bend point (straight when nothing is in the way)
  const mid = $derived(ctx.bends.get(id) ?? { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 });
  const control = $derived({ x: 2 * mid.x - (sourceX + targetX) / 2, y: 2 * mid.y - (sourceY + targetY) / 2 });
  const spline = $derived(`M ${sourceX} ${sourceY} Q ${control.x} ${control.y} ${targetX} ${targetY}`);
  const path = $derived(d.band === 'audio' ? ripplePath(sourceX, sourceY, mid.x, mid.y, targetX, targetY) : spline);

  // a table's bus: its entries as its wheel colours them (at most 12 strands: a longer table is sampled)
  const STRANDS = 12;
  const GAP = 4;
  const strands = $derived.by(() => {
    if (!d.table || d.width < 2) return [];
    void ctx.turned;
    const segments = cellView(ctx.program, d.table, ctx.shifts, false).segments;
    const n = Math.min(STRANDS, segments.length);
    return Array.from({ length: n }, (_, i) => {
      const fill = segments[Math.floor((i * segments.length) / n)].bands[0];
      const colour = fill?.kind === 'pitch' ? noteColour(fill.hue, false, fill.octave ?? 0) : 'var(--edge)';
      return { colour, path: strandPath(sourceX, sourceY, mid.x, mid.y, targetX, targetY, (i - (n - 1) / 2) * GAP) };
    });
  });

  // only a live edge (what it carries sounds now) pulses and takes its voice's colour
  const phase = $derived(isLive && d.phaseCell && ctx.live ? ctx.live.phases.get(d.phaseCell) : undefined);
  const dot = $derived(phase === undefined ? null : splinePoint(sourceX, sourceY, mid.x, mid.y, targetX, targetY, phase));

  const hue = $derived.by(() => {
    if (!isLive || !d.voice || !ctx.live) return null;
    const f = ctx.note(d.voice);
    // the note's colour on the voice's own grid
    return f ? (freqHue(ctx.program, d.voice, f) ?? pitchHue(12 * Math.log2(f / 261.63))) : null;
  });
  // (the colouring rule: C4 … C5 full colour, other octaves muted, lighter above, darker below)
  const octave = $derived.by(() => {
    const f = isLive && d.voice && ctx.live ? ctx.note(d.voice) : null;
    if (!f) return 0;
    const r = f / 261.63;
    return r >= 1 && r <= 2.0001 ? 0 : Math.floor(Math.log2(r));
  });
  const colour = $derived(hue === null ? null : noteColour(hue, false, octave));
  const edgeStyle = $derived(colour ? `${style ?? ''}; stroke: ${colour}; stroke-opacity: 0.9` : style);
</script>

{#if strands.length}
  <g class={`bus edge-${state}`}>
    <path class="bus-sheath" d={spline} style={`stroke-width: ${strands.length * GAP + 6}px`} />
    {#each strands as s, i (i)}
      <path d={s.path} style={`stroke: ${s.colour}`} />
    {/each}
  </g>
{/if}
<BaseEdge
  {id}
  {path}
  {markerEnd}
  style={edgeStyle}
  class={`edge-${state}${strands.length ? ' bus-core' : ''}`}
  {label}
  labelX={mid.x}
  labelY={mid.y}
  labelStyle={d.off ? 'opacity: 0.3' : colour ? `border-color: ${colour}` : undefined}
/>
{#if dot}
  <circle class="pulse" cx={dot.x} cy={dot.y} r={d.band === 'sync' ? 4.5 : 6} style={colour ? `fill: ${colour}` : undefined} />
{/if}

<style>
  .pulse {
    fill: var(--accent);
    pointer-events: none;
    filter: drop-shadow(0 0 3px currentColor);
  }
  .bus path {
    fill: none;
    stroke-width: 2.5;
    stroke-linecap: round;
    pointer-events: none;
    transition: stroke-opacity 200ms ease;
  }
  .bus .bus-sheath {
    stroke: var(--bg);
    stroke-opacity: 0.55;
  }
</style>
