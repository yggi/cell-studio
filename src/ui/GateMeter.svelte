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
  import { valuesAt } from '../engine/values';
  import { getGraphContext } from './context';
  import { fillColour } from './edgeStyle';

  let { notes, levels, gain = 1, size = 128, label }: { notes: string | null; levels: readonly string[]; gain?: number; size?: number; label: string } = $props();
  const ctx = getGraphContext();
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  // (the notes' steps as their own wheel draws them: their colours, chords as several bands)
  const view = $derived(notes && ctx.program.cells.has(notes) ? cellView(ctx.program, notes, ctx.shifts, false) : null);
  const steps = $derived(notes ? Math.max(1, ctx.program.cells.get(notes)?.steps ?? 1) : 1);
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
</script>

<svg data-wheel="gate" width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label={label}>
  <circle class="disc" cx={c} cy={c} r={geo.rDisc} />
  <rect class="well" x={bars.x} y={bars.top} width={bars.width} height={bars.height} rx={Math.max(1, size / 64)} />
  {#each bars.bars as b, i (i)}
    <rect class="bar" x={b.x} y={bars.yOf(b.level)} width={b.width} height={bars.yOf(0) - bars.yOf(b.level)} fill={fillColour(now[i])} />
  {/each}
</svg>

<style>
  .disc {
    fill: var(--wheel-disc);
    stroke: var(--wheel-ref);
    stroke-width: 2;
  }
  .well {
    fill: var(--wheel-rest);
  }
</style>
