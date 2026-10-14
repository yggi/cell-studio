/**
 * The time view's layers, drawn (ui/TimeView.svelte, in this order: zones, scalogram, waterfall, waveform, structure,
 * notes, grid, meter, sections, heard, splices, cells, patterns): each onto the canvas `g` over the frame `f`, its
 * colours read from the theme's CSS by `css`. What each shows is worked out in layout/timelayers.ts, its pixels in
 * layout/timepictures.ts, where things sit in layout/timeview.ts.
 */
import type { Boundary } from '@yggi/cells/engine/time/boundaries';
import { reach } from '@yggi/cells/engine/time/wavelet';
import type { CellSpan, Laned, Named, Patterns } from '../layout/timelayers';
import { familyHue, seconds } from '../layout/timelayers';
import { waveColumns } from '../layout/timepictures';
import { CARD, freqTicks, timeTicks, xOf, yOf, zones, type Frame } from '../layout/timeview';
import { noteColour } from './theme';

type G = CanvasRenderingContext2D;
type Css = (name: string) => string;
type Picture = CanvasImageSource & { readonly width: number; readonly height: number };
/** A scalogram as drawn: its window (s) and its periods, the fastest first. */
interface Rows {
  readonly window: number;
  readonly periods: readonly number[];
}

/** The face, and every other zone banded. */
export function drawZones(g: G, f: Frame, css: Css): void {
  g.fillStyle = css('--time-face');
  g.fillRect(0, 0, f.width, f.height);
  zones(f).forEach((z, i) => {
    if (i % 2) return;
    g.fillStyle = css('--time-zone');
    g.fillRect(0, yOf(f, z.hi), f.width, yOf(f, z.lo) - yOf(f, z.hi));
  });
}

/** Where the scalogram's rows reach on the tower: from the fastest period's to the slowest's, and half a row. */
function scalBand(f: Frame, p: readonly number[]) {
  const top = yOf(f, 1 / (p[0] ?? NaN));
  const bottom = yOf(f, 1 / (p[p.length - 1] ?? NaN));
  return { top, bottom, half: (bottom - top) / Math.max(1, p.length - 1) / 2 };
}

/** The scalogram: its rows evenly spaced on the log axis, so the picture crops and stretches straight; veiled where the
 * window's edges reach, twice the wavelet's e-folding time from the start and the end (a loop folded from its rounds
 * has no edges: each moment was heard clear of them in some round). */
export function drawScalogram(g: G, f: Frame, css: Css, sb: Picture, scal: Rows, loop: boolean): void {
  const p = scal.periods;
  const sx = (f.from / scal.window) * sb.width;
  const sw = ((f.to - f.from) / scal.window) * sb.width;
  const { top, bottom, half } = scalBand(f, p);
  g.drawImage(sb, sx, 0, sw, sb.height, 0, top - half, f.width, bottom - top + 2 * half);
  g.fillStyle = css('--time-veil');
  for (const side of loop ? [] : [0, 1]) {
    g.beginPath();
    g.moveTo(xOf(f, side * scal.window), top - half);
    for (const q of p) g.lineTo(xOf(f, side ? scal.window * (1 - reach(q, scal.window, 2)) : scal.window * reach(q, scal.window, 2)), yOf(f, 1 / q));
    g.lineTo(xOf(f, side * scal.window), bottom + half);
    g.fill();
  }
}

/** The waterfall: in the audible, as far as the sound was rendered. */
export function drawWaterfall(g: G, f: Frame, fb: Picture, fall: { readonly freqs: readonly number[]; readonly seconds: number }): void {
  const lo = fall.freqs[0] ?? NaN;
  const hi = fall.freqs[fall.freqs.length - 1] ?? NaN;
  const to = Math.min(f.to, fall.seconds);
  if (to <= f.from) return;
  const sx = (f.from / fall.seconds) * fb.width;
  const sw = ((to - f.from) / fall.seconds) * fb.width;
  g.globalAlpha = 0.85;
  g.drawImage(fb, sx, 0, sw, fb.height, 0, yOf(f, hi), xOf(f, to), yOf(f, lo) - yOf(f, hi));
  g.globalAlpha = 1;
}

/** The waveform: in the card's octave, as far as the sound was rendered (`per` peaks a second). */
export function drawWaveform(g: G, f: Frame, css: Css, w: { readonly peaks: Float32Array; readonly done: number }, per: number): void {
  const mid = (yOf(f, CARD) + yOf(f, f.hi)) / 2;
  const amp = (yOf(f, CARD) - yOf(f, f.hi)) / 2;
  g.fillStyle = css('--time-ink');
  for (const { x, lo, hi } of waveColumns(f, w.peaks, w.done, per)) g.fillRect(x, mid - hi * amp, 1, Math.max(1, (hi - lo) * amp));
}

