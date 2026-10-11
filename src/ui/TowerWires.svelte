<script lang="ts">
  /**
   * The tower layout's sound wires (docs/notes/tower-strip.md), behind the cells, in the graph's own coordinates: what
   * goes into the sound card leaves its source's top (a voice's: its base frequency on the tower), straight up a
   * little, and runs level to the strips, one strand left and one right (a two-channel card's first only left, its
   * second only right). Live, a strand takes its source's note's colour; at rest it is an edge's.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { getGraphContext, nodeState } from './context';
  import type { TowerIn } from '../layout/towerlayout';
  import { noteColour } from './theme';

  let { ins, viewport, width }: { ins: readonly TowerIn[]; viewport: Viewport; width: number } = $props();
  const ctx = getGraphContext();

  // (the strips' inner edges, where the flow's box ends, in the graph's coordinates)
  const xl = $derived(-viewport.x / viewport.zoom);
  const xr = $derived((width - viewport.x) / viewport.zoom);
  const colourOf = (name: string) => {
    void ctx.turned;
    const f = ctx.state !== 'stopped' && nodeState(ctx, `cell:${name}`) === 'live' ? ctx.sound.note(name) : null;
    return f ? noteColour(((((Math.round(12 * Math.log2(f / 440)) + 9) % 12) + 12) % 12) * 30) : null;
  };
  const wires = $derived(
    ins.map((o) => {
      const { x, top: y, name } = o;
      const hop = 28;
      const path = (to: number, dir: number) => `M${x},${y} C${x},${y - hop} ${x + dir * hop},${y} ${x + dir * hop * 1.6},${y} L${to},${y}`;
      return { id: o.id, d: [o.left ? path(xl, -1) : '', o.right ? path(xr, 1) : ''].join(' '), colour: colourOf(name), off: nodeState(ctx, o.from) === 'off' };
    }),
  );
</script>

<svg class="wires" aria-hidden="true">
  {#each wires as w (w.id)}
    <path d={w.d} class:live={!!w.colour} class:off={w.off} style:stroke={w.colour ?? undefined} />
  {/each}
</svg>

<style>
  .wires {
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
    stroke: var(--edge);
    stroke-width: 3;
    opacity: 0.85;
  }
  path.live {
    stroke-width: 3.5;
    opacity: 1;
  }
  path.off {
    opacity: 0.3;
    stroke-dasharray: 4 6;
  }
</style>
