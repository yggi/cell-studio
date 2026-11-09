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
  // (and a frame's, most, all bands together, the bands that stand out most first: Bach 847's synthesizers light ~290
  // a frame; a piece louder across more bands is held to this many)
  const GLINTS_FRAME = 320;
  // (how fast the light follows the sound, s: rising, falling)
  const RISE = 0.06;
  const FALL = 0.7;
  // (how often the sky is drawn playing, ms: ~17 a second, as often as its slow drift and twinkle need — each draw is
  // the whole sky painted and composited again, most of its cost; stretched when the page struggles)
  const EVERY = 60;
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
  // (an arc and a gradient each would cost far more); the colours quantised, so there are a few dozen at most. A near
  // glint, bright, is a star (`flare`): the same dot in the middle of a canvas twice as wide, four thin rays out from it.
  const sprites = new Map<number, HTMLCanvasElement>();
  function sprite(c: readonly number[], flare = false): HTMLCanvasElement {
    const q = c.map((v) => Math.min(15, Math.max(0, Math.round(v / 17))));
    const key = (((q[0] << 8) | (q[1] << 4) | q[2]) << 1) | (flare ? 1 : 0);
    let s = sprites.get(key);
    if (s) return s;
    s = document.createElement('canvas');
    const n = flare ? 32 : 16;
    s.width = s.height = n;
    const g = s.getContext('2d')!;
    const rgb = q.map((v) => v * 17);
    const m = n / 2;
    const grad = g.createRadialGradient(m, m, 0, m, m, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.18, css(mixed(rgb, [255, 255, 255], 0.5), 0.9));
    grad.addColorStop(0.45, css(rgb, 0.35));
    grad.addColorStop(1, css(rgb, 0));
    g.fillStyle = grad;
    g.fillRect(m - 8, m - 8, 16, 16);
    if (flare) {
      // (the rays: thin, white at the heart, its colour out to their ends, fading)
      g.globalCompositeOperation = 'lighter';
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as const) {
        const ray = g.createLinearGradient(m - dx * m, m - dy * m, m + dx * m, m + dy * m);
        ray.addColorStop(0, css(rgb, 0));
        ray.addColorStop(0.5, css(mixed(rgb, [255, 255, 255], 0.6), 0.7));
        ray.addColorStop(1, css(rgb, 0));
        g.fillStyle = ray;
        if (dx) g.fillRect(0, m - 0.6, n, 1.2);
        else g.fillRect(m - 0.6, 0, 1.2, n);
      }
    }
    sprites.set(key, s);
    return s;
  }

  // a spire's spike: full height at the mast, narrowing to its tip, bright at the mast and fading out — one small canvas
  // a colour and side, drawn stretched to its length and height (a gradient and a path each, a dozen times a second
  // for every band of every spire, were most of the spires' cost)
  const spikes = new Map<number, HTMLCanvasElement>();
  const SPIKE = { w: 64, h: 12 };
  function spike(c: readonly number[], side: -1 | 1): HTMLCanvasElement {
    const q = c.map((v) => Math.min(31, Math.max(0, Math.round(v / 8.25))));
    const key = (((q[0] << 10) | (q[1] << 5) | q[2]) << 1) | (side > 0 ? 1 : 0);
    let s = spikes.get(key);
    if (s) return s;
    s = document.createElement('canvas');
    s.width = SPIKE.w;
    s.height = SPIKE.h;
    const g = s.getContext('2d')!;
    const rgb = q.map((v) => Math.round(v * 8.25));
    const [x0, x1] = side > 0 ? [0, SPIKE.w] : [SPIKE.w, 0];
    const grad = g.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, css(rgb, 1));
    grad.addColorStop(1, css(rgb, 0.2));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x0, 0);
    g.lineTo(x1, SPIKE.h / 3);
    g.lineTo(x1, (2 * SPIKE.h) / 3);
    g.lineTo(x0, SPIKE.h);
    g.fill();
    spikes.set(key, s);
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
  const level = new Float32Array(BANDS);
  const tint = new Float32Array(BANDS * 3);
  function listen(now: number, playing: boolean) {
    const dt = last ? Math.min(0.5, (now - last) / 1000) : 1;
    last = playing ? now : 0;
    // (stopped, the light is what rests, at once; playing, it follows)
    const up = playing ? 1 - Math.exp(-dt / RISE) : 1;
    const down = playing ? 1 - Math.exp(-dt / FALL) : 1;
    level.fill(0);
    tint.fill(0);
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
          for (let i = 0; i < 3; i++) tint[b * 3 + i] += c[i] * v;
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
      const top = Math.max(tint[b * 3], tint[b * 3 + 1], tint[b * 3 + 2]);
      if (top > 0) for (let i = 0; i < 3; i++) skyTint[b][i] = (tint[b * 3 + i] * 255) / top;
    }
    return masts;
  }

  // The light: each band a line across the whole sky, a narrow core in a wider glow, drifting brighter and dimmer along
  // it. Drawn as numbers into a picture `COLS` wide and as tall as the sky (a column a stretch of the sky's width), then
  // stretched over the sky in one draw, smoothly: one draw a frame for all of them, not a gradient and a fill a band.
  const COLS = 8;
  let lightCols: HTMLCanvasElement | null = null;
  let lightPixels: ImageData | null = null;
  let lightSum = new Float32Array(0);
  const colourOf = Array.from({ length: BANDS }, () => [255, 255, 255]);
  const drift = new Float32Array(COLS);
  function drawLight(g: CanvasRenderingContext2D, t: number, half: number) {
    const H = Math.max(1, Math.ceil(h * RES));
    if (!lightCols || !lightPixels || lightCols.height !== H) {
      lightCols = document.createElement('canvas');
      lightCols.width = COLS;
      lightCols.height = H;
      lightPixels = new ImageData(COLS, H);
      lightSum = new Float32Array(COLS * H * 3);
    } else lightSum.fill(0);
    // (the line as drawn before, `line` px of light across: its core a gaussian of about half that, at least a pixel of
    // the picture, its glow three times as wide and a quarter as bright, the two together as much light as the line)
    const line = Math.max(0.6, half * 0.4) * RES;
    const core = Math.max(0.6, line * 0.5);
    const glow = core * 3;
    const scale = line / (Math.sqrt(2 * Math.PI) * (core + 0.25 * glow));
    // (the rows that have light: only they are drawn over the sky)
    let lo = H;
    let hi = -1;
    for (let b = 0; b < BANDS; b++) {
      const v = sky[b];
      if (v <= 0.015 || !audible(b)) continue;
      const y = yOf(band(b)) * RES;
      if (y < -3 * glow || y > H + 3 * glow) continue;
      const c = colourOf[b];
      const a = (0.03 + 0.32 * v) * v * v * scale;
      for (let k = 0; k < COLS; k++) drift[k] = a * (0.55 + 0.45 * Math.sin(t * (0.21 + 0.13 * hash(b, k, 1)) + 6.3 * hash(b, k, 2)));
      const r0 = Math.max(0, Math.floor(y - 3 * glow));
      const r1 = Math.min(H - 1, Math.ceil(y + 3 * glow));
      lo = Math.min(lo, r0);
      hi = Math.max(hi, r1);
      for (let r = r0; r <= r1; r++) {
        const d = r + 0.5 - y;
        const w = Math.exp((-d * d) / (2 * core * core)) + 0.25 * Math.exp((-d * d) / (2 * glow * glow));
        const at = r * COLS * 3;
        for (let k = 0; k < COLS; k++) {
          const s = drift[k] * w;
          lightSum[at + k * 3] += c[0] * s;
          lightSum[at + k * 3 + 1] += c[1] * s;
          lightSum[at + k * 3 + 2] += c[2] * s;
        }
      }
    }
    if (hi < lo) return;
    // (light added up, as a picture drawn with `lighter`: its colour at full, and how much of it, its alpha)
    const px = lightPixels.data;
    for (let i = 0, j = 0; i < lightSum.length; i += 3, j += 4) {
      const top = Math.max(lightSum[i], lightSum[i + 1], lightSum[i + 2]);
      if (top <= 0.5) {
        px[j + 3] = 0;
        continue;
      }
      const k = 255 / top;
      px[j] = lightSum[i] * k;
      px[j + 1] = lightSum[i + 1] * k;
      px[j + 2] = lightSum[i + 2] * k;
      px[j + 3] = Math.min(255, top);
    }
    lightCols.getContext('2d')!.putImageData(lightPixels, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(lightCols, 0, lo, COLS, hi + 1 - lo, 0, lo / RES, w, (hi + 1 - lo) / RES);
  }

  // (the bands that stand out most first: where a frame's glints go when they are rationed)
  const byStanding = Array.from({ length: BANDS }, (_, b) => b);

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
    // (each band's colour now: its outs' tint, the rainbow's, or half each)
    for (let b = 0; b < BANDS; b++) {
      const k = mode === 'tint' ? 1 : mode === 'rainbow' ? 0 : 0.5;
      for (let i = 0; i < 3; i++) colourOf[b][i] = vivid[b][i] * (1 - k) + skyTint[b][i] * k;
    }
    drawLight(g, t, half);
    // its glints: as many as it stands out, loud (a tone's partials: stars where it sounds), and a band only faintly
    // heard, or noise (a drum's, an analyser's floor), next to none: a haze of lines (each its own threshold, so they come
    // and go one by one, smoothly), each at a depth: the near ones bigger and brighter and drifting faster than the far
    // ones, the nearest and brightest a star; they pan with the graph. At most GLINTS_FRAME a frame, the bands that
    // stand out most first, fewer when the page is struggling, so the sky is never what makes the sound starve.
    let budget = Math.round(GLINTS_FRAME / load.scale);
    const span = w + 40;
    byStanding.sort((a, b) => spark[b] - spark[a]);
    for (const b of byStanding) {
      if (budget <= 0 || spark[b] <= 0.01) break;
      if (sky[b] <= 0.015 || !audible(b)) continue;
      const y = yOf(band(b));
      if (y < -half || y > h + half) continue;
      const v = sky[b];
      const colour = colourOf[b];
      for (let i = 0; i < GLINTS && budget > 0; i++) {
        const need = hash(b, i, 3);
        const on = Math.min(1, (spark[b] * spark[b] - need * 0.6) / 0.1);
        if (on <= 0) continue;
        const depth = 0.35 + 0.65 * hash(b, i, 4);
        const x = ((((hash(b, i, 5) * span + viewport.x + t * (4 + 14 * depth)) % span) + span) % span) - 20;
        const twinkle = 0.5 + 0.5 * Math.sin(t * (0.7 + 1.6 * hash(b, i, 6)) + 6.3 * hash(b, i, 7));
        const a = on * (0.25 + 0.75 * twinkle * twinkle) * (0.35 + 0.65 * depth);
        if (a < 0.03) continue;
        budget--;
        const r = Math.min(7, Math.max(1.2, half * 0.9)) * (0.6 + 0.9 * depth) * (0.8 + 0.4 * v);
        const yy = y + half * 0.5 * (hash(b, i, 8) - 0.5);
        g.globalAlpha = Math.min(1, a);
        // (a near one, bright now: a star, its rays twice its glow's reach)
        if (depth > 0.8 && a > 0.6) g.drawImage(sprite(colour, true), x - 2 * r, yy - 2 * r, 4 * r, 4 * r);
        else g.drawImage(sprite(colour), x - r, yy - r, 2 * r, 2 * r);
      }
    }
    g.globalAlpha = 1;
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
        const lv = m.l[b] ?? 0;
        const rv = m.r[b] ?? 0;
        if (lv > 0.04) {
          c.globalAlpha = (0.55 + 0.45 * lv) * alpha;
          c.drawImage(spike(colour, -1), x - lv * arm, y - bh / 2, lv * arm, bh);
        }
        if (rv > 0.04) {
          c.globalAlpha = (0.55 + 0.45 * rv) * alpha;
          c.drawImage(spike(colour, 1), x, y - bh / 2, rv * arm, bh);
        }
      }
      c.globalAlpha = 1;
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
