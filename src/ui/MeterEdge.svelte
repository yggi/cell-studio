<script lang="ts">
  /**
   * A trace of a meter's net (#27, layout/physics.ts meterNet): a meter reaches each cell it steps through the
   * others, like ground on a circuit board: a thin solid line in the meter's colour (dotted is an `over=` edge's). It carries no pulse of its own: every trace of a meter blinks at once,
   * on each of its steps (brighter on its first), so the whole net shows one signal.
   */
  import { BaseEdge, type EdgeProps } from '@xyflow/svelte';
  import { getGraphContext } from './context';
  import { meterColour } from './theme';

  let { id, sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();
  const ctx = getGraphContext();
  const d = $derived(data as { meter: number; name: string });
  const path = $derived(`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`);
  // how bright now: a flash at each of the meter's steps, fading through it
  const flash = $derived.by(() => {
    const at = ctx.live?.beatAt.get(d.name);
    if (at === undefined) return 0;
    const into = at - Math.floor(at + 1e-9);
    return Math.exp(-5 * into) * (Math.floor(at + 1e-9) === 0 ? 1 : 0.6);
  });
</script>

<BaseEdge {id} {path} class="meter-trace" style={`--trace: ${meterColour(d.meter)}; --flash: ${flash.toFixed(3)}`} interactionWidth={0} />

<style>
  :global(.svelte-flow__edge-path.meter-trace) {
    stroke: var(--trace);
    stroke-opacity: calc(0.35 + 0.65 * var(--flash));
    stroke-width: calc(1.25px + 2.75px * var(--flash));
    filter: drop-shadow(0 0 calc(4px * var(--flash)) var(--trace));
  }
</style>
