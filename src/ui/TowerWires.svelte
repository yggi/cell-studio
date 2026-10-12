<script lang="ts">
  /**
   * The tower layout's sound (docs/notes/tower-strip.md), behind the cells, in the graph's own coordinates, drawn as an
   * edge of sound is (edges.css `.band-audio`: rippled at rest, its wave travelling while it sounds): one net a base
   * frequency (`towerNets`), its trunk from its first source's top, level to the strip at the graph's right, hopping
   * over a cell in its way (`netPaths`); each other source at that height a riser into it, a dot where it joins.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { getGraphContext, nodeState } from './context';
  import { netPaths, towerNets, type TowerIn, type TowerObstacle } from '../layout/towerlayout';
  import { rippled } from '../layout/wire';
  import { EDGE } from './theme';
  import { noteColour } from './theme';
  import EdgePayload from './EdgePayload.svelte';
  import { payloadShown, watchLoad } from './payloadGate.svelte';

  let { ins, obstacles, viewport, width }: { ins: readonly TowerIn[]; obstacles: readonly TowerObstacle[]; viewport: Viewport; width: number } = $props();
  const ctx = getGraphContext();

  // (the strip's inner edge, where the flow's box ends, in the graph's coordinates)
  const to = $derived((width - viewport.x) / viewport.zoom);
  const colourOf = (name: string) => {
    void ctx.turned;
    const f = ctx.state !== 'stopped' && nodeState(ctx, `cell:${name}`) === 'live' ? ctx.sound.note(name) : null;
    return f ? noteColour(((((Math.round(12 * Math.log2(f / 440)) + 9) % 12) + 12) % 12) * 30) : null;
  };
  // (a net's state: the liveliest of its sources')
  const stateOf = (net: { taps: readonly TowerIn[] }) => {
    const states = net.taps.map((t) => nodeState(ctx, t.from));
    return (['live', 'idle', 'on', 'unrouted', 'off'] as const).find((s) => states.includes(s)) ?? 'on';
  };
  $effect(() => (ctx.playing ? watchLoad() : undefined));
  const nets = $derived(
    towerNets(ins).map((net) => {
      const { trunk, risers } = netPaths(net, to, obstacles);
      const state = stateOf(net);
      // (its sound: the first of its sources sounding now)
      const live = net.taps.find((t) => colourOf(t.name));
      const colour = live ? colourOf(live.name) : null;
      const wave = !!live && ctx.playing && payloadShown();
      return { ...net, trunk, risers, state, colour, voice: live?.name ?? net.taps[0].name, wave };
    }),
  );
</script>

<svg class="wires" aria-hidden="true">
  {#each nets as n (n.id)}
    <g class="band-audio">
      {#each [n.trunk, ...n.risers] as d, i (i)}
        <path
          d={n.wave ? d : rippled(d, EDGE.ripple.amp, EDGE.ripple.period)}
          class="svelte-flow__edge-path edge-{n.state}"
          class:edge-live={!!n.colour}
          style={n.colour ? `stroke: ${n.colour}; stroke-opacity: ${EDGE.liveOpacity}` : undefined}
        />
      {/each}
      {#if n.wave}
        <EdgePayload path={n.trunk} kind="wave" on={true} from={n.voice} stepped={null} voice={n.voice} values={null} colourOf={() => n.colour ?? ''} colour={n.colour} />
      {/if}
      {#each n.taps.slice(1) as t (t.id)}
        <circle class="join" cx={t.x + 28 * 1.6} cy={n.top} r="4" style={n.colour ? `fill: ${n.colour}` : undefined} />
      {/each}
    </g>
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
  }
  .join {
    fill: var(--edge);
  }
</style>
