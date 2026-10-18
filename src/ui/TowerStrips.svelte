<script lang="ts">
  /**
   * The tower layout's strip (docs/notes/tower-sky.md): a minimap of the tower graph, on the graph's own scale (panned
   * and zoomed with it). A lane each out, in its sections' order (layout/minimap.ts); in it, bottom to top, what makes
   * that out: the structure's cells at their rates, each a row of the values it takes (the one it holds now lit), a cell
   * several outs share across their lanes; the neutral zone's gates, voices and mixers, at their rows; and the out's
   * spire at its fundamental, its spectrum mirrored about the lane's middle (left channel left). A bridge runs straight
   * up each lane from the selector (through its player) to its pitch. Under it all the rainbow, a band a semitone (C red …), on down through the
   * rates; the tables nothing steps at the bottom.
   */
  import type { Viewport } from '@xyflow/svelte';
  import { onDestroy, onMount, untrack } from 'svelte';
  import { getGraphContext, hasGraphContext, nodeState, type TowerSource } from './context';
  import { bandFreq, bandHue, bandOctave } from '../layout/spectrum';
  import type { TowerIn, TowerLayer } from '../layout/towerlayout';
  import { towerTicks, withConstant, type StratumName, type TowerScale } from '../layout/towerscale';
  import type { Minimap } from '../layout/minimap';
  import type { Explained, HeardLevel, WrittenLevel } from '../layout/explained';
  import { seconds } from '../layout/timelayers';
  import { onFrames } from '../audio/ticker';
  import { hslRgb, noteHsl, sectionTintRgb } from './theme';
  import { heard, noteHz, outRgb } from './heard';
  import { drawSpire, spireOf } from './spire';
  import { cellView, selectorOf, selectorRow, valueAt, valueSpectrum, type CellView, type ValueShare } from '../layout/cellview';
  import { lapOf } from '@yggi/cells/engine/readers';
  import { fillColour } from './edgeStyle';
  import { C0 } from '../layout/spectrum';
  import { STRIP_MAX, STRIP_MIN } from './state/strip.svelte';

  /** Widths (px): from `NAMED` on, the names are written; under `BARE`, only the scale and its strata. */
  const NAMED = 120;
  const BARE = 48;

  let {
    ins,
    structure = [],
    map = null,
    layers = new Map(),
    rows = { gate: 0, voice: 0, mixer: 0 },
    viewport = { x: 0, y: 0, zoom: 1 },
    scale,
    width,
    onresize,
    ontoggle,
    onfocus,
    onzoom,
    sectionOf = () => undefined,
    tintOf = (name: string) => (graph ? outRgb(graph, name) : [255, 255, 255]),
    source,
    heardLevels = null,
    focus = null,
  }: {
    ins: readonly TowerIn[];
    /** The lanes, and the lanes each node feeds (layout/minimap.ts). */
    map?: Minimap | null;
    /** Each node's stratum, and the neutral zone's rows (the graph's y): towerLayers'. */
    layers?: ReadonlyMap<string, TowerLayer>;
    rows?: { readonly gate: number; readonly voice: number; readonly mixer: number };
    /** The structure: each stepped cell at its rate (decades), the tables nothing steps at -Infinity. */
    structure?: readonly { name: string; at: number }[];
    /** The graph's pan and zoom: where its own positions (the rows, the sockets) are on the screen. */
    viewport?: Viewport;
    /** The tower's scale (towerscale.ts): the screen's y for a height on it, its strata. */
    scale: TowerScale;
    /** Its width (px), STRIP_MIN … STRIP_MAX; dragged, `onresize` with the new one. */
    width: number;
    onresize: (width: number) => void;
    /** Its button: collapsed, or open again. */
    ontoggle: () => void;
    /** An out's own colour (its source's name): its section's, steady — its share of the sum, its lane, its name. */
    tintOf?: (source: string) => readonly number[];
    /** An out's section: its place among its selector's (its source's id), where one drives it. */
    sectionOf?: (source: string) => number | undefined;
    /** What the rows read, outside the graph (the time view's moment); inside it, the graph's context. */
    source?: TowerSource;
    /** The levels heard against those written (layout/explained.ts): the heard drawn at their periods, gaps marked. */
    heardLevels?: Explained<HeardLevel, WrittenLevel> | null;
    /** The cell selected (its name): its row outlined and named. */
    focus?: string | null;
    /** A pinch in the strip: the view zoomed by `factor` about (x, y), the screen's px. */
    onzoom?: (z: { factor: number; x: number; y: number }) => void;
    /** A tap on what the strip shows for a node (its id): the view moves to it. */
    onfocus?: (id: string) => void;
  } = $props();

  // (the graph's context, inside the graph: its lanes, its sound; the rows read `source`, else the graph's)
  const graph = hasGraphContext() ? getGraphContext() : null;
  const ctx = $derived<TowerSource>(source ?? graph!);
  const BANDS = 120;
  // (how much of its band's note the spectrum's section colours take: a slight chromatic tint)
  const TINT = 0.15;
  let h = $state(0);
  let canvas = $state<HTMLCanvasElement>();
  const sw = $derived(Math.round(Math.max(STRIP_MIN, Math.min(STRIP_MAX, width))));
  // (wide enough for the names; so narrow only the scale shows)
  const open = $derived(sw >= NAMED);
  const bare = $derived(sw < BARE);
  // (its one handle, on its left edge: a tap collapses it or opens it again, a drag sets its width — it follows the
  // pointer from the first few px, so a finger's slop is a tap)
  const TAP = 6;
  let drag: { x: number; w: number; moved: boolean } | null = null;
  function grip(e: PointerEvent) {
    drag = { x: e.clientX, w: sw, moved: false };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function dragged(e: PointerEvent) {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) <= TAP) return;
    drag.moved = true;
    onresize(Math.max(STRIP_MIN, Math.min(STRIP_MAX, drag.w + drag.x - e.clientX)));
  }
  function released(e: PointerEvent) {
    const was = drag;
    drag = null;
    if (was && !was.moved && e.type === 'pointerup') ontoggle();
  }
  const dpr = typeof devicePixelRatio === 'number' ? devicePixelRatio : 1;

  // (the screen's y for a height on the tower, decades: the view's scale)
  const yOf = (d: number) => scale.y(d);
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
    const { left, right, rest } = heard(graph!, o.name, BANDS);
    const k = rest ? 0.7 : 1;
    return { l: o.left ? left.map((v) => v * k) : new Float32Array(BANDS), r: o.right ? right.map((v) => v * k) : new Float32Array(BANDS) };
  }

  // (a band's colour: its note's, the palette's, at an opacity)
  // (by its octave: full in the fourth, darker below, brighter above)
  const hsla = (hue: number, a: number, octave = 0) => {
    const [hh, ss, ll] = noteHsl(hue, false, octave);
    return `hsla(${hh}, ${ss}%, ${ll}%, ${a})`;
  };

  // (each band its note's colour by its octave, as rgb: a spire's dots)
  const hues = Array.from({ length: BANDS }, (_, b) => hslRgb(...noteHsl(bandHue(b, BANDS), false, bandOctave(b, BANDS))));

  // (what a row shows, kept until the piece or a table's turn changes: not each frame — a selector's steps in
  // order, each the sections it picks; else the cell's spectrum of values, a table of sections' each its section)
  type Row = { steps: NonNullable<ReturnType<typeof selectorRow>>; n: number } | { v: CellView; sections: number; spread: ValueShare[]; selector?: string };
  let spectra = { program: null as unknown, shifts: null as unknown, got: new Map<string, Row | null>() };
  function spectrumNow(name: string): Row | null {
    const steps = selectorRow(ctx.program, name, ctx.shifts);
    if (steps) return steps.length ? { steps, n: ctx.program.cells.get(ctx.program.cells.get(name)?.over ?? '')?.units.length ?? 1 } : null;
    const v = cellView(ctx.program, name, ctx.shifts, false);
    if (!v) return null;
    const sections = [...(ctx.program.sections?.values() ?? [])].includes(name) ? (ctx.program.cells.get(name)?.units.length ?? 0) : 0;
    const spread = valueSpectrum(v, sections > 0);
    return spread.length ? { v, sections, spread, ...(sections ? { selector: selectorOf(ctx.program, name) } : {}) } : null;
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
    if (x < 0 || y < 0 || x > r.width || y > r.height || (e.target as Element | null)?.closest?.('.grip')) return;
    const id = tapped(x, y);
    if (id) onfocus(id);
  }

  // (two fingers down in the strip pinch the view: the strip takes the gesture itself, the graph under it not told; one
  // finger still goes through, to pan)
  $effect(() => {
    if (!onzoom) return;
    let span: number | null = null;
    const inside = (t: Touch) => {
      const r = stripEl?.getBoundingClientRect();
      return !!r && t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
    };
    const apart = (ts: TouchList) => Math.hypot(ts[0]!.clientX - ts[1]!.clientX, ts[0]!.clientY - ts[1]!.clientY);
    const start = (e: TouchEvent) => {
      span = e.touches.length === 2 && inside(e.touches[0]!) && inside(e.touches[1]!) ? apart(e.touches) : null;
      if (span !== null) (e.stopPropagation(), e.preventDefault());
    };
    const move = (e: TouchEvent) => {
      if (span === null || e.touches.length !== 2) return;
      e.stopPropagation();
      e.preventDefault();
      const d = apart(e.touches);
      const [a, b] = [e.touches[0]!, e.touches[1]!];
      if (span > 0) onzoom({ factor: d / span, x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });
      span = d;
    };
    const end = (e: TouchEvent) => {
      if (e.touches.length < 2) span = null;
    };
    const opts = { capture: true, passive: false } as const;
    window.addEventListener('touchstart', start, opts);
    window.addEventListener('touchmove', move, opts);
    window.addEventListener('touchend', end, opts);
    window.addEventListener('touchcancel', end, opts);
    return () => {
      window.removeEventListener('touchstart', start, opts);
      window.removeEventListener('touchmove', move, opts);
      window.removeEventListener('touchend', end, opts);
      window.removeEventListener('touchcancel', end, opts);
    };
  });

  function draw() {
    const g = canvas?.getContext('2d');
    if (!g || !h) return;
    hits = [];
    labelled = [];
    const W = sw;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, h);
    const band = (b: number) => Math.log10(bandFreq(b, BANDS));
    const half = (yOf(band(1)) - yOf(band(0))) * 0.5;
    // (the scale with the constant's band at the strip's foot, when it has tables to show)
    const foot = constantTop();
    const tower = foot < h ? withConstant(scale, { top: foot, bottom: h }) : scale;
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
    for (const r of rails(tower)) {
      g.fillStyle = r.colour;
      g.globalAlpha = 0.8;
      g.fillRect(W - 6, r.y0, 4, r.y1 - r.y0);
      g.globalAlpha = 1;
    }
    // the audible's scale: the frequency at the right (1, 2, 5 a decade, in Hz, from 1000 in kHz; between them a tick a
    // step, unnamed), the octaves at the left (each C, named Cn); a name only where it has room
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
    const ticks = towerTicks(scale, 0, h);
    const said: number[] = [];
    g.font = `${open ? 10 : 8}px system-ui, sans-serif`;
    g.strokeStyle = css('--line');
    for (const t of ticks.hz) {
      g.beginPath();
      g.moveTo(W - (t.named ? 18 : 11), t.y);
      g.lineTo(W - 6, t.y);
      g.stroke();
      if (!t.named || bare || !room(said, t.y)) continue;
      said.push(t.y);
      g.fillStyle = css('--text-muted');
      g.textAlign = 'right';
      // (clear of the rail's name, which stands along it at W - 10)
      halo(t.label, W - 20, t.y + 3);
      labelled.push(t.y);
    }
    const octaves: number[] = [];
    for (const t of ticks.octaves) {
      g.beginPath();
      g.moveTo(0, t.y);
      g.lineTo(open ? 10 : 6, t.y);
      g.stroke();
      if (bare || !room(octaves, t.y)) continue;
      octaves.push(t.y);
      g.fillStyle = css('--text-muted');
      g.textAlign = 'left';
      halo(t.label, open ? 12 : 8, t.y + 3);
    }
    // round periods, under the audible
    g.font = '10px system-ui, sans-serif';
    g.textAlign = 'right';
    for (const t of ticks.periods) {
      g.strokeStyle = css('--line');
      g.beginPath();
      g.moveTo(open ? 0 : W - 12, t.y);
      g.lineTo(W, t.y);
      g.stroke();
      if (open) {
        g.fillStyle = css('--text-muted');
        g.fillText(t.label, W - 10, t.y - 3);
        labelled.push(t.y - 6);
      }
    }
    // under the zone, the rainbow on down through the rates: a rate's octaves in a pitch's colours, muted
    const lowest = scale.at(h);
    for (let k = Math.floor(12 * Math.log2(10 ** lowest / C0)); ; k++) {
      const d = Math.log10(C0 * 2 ** (k / 12));
      if (d >= Math.log10(20)) break;
      const y0 = yOf(d + Math.log10(2) / 24);
      const y1 = yOf(d - Math.log10(2) / 24);
      if (y1 < 0) continue;
      g.fillStyle = hsla((((k % 12) + 12) % 12) * 30, 0.2, Math.floor(k / 12) - 4);
      g.fillRect(0, y0, W, y1 - y0);
    }
    // the constant: its own ground, under a line, over what the rates' rainbow would show there
    if (foot < h) {
      g.fillStyle = css('--surface');
      g.globalAlpha = 0.85;
      g.fillRect(0, foot, W - 7, h - foot);
      g.globalAlpha = 1;
      g.strokeStyle = css('--line');
      g.beginPath();
      g.moveTo(0, foot);
      g.lineTo(W, foot);
      g.stroke();
    }
    // (collapsed: the scale and its strata only)
    if (bare) return names(g, W, tower);
    // (no lanes — outside the graph, or nothing goes out: the rows in one wide column, solo)
    const solo = !map || !map.lanes.length;
    const m: Minimap = solo ? { lanes: [], span: new Map() } : map;
    // the lanes: a narrow column in the strip's middle, a lane an out; the combined spectrum out from its sides, the left
    // channel left, the right right; the names on the left when opened (under 20 Hz the sides are free)
    // (the lanes funnel: wide under the audible, where the structure and the neutral zone need the room, narrowing into
    // the column just under 20 Hz, eased; `lwAt(y)` a lane's width at a height, `x0At(y)` the lanes' left edge)
    const sy = (y: number) => y * viewport.zoom + viewport.y;
    const A = W - 8;
    const nl = Math.max(1, m.lanes.length);
    const lw = solo ? A * (open ? 0.5 : 0.8) : Math.min(open ? 8 : 5, (A * 0.6) / nl);
    const wide = solo ? lw : Math.max(lw, Math.min(open ? 30 : 12, (A * (open ? 0.5 : 0.8)) / nl));
    const yA = yOf(Math.log10(20));
    const rowTop = Math.min(sy(rows.gate), sy(rows.voice), sy(rows.mixer));
    const yB = yA + Math.max(16, Math.min(80, 0.3 * (rowTop - yA)));
    const lwAt = (y: number) => {
      const t = Math.max(0, Math.min(1, (y - yA) / (yB - yA)));
      return lw + (wide - lw) * t * t * (3 - 2 * t);
    };
    const x0At = (y: number) => A / 2 - (lwAt(y) * nl) / 2;
    const x0 = x0At(yA);
    const x1 = x0 + lw * nl;
    const mid = (k: number, y = yA) => x0At(y) + (k + 0.5) * lwAt(y);
    const across = (id: string, y: number): readonly [number, number] => {
      const [a, b] = m.span.get(id) ?? [0, nl - 1];
      return [x0At(y) + a * lwAt(y) + 1, x0At(y) + (b + 1) * lwAt(y) - 1];
    };
    // (a line down a lane, at x(y): straight where the lanes are, sampled through the funnel)
    const along = (x: (y: number) => number, ya: number, yb: number) => {
      const [lo, hi] = [Math.max(-10, Math.min(ya, yb)), Math.min(h + 10, Math.max(ya, yb))];
      if (hi <= lo) return;
      g.beginPath();
      g.moveTo(x(lo), lo);
      for (let y = Math.max(lo, yA); y < Math.min(hi, yB); y += 3) g.lineTo(x(y), y);
      g.lineTo(x(hi), hi);
      g.stroke();
    };
    g.strokeStyle = css('--line');
    g.globalAlpha = 0.5;
    if (!solo) for (let k = 0; k <= nl; k++) along((y) => x0At(y) + k * lwAt(y), 0, h);
    g.globalAlpha = 1;
    const nameOf = (id: string) => id.slice('cell:'.length);
    // the structure: each stepped cell at its rate, across the lanes it feeds, the values it takes (each as wide as
    // it is held, in its colour, the one it holds now lit); cells sharing a place stacked
    const paint = (c: string) => (c.startsWith('var(') ? css(c.slice(4, -1)) : c);
    const used = new Map<string, number>();
    const named: number[] = [];
    // (the table of sections' row: where each section's chip is, and which the selector picks now: each lane exits from its)
    const sectionRow: { at: { y: number; centre: Map<number, number>; picked: Set<number> } | null } = { at: null };
    const chips = (name: string, y: number, [xa, xb]: readonly [number, number], inColumn = true, bands = 1) => {
      // (a chorded cell, a step that picks several: a band each, the row grown up from its place)
      const grown = (bands - 1) * BAND;
      const got = spectrumOf(name);
      if (!got) return;
      const playing = ctx.state !== 'stopped';
      // (where it is in its lap: its playhead, a clock's its beat; none, nothing lit — a part not playing now)
      const local = ctx.heads.cells.get(name)?.local ?? ctx.heads.beatAt.get(name);
      const lap = lapOf(ctx.program, name);
      const t = playing && local !== undefined && local !== null && lap > 0 ? (((local / lap) % 1) + 1) % 1 : null;
      const rgb = (c: readonly number[]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
      // its segments, left to right, each its share of the row in its colours (a selector's step: a stripe a section it
      // picks), the one it holds now lit; a table of sections lights the sections its selector picks now
      const segments: { share: number; colours: string[]; lit: boolean; section?: number }[] =
        'steps' in got
          ? got.steps.map((s) => ({ share: s.t1 - s.t0, colours: s.picks.map((k) => rgb(sectionTintRgb(k, got.n))), lit: t !== null && t >= s.t0 && t < s.t1 }))
          : got.spread.map((e) => {
              const now = got.sections ? null : t !== null ? valueAt(got.v, t, false) : null;
              const picked = got.selector && playing ? ctx.heads.cells.get(got.selector)?.entries.has(e.index) : false;
              return {
                share: e.share,
                colours: [got.sections ? rgb(sectionTintRgb(e.index, got.sections)) : paint(fillColour(e.fill))],
                lit: got.sections ? !!picked : e.key === now,
                ...(got.sections ? { section: e.index } : {}),
              };
            });
      // (its state now, playing: the value it holds lit, taller and outlined, the outline flashing at each step it
      // takes and fading through the step — a cell of one value (a groove's hits) shows its steps so; in a rest,
      // nothing lit)
      const flash = 1 - ((((local ?? 0) % 1) + 1) % 1);
      hit(`cell:${name}`, xa, y - 4 - grown / 2, xb, y + 4 + grown / 2);
      let x = xa;
      if (segments.some((e) => e.section !== undefined)) sectionRow.at = { y, centre: new Map(), picked: new Set() };
      for (const e of segments) {
        const w = Math.max(1, e.share * (xb - xa) - 0.5);
        if (sectionRow.at && e.section !== undefined) {
          sectionRow.at.centre.set(e.section, x + (e.share * (xb - xa)) / 2);
          if (e.lit) sectionRow.at.picked.add(e.section);
        }
        const hh = (e.lit ? 6 : 4) + grown;
        g.globalAlpha = !playing || e.lit ? 1 : 0.3;
        e.colours.forEach((c, k) => {
          g.fillStyle = c;
          g.fillRect(x, y - hh / 2 + (k * hh) / e.colours.length, w, hh / e.colours.length);
        });
        if (e.lit) {
          g.globalAlpha = 0.35 + 0.65 * flash;
          g.strokeStyle = css('--text');
          g.lineWidth = 1;
          g.strokeRect(x - 0.5, y - 3.5 - grown / 2, w + 1, 7 + grown);
        }
        x += e.share * (xb - xa);
      }
      g.globalAlpha = 1;
      // (the cell selected: its row outlined, its name bold)
      if (name === focus) {
        g.strokeStyle = css('--text');
        g.lineWidth = 1.5;
        g.strokeRect(xa - 2.5, y - 5.5 - grown / 2, xb - xa + 5, 11 + grown);
        g.lineWidth = 1;
      }
      if (open && inColumn) {
        // (names of one height in other lanes, one under the other)
        let ny = y;
        while (named.some((n) => Math.abs(n - ny) < 8)) ny += 8;
        named.push(ny);
        g.fillStyle = css(name === focus ? '--text' : '--text-muted');
        g.font = `${name === focus ? '700 ' : ''}8px system-ui, sans-serif`;
        g.textAlign = 'left';
        g.fillText(name, 4, ny + 3, x0At(ny) - 6);
      }
    };
    // (a lane's player: the highest of the structure's cells in that lane alone, where its bridge starts)
    const player = new Map<number, number>();
    const players = new Map<number, { name: string; y: number }[]>();
    const place = (id: string, y: number, grown = 0) => {
      // (a cell with no lanes of its own goes across them all, as it is drawn: `across`)
      const [a, b] = m.span.get(id) ?? [0, nl - 1];
      // (a chorded cell takes the rows its bands grow into, above its place)
      const up = Math.ceil(grown / ROW);
      const rows = (n: number) => Array.from({ length: up + 1 }, (_, j) => Math.round(y / ROW) + n - j);
      let n = 0;
      while ([...Array(Math.max(0, b - a + 1)).keys()].some((k) => rows(n).some((r) => used.has(`${r}:${a + k}`)))) n++;
      for (let k = a; k <= b; k++) for (const r of rows(n)) used.set(`${r}:${a + k}`, 1);
      if (a === b && m.span.has(id)) player.set(a, Math.min(player.get(a) ?? Infinity, y + n * ROW - grown / 2));
      return y + n * ROW - grown / 2;
    };
    const tables: string[] = [];
    // (how many sections a selector's step picks, at most: its bands)
    const bandsOf = (name: string) => {
      const got = spectrumOf(name);
      return got && 'steps' in got ? Math.max(1, ...got.steps.map((st) => st.picks.length)) : 1;
    };
    // (the selectors' row, the lowest of them: where every lane's bridge reaches down to)
    let selectorY = -Infinity;
    for (const c of structure) {
      const id = `cell:${c.name}`;
      if (c.at === -Infinity) {
        tables.push(c.name);
        continue;
      }
      const y = yOf(c.at);
      if (layers.get(id) === 'selector') selectorY = Math.max(selectorY, y);
      if (y < -10 || y > h + 10) continue;
      const bands = bandsOf(c.name);
      const at = place(id, y, (bands - 1) * BAND);
      // (a lane's player — a cell in that lane alone — is drawn on its bridge and named up it, not in the left column)
      const [a, b] = m.span.get(id) ?? [-1, -2];
      if (a === b) (players.get(a) ?? players.set(a, []).get(a)!).push({ name: c.name, y: at });
      chips(c.name, at, across(id, at), a !== b, bands);
    }
    tables.forEach((name, k) => chips(name, h - 10 - k * ROW, across(`cell:${name}`, h - 10 - k * ROW)));
    // the spectrum, all the outs together: each band's bar as long as its loudest out, split into the outs' shares in
    // their colours, in the lanes' order from the column out on both sides (mirrored: the first lane's innermost); the left
    // channel out from the column's left side, the right from its right
    const outs = new Map(ins.map((o) => [o.id, o]));
    const each = m.lanes.flatMap((lane, k) => {
      const o = outs.get(lane.edge);
      return o ? [{ k, lane, o, ...levels(o), c: tintOf(o.name), off: nodeState(graph!, lane.source) === 'off' }] : [];
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
          // (its section's colour, a slight tint of the band's note in it: TINT)
          const note = hues[b]!;
          const c = [0, 1, 2].map((i) => Math.round(e.c[i]! * (1 - TINT) + note[i]! * TINT));
          g.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(e.off ? 0.3 : 1) * (0.45 + 0.55 * top)})`;
          g.fillRect(side === 'left' ? x0 - 1 - at - part : x1 + 1 + at, y - hb / 2, part, hb);
          hit(e.lane.source, side === 'left' ? x0 - 1 - at - part : x1 + 1 + at, y - hb / 2, side === 'left' ? x0 - 1 - at : x1 + 1 + at + part, y + hb / 2);
          at += part;
        });
      }
    }
    const laneActive = new Map<number, boolean>();
    const namedLeft: number[] = [];
    const namedRight: number[] = [];
    // each out's spire in its lane, at its fundamental; its bridge straight down the lane, through its player, to the selector
    for (const e of each) {
      const { k, o, l, r, c } = e;
      const s = spireOf(
        l.map((v, b) => Math.max(v, r[b] ?? 0)),
        noteHz(graph!, o.name),
        BANDS,
      );
      const top = s ? yOf(band(s.root)) : sy(o.top);
      const from = player.get(k) ?? sy(rows.gate);
      // (the lane is its signal's, as the graph's edge is: neutral at rest, the note's colour while it sounds; it is
      // active when the section that drives it is picked — a lane of a section not picked is dim)
      const section = sectionOf(e.lane.source);
      const playing = ctx.state !== 'stopped';
      const active = !e.off && (!playing || section === undefined || !sectionRow.at || sectionRow.at.picked.has(section));
      laneActive.set(k, active);
      const signal = playing ? outRgb(graph!, o.name) : null;
      g.strokeStyle = signal ? `rgb(${signal[0]}, ${signal[1]}, ${signal[2]})` : css('--edge');
      g.globalAlpha = active ? (playing ? 0.9 : 0.7) : 0.25;
      g.lineWidth = 1;
      // (down through the structure to the selector, out of the chip of its section: each lane exits from the section that
      // drives it — two outs of one section (a build's snare and riser) split from its one chip)
      const exit = section !== undefined ? sectionRow.at?.centre.get(section) : undefined;
      const foot = sectionRow.at && exit !== undefined ? sectionRow.at.y : Math.max(from, selectorY);
      const fan = exit !== undefined ? Math.max(0, Math.min(44, foot - from - 8)) : 0;
      const laneX = (y: number) => {
        if (exit === undefined || y <= foot - fan) return mid(k, y);
        const t = Math.min(1, (y - (foot - fan)) / fan);
        return mid(k, y) + (exit - mid(k, y)) * t * t * (3 - 2 * t);
      };
      {
        const [lo, hi] = [Math.max(-10, Math.min(top, foot)), Math.min(h + 10, Math.max(top, foot))];
        if (hi > lo) {
          g.beginPath();
          g.moveTo(laneX(lo), lo);
          for (let y = lo + 3; y < hi; y += 3) g.lineTo(laneX(y), y);
          g.lineTo(laneX(hi), hi);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      hit(e.lane.source, mid(k) - lw / 2, yB, mid(k) + lw / 2, s ? yOf(band(s.top)) - 4 : top - 4);
      hit(e.lane.source, mid(k, from) - lwAt(from) / 2, from, mid(k, from) + lwAt(from) / 2, yB);
      if (s)
        drawSpire(
          g,
          mid(k),
          (b) => yOf(band(b)),
          s,
          Math.min(3.5, lw * 0.6),
          c,
          (b) => hues[b]!,
          e.off ? 0.3 : 1,
        );
      // (its name at its base fundamental, steady (the note now jumps), on its side of the column — the lanes in the left
      // half to its left, the others to its right — over the spectrum on a halo; a name whose neighbour on that side is
      // too close goes under it; playing, only while it sounds)
      if (open && (ctx.state === 'stopped' || nodeState(graph!, e.lane.source) === 'live')) {
        // (its own side first; where a name stands there already, the other side if it is free at that height, else under it)
        const seat = sy(o.top) + 3;
        const free = (side: number[], y: number) => side.every((n) => Math.abs(n - y) >= 10);
        let leftSide = k < nl / 2;
        let ny = seat;
        if (!free(leftSide ? namedLeft : namedRight, seat) && free(leftSide ? namedRight : namedLeft, seat)) leftSide = !leftSide;
        const side = leftSide ? namedLeft : namedRight;
        while (!free(side, ny)) ny += 10;
        side.push(ny);
        g.font = '700 9px system-ui, sans-serif';
        g.textAlign = leftSide ? 'right' : 'left';
        g.lineWidth = 3;
        g.strokeStyle = css('--surface');
        const nx = leftSide ? x0 - 4 : x1 + 4;
        // (dim where its lane is: a voice of a section not picked)
        g.globalAlpha = active ? 1 : 0.35;
        g.strokeText(o.name, nx, ny);
        g.fillStyle = e.off ? css('--edge') : `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        g.fillText(o.name, nx, ny);
        g.globalAlpha = 1;
      }
    }
    // each lane's players named once, up its bridge from the highest one's chip, toward the gates' row (`off · prog`:
    // several, from the top down), in the highest one's section colour, on a halo
    for (const [k, ps] of players) {
      ps.sort((p, q) => p.y - q.y);
      const top = ps[0]!.y - 5;
      const room = top - (sy(rows.gate) + 8);
      if (room < 12 || top > h + 10) continue;
      const text = ps.map((p) => p.name).join(' · ');
      const t = tintOf(ps[0]!.name);
      g.font = `700 ${open ? 9 : 8}px system-ui, sans-serif`;
      const len = Math.min(room, g.measureText(text).width);
      g.textAlign = 'left';
      g.setTransform(dpr, 0, 0, dpr, (mid(k, top) + 3) * dpr, top * dpr);
      g.rotate(-Math.PI / 2);
      g.lineWidth = 3;
      g.strokeStyle = css('--surface');
      g.globalAlpha = laneActive.get(k) === false ? 0.35 : 1;
      g.strokeText(text, 0, 0, room);
      g.fillStyle = `rgb(${t[0]}, ${t[1]}, ${t[2]})`;
      g.fillText(text, 0, 0, room);
      g.globalAlpha = 1;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.lineWidth = 1;
      hit(`cell:${ps[0]!.name}`, mid(k, top) - 6, top - len, mid(k, top) + 4, top);
    }
    // the neutral zone's rows, named (A), and on them what stands there, in its lanes: a gate a dot, a voice a dot in
    // its note's colour, a mixer a square across the voices it mixes
    const zoneRows = [
      ['gates', rows.gate, 'gate'],
      ['voices', rows.voice, 'voice'],
      ['mixers', rows.mixer, 'mixer'],
    ] as const;
    for (const [label, y, layer] of zoneRows) {
      const members = [...layers].filter(([id, l]) => l === layer && m.span.has(id));
      if (!members.length) continue;
      const yy = sy(y);
      g.strokeStyle = css('--line');
      g.setLineDash([2, 3]);
      g.beginPath();
      g.moveTo(x0At(yy), yy);
      g.lineTo(x0At(yy) + lwAt(yy) * nl, yy);
      g.stroke();
      g.setLineDash([]);
      if (open) {
        g.fillStyle = css('--text-muted');
        g.font = '9px system-ui, sans-serif';
        g.textAlign = 'left';
        g.fillText(label, 4, yy + 3, x0At(yy) - 6);
      }
      const at = new Map<number, number>();
      // (a voice's name up its lane from above its dot; voices sharing a lane, or in lanes too close for two names side
      // by side, one above the other: a staircase)
      const above = new Map<number, number[]>();
      // (the room over the voices: names stay under the mixers' row, else they run on through its mark, and go side by
      // side in a column of their own, as many as it takes)
      const ceiling = layer === 'voice' && layers.size && [...layers.values()].includes('mixer') ? sy(rows.mixer) + 10 : -Infinity;
      let last: { lane: number; top: number } | null = null;
      members.sort(([x], [y]) => m.span.get(x)![0] - m.span.get(y)![0]);
      for (const [id] of members) {
        const [a, b] = m.span.get(id)!;
        const [xa, xb] = across(id, yy);
        const n = at.get(a) ?? 0;
        at.set(a, n + 1);
        const name = nameOf(id);
        hit(id, xa, yy - 4, xb, yy + 4);
        // (dim where its lanes are all not picked)
        const lanes = Array.from({ length: b - a + 1 }, (_, i) => laneActive.get(a + i));
        g.globalAlpha = lanes.length && lanes.every((v) => v === false) ? 0.35 : 1;
        // (its section's colour, steady: a mixer's the mean of what it mixes)
        const t = tintOf(name);
        const c = `rgb(${t[0]}, ${t[1]}, ${t[2]})`;
        g.fillStyle = c;
        g.strokeStyle = c;
        if (layer === 'mixer') {
          if (b > a) {
            g.beginPath();
            g.moveTo(xa + lwAt(yy) / 2 - 1, yy);
            g.lineTo(xb - lwAt(yy) / 2 + 1, yy);
            g.stroke();
          }
          g.fillRect((xa + xb) / 2 - 3, yy - 3, 6, 6);
        } else {
          const x = (xa + xb) / 2 + (n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 3 : 0);
          g.beginPath();
          // (a voice that reaches several lanes: a bar across them to its dot, as a mixer's, so each lane runs into it)
          if (layer === 'voice' && b > a) {
            g.beginPath();
            g.moveTo(xa + lwAt(yy) / 2 - 1, yy);
            g.lineTo(xb - lwAt(yy) / 2 + 1, yy);
            g.stroke();
          }
          g.beginPath();
          g.arc(x, yy, 2.5, 0, 2 * Math.PI);
          g.fill();
          if (layer === 'voice') {
            // its name, rotated, up its lane from above its dot, on a halo
            const close: boolean = last !== null && (a - last.lane) * lwAt(yy) < (open ? 11 : 10);
            g.font = `700 ${open ? 9 : 8}px system-ui, sans-serif`;
            const len = g.measureText(name).width;
            const tops = above.get(a) ?? [];
            // (the first column that has room for it: under the previous name, and the next lane's, clear of the ceiling)
            let col = 0;
            const topOf = (k: number): number => Math.min(tops[k] ?? yy - 6, k === 0 && close && last ? last.top - 6 : Infinity);
            while (topOf(col) - len < ceiling && col < 6) col++;
            const from: number = topOf(col);
            const pitch = open ? 11 : 10;
            g.textAlign = 'left';
            g.setTransform(dpr, 0, 0, dpr, ((xa + xb) / 2 + 3 + col * pitch) * dpr, from * dpr);
            g.rotate(-Math.PI / 2);
            g.lineWidth = 3;
            g.strokeStyle = css('--surface');
            g.strokeText(name, 0, 0);
            // (a low note's colour is dark: its name a third lighter, to read on the strip)
            g.fillStyle = `rgb(${t.map((v) => Math.round(v + (255 - v) * 0.35)).join(', ')})`;
            g.fillText(name, 0, 0);
            g.setTransform(dpr, 0, 0, dpr, 0, 0);
            g.lineWidth = 1;
            hit(id, xa, from - len, xb, from);
            tops[col] = from - len - 6;
            above.set(a, tops);
            last = { lane: a, top: from - len };
          }
        }
      }
      g.globalAlpha = 1;
    }
    // the levels heard (layout/explained.ts), at their periods at the right, left of the rails: a bar as long as it is
    // strong, white where a level written meets it (its row names it), orange alone (unexplained) with its period; a
    // level written that is not heard, a hollow ring
    if (heardLevels) {
      const room = Math.min(40, W * 0.25);
      const at = (period: number) => yOf(-Math.log10(period));
      g.font = '9px system-ui, sans-serif';
      g.textAlign = 'right';
      for (const [h0, matched] of [...heardLevels.both.map((b) => [b.heard, true] as const), ...heardLevels.heardOnly.map((x) => [x, false] as const)]) {
        const y = at(h0.period);
        if (y < 0 || y > h) continue;
        const len = Math.max(2, h0.strength * room);
        g.fillStyle = css(matched ? '--time-section' : '--time-heard');
        g.fillRect(W - 8 - len, y - 1.5, len, 3);
        if (!matched && open) {
          g.fillText(seconds(h0.period), W - 12 - len, y + 3);
          labelled.push(y);
        }
      }
      g.strokeStyle = css('--time-section');
      for (const w0 of heardLevels.writtenOnly) {
        const y = at(w0.period);
        if (y < 0 || y > h) continue;
        g.beginPath();
        g.arc(W - 12, y, 2.5, 0, 2 * Math.PI);
        g.stroke();
      }
      g.textAlign = 'left';
    }
    names(g, W, tower);
  }

  // the strata's rails (the screen's y, top over bottom): the scale's strata (towerscale.ts), each in its colour
  function rails(t: TowerScale): { name: string; colour: string; y0: number; y1: number }[] {
    const colour: Record<StratumName, string> = { constant: '--text-muted', slow: '--meter-2', pulse: '--meter-1', voices: '--meter-3', audible: '--accent', card: '--accent' };
    return t.strata.map((x) => ({ name: x.name, colour: css(colour[x.name]), y0: x.top, y1: x.bottom }));
  }

  // (the constant's top: room for its tables, a row each, and its name; none, the strip's foot)
  const ROW = 8;
  // (a band of a chorded cell's row, px)
  const BAND = 4;
  function constantTop(): number {
    const n = structure.filter((c) => c.at === -Infinity).length;
    return n ? h - Math.max(48, 16 + n * ROW) : h;
  }

  // each rail named along it, where it shows (folded too, smaller), on a halo
  // (where the labels at the strip's right edge stand, the y of each: a stratum's name keeps clear of them)
  let labelled: number[] = [];
  function names(g: CanvasRenderingContext2D, W: number, t: TowerScale) {
    for (const r of rails(t)) {
      const a = Math.max(0, r.y0);
      const b = Math.min(h, r.y1);
      if (b - a < 40) continue;
      g.font = `700 ${open ? 11 : bare ? 8 : 9}px system-ui, sans-serif`;
      g.textAlign = 'center';
      // (its middle, clear of the labels by 4 px; else where along its band it stands furthest from them, a name's
      // length clear of the band's ends)
      const half = g.measureText(r.name).width / 2 + 2;
      const clear = (c: number) => Math.min(Infinity, ...labelled.map((y) => Math.abs(y - c) - half));
      let at = (a + b) / 2;
      if (clear(at) < 4) for (let c = a + half; c <= b - half; c += 2) if (clear(c) > clear(at) + 1) at = c;
      g.setTransform(dpr, 0, 0, dpr, (W - 10) * dpr, at * dpr);
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
    void [
      viewport.x,
      viewport.y,
      viewport.zoom,
      scale,
      heardLevels,
      focus,
      source && ctx.heads,
      ins,
      structure,
      map,
      layers,
      rows,
      sw,
      h,
      ctx.program,
      ctx.shifts,
      ctx.state,
      graph?.muted,
      canvas,
    ];
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
  <!-- its handle, on its left edge: tap to collapse or open, drag to resize -->
  <div
    class="grip"
    role="separator"
    aria-orientation="vertical"
    aria-valuenow={sw}
    aria-valuemin={STRIP_MIN}
    aria-valuemax={STRIP_MAX}
    aria-label="The tower's handle: tap to {bare ? 'open' : 'collapse'} it, drag to resize"
    title={bare ? 'Tap to open the tower, drag to resize' : 'Tap to collapse the tower, drag to resize'}
    onpointerdown={grip}
    onpointermove={dragged}
    onpointerup={released}
    onpointercancel={released}
  ></div>
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
  /* (a finger-sized pill astride its left edge, a grip's two lines on it) */
  .grip {
    position: absolute;
    top: 50%;
    left: -14px;
    width: 28px;
    height: 72px;
    transform: translateY(-50%);
    border-radius: var(--radius-pill);
    border: 1px solid var(--line);
    background:
      linear-gradient(var(--text-muted), var(--text-muted)) 10px 50% / 2px 24px no-repeat,
      linear-gradient(var(--text-muted), var(--text-muted)) 16px 50% / 2px 24px no-repeat,
      var(--bg);
    cursor: ew-resize;
    pointer-events: auto;
    touch-action: none;
  }
  .grip:hover,
  .grip:active {
    border-color: var(--accent);
  }
</style>
