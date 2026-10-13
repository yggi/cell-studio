<script lang="ts" module>
  /** The strip's width (px): folded, always there; opened, with the tower's scale named. */
  export const STRIP = 64;
  export const STRIP_OPEN = 180;
</script>

<script lang="ts">
  /**
   * The tower layout's strip (docs/notes/tower-strip.md): the sound card as one strip at the graph's right, the
   * frequency tower on the graph's own scale (towerlayout.ts: up high, one even log scale, panned and zoomed with the
   * graph), its left half the left channel and its right half the right, mirrored about its centre (mono: the same on
   * both). The audible part is a rainbow, a band a semitone in its note's colour (C red …); under it the pulse and the
   * slow, a decade a tick. What goes into the card shows its spectrum: a bar per band out from the centre, as long as it
   * is loud (all sources together, the piece's spectrum), and at the strip's inner edge each source's connector, a line
   * over its range, and a dot where its net comes in. Stopped: each source's own partials, faint; playing: what it
   * sounds now.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { onDestroy, onMount } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { bandFreq, bandHue, bandsFromFFT, restingProfile } from '../layout/spectrum';
  import { towerNets, towerY, type TowerIn } from '../layout/towerlayout';
  import { TOWER_ZONES } from '../layout/tower';
  import { onFrames } from '../audio/ticker';
  import { noteColour, noteHsl } from './theme';

  let {
    ins,
    viewport,
    open,
    ontoggle,
  }: {
    ins: readonly TowerIn[];
    viewport: Viewport;
    open: boolean;
    ontoggle: () => void;
  } = $props();

  const ctx = getGraphContext();
  const BANDS = 120;
  let h = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  const sw = $derived(open ? STRIP_OPEN : STRIP);
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;

  // (the screen's y for a height on the tower, decades: the graph's y, panned and zoomed)
  const yOf = (d: number) => towerY(d) * viewport.zoom + viewport.y;
  const css = (name: string) => (typeof getComputedStyle !== 'undefined' && canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '') || '#888';

  // what a source sounds on a side now: levels per band (0 … 1), live or at rest; nothing on a half it doesn't reach
  function levels(o: TowerIn, side: 'left' | 'right'): Float32Array {
    if (!o[side]) return new Float32Array(BANDS);
    const live = ctx.state !== 'stopped' ? ctx.sound.spectrum(o.name) : null;
    if (live) return bandsFromFFT(live[side], live.sampleRate, BANDS);
    return restingProfile(ctx.program, o.name, ctx.shifts, BANDS)[side].map((v) => v * 0.7);
  }

  // (a band's colour: its note's, the palette's, at an opacity)
  const hsla = (hue: number, a: number) => {
    const [hh, ss, ll] = noteHsl(hue);
    return `hsla(${hh}, ${ss}%, ${ll}%, ${a})`;
  };

  function colourOf(name: string): string {
    const f = ctx.state !== 'stopped' ? ctx.sound.note(name) : null;
    const hz = f ?? ctx.program.cells.get(name)?.freq ?? 0;
    if (!(hz > 0) || nodeState(ctx, `cell:${name}`) === 'off') return css('--edge');
    return noteColour(((((Math.round(12 * Math.log2(hz / 440)) + 9) % 12) + 12) % 12) * 30);
  }

  // (a decade's tick, as a period below 1 Hz and a frequency above)
  function decade(d: number): string {
    const hz = 10 ** d;
    if (hz >= 1000) return `${hz / 1000} kHz`;
    if (hz >= 1) return `${hz} Hz`;
    const s = 1 / hz;
    return s >= 86400 ? `${+(s / 86400).toPrecision(2)} d` : s >= 3600 ? `${+(s / 3600).toPrecision(2)} h` : s >= 60 ? `${+(s / 60).toPrecision(2)} min` : `${s} s`;
  }

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g || !h) return;
    const W = sw;
    const cx = W / 2;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, h);
    const band = (b: number) => Math.log10(bandFreq(b, BANDS));
    const half = (towerY(band(1)) - towerY(band(0))) * viewport.zoom * 0.5;
    // the audible: the rainbow, a band a semitone
    for (let b = 0; b < BANDS; b++) {
      const f = bandFreq(b, BANDS);
      if (f < 20 || f > 20000) continue;
      const y = yOf(band(b));
      if (y < -10 || y > h + 10) continue;
      g.fillStyle = hsla(bandHue(b, BANDS), open ? 0.24 : 0.2);
      g.fillRect(0, y + half, W, -2 * half);
    }
    // the zones, a rail at the outer edge
    const zone = (name: string) => css(name === 'slow' ? '--meter-2' : name === 'pulse' ? '--meter-1' : '--accent');
    TOWER_ZONES.forEach((z, i) => {
      const lo = Math.max(-8, z.from);
      const hi = TOWER_ZONES[i + 1]?.from ?? Math.log10(20000);
      g.fillStyle = zone(z.name);
      g.globalAlpha = 0.8;
      g.fillRect(W - 6, yOf(hi), 4, yOf(lo) - yOf(hi));
      g.globalAlpha = 1;
    });
    // the halves: the centre line through the audible
    g.strokeStyle = css('--line');
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(cx, yOf(Math.log10(20000)));
    g.lineTo(cx, yOf(Math.log10(20)));
    g.stroke();
    // decades
    g.font = '10px system-ui, sans-serif';
    g.textAlign = 'right';
    for (let d = -6; d <= 4; d++) {
      const y = yOf(d);
      if (y < 0 || y > h) continue;
      g.strokeStyle = css('--line');
      g.beginPath();
      g.moveTo(open ? 0 : W - 12, y);
      g.lineTo(W, y);
      g.stroke();
      if (open) {
        g.fillStyle = css('--text-muted');
        g.fillText(decade(d), W - 10, y - 3);
      }
    }
    // the spectrum: every source together, the left channel out to the left of the centre, the right to the right
    const room = cx - 8;
    const each = ins.map((o) => ({ o, l: levels(o, 'left'), r: levels(o, 'right'), colour: colourOf(o.name) }));
    for (const side of ['left', 'right'] as const) {
      const total = new Float32Array(BANDS);
      for (const e of each) for (let b = 0; b < BANDS; b++) total[b] = Math.max(total[b], (side === 'left' ? e.l : e.r)[b]);
      for (let b = 0; b < BANDS; b++) {
        if (total[b] <= 0.02) continue;
        const y = yOf(band(b));
        if (y < -10 || y > h + 10) continue;
        g.fillStyle = hsla(bandHue(b, BANDS), 0.35 + 0.65 * total[b]);
        const len = total[b] * room;
        g.fillRect(side === 'left' ? cx - len : cx, y - Math.max(1, half * 0.7), len, Math.max(2, half * 1.4));
      }
    }
    // each source's connector at the inner edge: a line over its range (the sources of one net side by side), a dot
    // where its net comes in
    const nets = towerNets(ins);
    for (const net of nets) {
      const y0 = net.top * viewport.zoom + viewport.y;
      net.taps.forEach((o, k) => {
        const e = each.find((x) => x.o.id === o.id)!;
        const l = e.l.map((v, b) => Math.max(v, e.r[b]));
        // (its range: the bands within about 30 dB of its loudest, not the FFT's floor)
        const peak = Math.max(...l);
        let lo = -1;
        let hi = -1;
        for (let b = 0; b < BANDS; b++)
          if (peak > 0.05 && l[b] > peak - 0.43) {
            if (lo < 0) lo = b;
            hi = b;
          }
        const x = 2.5 + k * 4;
        g.strokeStyle = e.colour;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, lo >= 0 ? Math.min(y0, yOf(band(hi))) : y0);
        g.lineTo(x, lo >= 0 ? Math.max(y0, yOf(band(lo))) : y0);
        g.stroke();
      });
      g.fillStyle = each.find((x) => x.o.id === net.taps[0].id)!.colour;
      g.beginPath();
      g.arc(3, y0, 4.5, 0, 2 * Math.PI);
      g.fill();
      if (open) {
        g.fillStyle = css('--text');
        g.font = '700 10px system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillText(net.taps.map((t) => t.name).join(' · '), 12, y0 - 5);
        g.font = '10px system-ui, sans-serif';
        g.textAlign = 'right';
      }
    }
    // the halves named, the zones named (opened)
    g.fillStyle = css('--text-muted');
    g.font = '700 10px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('L', cx - room / 2, 18);
    g.fillText('R', cx + room / 2, 18);
    if (open)
      TOWER_ZONES.forEach((z, i) => {
        const lo = Math.max(-6, z.from);
        const hi = TOWER_ZONES[i + 1]?.from ?? Math.log10(20000);
        const y = (yOf(lo) + yOf(hi)) / 2;
        if (y < 0 || y > h) return;
        g.fillStyle = zone(z.name);
        g.font = '700 11px system-ui, sans-serif';
        g.setTransform(dpr, 0, 0, dpr, (W - 16) * dpr, y * dpr);
        g.rotate(-Math.PI / 2);
        g.fillText(z.name, 0, 0);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
  }

  // stopped: drawn again when what it shows moves (the view, the piece, a source); playing: every frame (below)
  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, ins, sw, h, ctx.program, ctx.shifts, ctx.state, ctx.muted, canvas];
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

<div class="strip" style:width="{sw}px" bind:clientHeight={h}>
  {#if h}
    <canvas bind:this={canvas} width={sw * dpr} height={h * dpr} style:width="{sw}px" style:height="{h}px"></canvas>
  {/if}
  <button class="open" onclick={ontoggle} aria-pressed={open} title={open ? 'Fold the tower' : 'Open the tower: its scale and what comes in'}>{open ? '›' : '‹'}</button>
</div>

<style>
  .strip {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    z-index: 4;
    background: var(--surface);
    border-left: 1px solid var(--line);
    pointer-events: none;
  }
  canvas {
    display: block;
  }
  .open {
    position: absolute;
    top: 28px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 28px;
    min-height: 24px;
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--text-muted);
    font: 700 var(--text-sm) var(--font-ui);
    cursor: pointer;
    pointer-events: auto;
  }
  .open[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
