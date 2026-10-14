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
  import { bandFreq, bandHue, bandOctave } from '../layout/spectrum';
  import { towerAt, towerNets, towerY, type TowerIn } from '../layout/towerlayout';
  import { TOWER_ZONES } from '../layout/tower';
  import { onFrames } from '../audio/ticker';
  import { noteHsl } from './theme';
  import { heard, noteHz, noteOf, outRgb } from './heard';
  import { drawSpire, spireOf } from './spire';
  import { cellView, valueAt, valueSpectrum } from '../layout/cellview';
  import { lapOf } from '../engine/readers';
  import { fillColour } from './edgeStyle';
  import { C0 } from '../layout/spectrum';

  let {
    ins,
    structure = [],
    viewport,
    zone = 0,
    open,
    ontoggle,
    sum = 'stack',
  }: {
    ins: readonly TowerIn[];
    /** The structure: each stepped cell at its rate (decades), the tables nothing steps at -Infinity. */
    structure?: readonly { name: string; at: number }[];
    viewport: Viewport;
    /** The neutral zone between the structure and the audible (decades: towerlayout.ts towerY). */
    zone?: number;
    open: boolean;
    ontoggle: () => void;
    /** The sum: `stack`, each band's bar split into its sources' shares, each in its colour; `max`, the loudest, in the band's. */
    sum?: 'stack' | 'max';
  } = $props();

  const ctx = getGraphContext();
  const BANDS = 120;
  let h = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  const sw = $derived(open ? STRIP_OPEN : STRIP);
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;

  // (the screen's y for a height on the tower, decades: the graph's y, panned and zoomed)
  const yOf = (d: number) => towerY(d, zone) * viewport.zoom + viewport.y;
  const css = (name: string) => (typeof getComputedStyle !== 'undefined' && canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '') || '#888';

  // what a source sounds on each side now: levels per band (0 … 1), live or at rest (faint); nothing on a half it
  // doesn't reach
  function levels(o: TowerIn): { l: Float32Array; r: Float32Array } {
    const { left, right, rest } = heard(ctx, o.name, BANDS);
    const k = rest ? 0.7 : 1;
    return { l: o.left ? left.map((v) => v * k) : new Float32Array(BANDS), r: o.right ? right.map((v) => v * k) : new Float32Array(BANDS) };
  }

  // (a band's colour: its note's, the palette's, at an opacity)
  // (by its octave: full in the fourth, darker below, brighter above)
  const hsla = (hue: number, a: number, octave = 0) => {
    const [hh, ss, ll] = noteHsl(hue, false, octave);
    return `hsla(${hh}, ${ss}%, ${ll}%, ${a})`;
  };

  // (a source's colour: its note's, as its socket and its wire are; off or with none, the edge's)
  function colourOf(name: string): string {
    if (nodeState(ctx, `cell:${name}`) === 'off') return css('--edge');
    return noteOf(ctx, name) ?? css('--edge');
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
    const half = (towerY(band(1), zone) - towerY(band(0), zone)) * viewport.zoom * 0.5;
    // the audible: the rainbow, a band a semitone
    for (let b = 0; b < BANDS; b++) {
      const f = bandFreq(b, BANDS);
      if (f < 20 || f > 20000) continue;
      const y = yOf(band(b));
      if (y < -10 || y > h + 10) continue;
      g.fillStyle = hsla(bandHue(b, BANDS), open ? 0.24 : 0.2, bandOctave(b, BANDS));
      g.fillRect(0, y + half, W, -2 * half);
    }
    // the zones, a rail at the outer edge
    const zoneColour = (name: string) => css(name === 'slow' ? '--meter-2' : name === 'pulse' ? '--meter-1' : '--accent');
    TOWER_ZONES.forEach((z, i) => {
      const lo = Math.max(-8, z.from);
      const hi = (TOWER_ZONES[i + 1]?.from ?? Math.log10(20000)) - 1e-9;
      g.fillStyle = zoneColour(z.name);
      g.globalAlpha = 0.8;
      g.fillRect(W - 6, yOf(hi), 4, yOf(lo) - yOf(hi));
      g.globalAlpha = 1;
    });
    // the neutral zone between the structure and the audible: off the scale, where the voices and mixers stand
    if (zone > 0) {
      const z0 = yOf(Math.log10(20));
      const z1 = yOf(Math.log10(20) - 1e-9);
      g.fillStyle = css('--bg');
      g.fillRect(0, z0, W, z1 - z0);
      if (open && z1 - z0 > 40) {
        g.fillStyle = css('--text-muted');
        g.font = '10px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillText('voices · mixers', cx, (z0 + z1) / 2);
      }
    }
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
    // (in stack: each band's bar as long as its loudest source, split into the sources' shares, in their colours, the
    // sources in the graph's order left to right from the centre out)
    const each = [...ins].sort((a, b) => a.x - b.x).map((o) => ({ o, ...levels(o), colour: colourOf(o.name) }));
    for (const side of ['left', 'right'] as const) {
      const dir = side === 'left' ? -1 : 1;
      for (let b = 0; b < BANDS; b++) {
        const vs = each.map((e) => (side === 'left' ? e.l : e.r)[b]);
        const top = Math.max(0, ...vs);
        if (top <= 0.02 || bandFreq(b, BANDS) < 20 || bandFreq(b, BANDS) > 20000) continue;
        const y = yOf(band(b));
        if (y < -10 || y > h + 10) continue;
        const len = top * room;
        const y0 = y - Math.max(1, half * 0.7);
        const bh = Math.max(2, half * 1.4);
        if (sum === 'max') {
          g.fillStyle = hsla(bandHue(b, BANDS), 0.35 + 0.65 * top, bandOctave(b, BANDS));
          g.fillRect(side === 'left' ? cx - len : cx, y0, len, bh);
          continue;
        }
        const all = vs.reduce((a, v) => a + (v > 0.02 ? v : 0), 0);
        let at = 0;
        g.globalAlpha = 0.45 + 0.55 * top;
        each.forEach((e, k) => {
          if (vs[k] <= 0.02) return;
          const part = (vs[k] / all) * len;
          g.fillStyle = e.colour;
          g.fillRect(dir < 0 ? cx - at - part : cx + at, y0, part, bh);
          at += part;
        });
        g.globalAlpha = 1;
      }
    }
    // each out's marker at the inner edge: its spire (spire.ts: its fundamental a big dot, swelling with its level, a
    // hairline up its range, a dot a partial), the outs of one row side by side; opened, their names stacked by it
    const nets = towerNets(ins);
    for (const net of nets) {
      const y0 = net.top * viewport.zoom + viewport.y;
      net.taps.forEach((o, k) => {
        const e = each.find((x) => x.o.id === o.id)!;
        const s = spireOf(
          e.l.map((v: number, b: number) => Math.max(v, e.r[b] ?? 0)),
          noteHz(ctx, o.name),
          BANDS,
        );
        const x = 6 + k * 9;
        const off = nodeState(ctx, `cell:${o.name}`) === 'off';
        if (s) drawSpire(g, x, (b) => yOf(band(b)), s, 4, outRgb(ctx, o.name), off ? 0.3 : 1);
        if (open) {
          g.fillStyle = e.colour;
          g.font = '700 10px system-ui, sans-serif';
          g.textAlign = 'left';
          g.fillText(o.name, 8 + net.taps.length * 9, y0 + 3 + (k - (net.taps.length - 1) / 2) * 11);
        }
      });
    }
    g.font = '10px system-ui, sans-serif';
    // the structure (docs/notes/tower-sky.md): under 20 Hz the rainbow goes on, a rate's octaves in a pitch's colours,
    // muted; each stepped cell a row at its rate, the spectrum of its values (each value as wide as it is held, in its
    // colour, the one it holds now lit); the tables nothing steps rows at the strip's bottom, their spectra static
    const lowest = towerAt((h - viewport.y) / viewport.zoom);
    for (let k = Math.floor(12 * Math.log2(10 ** lowest / C0)); ; k++) {
      const d = Math.log10(C0 * 2 ** (k / 12));
      if (d >= Math.log10(20)) break;
      const y0 = yOf(d + Math.log10(2) / 24);
      const y1 = yOf(d - Math.log10(2) / 24);
      if (y1 < 0) continue;
      g.fillStyle = hsla((((k % 12) + 12) % 12) * 30, 0.2, Math.floor(k / 12) - 4);
      g.fillRect(0, y0, W, y1 - y0);
    }
    // (a row's height: cells at one rate stacked this far apart)
    const ROW = 10;
    const paint = (c: string) => (c.startsWith('var(') ? css(c.slice(4, -1)) : c);
    const rows = new Map<number, number>();
    const tables = structure.filter((x) => x.at === -Infinity);
    const chips = (name: string, y: number) => {
      const v = cellView(ctx.program, name, ctx.shifts, false);
      if (!v) return;
      const spread = valueSpectrum(v);
      if (!spread.length) return;
      const local = ctx.heads.cells.get(name)?.local ?? 0;
      const lap = lapOf(ctx.program, name);
      const now = lap > 0 ? valueAt(v, (((local / lap) % 1) + 1) % 1) : null;
      const x0 = open ? 64 : 8;
      const x1 = W - 14;
      let x = x0;
      for (const e of spread) {
        const w = e.share * (x1 - x0);
        g.globalAlpha = ctx.state === 'stopped' || e.key === now ? 1 : 0.35;
        g.fillStyle = paint(fillColour(e.fill));
        g.fillRect(x, y - 2.5, Math.max(1, w - 1), 5);
        x += w;
      }
      g.globalAlpha = 1;
      if (open) {
        g.fillStyle = css('--text-muted');
        g.font = '8px system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillText(name, 4, y + 3, 58);
      }
    };
    for (const c of structure) {
      if (c.at === -Infinity) continue;
      // (cells at one rate stacked, a row each)
      const at = yOf(c.at);
      const key = Math.round(at / ROW);
      const n = rows.get(key) ?? 0;
      rows.set(key, n + 1);
      if (at < -10 || at > h + 10) continue;
      chips(c.name, at + n * ROW);
    }
    tables.forEach((c, k) => chips(c.name, h - 12 - k * ROW));
    // the halves named, the zones named (opened)
    g.fillStyle = css('--text-muted');
    g.font = '700 10px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('L', cx - room / 2, 18);
    g.fillText('R', cx + room / 2, 18);
    if (open)
      TOWER_ZONES.forEach((z, i) => {
        const lo = Math.max(-6, z.from);
        const hi = (TOWER_ZONES[i + 1]?.from ?? Math.log10(20000)) - 1e-9;
        const y = (yOf(lo) + yOf(hi)) / 2;
        if (y < 0 || y > h) return;
        g.fillStyle = zoneColour(z.name);
        g.font = '700 11px system-ui, sans-serif';
        g.setTransform(dpr, 0, 0, dpr, (W - 16) * dpr, y * dpr);
        g.rotate(-Math.PI / 2);
        g.fillText(z.name, 0, 0);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
  }

  // stopped: drawn again when what it shows moves (the view, the piece, a source); playing: every frame (below)
  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, ins, structure, sw, h, ctx.program, ctx.shifts, ctx.state, ctx.muted, canvas];
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
