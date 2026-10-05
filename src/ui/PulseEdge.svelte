<script lang="ts">
  import { noteColour } from './theme';
  import { freqHue } from '../engine/compile';
  /**
   * An edge that shows what flows along it while playing:
   *  - step edges: a pulse per step of the consumer, from the driver (&bar) to it
   *  - out edges (melody → voice) and mix edges (voice → mix): the colour of the
   *    note sounding now, with a pulse per step of the melody
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { splinePoint } from '../layout/physics';
  import { getGraphContext } from './context';
  import { pitchHue } from '../theory/modes';

  let { id, sourceX, sourceY, targetX, targetY, data, label, markerEnd, style }: EdgeProps = $props();
  const ctx = getGraphContext();
  const d = $derived(data as { kind: string; phaseCell: string | null; voice: string | null; reverse: boolean; off?: boolean });

  // a quadratic spline through the layout's bend point (straight when nothing is in the way)
  const mid = $derived(ctx.bends.get(id) ?? { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 });
  const control = $derived({ x: 2 * mid.x - (sourceX + targetX) / 2, y: 2 * mid.y - (sourceY + targetY) / 2 });
  const path = $derived(`M ${sourceX} ${sourceY} Q ${control.x} ${control.y} ${targetX} ${targetY}`);
  const geometry = $derived([path, mid.x, mid.y] as const);

  // an edge that's off (an end switched off) neither pulses nor takes its voice's colour
  const phase = $derived(!d.off && d.phaseCell && ctx.live ? ctx.live.phases.get(d.phaseCell) : undefined);
  // flow from upstream to downstream: step edges point consumer → driver, so they run backwards
  const t = $derived(phase === undefined ? null : d.reverse ? 1 - phase : phase);
  const dot = $derived(t === null ? null : splinePoint(sourceX, sourceY, mid.x, mid.y, targetX, targetY, t));

  const hue = $derived.by(() => {
    if (d.off || !d.voice || !ctx.live) return null;
    const f = ctx.note(d.voice);
    // the note's colour on the voice's own grid
    return f ? (freqHue(ctx.program, d.voice, f) ?? pitchHue(12 * Math.log2(f / 261.63))) : null;
  });
  // (the colouring rule: C4 … C5 full colour, other octaves muted, lighter above, darker below)
  const octave = $derived.by(() => {
    const f = d.voice && ctx.live ? ctx.note(d.voice) : null;
    if (!f) return 0;
    const r = f / 261.63;
    return r >= 1 && r <= 2.0001 ? 0 : Math.floor(Math.log2(r));
  });
  const colour = $derived(hue === null ? null : noteColour(hue, false, octave));
  const edgeStyle = $derived(colour ? `${style ?? ''}; stroke: ${colour}; stroke-opacity: 0.9` : style);
</script>

<BaseEdge {id} {path} {markerEnd} style={edgeStyle} {label} labelX={geometry[1]} labelY={geometry[2]} labelStyle={d.off ? 'opacity: 0.3' : colour ? `border-color: ${colour}` : undefined} />
{#if dot}
  <circle class="pulse" cx={dot.x} cy={dot.y} r="6" style={colour ? `fill: ${colour}` : undefined} />
{/if}

<style>
  .pulse {
    fill: var(--accent);
    pointer-events: none;
    filter: drop-shadow(0 0 3px currentColor);
  }
</style>
