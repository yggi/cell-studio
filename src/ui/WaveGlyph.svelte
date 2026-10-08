<script lang="ts">
  import { fmWave } from '../engine/fm';
  /**
   * An instrument's, a mix's or a read head's wheel (show=wave, a voice's plain show): its waveform in a disc — stopped, one
   * cycle of it; playing, the sound itself, held still from a rising zero-crossing (as the scope holds it).
   */
  import { onDestroy, onMount } from 'svelte';
  import { onFrames } from '../audio/ticker';
  import { onScreen } from './kit/attach';
  import { waveform } from '../engine/wave';
  import { codeShifts } from '../engine/program';
  import { noteName } from '../theory/modes';
  import { getGraphContext } from './context';
  import { fitFont, hubMax } from '../layout/dial';
  import { wheelGeometry } from '../layout/wheel';

  /** caption: what it says under the wave (a read head: where it reads); a voice says its note. */
  let { name, size = 120, caption = null }: { name: string; size?: number; caption?: string | null } = $props();
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
  const note = $derived(caption ?? (cell ? noteName(cell.freq) : ''));
  const noteFont = $derived(fitFont(size * 0.4, note.length, hubMax(size, 12)));
  const points = $derived.by(() => {
    let w: Float32Array;
    // (a read head or a mix has no cycle of its own: stopped, only its line)
    if (typeof cell?.params.play === 'string' || cell?.mix) return '';
    const src = cell?.params.s === undefined ? null : String(cell.params.s);
    try {
      // an FM voice: its modulated wave (at its brightest), not its carrier's
      if (typeof cell?.params.fm === 'string') w = fmWave(ctx.program, name, 160);
      else if (src && BUILT_IN[src]) w = Float32Array.from({ length: 96 }, (_, i) => BUILT_IN[src](i / 95));
      else if (src)
        w = Float32Array.from({ length: 96 }, (_, i) => Math.sin(i * 12.9898) * 0.8); // noise
      else w = waveform(ctx.program, name, codeShifts(ctx.program), 96);
    } catch {
      return '';
    }
    const c = size / 2;
    const width = size * 0.72;
    const height = size * 0.3;
    return Array.from(w, (v, i) => `${(c - width / 2 + (i / (w.length - 1)) * width).toFixed(1)},${(c - v * height).toFixed(1)}`).join(' ');
  });

  // the sound now, while it plays (~15 a second, only on screen)
  let live = $state('');
  let visible = true;
  let stop = () => {};
  function frame() {
    const w = visible && ctx.playing ? ctx.sound.waveform(name) : null;
    if (!w) {
      if (live) live = '';
      return;
    }
    const n = Math.min(240, w.length >> 1);
    let start = 0;
    for (let i = 1; i < w.length - n; i++)
      if (w[i - 1] < 0 && w[i] >= 0) {
        start = i;
        break;
      }
    let top = 0.02;
    for (let i = start; i < start + n; i++) top = Math.max(top, Math.abs(w[i]));
    const c = size / 2;
    const width = size * 0.72;
    const height = size * 0.3;
    const pts: string[] = [];
    for (let i = 0; i < n; i += 2) pts.push(`${(c - width / 2 + (i / (n - 1)) * width).toFixed(1)},${(c - (w[start + i] / top) * height).toFixed(1)}`);
    live = pts.join(' ');
  }
  onMount(() => (stop = onFrames(frame, () => 66)));
  onDestroy(() => stop());
</script>

<svg {@attach onScreen((v) => (visible = v))} data-wheel="wave" width={size} height={size} viewBox="0 0 {size} {size}" role="img" aria-label="&{name}: its waveform">
  <circle class="disc" cx={geo.c} cy={geo.c} r={geo.rDisc} />
  <line class="axis" x1={size * 0.14} y1={size / 2} x2={size * 0.86} y2={size / 2} />
  <polyline class="wave" class:live={!!live} points={live || points} />
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
  .wave.live {
    stroke-width: 1.8;
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
