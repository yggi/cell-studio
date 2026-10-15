<script lang="ts" module>
  /** The strip's width (px): folded, always there; opened, with the tower's scale named. */
  export const STRIP = 64;
  export const STRIP_OPEN = 180;
</script>

<script lang="ts">
  /**
   * The tower layout's strip (docs/notes/tower-sky.md): a minimap of the tower graph, on the graph's own scale (panned
   * and zoomed with it). A lane each out, in its sections' order (layout/minimap.ts); in it, bottom to top, what makes
   * that out: the structure's cells at their rates, each a row of the values it takes (the one it holds now lit), a cell
   * several outs share across their lanes; the neutral zone's gates, voices and mixers, at their rows; and the out's
   * spire at its fundamental, its spectrum mirrored about the lane's middle (left channel left). A bridge runs straight
   * up each lane from its player to its pitch. Under it all the rainbow, a band a semitone (C red …), on down through the
   * rates; the tables nothing steps at the bottom.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { onDestroy, onMount, untrack } from 'svelte';
  import { getGraphContext, nodeState } from './context';
  import { bandFreq, bandHue, bandOctave } from '../layout/spectrum';
  import { towerAt, towerY, type TowerIn, type TowerLayer } from '../layout/towerlayout';
  import type { Minimap } from '../layout/minimap';
  import { TOWER_ZONES } from '../layout/tower';
  import { onFrames } from '../audio/ticker';
  import { noteHsl, tapTintRgb } from './theme';
  import { heard, noteHz, noteOf, outRgb } from './heard';
  import { drawSpire, spireOf } from './spire';
  import { cellView, valueAt, valueSpectrum } from '../layout/cellview';
  import { lapOf } from '@yggi/cells/engine/readers';
  import { fillColour } from './edgeStyle';
  import { C0 } from '../layout/spectrum';

  let {
    ins,
    structure = [],
    map = null,
    layers = new Map(),
    rows = { gate: 0, voice: 0, mixer: 0 },
    viewport,
    zone = 0,
    open,
    ontoggle,
    onfocus,
  }: {
    ins: readonly TowerIn[];
    /** The lanes, and the lanes each node feeds (layout/minimap.ts). */
    map?: Minimap | null;
    /** Each node's stratum, and the neutral zone's rows (the graph's y): towerLayers'. */
    layers?: ReadonlyMap<string, TowerLayer>;
    rows?: { readonly gate: number; readonly voice: number; readonly mixer: number };
    /** The structure: each stepped cell at its rate (decades), the tables nothing steps at -Infinity. */
    structure?: readonly { name: string; at: number }[];
    viewport: Viewport;
    /** The neutral zone between the structure and the audible (decades: towerlayout.ts towerY). */
    zone?: number;
    open: boolean;
    ontoggle: () => void;
    /** A tap on what the strip shows for a node (its id): the view moves to it. */
    onfocus?: (id: string) => void;
  } = $props();

  const ctx = getGraphContext();
  const BANDS = 120;
  let h = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  const sw = $derived(open ? STRIP_OPEN : STRIP);
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;

  // (the screen's y for a height on the tower, decades: the graph's y, panned and zoomed)
  const yOf = (d: number) => towerY(d, zone) * viewport.zoom + viewport.y;
  // (a theme colour, read once: getComputedStyle each time is slow, and the theme doesn't change)
  const theme = new Map<string, string>();
  const css = (name: string) => {
    const had = theme.get(name);
    if (had) return had;
    const v = typeof getComputedStyle !== 'undefined' && canvas ? getComputedStyle(canvas).getPropertyValue(name).trim() : '';
    if (v) theme.set(name, v);
    return v || '#888';
  };

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

  // (a cell's wheel and its spectrum of values, kept until the piece or a table's turn changes: not each frame)
  let spectra = { program: null as unknown, shifts: null as unknown, got: new Map<string, ReturnType<typeof spectrumNow>>() };
  function spectrumNow(name: string) {
    const v = cellView(ctx.program, name, ctx.shifts, false);
    if (!v) return null;
    // (a selector's table of taps: each entry a section, in its tint)
    const taps = [...(ctx.program.taps?.values() ?? [])].includes(name) ? (ctx.program.cells.get(name)?.units.length ?? 0) : 0;
    const spread = valueSpectrum(v, taps > 0);
    return spread.length ? { v, taps, spread } : null;
  }
  function spectrumOf(name: string) {
    if (spectra.program !== ctx.program || spectra.shifts !== ctx.shifts) spectra = { program: ctx.program, shifts: ctx.shifts, got: new Map() };
    if (!spectra.got.has(name)) spectra.got.set(name, spectrumNow(name));
    return spectra.got.get(name)!;
  }

  // what was drawn for which node, where (the strip's px), for a tap to find
  let hits: { id: string; x0: number; y0: number; x1: number; y1: number }[] = [];
  const hit = (id: string, x0: number, y0: number, x1: number, y1: number) =>
    hits.push({ id, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) });
  // (a tap: what it lands on, the smallest; else the nearest, a few px off)
  function tapped(x: number, y: number): string | undefined {
    const off = (r: (typeof hits)[number]) => Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.y0 - y, 0, y - r.y1));
    const near = hits.filter((r) => off(r) <= 6);
    near.sort((a, b) => off(a) - off(b) || (a.x1 - a.x0) * (a.y1 - a.y0) - (b.x1 - b.x0) * (b.y1 - b.y0));
    return near[0]?.id;
  }
  // (the strip lets the graph under it have its pointer, to pan and zoom through it: a tap is told from a drag on the
  // window — down and up within a few px, in the strip)
  let down: { x: number; y: number } | null = null;
  let stripEl = $state<HTMLDivElement>();
  function onDown(e: PointerEvent) {
    down = { x: e.clientX, y: e.clientY };
  }
  function onUp(e: PointerEvent) {
    const was = down;
    down = null;
    if (!was || !stripEl || !onfocus || Math.hypot(e.clientX - was.x, e.clientY - was.y) > 6) return;
    const r = stripEl.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height || (e.target as Element | null)?.closest?.('.fold')) return;
    const id = tapped(x, y);
    if (id) onfocus(id);
  }

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g || !h) return;
    hits = [];
    const W = sw;
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
    // the strata, a rail each at the outer edge: the slow, the pulse, the neutral zone (the voices and mixers, off the
    // scale), the audible
    for (const r of rails()) {
      g.fillStyle = r.colour;
      g.globalAlpha = 0.8;
      g.fillRect(W - 6, r.y0, 4, r.y1 - r.y0);
      g.globalAlpha = 1;
    }
    // the audible's scale: the frequency at the right (1, 2, 5 a decade, in Hz, from 1000 in kHz; between them a tick a
    // step, unnamed), the octaves at the left (each C, named Cn); a name only where it has room
    const hearing = (hz: number) => hz >= 20 && hz <= 20000;
    const room = (ys: number[], y: number) => ys.every((u) => Math.abs(u - y) >= 11);
    // (a name over the spectrum, on a halo)
    const halo = (text: string, x: number, y: number) => {
      g.lineWidth = 3;
      g.strokeStyle = css('--surface');
      g.strokeText(text, x, y);
      g.fillText(text, x, y);
      g.lineWidth = 1;
      g.strokeStyle = css('--line');
    };
    const said: number[] = [];
    g.font = `${open ? 10 : 8}px system-ui, sans-serif`;
    g.strokeStyle = css('--line');
    for (let d = 1; d <= 4; d++)
      for (let m = 1; m <= 9; m++) {
        const hz = m * 10 ** d;
        const y = yOf(Math.log10(hz));
        if (!hearing(hz) || y < 0 || y > h) continue;
        const named = m === 1 || m === 2 || m === 5;
        g.beginPath();
        g.moveTo(W - (named ? 18 : 11), y);
        g.lineTo(W - 6, y);
        g.stroke();
        if (!named || !room(said, y)) continue;
        said.push(y);
        g.fillStyle = css('--text-muted');
        g.textAlign = 'right';
        // (clear of the rail's name, which stands along it at W - 10)
        halo(hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz`, W - 20, y + 3);
      }
    const octaves: number[] = [];
    for (let n = 0; n <= 10; n++) {
      const hz = C0 * 2 ** n;
      const y = yOf(Math.log10(hz));
      if (!hearing(hz) || y < 0 || y > h) continue;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(open ? 10 : 6, y);
      g.stroke();
      if (!room(octaves, y)) continue;
      octaves.push(y);
      g.fillStyle = css('--text-muted');
      g.textAlign = 'left';
      halo(`C${n}`, open ? 12 : 8, y + 3);
    }
    // decades, under the audible
    g.font = '10px system-ui, sans-serif';
    g.textAlign = 'right';
    for (let d = -6; d <= 1; d++) {
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
    // under the zone, the rainbow on down through the rates: a rate's octaves in a pitch's colours, muted
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
    if (!map || !map.lanes.length) return names(g, W);
    // the lanes: a narrow column in the strip's middle, a lane an out; the combined spectrum out from its sides, the left
    // channel left, the right right; the names on the left when opened (under 20 Hz the sides are free)
    const A = W - 8;
    const lw = Math.min(open ? 8 : 5, (A * 0.6) / map.lanes.length);
    const x0 = A / 2 - (lw * map.lanes.length) / 2;
    const x1 = x0 + lw * map.lanes.length;
    const mid = (k: number) => x0 + (k + 0.5) * lw;
    const across = (id: string): readonly [number, number] => {
      const [a, b] = map.span.get(id) ?? [0, map.lanes.length - 1];
      return [x0 + a * lw + 1, x0 + (b + 1) * lw - 1];
    };
    g.strokeStyle = css('--line');
    g.globalAlpha = 0.5;
    for (let k = 0; k <= map.lanes.length; k++) {
      g.beginPath();
      g.moveTo(x0 + k * lw, 0);
      g.lineTo(x0 + k * lw, h);
      g.stroke();
    }
    g.globalAlpha = 1;
    const sy = (y: number) => y * viewport.zoom + viewport.y;
    const nameOf = (id: string) => id.slice('cell:'.length);
    // the structure: each stepped cell at its rate, across the lanes it feeds, the values it takes (each as wide as
    // it is held, in its colour, the one it holds now lit); cells sharing a place stacked
    const ROW = 8;
    const paint = (c: string) => (c.startsWith('var(') ? css(c.slice(4, -1)) : c);
    const used = new Map<string, number>();
    const named: number[] = [];
    const chips = (name: string, y: number, [xa, xb]: readonly [number, number]) => {
      const got = spectrumOf(name);
      if (!got) return;
      const { v, taps, spread } = got;
      const local = ctx.heads.cells.get(name)?.local ?? 0;
      const lap = lapOf(ctx.program, name);
      const now = lap > 0 ? valueAt(v, (((local / lap) % 1) + 1) % 1, taps > 0) : null;
      hit(`cell:${name}`, xa, y - 4, xb, y + 4);
      let x = xa;
      for (const e of spread) {
        const w = e.share * (xb - xa);
        g.globalAlpha = ctx.state === 'stopped' || e.key === now ? 1 : 0.35;
        const t = taps ? tapTintRgb(e.index, taps) : null;
        g.fillStyle = t ? `rgb(${t[0]}, ${t[1]}, ${t[2]})` : paint(fillColour(e.fill));
        g.fillRect(x, y - 2, Math.max(1, w - 0.5), 4);
        x += w;
      }
      g.globalAlpha = 1;
      if (open) {
        // (names of one height in other lanes, one under the other)
        let ny = y;
        while (named.some((n) => Math.abs(n - ny) < 8)) ny += 8;
        named.push(ny);
        g.fillStyle = css('--text-muted');
        g.font = '8px system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillText(name, 4, ny + 3, x0 - 6);
      }
    };
    // (a lane's player: the highest of the structure's cells in that lane alone, where its bridge starts)
    const player = new Map<number, number>();
    const place = (id: string, y: number) => {
      const [a, b] = map.span.get(id) ?? [-1, -1];
      let n = 0;
      while ([...Array(Math.max(0, b - a + 1)).keys()].some((k) => used.has(`${Math.round(y / ROW) + n}:${a + k}`))) n++;
      for (let k = a; k <= b; k++) used.set(`${Math.round(y / ROW) + n}:${k}`, 1);
      if (a === b && a >= 0) player.set(a, Math.min(player.get(a) ?? Infinity, y + n * ROW));
      return y + n * ROW;
    };
    const tables: string[] = [];
    for (const c of structure) {
      const id = `cell:${c.name}`;
      if (c.at === -Infinity) {
        tables.push(c.name);
        continue;
      }
      const y = yOf(c.at);
      if (y < -10 || y > h + 10) continue;
      chips(c.name, place(id, y), across(id));
    }
    tables.forEach((name, k) => chips(name, h - 10 - k * ROW, across(`cell:${name}`)));
    // the spectrum, all the outs together: each band's bar as long as its loudest out, split into the outs' shares in
    // their colours, in the lanes' order from the column out on both sides (mirrored: the first lane's innermost); the left
    // channel out from the column's left side, the right from its right
    const outs = new Map(ins.map((o) => [o.id, o]));
    const each = map.lanes.flatMap((lane, k) => {
      const o = outs.get(lane.edge);
      return o ? [{ k, lane, o, ...levels(o), c: outRgb(ctx, o.name), off: nodeState(ctx, lane.source) === 'off' }] : [];
    });
    const hb = Math.max(1.5, half * 1.4);
    for (const side of ['left', 'right'] as const) {
      const room = side === 'left' ? x0 - 2 : A - x1 - 2;
      for (let b = 0; b < BANDS; b++) {
        const f = bandFreq(b, BANDS);
        if (f < 20 || f > 20000) continue;
        const y = yOf(band(b));
        if (y < -10 || y > h + 10) continue;
        const vs = each.map((e) => (side === 'left' ? e.l : e.r)[b] ?? 0);
        const top = Math.max(0, ...vs);
        if (top <= 0.02) continue;
        const all = vs.reduce((a, v) => a + (v > 0.02 ? v : 0), 0);
        const len = top * room;
        let at = 0;
        each.forEach((e, n) => {
          const v = vs[n]!;
          if (v <= 0.02) return;
          const part = (v / all) * len;
          g.fillStyle = `rgba(${e.c[0]}, ${e.c[1]}, ${e.c[2]}, ${(e.off ? 0.3 : 1) * (0.45 + 0.55 * top)})`;
          g.fillRect(side === 'left' ? x0 - 1 - at - part : x1 + 1 + at, y - hb / 2, part, hb);
          hit(e.lane.source, side === 'left' ? x0 - 1 - at - part : x1 + 1 + at, y - hb / 2, side === 'left' ? x0 - 1 - at : x1 + 1 + at + part, y + hb / 2);
          at += part;
        });
      }
    }
    // each out's spire in its lane, at its fundamental; its bridge straight down the lane to its player
    for (const e of each) {
      const { k, o, l, r, c, off } = e;
      const s = spireOf(
        l.map((v, b) => Math.max(v, r[b] ?? 0)),
        noteHz(ctx, o.name),
        BANDS,
      );
      const top = s ? yOf(band(s.root)) : sy(o.top);
      const from = player.get(k) ?? sy(rows.gate);
      g.strokeStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${off ? 0.25 : 0.6})`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(mid(k), from);
      g.lineTo(mid(k), top);
      g.stroke();
      hit(e.lane.source, mid(k) - lw / 2, from, mid(k) + lw / 2, s ? yOf(band(s.top)) - 4 : top - 4);
      if (s) drawSpire(g, mid(k), (b) => yOf(band(b)), s, Math.min(3.5, lw * 0.6), c, off ? 0.3 : 1);
      if (open) {
        // (its name at its fundamental, left of the column, over the spectrum on a halo)
        g.font = '700 9px system-ui, sans-serif';
        g.textAlign = 'right';
        g.lineWidth = 3;
        g.strokeStyle = css('--surface');
        g.strokeText(o.name, x0 - 4, top + 3);
        g.fillStyle = colourOf(o.name);
        g.fillText(o.name, x0 - 4, top + 3);
      }
    }
    // the neutral zone's rows, named (A), and on them what stands there, in its lanes: a gate a dot, a voice a dot in
    // its note's colour, a mixer a square across the voices it mixes
    const zoneRows = [
      ['gates', rows.gate, 'gate'],
      ['voices', rows.voice, 'voice'],
      ['mixers', rows.mixer, 'mixer'],
    ] as const;
    for (const [label, y, layer] of zoneRows) {
      const members = [...layers].filter(([id, l]) => l === layer && map.span.has(id));
      if (!members.length) continue;
      const yy = sy(y);
      g.strokeStyle = css('--line');
      g.setLineDash([2, 3]);
      g.beginPath();
      g.moveTo(x0, yy);
      g.lineTo(x1, yy);
      g.stroke();
      g.setLineDash([]);
      if (open) {
        g.fillStyle = css('--text-muted');
        g.font = '9px system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillText(label, 4, yy + 3, x0 - 6);
      }
      const at = new Map<number, number>();
      for (const [id] of members) {
        const [a, b] = map.span.get(id)!;
        const [xa, xb] = across(id);
        const n = at.get(a) ?? 0;
        at.set(a, n + 1);
        const name = nameOf(id);
        hit(id, xa, yy - 4, xb, yy + 4);
        const c = layer === 'gate' || ctx.program.cells.get(name)?.kit ? css('--unit') : (noteOf(ctx, name) ?? css('--unit'));
        g.fillStyle = c;
        g.strokeStyle = c;
        if (layer === 'mixer') {
          if (b > a) {
            g.beginPath();
            g.moveTo(xa + lw / 2 - 1, yy);
            g.lineTo(xb - lw / 2 + 1, yy);
            g.stroke();
          }
          g.fillRect((xa + xb) / 2 - 3, yy - 3, 6, 6);
        } else {
          g.beginPath();
          g.arc((xa + xb) / 2 + (n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 3 : 0), yy, 2.5, 0, 2 * Math.PI);
          g.fill();
        }
      }
    }
    names(g, W);
  }

  // the strata's rails (the screen's y, top over bottom): the tower's zones, and the neutral zone between the pulse and
  // the audible
  function rails(): { name: string; colour: string; y0: number; y1: number }[] {
    const hearing = Math.log10(20);
    const zoneColour = (name: string) => css(name === 'slow' ? '--meter-2' : name === 'pulse' ? '--meter-1' : '--accent');
    const out: { name: string; colour: string; y0: number; y1: number }[] = TOWER_ZONES.map((z, i) => {
      const lo = Math.max(-8, z.from);
      const hi = (TOWER_ZONES[i + 1]?.from ?? Math.log10(20000)) - 1e-9;
      return { name: z.name, colour: zoneColour(z.name), y0: yOf(hi), y1: yOf(lo) };
    });
    if (zone > 0) out.push({ name: 'voices', colour: css('--meter-3'), y0: yOf(hearing), y1: yOf(hearing - 1e-9) });
    return out;
  }

  // each rail named along it, where it shows (folded too, smaller), on a halo
  function names(g: CanvasRenderingContext2D, W: number) {
    for (const r of rails()) {
      const a = Math.max(0, r.y0);
      const b = Math.min(h, r.y1);
      if (b - a < 40) continue;
      g.font = `700 ${open ? 11 : 9}px system-ui, sans-serif`;
      g.textAlign = 'center';
      g.setTransform(dpr, 0, 0, dpr, (W - 10) * dpr, ((a + b) / 2) * dpr);
      g.rotate(-Math.PI / 2);
      g.lineWidth = 3;
      g.strokeStyle = css('--surface');
      g.strokeText(r.name, 0, 0);
      g.fillStyle = r.colour;
      g.fillText(r.name, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  // stopped: drawn again when what it shows moves (the view, the piece, a source); playing: every frame (below)
  $effect(() => {
    void [viewport.x, viewport.y, viewport.zoom, ins, structure, map, layers, rows, sw, h, ctx.program, ctx.shifts, ctx.state, ctx.muted, canvas];
    // (only what is listed: what draw reads, the playheads among it, would draw it again each frame; and only stopped —
    // playing, the frame loop draws it, and the layout's ticks moving what is listed would draw it once more each)
    if (untrack(() => ctx.state) === 'stopped') untrack(draw);
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

<svelte:window onpointerdowncapture={onDown} onpointerupcapture={onUp} />
<div class="strip" style:width="{sw}px" bind:clientHeight={h} bind:this={stripEl}>
  {#if h}
    <canvas bind:this={canvas} width={sw * dpr} height={h * dpr} style:width="{sw}px" style:height="{h}px"></canvas>
  {/if}
  <button class="fold" onclick={ontoggle} aria-pressed={open} title={open ? 'Fold the tower' : 'Open the tower: its scale and what comes in'}>{open ? '›' : '‹'}</button>
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
  .fold {
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
  .fold[aria-pressed='true'] {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
