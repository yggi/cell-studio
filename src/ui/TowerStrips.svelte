<script lang="ts" module>
  /** A strip's width (px): folded, always there; opened, with the tower's scale named. */
  export const STRIP = 44;
  export const STRIP_OPEN = 150;
</script>

<script lang="ts">
  /**
   * The tower layout's strips (docs/notes/tower-strip.md): the sound card as two strips, the left channel at the graph's
   * left edge and the right at its right, each the frequency tower on the graph's own scale (towerlayout.ts: up high,
   * one even log scale, panned and zoomed with the graph). The audible part is a rainbow, a band a semitone in its
   * note's colour (C red …); under it the pulse and the slow, a decade a tick. What goes into the card shows its
   * spectrum on the strips it reaches: a bar per band, as long as it is loud (all of them together, the piece's
   * spectrum), and each source's connector, a line over its range ending in a dot where its wire comes in. Stopped:
   * each source's own partials, faint; playing: what it sounds now.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { onDestroy, onMount } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { bandFreq, bandHue, bandsFromFFT, restingProfile } from '../layout/spectrum';
  import { towerY, type TowerIn } from '../layout/towerlayout';
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
  let w = $state(0);
  let h = $state(0);
  let left = $state<HTMLCanvasElement>();
  let right = $state<HTMLCanvasElement>();
  const sw = $derived(open ? STRIP_OPEN : STRIP);
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;

  // (the screen's y for a height on the tower, decades: the graph's y, panned and zoomed)
  const yOf = (d: number) => towerY(d) * viewport.zoom + viewport.y;
  const css = (name: string) => (typeof getComputedStyle !== 'undefined' && left ? getComputedStyle(left).getPropertyValue(name).trim() : '') || '#888';

  // what a source sounds on a side now: levels per band (0 … 1), live or at rest
  function levels(name: string, side: 'left' | 'right'): Float32Array {
    const live = ctx.state !== 'stopped' ? ctx.sound.spectrum(name) : null;
    if (live) return bandsFromFFT(live[side], live.sampleRate, BANDS);
    return restingProfile(ctx.program, name, ctx.shifts, BANDS)[side].map((v) => v * 0.7);
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

  function draw(canvas: HTMLCanvasElement | undefined, side: 'left' | 'right') {
    const g = canvas?.getContext('2d');
    if (!g || !h) return;
    const W = sw;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, h);
    // (the inner edge: where the graph is, and the wires come in)
    const inner = side === 'left' ? W : 0;
    const out = side === 'left' ? -1 : 1;
    const zoom = viewport.zoom;
    // the audible: the rainbow, a band a semitone
    const band = (b: number) => Math.log10(bandFreq(b, BANDS));
    const half = (towerY(band(1)) - towerY(band(0))) * zoom * 0.5;
    for (let b = 0; b < BANDS; b++) {
      const f = bandFreq(b, BANDS);
      if (f < 20 || f > 20000) continue;
      const y = yOf(band(b));
      if (y < -10 || y > h + 10) continue;
      g.fillStyle = hsla(bandHue(b, BANDS), open ? 0.24 : 0.2);
      g.fillRect(0, y + half, W, -2 * half);
    }
    // the zones under it, a rail at the outer edge
    const rail = side === 'left' ? 2 : W - 6;
    const zone = (name: string) => css(name === 'slow' ? '--meter-2' : name === 'pulse' ? '--meter-1' : '--accent');
    TOWER_ZONES.forEach((z, i) => {
      const lo = Math.max(-8, z.from);
      const hi = TOWER_ZONES[i + 1]?.from ?? Math.log10(20000);
      g.fillStyle = zone(z.name);
      g.globalAlpha = 0.8;
      g.fillRect(rail, yOf(hi), 4, yOf(lo) - yOf(hi));
      g.globalAlpha = 1;
    });
    // decades
    g.font = '10px system-ui, sans-serif';
    g.textAlign = side === 'left' ? 'left' : 'right';
    for (let d = -6; d <= 4; d++) {
      const y = yOf(d);
      if (y < 0 || y > h) continue;
      g.strokeStyle = css('--line');
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(open ? 0 : side === 'left' ? 0 : W - 10, y);
      g.lineTo(open ? W : side === 'left' ? 10 : W, y);
      g.stroke();
      if (open) {
        g.fillStyle = css('--text-muted');
        g.fillText(decade(d), side === 'left' ? 10 : W - 10, y - 3);
      }
    }
    // the spectrum: every source on this side together, a bar per band from the inner edge
    const room = W - 10;
    const total = new Float32Array(BANDS);
    const each = ins.filter((o) => o[side]).map((o) => ({ o, l: levels(o.name, side), colour: colourOf(o.name) }));
    for (const { l } of each) for (let b = 0; b < BANDS; b++) total[b] = Math.max(total[b], l[b]);
    for (let b = 0; b < BANDS; b++) {
      if (total[b] <= 0.02) continue;
      const y = yOf(band(b));
      if (y < -10 || y > h + 10) continue;
      g.fillStyle = hsla(bandHue(b, BANDS), 0.35 + 0.65 * total[b]);
      const len = total[b] * room;
      g.fillRect(side === 'left' ? inner - len : 0, y - Math.max(1, half * 0.7), len, Math.max(2, half * 1.4));
    }
    // each source's connector: a line over its range at the inner edge, a dot where its wire comes in
    const named: number[] = [];
    for (const { o, l, colour } of each) {
      // (its range: the bands within about 30 dB of its loudest, not the FFT's floor)
      const peak = Math.max(...l);
      let lo = -1;
      let hi = -1;
      for (let b = 0; b < BANDS; b++)
        if (peak > 0.05 && l[b] > peak - 0.43) {
          if (lo < 0) lo = b;
          hi = b;
        }
      const y0 = o.top * zoom + viewport.y;
      const x = inner + out * 2.5;
      g.strokeStyle = colour;
      g.fillStyle = colour;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x, lo >= 0 ? Math.min(y0, yOf(band(hi))) : y0);
      g.lineTo(x, lo >= 0 ? Math.max(y0, yOf(band(lo))) : y0);
      g.stroke();
      g.beginPath();
      g.arc(x, y0, 4, 0, 2 * Math.PI);
      g.fill();
      if (open) {
        g.fillStyle = css('--text');
        g.font = '700 10px system-ui, sans-serif';
        // (names at one height stacked, not on top of each other)
        let y = y0 + 14;
        while (named.some((n) => Math.abs(n - y) < 12)) y += 12;
        named.push(y);
        g.fillText(o.name, side === 'left' ? 12 : W - 12, y);
        g.font = '10px system-ui, sans-serif';
      }
    }
    // the zones named (opened)
    if (open) {
      g.save();
      TOWER_ZONES.forEach((z, i) => {
        const lo = Math.max(-6, z.from);
        const hi = TOWER_ZONES[i + 1]?.from ?? Math.log10(20000);
        const y = (yOf(lo) + yOf(hi)) / 2;
        if (y < 0 || y > h) return;
        g.fillStyle = zone(z.name);
        g.font = '700 11px system-ui, sans-serif';
        g.textAlign = 'center';
        g.setTransform(dpr, 0, 0, dpr, (side === 'left' ? 16 : W - 16) * dpr, y * dpr);
        g.rotate(-Math.PI / 2);
        g.fillText(z.name, 0, 0);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      g.restore();
    }
  }

  // (a decade's tick, as a period below 1 Hz and a frequency above)
  function decade(d: number): string {
    const hz = 10 ** d;
    if (hz >= 1000) return `${hz / 1000} kHz`;
    if (hz >= 1) return `${hz} Hz`;
    const s = 1 / hz;
    return s >= 86400 ? `${+(s / 86400).toPrecision(2)} d` : s >= 3600 ? `${+(s / 3600).toPrecision(2)} h` : s >= 60 ? `${+(s / 60).toPrecision(2)} min` : `${s} s`;
  }

  const both = () => (draw(left, 'left'), draw(right, 'right'));
  // stopped: drawn again when what it shows moves (the view, the piece, a source); playing: every frame (below)
  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, ins, sw, h, ctx.program, ctx.shifts, ctx.state, ctx.muted, left, right];
    both();
  });
  let stop = () => {};
  onMount(
    () =>
      (stop = onFrames(
        () => ctx.state !== 'stopped' && both(),
        () => 33,
      )),
  );
  onDestroy(() => stop());
</script>

<div class="strips" bind:clientWidth={w} bind:clientHeight={h}>
  {#if w && h}
    {#each [['left', 0], ['right', w - sw]] as const as [side, x] (side)}
      <div class="strip" style:left="{x}px" style:width="{sw}px">
        {#if side === 'left'}
          <canvas bind:this={left} width={sw * dpr} height={h * dpr} style:width="{sw}px" style:height="{h}px"></canvas>
        {:else}
          <canvas bind:this={right} width={sw * dpr} height={h * dpr} style:width="{sw}px" style:height="{h}px"></canvas>
        {/if}
        <button class="side" onclick={ontoggle} aria-pressed={open} title={open ? 'Fold the tower' : 'Open the tower: its scale and what comes in'}
          >{side === 'left' ? 'L' : 'R'}</button
        >
      </div>
    {/each}
  {/if}
</div>

<style>
  .strips {
    position: absolute;
    inset: 0;
    z-index: 4;
    pointer-events: none;
  }
  .strip {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--surface);
    border-left: 1px solid var(--line);
    border-right: 1px solid var(--line);
  }
  canvas {
    display: block;
  }
  .side {
    position: absolute;
    top: 52px;
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
  .side[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
