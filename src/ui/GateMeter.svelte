<script lang="ts">
  /**
   * A gate drawn as a level meter (#234, docs/language/mix.md: a gate): a bar for each note its trigger sounds now,
   * side by side for a chord, in the note's colour as the trigger's own wheel colours it, as tall as `velocity=` says
   * (full without one). `gate=` is the ceiling: how far the bars may rise now (the part above it ghosted). A rest, no bar.
   * At rest the heads are at time 0, so it shows the first step.
   */
  import { cellView } from '../layout/cellview';
  import { gateBars, gateOf } from '../layout/gate';
  import { wheelGeometry } from '../layout/wheel';
  import { valuesAt } from '../engine/values';
  import { getGraphContext } from './context';
  import { fillColour } from './edgeStyle';

  let { name, size = 128 }: { name: string; size?: number } = $props();
  const ctx = getGraphContext();
  const geo = $derived(wheelGeometry(size));
  const c = $derived(geo.c);
  const gate = $derived(gateOf(ctx.program, name));
  const cell = $derived(ctx.program.cells.get(name));
  // (the trigger's steps as its own wheel draws them: their colours, chords as several bands)
  const view = $derived(gate ? cellView(ctx.program, gate.trigger, ctx.shifts, false) : null);
  const steps = $derived(gate ? Math.max(1, ctx.program.cells.get(gate.trigger)?.steps ?? 1) : 1);
  const level = (cellName: string | null | undefined): number => {
    if (!cellName) return 1;
    const v = valuesAt(ctx.program, ctx.shifts, cellName, ctx.heads.seconds)[0];
    return v === undefined ? 1 : Math.max(0, Math.min(1, v));
  };
  const velocityCell = $derived(typeof cell?.params.velocity === 'string' && ctx.program.cells.has(cell.params.velocity) ? cell.params.velocity : null);
  // the notes sounding now: the trigger's step under its playhead, a band for each (a rest has none)
  const notes = $derived.by(() => {
    if (!gate || !view) return [];
    const local = ctx.heads.cells.get(gate.trigger)?.local ?? 0;
    const t = (((local / steps) % 1) + 1) % 1;
    const seg = view.segments.find((s) => t >= s.t0 - 1e-9 && t < s.t1 - 1e-9);
    return (seg?.bands ?? []).filter((b) => b.kind === 'pitch' || b.kind === 'level');
  });
  // (a meter inside the wheel's disc)
  const bars = $derived(gate ? gateBars(size, notes.length, level(velocityCell), level(gate.open)) : null);
</script>

<svg data-wheel="gate" width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="&{name}: a gate, its notes as bars">
  <circle class="disc" cx={c} cy={c} r={geo.rDisc} />
  {#if bars}
    <rect class="well" x={bars.x} y={bars.top} width={bars.width} height={bars.height} rx={Math.max(1, size / 64)} />
    {#if bars.ceiling < 1}<line class="ceiling" x1={bars.x} x2={bars.x + bars.width} y1={bars.yOf(bars.ceiling)} y2={bars.yOf(bars.ceiling)} />{/if}
    {#each bars.bars as b, i (i)}
      <!-- (as tall as velocity says, ghosted above the gate's ceiling) -->
      <rect class="ghost" x={b.x} y={bars.yOf(b.velocity)} width={b.width} height={bars.yOf(0) - bars.yOf(b.velocity)} fill={fillColour(notes[i])} />
      <rect class="bar" x={b.x} y={bars.yOf(b.level)} width={b.width} height={bars.yOf(0) - bars.yOf(b.level)} fill={fillColour(notes[i])} />
    {/each}
  {/if}
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
  .ghost {
    opacity: 0.25;
  }
  .ceiling {
    stroke: var(--text);
    stroke-width: 1.5;
    stroke-dasharray: 2 2;
    opacity: 0.8;
  }
</style>
