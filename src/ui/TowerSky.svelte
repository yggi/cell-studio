<script lang="ts" module>
  /**
   * How the sky is lit (docs/notes/tower-sky.md, the options): `mix` (the owner's), half its out's tint and half the
   * sky's own colour at that height; `tint`, all its tint; `rainbow`, all the sky's (the spire alone in its tint).
   */
  export type SkyMode = 'tint' | 'rainbow' | 'mix';
  export const SKY_MODES: readonly SkyMode[] = ['tint', 'rainbow', 'mix'];

  /** A number in [0, 1) for (a, b, c), the same every time: where a glint is, how deep, how fast it twinkles. */
  function hash(a: number, b: number, c: number): number {
    let h = Math.imul(a + 0x9e37, 0x85ebca6b) ^ Math.imul(b + 0x7f4a, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2f);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
    h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
  }
</script>

<script lang="ts">
  /**
   * The audible sky (the tower layout, docs/notes/tower-sky.md): behind the graph, the audible stratum of the tower
   * (20 Hz … 20 kHz, on the graph's own scale: towerlayout.ts) is a muted rainbow, a band a semitone in its note's
   * colour, as the strip at the right is. Each socket into the sound card stands in it as an antenna spire: a mast at its
   * x, its levels as bars out from the mast at their own heights (the left channel to the left, the right to the right),
   * from its lowest sounding band to its highest. What all of them sound lights the sky: each band a thin line of light
   * across the whole sky and glints strung along it, as bright and as many as the band is loud, in its band's colour
   * and its outs' (`outTint`); the glints twinkle slowly and stand at depths (the far ones small, dim, drifting slower). The light follows the sound smoothly (a quick rise, a slow fall), so a fast piece pulses and a slow
   * one breathes, and nothing blinks. Stopped: the partials at rest, faint and still. Drawn in the screen's
   * coordinates, under the graph; between two draws the layers follow the graph's pan and zoom by a transform, so
   * they stay fixed to it however seldom they are drawn.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { onDestroy, onMount, untrack } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { bandFreq, bandHue, bandOctave, C0 } from '../layout/spectrum';
  import { towerAt, towerY } from '../layout/towerlayout';
  import { load, onFrames } from '../audio/ticker';
  import { hslRgb, litRgb, noteHsl } from './theme';
  import { heard, noteHz, outTint } from './heard';
  import { drawSpire, spireOf } from './spire';

  let {
    spires,
    viewport,
    zone = 0,
    mode = 'mix',
  }: {
    /** Each socket: where it stands (the graph's coordinates, its centre) and whose sound it is. */
    spires: readonly { id: string; x: number; y: number; source: string; section?: readonly number[] | null }[];
    viewport: Viewport;
    /** The neutral zone between the structure and the audible (decades: towerlayout.ts towerY). */
    zone?: number;
    mode?: SkyMode;
  } = $props();

  const ctx = getGraphContext();
  const BANDS = 120;
  // (drawn at half the screen's resolution: lines and glints, soft anyway)
  const RES = 0.5;
  // (a band's glints, most: as many show as the band is loud; fewer when the page is struggling)
  const GLINTS = 24;
  // (how fast the light follows the sound, s: rising, falling)
  const RISE = 0.06;
  const FALL = 0.7;
  // (how often the sky is drawn playing, ms: the glints twinkle smoothly at this; stretched when the page struggles)
  const EVERY = 40;
  // (the spires, the meters, half as often: 12 a second, as they were)
  const SPIRES = 80;
  let w = $state(0);
  let h = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  // (the rainbow under the light, a canvas of its own: drawn when the view moves, not every frame)
  let ground = $state<HTMLCanvasElement>();
  // (the spires on a canvas of their own, at the screen's resolution: dots and hairlines, sharp)
  let crisp = $state<HTMLCanvasElement>();
  let root = $state<HTMLDivElement>();
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;
  // (the light each band sends, smoothed: what all the spires sound, and its colour, the outs' tints by how loud)
  const sky = new Float32Array(BANDS);
  // (and how much of it stands out of its neighbours, smoothed the same: a tone's partials sparkle, noise is a haze)
  const spark = new Float32Array(BANDS);
  const skyTint = Array.from({ length: BANDS }, () => [255, 255, 255]);
  let last = 0;
  // (the views the light and the spires were drawn in: between draws they are moved to the view now by a transform)
  type View = { x: number; y: number; zoom: number };
  let drawn: View | null = null;
  let drawnSpires: View | null = null;
  let spiresAt = -Infinity;

  const band = (b: number) => Math.log10(bandFreq(b, BANDS));
  const yOf = (d: number) => towerY(d, zone) * viewport.zoom + viewport.y;
  const sx = (x: number) => x * viewport.zoom + viewport.x;
  const sy = (y: number) => y * viewport.zoom + viewport.y;
  const audible = (b: number) => {
    const f = bandFreq(b, BANDS);
    return f >= 20 && f <= 20000;
  };

  // (each band its note's colour by its octave: full in the fourth, darker below, brighter above)
  const hues = Array.from({ length: BANDS }, (_, b) => hslRgb(...noteHsl(bandHue(b, BANDS), false, bandOctave(b, BANDS))));
  // (and lit: saturated and bright, its active bands in the sky)
  const vivid = Array.from({ length: BANDS }, (_, b) => litRgb(bandHue(b, BANDS)));
  const mixed = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const css = (c: readonly number[], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

  // a glint: a soft dot, white at its heart, its colour round it — one small canvas a colour, drawn with drawImage
  // (an arc and a gradient each would cost far more); the colours quantised, so there are a few dozen at most
  const sprites = new Map<number, HTMLCanvasElement>();
  function sprite(c: readonly number[]): HTMLCanvasElement {
    const q = c.map((v) => Math.min(15, Math.round(v / 17)));
    const key = (q[0] << 8) | (q[1] << 4) | q[2];
    let s = sprites.get(key);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = s.height = 16;
    const g = s.getContext('2d')!;
    const rgb = q.map((v) => v * 17);
    const grad = g.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.18, css(mixed(rgb, [255, 255, 255], 0.5), 0.9));
    grad.addColorStop(0.45, css(rgb, 0.35));
    grad.addColorStop(1, css(rgb, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, 16, 16);
    sprites.set(key, s);
    return s;
  }

  // the ground, drawn again only when the view moves (not every frame): the sky's rainbow, a band a semitone, on down
  // through the rates behind the structure
  function drawGround() {
    const g = ground?.getContext('2d');
    if (!g || !w || !h) return;
    g.setTransform(RES, 0, 0, RES, 0, 0);
    g.clearRect(0, 0, w, h);
    const half = Math.max(0.5, Math.abs(towerY(band(1), zone) - towerY(band(0), zone)) * viewport.zoom * 0.5);
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
  }

  // what every spire sounds, into the sky's bands, smoothed (a quick rise, a slow fall: it pulses, it doesn't blink),
  // and each spire's levels now, for its mast
  function listen(now: number, playing: boolean) {
    const dt = last ? Math.min(0.5, (now - last) / 1000) : 1;
    last = playing ? now : 0;
    // (stopped, the light is what rests, at once; playing, it follows)
    const up = playing ? 1 - Math.exp(-dt / RISE) : 1;
    const down = playing ? 1 - Math.exp(-dt / FALL) : 1;
    const level = new Float32Array(BANDS);
    const tint = Array.from({ length: BANDS }, () => [0, 0, 0]);
    const masts = [];
    for (const s of spires) {
      const dim = nodeState(ctx, `cell:${s.source}`) === 'off';
      const { left, right, rest } = heard(ctx, s.source, BANDS);
      // (its own colour, steady: its section's, else its base note's — its mast, and its share of the light)
      const own = outTint(ctx.program, s.source, s.section ?? null);
      if (!dim)
        for (let b = 0; b < BANDS; b++) {
          const v = audible(b) ? Math.max(left[b], right[b]) * (rest ? 0.45 : 1) : 0;
          if (v <= 0.02) continue;
          // (several outs on one band light it more, never past full)
          level[b] = 1 - (1 - level[b]) * (1 - v);
          const c = own ?? vivid[b];
          for (let i = 0; i < 3; i++) tint[b][i] += c[i] * v;
        }
      masts.push({ s, dim, rest, tint: own, l: left, r: right });
    }
    for (let b = 0; b < BANDS; b++) {
      const v = level[b];
      sky[b] += (v - sky[b]) * (v > sky[b] ? up : down);
      // (a peak: louder than the bands round it, a few semitones each way)
      let round = 0;
      // (out of the audible, a band counts as this one: the audible's edge is no peak)
      const at = (n: number) => (audible(n) ? (level[n] ?? 0) : v);
      for (let k = 2; k <= 5; k++) round += at(b - k) + at(b + k);
      const p = v * Math.min(1, Math.max(0, 0.2 + 3 * (v - round / 8)));
      spark[b] += (p - spark[b]) * (p > spark[b] ? up : down);
      const sum = tint[b][0] + tint[b][1] + tint[b][2];
      if (sum > 0) {
        const k = 255 / Math.max(tint[b][0], tint[b][1], tint[b][2]);
        skyTint[b] = tint[b].map((c) => c * k);
      }
    }
    return masts;
  }

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g || !w || !h) return;
    const playing = ctx.state !== 'stopped';
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const masts = listen(now, playing);
    const t = playing && !prefersReducedMotion.current ? now / 1000 : 0;
    g.setTransform(RES, 0, 0, RES, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.globalCompositeOperation = 'lighter';
    const half = Math.max(0.5, Math.abs(towerY(band(1), zone) - towerY(band(0), zone)) * viewport.zoom * 0.5);
    // (the glints a band, fewer when the page is struggling, so the sky is never what makes the sound starve)
    const glints = Math.max(6, Math.round(GLINTS / load.scale));
    // (the field the glints wrap round: the sky's width and a margin, so one doesn't pop in at an edge)
    const span = w + 40;
    for (let b = 0; b < BANDS; b++) {
      const v = sky[b];
      if (v <= 0.015 || !audible(b)) continue;
      const y = yOf(band(b));
      if (y < -half || y > h + half) continue;
      const colour = mode === 'tint' ? skyTint[b] : mode === 'rainbow' ? vivid[b] : mixed(vivid[b], skyTint[b], 0.5);
      // the band's line of light, across the whole sky and thinner than its band, brighter where it drifts
      const line = Math.max(0.6, half * 0.4);
      const grad = g.createLinearGradient(0, 0, w, 0);
      for (let k = 0; k <= 4; k++) {
        const n = 0.55 + 0.45 * Math.sin(t * (0.21 + 0.13 * hash(b, k, 1)) + 6.3 * hash(b, k, 2));
        grad.addColorStop(k / 4, css(colour, (0.03 + 0.32 * v) * v * v * n));
      }
      g.fillStyle = grad;
      g.fillRect(0, y - line / 2, w, line);
      // its glints: as many as it stands out, loud (a tone's partials: stars where it sounds), and a band only faintly
      // heard, or noise (a drum's, an analyser's floor), next to none: a haze of lines (each its own threshold, so they
      // come and go one by one, smoothly), each at a
      // depth: the near ones bigger and brighter and drifting faster than the far ones; they pan with the graph
      for (let i = 0; i < glints; i++) {
        const need = hash(b, i, 3);
        const on = Math.min(1, (spark[b] * spark[b] - need * 0.6) / 0.1);
        if (on <= 0) continue;
        const depth = 0.35 + 0.65 * hash(b, i, 4);
        const x = ((((hash(b, i, 5) * span + viewport.x + t * (4 + 14 * depth)) % span) + span) % span) - 20;
        const twinkle = 0.5 + 0.5 * Math.sin(t * (0.7 + 1.6 * hash(b, i, 6)) + 6.3 * hash(b, i, 7));
        const a = on * (0.25 + 0.75 * twinkle * twinkle) * (0.35 + 0.65 * depth);
        if (a < 0.03) continue;
        const r = Math.min(7, Math.max(1.2, half * 0.9)) * (0.6 + 0.9 * depth) * (0.8 + 0.4 * v);
        g.globalAlpha = Math.min(1, a);
        g.drawImage(sprite(colour), x - r, y + half * 0.5 * (hash(b, i, 8) - 0.5) - r, 2 * r, 2 * r);
      }
      g.globalAlpha = 1;
    }
    g.globalCompositeOperation = 'source-over';
    drawn = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
    follow();
    // (playing, the spires every SPIRES ms; stopped, each time)
    if (playing && now - spiresAt < SPIRES * load.scale) return;
    spiresAt = now;
    // the spires over the light: its fundamental a big dot, a hairline up its range, a dot a partial (spire.ts)
    const c = crisp?.getContext('2d');
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const arm = Math.max(18, 60 * viewport.zoom);
    for (const m of masts) {
      const x = sx(m.s.x);
      if (x < -arm || x > w + arm) continue;
      const s = spireOf(
        m.l.map((v, b) => Math.max(v, m.r[b] ?? 0)),
        noteHz(ctx, m.s.source),
        BANDS,
      );
      if (!s) continue;
      const alpha = m.dim ? 0.3 : m.rest ? 0.75 : 1;
      const tint = m.tint ?? [255, 255, 255];
      const section = m.s.section ?? null;
      // its foot: from its socket to its fundamental, wherever the two are (a kit's socket at its lowest drum, its
      // spectrum's lowest partial higher; a melody's socket at its base, its note now elsewhere)
      const foot = yOf(band(s.root));
      c.strokeStyle = css(tint, 0.7 * alpha);
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x, sy(m.s.y));
      c.lineTo(x, foot);
      c.stroke();
      // its spectrum, mirrored about the mast: a spike a band at its height, the left channel left, the right right,
      // each as tall as its band and in its band's colour (the rainbow by octave, dark low and bright high), tinted by
      // the out's section, bright at the mast and fading out to its tip
      const bh = Math.max(2, half * 1.6);
      for (let b = s.root; b <= s.top; b++) {
        const y = yOf(band(b));
        if (y < -half || y > h + half) continue;
        const colour = section ? mixed(hues[b], section, 0.35) : hues[b];
        for (const [side, lv] of [
          [-1, m.l[b] ?? 0],
          [1, m.r[b] ?? 0],
        ] as const) {
          if (lv <= 0.04) continue;
          const len = lv * arm;
          const grad = c.createLinearGradient(x, 0, x + side * len, 0);
          grad.addColorStop(0, css(colour, (0.55 + 0.45 * lv) * alpha));
          grad.addColorStop(1, css(colour, 0.15 * alpha));
          c.fillStyle = grad;
          // (a spike: full height at the mast, narrowing to its tip)
          c.beginPath();
          c.moveTo(x, y - bh / 2);
          c.lineTo(x + side * len, y - bh / 6);
          c.lineTo(x + side * len, y + bh / 6);
          c.lineTo(x, y + bh / 2);
          c.fill();
        }
      }
      drawSpire(
        c,
        x,
        (b) => yOf(band(b)),
        s,
        Math.max(5, 18 * viewport.zoom),
        tint,
        (b) => hues[b]!,
        alpha,
      );
    }
    drawnSpires = { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
    follow();
  }

  // the light and the spires moved from the view they were drawn in to the view now: they stay fixed to the graph
  // while it pans and zooms, between draws (an exact map: a point drawn at s is now at s·k + (t − t₀·k))
  function follow() {
    const move = (from: View | null) => {
      if (!from) return '';
      const k = viewport.zoom / from.zoom;
      const tx = viewport.x - from.x * k;
      const ty = viewport.y - from.y * k;
      return k === 1 && tx === 0 && ty === 0 ? '' : `translate(${tx}px, ${ty}px) scale(${k})`;
    };
    if (canvas) canvas.style.transform = move(drawn);
    if (crisp) crisp.style.transform = move(drawnSpires);
    // (what the sky shows now: the gallery's sky subject measures it against the graph's own transform)
    if (root) {
      root.dataset.view = `${viewport.x},${viewport.y},${viewport.zoom}`;
      root.dataset.audible = `${Math.round(yOf(Math.log10(300)))}`;
    }
  }

  let queued = 0;
  // (stopped, drawn again on the next frame when what it shows moves; until then it follows by its transform)
  const redraw = () => {
    if (queued || typeof requestAnimationFrame === 'undefined') return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      draw();
    });
  };

  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, zone, w, h, ground];
    // (only what is listed: what draw reads, the playheads among it, would draw it again each frame)
    untrack(drawGround);
    untrack(follow);
  });
  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, spires, mode, w, h, ctx.program, ctx.shifts, ctx.state, ctx.muted, canvas, crisp];
    // (only what is listed; and only stopped — playing, the frame loop draws it)
    if (untrack(() => ctx.state) === 'stopped') untrack(redraw);
  });
  $effect(() => {
    void spires;
    // (a socket moved while playing, dragged or the layout settling: its spire follows on the next frame, not the next
    // meter's turn; panning and zooming need no draw, the transform follows)
    if (untrack(() => ctx.state) !== 'stopped') {
      spiresAt = -Infinity;
      untrack(redraw);
    }
  });
  let stop = () => {};
  onMount(
    () =>
      (stop = onFrames(
        () => ctx.state !== 'stopped' && draw(),
        () => EVERY,
      )),
  );
  onDestroy(() => {
    stop();
    if (queued) cancelAnimationFrame(queued);
  });
</script>

<div class="sky" bind:this={root} bind:clientWidth={w} bind:clientHeight={h} data-sky={mode}>
  {#if w && h}
    <canvas class="layer" bind:this={ground} width={Math.ceil(w * RES)} height={Math.ceil(h * RES)} style:width="{w}px" style:height="{h}px"></canvas>
    <canvas class="layer moves" bind:this={canvas} width={Math.ceil(w * RES)} height={Math.ceil(h * RES)} style:width="{w}px" style:height="{h}px"></canvas>
    <canvas class="crisp moves" bind:this={crisp} width={Math.ceil(w * dpr)} height={Math.ceil(h * dpr)} style:width="{w}px" style:height="{h}px"></canvas>
  {/if}
</div>

<style>
  .sky {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }
  canvas {
    display: block;
  }
  .crisp,
  .layer {
    position: absolute;
    inset: 0;
  }
  .moves {
    transform-origin: 0 0;
  }
</style>
