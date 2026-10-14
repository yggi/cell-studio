<script lang="ts" module>
  /**
   * How the sky is lit (docs/notes/tower-sky.md, the options): `mix` (the owner's), half its out's tint and half the
   * sky's own colour at that height; `tint`, all its tint; `rainbow`, all the sky's (the spire alone in its tint).
   */
  export type SkyMode = 'tint' | 'rainbow' | 'mix';
  export const SKY_MODES: readonly SkyMode[] = ['tint', 'rainbow', 'mix'];
</script>

<script lang="ts">
  /**
   * The audible sky (the tower layout, docs/notes/tower-sky.md): behind the graph, the audible stratum of the tower
   * (20 Hz … 20 kHz, on the graph's own scale: towerlayout.ts) is a muted rainbow, a band a semitone in its note's
   * colour, as the strip at the right is. Each socket into the sound card stands in it as an antenna spire: a mast at its
   * x, its levels as bars out from the mast at their own heights (the left channel to the left, the right to the right),
   * from its lowest sounding band to its highest. What it sends lights the sky: each band a glow out from the spire, as
   * far and as bright as it is loud, in its source's note's colour, as its socket and its wire are (`outRgb`). Stopped: its partials at rest, faint; playing,
   * what it sounds now. Drawn in the screen's coordinates, under the graph.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { onDestroy, onMount } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { bandFreq, bandHue, bandOctave, C0 } from '../layout/spectrum';
  import { towerAt, towerY } from '../layout/towerlayout';
  import { onFrames } from '../audio/ticker';
  import { hslRgb, noteHsl } from './theme';
  import { heard, noteHz, outRgb } from './heard';
  import { drawSpire, spireOf } from './spire';

  let {
    spires,
    viewport,
    zone = 0,
    mode = 'mix',
  }: {
    /** Each socket: where it stands (the graph's coordinates, its centre) and whose sound it is. */
    spires: readonly { id: string; x: number; y: number; source: string }[];
    viewport: Viewport;
    /** The neutral zone between the structure and the audible (decades: towerlayout.ts towerY). */
    zone?: number;
    mode?: SkyMode;
  } = $props();

  const ctx = getGraphContext();
  const BANDS = 120;
  // (drawn at half the screen's resolution: a glow, soft anyway)
  const RES = 0.5;
  let w = $state(0);
  let h = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  // (the spires on a canvas of their own, at the screen's resolution: dots and hairlines, sharp)
  let crisp = $state<HTMLCanvasElement>();
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  // (the light, a layer of its own: softened before it is laid over the sky)
  let light: HTMLCanvasElement | undefined;

  const band = (b: number) => Math.log10(bandFreq(b, BANDS));
  const yOf = (d: number) => towerY(d, zone) * viewport.zoom + viewport.y;
  const sx = (x: number) => x * viewport.zoom + viewport.x;

  // (each band its note's colour by its octave: full in the fourth, darker below, brighter above)
  const hues = Array.from({ length: BANDS }, (_, b) => hslRgb(...noteHsl(bandHue(b, BANDS), false, bandOctave(b, BANDS))));
  const mixed = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const css = (c: readonly number[], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g || !w || !h) return;
    g.setTransform(RES, 0, 0, RES, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    const half = Math.max(0.5, (towerY(band(1), zone) - towerY(band(0), zone)) * viewport.zoom * 0.5);
    const audible = (b: number) => {
      const f = bandFreq(b, BANDS);
      return f >= 20 && f <= 20000;
    };
    // the sky: the muted rainbow, a band a semitone
    for (let b = 0; b < BANDS; b++) {
      if (!audible(b)) continue;
      const y = yOf(band(b));
      if (y < -half || y > h + half) continue;
      g.fillStyle = css(hues[b], 0.09);
      g.fillRect(0, y - half, w, 2 * half);
    }
    // under it, behind the structure, the rainbow goes on: a rate's octaves in a pitch's colours, fainter
    const lowest = towerAt((h - viewport.y) / viewport.zoom);
    for (let k = Math.floor(12 * Math.log2(10 ** lowest / C0)); ; k++) {
      const d = Math.log10(C0 * 2 ** (k / 12));
      if (d >= Math.log10(20)) break;
      const y0 = yOf(d + Math.log10(2) / 24);
      const y1 = yOf(d - Math.log10(2) / 24);
      if (y1 < 0) continue;
      g.fillStyle = css(hslRgb(...noteHsl((((k % 12) + 12) % 12) * 30, false, Math.floor(k / 12) - 4)), 0.08);
      g.fillRect(0, y0, w, y1 - y0);
    }
    // its edge: where the audible begins
    const floor = yOf(Math.log10(20));
    const fade = g.createLinearGradient(0, floor, 0, floor + 40);
    fade.addColorStop(0, css(hues[0], 0.05));
    fade.addColorStop(1, css(hues[0], 0));
    g.fillStyle = fade;
    g.fillRect(0, floor, w, 40);
    // the light each spire sends, added (the sky brightens where several reach), into a layer of its own, then softened
    // and laid over the sky
    const sky = g;
    if (!light || light.width !== canvas!.width || light.height !== canvas!.height) {
      light = document.createElement('canvas');
      light.width = canvas!.width;
      light.height = canvas!.height;
    }
    const lg = light.getContext('2d')!;
    lg.setTransform(RES, 0, 0, RES, 0, 0);
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, w, h);
    lg.globalCompositeOperation = 'lighter';
    const reach = 1100 * viewport.zoom;
    const masts: { x: number; hz: number | null; tint: readonly number[]; l: Float32Array; r: Float32Array; rest: boolean; dim: boolean }[] = [];
    for (const s of spires) {
      const x = sx(s.x);
      if (x < -reach || x > w + reach) continue;
      const dim = nodeState(ctx, `cell:${s.source}`) === 'off';
      const { left, right, rest } = heard(ctx, s.source, BANDS);
      const tint = outRgb(ctx, s.source);
      let lo = -1;
      for (let b = 0; b < BANDS; b++) {
        const v = Math.max(left[b], right[b]);
        if (!audible(b) || v <= 0.02) continue;
        if (lo < 0) lo = b;
        const y = yOf(band(b));
        if (y < -half || y > h + half) continue;
        const colour = !tint || mode === 'rainbow' ? hues[b] : mode === 'mix' ? mixed(tint, hues[b], 0.5) : tint;
        for (const [side, lv] of [
          [-1, left[b]],
          [1, right[b]],
        ] as const) {
          if (lv <= 0.04 || dim) continue;
          const a = (rest ? 0.35 : 0.7) * lv * lv + (rest ? 0.08 : 0.25) * lv;
          const len = (0.25 + 0.75 * lv) * reach;
          const grad = lg.createLinearGradient(x, 0, x + side * len, 0);
          grad.addColorStop(0, css(colour, a));
          grad.addColorStop(0.3, css(colour, a * 0.5));
          grad.addColorStop(1, css(colour, 0));
          lg.fillStyle = grad;
          lg.fillRect(side < 0 ? x - len : x, y - half, len, 2 * half);
        }
      }
      if (lo >= 0) masts.push({ x, hz: noteHz(ctx, s.source), tint, l: left, r: right, rest, dim });
    }
    sky.setTransform(1, 0, 0, 1, 0, 0);
    sky.globalCompositeOperation = 'lighter';
    // (softened over a few semitones, up and down)
    sky.filter = `blur(${Math.max(2, 3 * half * RES)}px)`;
    sky.drawImage(light, 0, 0);
    sky.drawImage(light, 0, 0);
    sky.filter = 'none';
    sky.setTransform(RES, 0, 0, RES, 0, 0);
    // the spires over the light: its fundamental a big dot, a hairline up its range, a dot a partial (spire.ts)
    const t = crisp?.getContext('2d');
    if (!t) return;
    t.setTransform(dpr, 0, 0, dpr, 0, 0);
    t.clearRect(0, 0, w, h);
    for (const m of masts) {
      const s = spireOf(
        m.l.map((v, b) => Math.max(v, m.r[b] ?? 0)),
        m.hz,
        BANDS,
      );
      if (s) drawSpire(t, m.x, (b) => yOf(band(b)), s, Math.max(4, 14 * viewport.zoom), m.tint, m.dim ? 0.3 : m.rest ? 0.7 : 1);
    }
  }

  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, spires, mode, w, h, ctx.program, ctx.shifts, ctx.state, ctx.muted, canvas, crisp];
    draw();
  });
  let stop = () => {};
  onMount(
    () =>
      (stop = onFrames(
        () => ctx.state !== 'stopped' && draw(),
        () => 33,
      )),
  );
  onDestroy(() => stop());
</script>

<div class="sky" bind:clientWidth={w} bind:clientHeight={h} data-sky={mode}>
  {#if w && h}
    <canvas bind:this={canvas} width={Math.ceil(w * RES)} height={Math.ceil(h * RES)} style:width="{w}px" style:height="{h}px"></canvas>
    <canvas class="crisp" bind:this={crisp} width={Math.ceil(w * dpr)} height={Math.ceil(h * dpr)} style:width="{w}px" style:height="{h}px"></canvas>
  {/if}
</div>

<style>
  .sky {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  canvas {
    display: block;
  }
  .crisp {
    position: absolute;
    inset: 0;
  }
</style>
