<script lang="ts">
  /**
   * A trace of a meter's net (#27, layout/nets.ts meterNet): a meter reaches each cell it steps through the
   * others, like ground on a circuit board: a backbone, a wide trace in the meter's colour. It carries no pulse of its own: every trace of a meter blinks at once,
   * on each of its steps (brighter on its first), so the whole net shows one signal.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { getGraphContext } from './context';
  import { beatFlash } from './edgeStyle';
  import { EDGE, meterColour } from './theme';
  import { palette } from './palette';
  import { tickLevel } from '../layout/meters';

  let { id, source, target, sourceX: rimSX, sourceY: rimSY, targetX: rimTX, targetY: rimTY, data }: EdgeProps = $props();
  const ctx = getGraphContext();
  // (an end on a selector's pill: its port, or its outline — PulseEdge's rule)
  const ends = $derived({ source: ctx.anchor?.(source, target, { x: rimTX, y: rimTY }), target: ctx.anchor?.(target, source, { x: rimSX, y: rimSY }) });
  const [sourceX, sourceY] = $derived([ends.source?.x ?? rimSX, ends.source?.y ?? rimSY]);
  const [targetX, targetY] = $derived([ends.target?.x ?? rimTX, ends.target?.y ?? rimTY]);
  const d = $derived(data as { meter: number; name: string; at?: { x: number; y: number; r: number } });
  // (a tap's sub-net: from the outside of its bulb on its table, towards the cell — decision 016)
  const path = $derived.by(() => {
    if (!d.at) return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    const [x, y] = [rimSX + d.at.x, rimSY + d.at.y];
    const l = Math.hypot(targetX - x, targetY - y) || 1;
    return `M ${x + ((targetX - x) / l) * d.at.r} ${y + ((targetY - y) / l) * d.at.r} L ${targetX} ${targetY}`;
  });
  // how bright now: a flash at each of the meter's steps, fading through it
  // (a flash is a tick sounding now: while playing)
  const flash = $derived(beatFlash(ctx.playing ? ctx.heads.beatAt.get(d.name) : undefined));
  // its colour: at rest the meter's own (the ring its cells wear, its name's); on a tick the palette's sync value, the
  // tick's level (ui/palette.ts: the bar's first --meter-0, a beat --meter-1, finer --meter-2 … 3), fading back with the flash
  const tick = $derived.by(() => {
    const at = ctx.playing ? ctx.heads.beatAt.get(d.name) : undefined;
    return at === undefined ? null : palette('sync', tickLevel(ctx.program.cells.get(d.name), at));
  });
  const trace = $derived(tick ? `color-mix(in oklab, ${tick} ${Math.round(100 * Math.min(1, flash * EDGE.flash.mix))}%, ${meterColour(d.meter)})` : meterColour(d.meter));
</script>

<BaseEdge {id} {path} class="meter-trace" style={`--trace: ${trace}; --flash: ${flash.toFixed(3)}`} interactionWidth={0} />