/** The structure: each cell where it plays at the height of its own length (a phrase of 4 s on the scalogram's 4 s
 * row), as a note sits at its pitch: the splice tree by scale, over the ridges it makes; a copy (base=) in its base's
 * colour, dashed. */
export function drawStructure(g: G, f: Frame, st: readonly Laned[]): void {
  const bottom = yOf(f, f.lo);
  g.font = '10px system-ui, sans-serif';
  g.lineWidth = 1;
  for (const node of st) {
    if (node.to < f.from || node.at > f.to || !(node.to > node.at)) continue;
    const x0 = xOf(f, node.at);
    const x1 = xOf(f, node.to);
    const y = Math.min(bottom - 4, yOf(f, 1 / (node.to - node.at)) + 9 * node.lane);
    const colour = noteColour(familyHue(node.base ?? node.cell));
    g.globalAlpha = 0.35;
    g.fillStyle = colour;
    g.fillRect(x0 + 0.5, y - 3, Math.max(1, x1 - x0 - 1), 6);
    g.globalAlpha = 0.9;
    g.strokeStyle = colour;
    g.setLineDash(node.base ? [3, 2] : []);
    g.strokeRect(x0 + 0.5, y - 3, Math.max(1, x1 - x0 - 1), 6);
    if (x1 - x0 > 8 * (node.cell.length + 1)) {
      g.fillStyle = colour;
      g.fillText(`&${node.cell}`, x0 + 3, y - 5);
    }
  }
  g.setLineDash([]);
  g.globalAlpha = 1;
}

/** The notes `n[a]` to `n[b]` one by one: at their pitch, `semi` px high, in their voice's colour. */
export function drawNotes(
  g: G,
  f: Frame,
  n: readonly { at: number; dur: number; freq: number; voice: string }[],
  a: number,
  b: number,
  semi: number,
  colour: (voice: string) => string,
): void {
  for (let i = a; i < b; i++) {
    const e = n[i];
    if (!e || e.at + e.dur < f.from || !(e.freq > 0)) continue;
    g.fillStyle = colour(e.voice);
    const x = xOf(f, e.at);
    g.fillRect(x, yOf(f, e.freq) - semi / 2, Math.max(1, xOf(f, e.at + e.dur) - x), semi);
  }
}

/** The grid: the tower's marks and its zones' names at the left, time's marks at the bottom. */
export function drawGrid(g: G, f: Frame, css: Css): void {
  g.font = '11px system-ui, sans-serif';
  g.fillStyle = css('--time-grid');
  for (const t of freqTicks(f)) g.fillRect(0, Math.round(yOf(f, t.hz)), f.width, 1);
  for (const t of timeTicks(f)) g.fillRect(Math.round(xOf(f, t.at)), 0, 1, f.height);
  g.fillStyle = css('--time-ink');
  for (const t of freqTicks(f)) g.fillText(t.label, 6, yOf(f, t.hz) - 3);
  for (const t of timeTicks(f)) g.fillText(t.label, xOf(f, t.at) + 3, f.height - 6);
  g.textAlign = 'right';
  for (const z of zones(f)) if (yOf(f, z.lo) - yOf(f, z.hi) > 16) g.fillText(z.name, f.width - 8, yOf(f, z.hi) + 14);
  g.textAlign = 'left';
}

/** The meter across the scalogram: the beat, the bar and the sections' length dashed, labelled; the bars' lines where
 * they are far enough apart to see; and at the right, the levels it hears most, named. */
export function drawMeter(g: G, f: Frame, css: Css, scal: Rows, mt: readonly Named[], rg: readonly { period: number; label: string | null }[]): void {
  const p = scal.periods;
  const { top, bottom } = scalBand(f, p);
  const shown = (q: number) => q >= (p[0] ?? NaN) && q <= (p[p.length - 1] ?? NaN);
  g.strokeStyle = css('--time-meter');
  g.fillStyle = css('--time-meter');
  g.setLineDash([6, 4]);
  for (const m of mt) {
    if (!shown(m.period)) continue;
    const y = Math.round(yOf(f, 1 / m.period)) + 0.5;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(f.width, y);
    g.stroke();
    g.fillText(`${m.label} ${seconds(m.period)}`, 130, y - 4);
  }
  g.setLineDash([]);
  const bar = mt.find((m) => m.label === 'bar') ?? mt.find((m) => m.label === 'beat');
  if (bar && xOf(f, bar.period) - xOf(f, 0) >= 12) {
    g.globalAlpha = 0.35;
    for (let t = Math.ceil(f.from / bar.period) * bar.period; t <= f.to; t += bar.period) g.fillRect(Math.round(xOf(f, t)), top, 1, bottom - top);
    g.globalAlpha = 1;
  }
  g.textAlign = 'right';
  for (const r of rg) {
    const y = yOf(f, 1 / r.period);
    g.beginPath();
    g.moveTo(f.width - 2, y - 5);
    g.lineTo(f.width - 10, y);
    g.lineTo(f.width - 2, y + 5);
    g.fill();
    g.fillText(r.label ? `${seconds(r.period)} · ${r.label}` : seconds(r.period), f.width - 14, y + 4);
  }
  g.textAlign = 'left';
}

