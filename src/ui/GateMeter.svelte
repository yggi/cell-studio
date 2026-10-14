<script lang="ts" module>
  // (each meter's own ids for its gradient and clip: counted, not drawn by chance)
  let meters = 0;
</script>

<script lang="ts">
  /**
   * A gate drawn as a level meter (#234, docs/language/mix.md: a gate), and an unnamed product (a junction) as a small
   * one: a bar for each note it plays now, side by side for a chord, in the note's colour as the wheel of the cell
   * whose notes they are colours it, as tall as its level: the product of its level streams now and its gain. A rest,
   * no bar. At rest the heads are at time 0, so it shows the first step.
   */
  import { cellView } from '../layout/cellview';
  import { gateBars } from '../layout/gate';
  import { wheelGeometry } from '../layout/wheel';
  import { valuesAt } from '@yggi/cells/engine/values';
  import { lapOf } from '@yggi/cells/engine/readers';
  import { getGraphContext } from './context';
  import { fillColour } from './edgeStyle';

  let { notes, levels, gain = 1, size = 128, label }: { notes: string | null; levels: readonly string[]; gain?: number; size?: number; label: string } = $props();
  const ctx = getGraphContext();
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  // (the notes' steps as their own wheel draws them: their colours, chords as several bands)
  const view = $derived(notes && ctx.program.cells.has(notes) ? cellView(ctx.program, notes, ctx.shifts, false) : null);
  const steps = $derived(notes ? lapOf(ctx.program, notes) : 1);
  // how loud now: each level stream's value (a rest in it: nothing), times the gain
  const level = $derived(
    levels.reduce((a, l) => {
      if (!ctx.program.cells.has(l)) return a;
      const v = valuesAt(ctx.program, ctx.shifts, l, ctx.heads.seconds)[0];
      return a * (v === undefined ? 0 : Math.max(0, v));
    }, gain),
  );
  // the notes sounding now: the step under the playhead, a band for each (a rest has none)
  const now = $derived.by(() => {
    if (!notes || !view) return [];
    const local = ctx.heads.cells.get(notes)?.local ?? 0;
    const t = (((local / steps) % 1) + 1) % 1;
    const seg = view.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9);
    return (seg?.bands ?? []).filter((b) => b.kind === 'pitch' || b.kind === 'level');
  });
  const bars = $derived(gateBars(size, now.length, level));
  // the peak: where the level last reached, falling back slowly (a meter's peak hold), while it plays
  let peak = $state(0);
  let peakAt = 0;
  $effect(() => {
    const t = ctx.heads.seconds;
    const l = now.length ? Math.min(1, level) : 0;
    const fallen = Math.max(0, peak - Math.max(0, t - peakAt) * 0.5);
    if (!ctx.lit) peak = 0;
    else if (l >= fallen) {
      peak = l;
      peakAt = t;
    } else if (Math.abs(fallen - peak) > 0.01) {
      peak = fallen;
      peakAt = t;
    }
  });
  const uid = `gm-${++meters}`;
</script>

<svg data-wheel="gate" width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label={label}>
  <defs>
    <linearGradient id="{uid}-sheen" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="white" stop-opacity="0.35" />
      <stop offset="0.5" stop-color="white" stop-opacity="0" />
    </linearGradient>
    <clipPath id="{uid}-track"><rect x={bars.x} y={bars.top} width={bars.width} height={bars.height} rx={bars.round} /></clipPath>
  </defs>
  <circle class="disc" cx={c} cy={c} r={geo.rDisc} />
  <rect class="track" x={bars.x} y={bars.top} width={bars.width} height={bars.height} rx={bars.round} />
  {#each bars.ticks as t (t)}
    <line class="tick" x1={bars.x - size * 0.035} x2={bars.x - size * 0.005} y1={bars.yOf(t)} y2={bars.yOf(t)} />
  {/each}
  <!-- (the most it can reach: its gain, when that is less than full) -->
  {#if gain < 1}<line class="gain" x1={bars.x} x2={bars.x + bars.width} y1={bars.yOf(gain)} y2={bars.yOf(gain)} />{/if}
  <g clip-path="url(#{uid}-track)">
    {#each bars.bars as b, i (i)}
      {@const top = bars.yOf(b.level)}
      {@const h = bars.yOf(0) - top}
      {#if h > 0}
        <rect class="glow" x={b.x - 1.5} y={top - 1.5} width={b.width + 3} height={h + 3} rx={b.width / 4} fill={fillColour(now[i])} />
        <rect class="bar" x={b.x} y={top} width={b.width} height={h} rx={Math.min(b.width / 4, h / 2)} fill={fillColour(now[i])} />
        <rect x={b.x} y={top} width={b.width} height={h} rx={Math.min(b.width / 4, h / 2)} fill="url(#{uid}-sheen)" />
      {/if}
    {/each}
  </g>
  {#if peak > 0.01}<line class="peak" x1={bars.x + bars.width * 0.15} x2={bars.x + bars.width * 0.85} y1={bars.yOf(peak)} y2={bars.yOf(peak)} />{/if}
</svg>

<style>
  .disc {
    fill: var(--wheel-disc);
    stroke: var(--wheel-ref);
    stroke-width: 2;
  }
  .track {
    fill: var(--wheel-rest);
    stroke: var(--wheel-ref);
    stroke-width: 1;
  }
  .tick {
    stroke: var(--wheel-tick);
    stroke-width: 1.5;
  }
  .gain {
    stroke: var(--text-muted);
    stroke-width: 1;
    stroke-dasharray: 3 2;
  }
  .glow {
    opacity: 0.3;
    filter: blur(2px);
  }
  .peak {
    stroke: var(--text);
    stroke-width: 1.5;
    opacity: 0.8;
  }
</style>
