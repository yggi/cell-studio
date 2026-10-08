<script lang="ts">
  /**
   * A belt between two turntables: its two runs (the outer tangents of the pulleys, sized by the
   * step ratio), under the wheels. The pulling run straight — thicker, brighter as it stretches;
   * the other sags with its slack. A slip flashes. A step is sync: its colour is the palette's (ui/palette.ts), the
   * clock's tick, between the edge at rest and the bar's level as it pulls; no colour of its own.
   */
  import type { EdgeProps } from '@xyflow/svelte';
  import { openBelt, runPath } from '../layout/belts';
  import { palette } from './palette';

  const TICK = palette('sync', 0);

  let { sourceX, sourceY, targetX, targetY, data }: EdgeProps = $props();
  const d = $derived(data as { rDriven: number; rDriver: number; stretch: number; slipping: boolean });
  // source: the belted (driven) cell; target: its driver
  const runs = $derived(openBelt({ x: targetX, y: targetY }, d.rDriver, { x: sourceX, y: sourceY }, d.rDriven));
  const tension = $derived(Math.min(1, Math.abs(d.stretch) * 8));
  const sag = $derived(Math.min(26, 3 + Math.abs(d.stretch) * 160));
  const pulling = $derived(d.stretch >= 0 ? 0 : 1);
</script>

{#if runs}
  <g style:--tick={TICK}>
    {#each runs as [a, b], i (i)}
      {#if i === pulling}
        <path class="belt" class:slip={d.slipping} d="M{a.x},{a.y} L{b.x},{b.y}" stroke-width={4 + tension * 2.5} style:--t={tension} />
      {:else}
        <path class="belt slack" class:slip={d.slipping} d={runPath(a, b, sag, i === 0 ? -1 : 1)} stroke-width="4" />
      {/if}
    {/each}
  </g>
{/if}

<style>
  .belt {
    fill: none;
    stroke: color-mix(in oklab, var(--tick) calc(45% + var(--t, 0) * 55%), var(--edge));
    stroke-linecap: round;
    filter: drop-shadow(0 3px 3px rgba(0, 0, 0, 0.55));
  }
  .belt.slack {
    stroke: color-mix(in oklab, var(--tick) 25%, var(--edge));
  }
  .belt.slip {
    stroke: var(--danger);
  }
</style>
