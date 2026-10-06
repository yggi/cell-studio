<script lang="ts">
  import { fmWave } from '../engine/fm';
  /** show=wave: one cycle of a voice's waveform, in a disc. */
  import { waveform } from '../engine/wave';
  import { codeShifts } from '../engine/program';
  import { noteName } from '../theory/modes';
  import { getGraphContext } from './context';
  import { fitFont, hubMax } from '../layout/dial';
  import { wheelGeometry } from '../layout/wheel';

  let { name, size = 120 }: { name: string; size?: number } = $props();
  const ctx = getGraphContext();
  const cell = $derived(ctx.program.cells.get(name));
  // a built-in source (s=): its own shape; otherwise the braid's waveform
  const BUILT_IN: Record<string, (x: number) => number> = {
    sine: (x) => Math.sin(2 * Math.PI * x),
    tri: (x) => (x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4),
    saw: (x) => 2 * x - 1,
    square: (x) => (x < 0.5 ? 1 : -1),
    pulse: (x) => (x < 0.25 ? 1 : -1),
  };
  const geo = $derived(wheelGeometry(size));
  const note = $derived(cell ? noteName(cell.freq) : '');
  const noteFont = $derived(fitFont(size * 0.4, note.length, hubMax(size, 12)));
  const points = $derived.by(() => {
    let w: Float32Array;
    const src = cell?.params.s === undefined ? null : String(cell.params.s);
    try {
      // an FM voice: its modulated wave (at its brightest), not its carrier's
      if (typeof cell?.params.fm === 'string') w = fmWave(ctx.program, name, 160);
      else if (src && BUILT_IN[src]) w = Float32Array.from({ length: 96 }, (_, i) => BUILT_IN[src](i / 95));
      else if (src) w = Float32Array.from({ length: 96 }, (_, i) => Math.sin(i * 12.9898) * 0.8); // noise
      else w = waveform(ctx.program, name, codeShifts(ctx.program), 96);
    } catch {
      return '';
    }
    const c = size / 2;
    const width = size * 0.72;
    const height = size * 0.3;
    return Array.from(w, (v, i) => `${(c - width / 2 + (i / (w.length - 1)) * width).toFixed(1)},${(c - v * height).toFixed(1)}`).join(' ');
  });
</script>

<svg data-wheel="wave" width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="&{name}: one cycle of its waveform">
  <circle class="disc" cx={geo.c} cy={geo.c} r={geo.rDisc} />
  <line class="axis" x1={size * 0.14} y1={size / 2} x2={size * 0.86} y2={size / 2} />
  <polyline class="wave" {points} />
  {#if noteFont}<text x={geo.c} y={size * 0.84} style:font-size="{noteFont}px">{note}</text>{/if}
</svg>

<style>
  .disc {
    fill: var(--wheel-disc);
  }
  .axis {
    stroke: var(--wheel-tick);
    stroke-width: 1;
  }
  .wave {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.5;
    stroke-linejoin: round;
  }
  text {
    text-anchor: middle;
    font: 700 12px var(--font-ui);
    fill: var(--text-muted);
  }
</style>
