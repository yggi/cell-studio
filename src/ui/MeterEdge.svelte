<script lang="ts">
  /**
   * A trace of a meter's net (#27, layout/nets.ts meterNet): a meter reaches each cell it steps through the
   * others, like ground on a circuit board: a backbone, a wide trace in the meter's colour. It carries no pulse of its own: every trace of a meter blinks at once,
   * on each of its steps (brighter on its first), so the whole net shows one signal.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { getGraphContext } from './context';
  import { meterColour } from './theme';
  import { palette } from './palette';
  import { tickLevel } from '../layout/meters';

  let { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();
  const ctx = getGraphContext();
  const d = $derived(data as { meter: number; name: string });
  const path = $derived(`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`);
  // how bright now: a flash at each of the meter's steps, fading through it
  const flash = $derived.by(() => {
    // (a flash is a tick sounding now: while playing)
    const at = ctx.playing ? ctx.heads.beatAt.get(d.name) : undefined;
    if (at === undefined) return 0;
    const into = at - Math.floor(at + 1e-9);
    return Math.exp(-5 * into) * (Math.floor(at + 1e-9) === 0 ? 1 : 0.6);
  });
  // its colour: at rest the meter's own (the ring its cells wear, its name's); on a tick the palette's sync value, the
  // tick's level (ui/palette.ts: the bar's first --meter-0, a beat --meter-1, finer --meter-2 … 3), fading back with the flash
  const tick = $derived.by(() => {
    const at = ctx.playing ? ctx.heads.beatAt.get(d.name) : undefined;
    return at === undefined ? null : palette('sync', tickLevel(ctx.program.cells.get(d.name), at));
  });
  const trace = $derived(tick ? `color-mix(in oklab, ${tick} ${Math.round(100 * Math.min(1, flash * 1.6))}%, ${meterColour(d.meter)})` : meterColour(d.meter));
</script>

<BaseEdge {id} {path} class="meter-trace" style={`--trace: ${trace}; --flash: ${flash.toFixed(3)}`} interactionWidth={0} />
