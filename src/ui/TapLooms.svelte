<script lang="ts">
  /**
   * The selectors' looms (the tower layout, taploom.ts): over each table of taps, a lane a tap, its strand up from its
   * bulb, along its lane and straight to each cell it steps; tinted in its section's colour (partColour, as its bulb is),
   * behind the cells, in the graph's own coordinates.
   */
  import type { LoomStrand } from '../layout/taploom';
  import { partColour } from './theme';

  let { looms }: { looms: readonly { table: string; strands: readonly LoomStrand[] }[] } = $props();
  const drawn = $derived(
    looms.flatMap((l) => {
      const n = Math.max(1, ...l.strands.map((s) => s.tap + 1));
      // (the source's lane: as a wire is)
      return l.strands.map((s) => ({ id: `${l.table}:${s.bulb}:${s.to}`, d: s.d, colour: s.tap < 0 ? 'var(--edge)' : partColour(s.tap, n) }));
    }),
  );
</script>

<svg class="looms" aria-hidden="true">
  {#each drawn as s (s.id)}
    <path d={s.d} style:stroke={s.colour} />
  {/each}
</svg>

<style>
  .looms {
    position: absolute;
    left: 0;
    top: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
  }
  path {
    fill: none;
    stroke-width: 3;
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0.75;
  }
</style>
