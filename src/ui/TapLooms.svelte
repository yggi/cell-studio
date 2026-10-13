<script lang="ts">
  /**
   * The selectors as the tower layout draws them (taploom.ts, docs/notes/tower-strip.md): each a pill, its loom inside.
   * The clock it reads comes in white and passes through along the lowest lane, a meter's trace as any; each tap a
   * lane of its own, the clock tinted its section's colour (partColour) — a prism, one white in, its spectrum out. The
   * outputs are bulbs along the pill's top, each wire leaving straight up. Behind the cells, in the graph's coordinates.
   */
  import type { Loom } from '../layout/physics';
  import { partColour } from './theme';

  let { looms }: { looms: readonly Loom[] } = $props();
  // (the raw clock: white; a tap's: the clock tinted its section's colour)
  const tint = (tap: number, n: number) => (tap < 0 ? 'var(--meter-0)' : `color-mix(in oklab, ${partColour(tap, n)} 65%, var(--meter-0))`);
  const drawn = $derived(
    looms.map((l) => {
      const n = Math.max(1, ...l.strands.map((s) => s.tap + 1));
      const strands = l.strands.map((s) => ({ id: `${l.table}:${s.bulb}:${s.to}`, d: s.d, colour: tint(s.tap, n) }));
      // (an output a riser: where it leaves the pill's top, one bulb each)
      const outs = new Map<string, { x: number; colour: string }>();
      for (const s of l.strands) {
        const x = s.pieces[2][0];
        outs.set(`${s.tap}:${Math.round(x)}`, { x, colour: tint(s.tap, n) });
      }
      return { id: l.table, pill: l.pill, strands, outs: [...outs].map(([k, o]) => ({ k, ...o })) };
    }),
  );
</script>

<svg class="looms" aria-hidden="true">
  {#each drawn as l (l.id)}
    {@const h = l.pill.y1 - l.pill.y0}
    <rect class="pill" x={l.pill.x0} y={l.pill.y0} width={l.pill.x1 - l.pill.x0} height={h} rx={h / 2} />
    {#each l.strands as s (s.id)}
      <path d={s.d} style:--trace={s.colour} />
    {/each}
    {#each l.outs as o (o.k)}
      <circle class="out" cx={o.x} cy={l.pill.y0} r="6" style:fill={o.colour} />
    {/each}
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
  .pill {
    fill: var(--wheel-disc);
    stroke: var(--wheel-tick);
    stroke-width: 1.5;
  }
  /* (a meter's trace, as MeterEdge draws one: edges.css .meter-trace) */
  path {
    fill: none;
    stroke: var(--trace);
    stroke-width: var(--edge-trace-w);
    stroke-opacity: var(--edge-trace-rest);
    stroke-linejoin: round;
    stroke-linecap: round;
  }
  .out {
    stroke: var(--wheel-disc);
    stroke-width: 2;
  }
</style>
