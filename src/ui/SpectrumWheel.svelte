<script lang="ts">
  /**
   * A wheel that doesn't spin: a spectral waterfall, for a voice, a mix or the
   * sound card. Left channel on the left half, right on the right; 20 Hz meets
   * at the bottom, 20 kHz at the top; the newest frame at the hub, flowing
   * outward. Colour is frequency (red → violet), brightness is level.
   * At rest it shows the profile (the partials it would make); pressing play
   * clears it, and live frames fill it from the hub.
   */
  import { onDestroy, onMount } from 'svelte';
  import { getGraphContext } from './context';
  import { bandFreq, bandHue, bandsFromFFT, hslToRgb, restingProfile, wheelLUT } from '../layout/spectrum';
  import { freqHue, gridName } from '../engine/compile';
  import { noteName } from '../theory/modes';
  import { DOUGH_SOURCES } from '../engine/dough-params';
  import { load, watchLoad } from '../audio/load';

  /** hub: what the hub says; without it, the note a voice sounds now (at rest, its pitch 0). */
  let { name, size = 120, hub: fixed = null }: { name: string; size?: number; hub?: { big: string; small: string } | null } = $props();
  const ctx = getGraphContext();

  const BANDS = 120; // a semitone each, C0 … B9
  const FRAMES = 18;
  // (the wheel is a soft field of colour: 1.5 × the layout size is plenty, and 3/4 the pixels of 2 ×)
  const scale = typeof devicePixelRatio === 'number' ? Math.min(1.5, devicePixelRatio) : 1;
  // The canvas is drawn at the size it is seen: the graph's zoom shrinks a wheel to a few dozen pixels, and
  // painting (and analysing) the full size for that is wasted. `seen` is on-screen size / layout size,
  // measured twice a second; the canvas steps by 16 px so a pinch doesn't rebuild the lookup each frame.
  let seen = $state(1);
  const px = $derived(Math.max(32, Math.min(Math.round(size * scale), Math.ceil((size * seen * scale) / 16) * 16)));
  const lut = $derived(wheelLUT(px, px * 0.24, px * 0.47, BANDS, FRAMES));

  // history[side][frame][band], frame 0 newest
  const history = new Float32Array(2 * FRAMES * BANDS);
  // each band the colour of its note on the voice's own grid (a rainbow per period, from its pitch 0);
  // mixes and the sound card hear many grids: the 12-tone rainbow, C red. Dark → bright by level.
  const LEVELS = 64;
  const cell = $derived(ctx.program.cells.get(name));
  const palette = $derived.by(() => {
    const out = new Uint8ClampedArray(BANDS * LEVELS * 3);
    const voice = cell?.voice ?? false;
    for (let b = 0; b < BANDS; b++) {
      const f = bandFreq(b, BANDS);
      const hue = (voice ? freqHue(ctx.program, name, f) : null) ?? bandHue(b, BANDS);
      // the colouring rule: C4 … C5 the natural range, full colour; other octaves muted, lighter above,
      // darker below
      const ratio = f / 261.63;
      const oct = ratio <= 2.0001 && ratio >= 1 ? 0 : Math.floor(Math.log2(ratio));
      const o = Math.max(-3, Math.min(3, oct));
      const sat = o === 0 ? 0.9 : 0.9 * (0.6 - 0.1 * (Math.abs(o) - 1));
      for (let i = 0; i < LEVELS; i++) {
        const t = Math.pow(i / (LEVELS - 1), 0.6); // lift quiet partials
        const [r, g, bl] = hslToRgb(hue, sat, Math.max(0.03, Math.min(0.85, 0.06 + 0.5 * t + o * 0.06 * t)));
        out.set([r, g, bl], (b * LEVELS + i) * 3);
      }
    }
    return out;
  });

  // the hub: the note sounding now (at rest, the voice's pitch 0); noise just says what it is
  const noise = $derived.by(() => {
    const src = cell?.params.s;
    const kind = src === undefined ? null : DOUGH_SOURCES[String(src)];
    return kind === 'white' || kind === 'pink' || kind === 'brown' ? kind : null;
  });
  let sounding = $state<number | null>(null);
  // on a grid other than 12 to the octave: the position on it, and the nearest 12-tone note in cents
  const onGrid = $derived(!fixed && !noise && cell?.voice ? gridName(ctx.program, name, sounding ?? cell.freq) : null);
  const hub = $derived(fixed ? fixed.big : (noise ?? (onGrid ? String(onGrid.position) : noteName(sounding ?? cell?.freq ?? 0))));
  const small = $derived(fixed?.small ?? (onGrid ? `${onGrid.nearest} ${onGrid.cents >= 0 ? '+' : '−'}${Math.abs(onGrid.cents)}¢` : ''));
  const title = $derived(
    onGrid ? `&${onGrid.grid} ${onGrid.position} · nearest 12-tone ${onGrid.nearest}, ${onGrid.cents >= 0 ? '+' : '−'}${Math.abs(onGrid.cents)} cents` : undefined,
  );

  let canvas: HTMLCanvasElement;
  let image: ImageData | null = null;
  let raf = 0;
  let last = 0;

  function fillResting() {
    if (!ctx.program.cells.get(name)) return;
    const { left, right } = restingProfile(ctx.program, name, ctx.shifts, BANDS);
    for (let f = 0; f < FRAMES; f++) {
      history.set(left, (0 * FRAMES + f) * BANDS);
      history.set(right, (1 * FRAMES + f) * BANDS);
    }
  }

  function push(left: Float32Array, right: Float32Array) {
    for (const [side, bands] of [[0, left], [1, right]] as const) {
      const base = side * FRAMES * BANDS;
      history.copyWithin(base + BANDS, base, base + (FRAMES - 1) * BANDS); // age everything one frame inward
      history.set(bands, base);
    }
  }

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g) return;
    // read the reactive values once a frame, not once a pixel
    const size = px;
    const map = lut;
    const pal = palette;
    if (!image || image.width !== size) image = g.createImageData(size, size);
    const d = image.data;
    for (let i = 0; i < map.length; i++) {
      const k = map[i];
      if (k < 0) {
        d[i * 4 + 3] = 0;
        continue;
      }
      const p = ((k % BANDS) * LEVELS + Math.round(history[k] * 63)) * 3;
      d[i * 4] = pal[p];
      d[i * 4 + 1] = pal[p + 1];
      d[i * 4 + 2] = pal[p + 2];
      d[i * 4 + 3] = 255;
    }
    g.putImageData(image, 0, 0);
  }

  let wasLive = false;
  // only a wheel that can be seen does any work: off screen, in the hidden tab, or with the page in the
  // background it reads no analysis and paints nothing (dozens of wheels, each analysing its voice every
  // frame, kept the page too busy to feed the sound)
  let visible = true;
  let quiet = 0; // frames of silence in a row
  let shown = true;
  let checked = -1e9;
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    // (a wheel seen small — the graph zoomed out to take in a whole piece — is read less often: every read of
    // its analysers is a Fourier transform, and a few dozen pixels can't show 15 a second)
    const small = size * seen < 56 ? 3 : size * seen < 90 ? 2 : 1;
    if (t - last < 66 * load.scale * small * (quiet > FRAMES ? 2 : 1)) return; // ~15 a second: plenty for a spectrum (fewer when the page is busy)
    last = t;
    // (in the hidden tab the box is still in view, just not shown: ask the element itself — twice a
    // second, not every frame: the question is not free)
    if (t - checked > 500) {
      checked = t;
      const el = canvas as HTMLCanvasElement & { checkVisibility?: (o?: object) => boolean };
      shown = !el.checkVisibility || el.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const w = el.getBoundingClientRect().width;
      if (w > 0 && Math.abs(w / size - seen) > 0.1 * seen) seen = w / size;
    }
    if (!shown) return;
    const playing = !!ctx.live;
    if (playing !== wasLive) {
      wasLive = playing;
      // play: start from an empty wheel; stop: back to the profile
      if (playing) (history.fill(0), (quiet = 0));
      else fillResting();
      draw();
    }
    const live = playing ? ctx.spectrum(name) : null;
    sounding = playing && !fixed ? ctx.note(name) : null;
    if (live) {
      const l = bandsFromFFT(live.left, live.sampleRate, BANDS);
      const r = bandsFromFFT(live.right, live.sampleRate, BANDS);
      // a wheel that has been silent for its whole history is blank already: nothing to age or paint
      if (l.some((v) => v > 0) || r.some((v) => v > 0)) quiet = 0;
      else if (quiet <= FRAMES) quiet++;
      if (quiet <= FRAMES) {
        push(l, r);
        draw();
      }
    }
  }

  // at rest (and whenever the voice changes), show its own partials
  $effect(() => {
    void ctx.program;
    void ctx.shifts;
    if (!ctx.live) {
      fillResting();
      draw();
    }
  });

  // (a canvas that changes size is cleared: paint it again from the history)
  $effect(() => {
    void px;
    if (canvas) draw();
  });

  let watch: IntersectionObserver | null = null;
  onMount(() => {
    fillResting();
    draw();
    watchLoad();
    raf = requestAnimationFrame(frame);
    if (typeof IntersectionObserver !== 'undefined') {
      watch = new IntersectionObserver((es) => (visible = es.some((e) => e.isIntersecting)));
      watch.observe(canvas);
    }
  });
  onDestroy(() => {
    cancelAnimationFrame(raf);
    watch?.disconnect();
  });
</script>

<div class="wheel" style="width: {size}px; height: {size}px">
  <canvas bind:this={canvas} width={px} height={px} style="width: {size}px; height: {size}px"></canvas>
  <span class="note" class:long={hub.length > 4} {title}>{hub}{#if small}<small>{small}</small>{/if}</span>
</div>

<style>
  .wheel {
    position: relative;
    border-radius: 50%;
    background: var(--wheel-disc);
  }
  canvas {
    display: block;
  }
  .note {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 44%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font: 700 16px var(--font-ui);
    color: var(--text);
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .note.long {
    font-size: 12px;
  }
  .note small {
    display: block;
    font: 500 10px var(--font-ui);
    color: var(--text-muted);
    text-align: center;
  }
</style>