/** The sections written: a line each, named under the card's octave. */
export function drawSections(g: G, f: Frame, css: Css, ws: readonly { at: number; label: string }[]): void {
  g.fillStyle = css('--time-section');
  for (const s of ws) {
    if (s.at < f.from || s.at > f.to) continue;
    const x = Math.round(xOf(f, s.at));
    g.fillRect(x, 0, 1, f.height);
    g.fillText(s.label.slice(0, 16), x + 3, yOf(f, CARD) + 14);
  }
}

/** The boundaries heard, a mark each at 20 Hz: the section's colour on a section, the splice's on a splice, else
 * their own. */
export function drawHeard(g: G, f: Frame, css: Css, hd: readonly Boundary[], ws: readonly { at: number }[], sp: readonly { at: number }[]): void {
  const y = yOf(f, 20);
  for (const b of hd) {
    if (b.at < f.from || b.at > f.to) continue;
    const x = xOf(f, b.at);
    const near = Math.max(1, (f.to - f.from) / 200);
    const on = ws.some((s) => Math.abs(s.at - b.at) <= near);
    const inBraid = !on && sp.some((s) => Math.abs(s.at - b.at) <= near);
    g.fillStyle = on ? css('--time-section') : inBraid ? css('--time-splice') : css('--time-heard');
    g.beginPath();
    g.moveTo(x, y - 9);
    g.lineTo(x - 5, y);
    g.lineTo(x + 5, y);
    g.fill();
  }
}

/** The splices: a tick where a braid turns to its next spliced cell, just above the heard marks. */
export function drawSplices(g: G, f: Frame, css: Css, sp: readonly { at: number }[]): void {
  const y = yOf(f, 20) - 14;
  g.fillStyle = css('--time-splice');
  for (const s of sp) if (s.at >= f.from && s.at <= f.to) g.fillRect(Math.round(xOf(f, s.at)), y - 8, 1.5, 8);
}

/** The cells: each a bar at the left from its step down to its turn, in lanes. */
export function drawCells(g: G, f: Frame, css: Css, cs: readonly CellSpan[]): void {
  const lanes: number[] = [];
  g.font = '10px system-ui, sans-serif';
  for (const c of [...cs].sort((a, b) => a.step - b.step)) {
    const top = yOf(f, 1 / c.step);
    const bottom = yOf(f, 1 / c.turn);
    if (bottom < 0 || top > f.height) continue;
    let lane = lanes.findIndex((end) => end < top - 2);
    if (lane < 0) lane = lanes.length;
    if (lane > 10) continue;
    lanes[lane] = Math.max(bottom, top + 12);
    const x = 48 + lane * 6;
    g.fillStyle = css('--time-cell');
    g.fillRect(x, top, 3, Math.max(2, bottom - top));
    g.fillRect(x - 2, top - 1, 7, 2);
  }
}

/** The patterns: each motif heard at two time scales boxed round its notes (a colour a motif, its ratio beside), and
 * the foldings alike listed at the bottom. */
export function drawPatterns(g: G, f: Frame, css: Css, pt: Patterns): void {
  g.lineWidth = 1.5;
  g.font = '11px system-ui, sans-serif';
  pt.motifs.forEach((m, k) => {
    const colour = noteColour((k * 97 + 40) % 360);
    g.strokeStyle = colour;
    g.fillStyle = colour;
    for (const o of m.heard) {
      if (o.to < f.from || o.at > f.to) continue;
      const x0 = xOf(f, o.at) - 2;
      const x1 = xOf(f, o.to + o.scale * 0.6) + 2;
      const y0 = yOf(f, o.hi) - 5;
      const y1 = yOf(f, o.lo) + 5;
      g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      if (o.scale > (m.scales[0] ?? NaN) * 1.06) g.fillText(`×${(o.scale / (m.scales[0] ?? NaN)).toFixed(1)}`, x0, y0 - 3);
    }
  });
  g.lineWidth = 1;
  g.fillStyle = css('--time-ink');
  pt.folded.forEach((fd, k) => {
    const where = fd.where.slice(0, 4).map((x) => `${x.voice} ${x.kind === 'pitch' ? 'pitch' : `rhythm round ${x.level}`}`);
    g.fillText(`folded alike · ${fd.name}${fd.even ? ' (maximally even)' : ''}: ${where.join(', ')}`, 70, f.height - 40 - 14 * k);
  });
}
