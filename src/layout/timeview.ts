/**
 * The time view's geometry (ui/TimeView.svelte; docs/notes/scalogram.md): time across, from the piece's start to its
 * end and zoomable; frequency up, on the tower's logarithmic axis (layout/tower.ts), from the piece's slowest level at
 * the bottom through the pulse and the audible to the sound card's samples at the top. Every layer sits at its own
 * height: the scalogram (periods as frequencies) in the slow and the pulse, the notes at their pitch and the waterfall
 * in the audible, the waveform above it, where the card is; between the pulse and the audible the neutral zone, off
 * the scale, its rows the voices (as the graph's). The vertical axis is the tower's scale (layout/towerscale.ts, #440),
 * the graph's own, fitted to the view's height. Pure: numbers in, numbers out.
 */
import { towerScale, towerTicks, type TowerScale } from './towerscale';

/**
 * What the view shows: seconds `from` to `to` across `width` px, frequencies `lo` to `hi` (Hz) up `height` px, the
 * neutral zone `zone` px of it; `scale`, the tower's scale those make.
 */
export interface Frame {
  readonly from: number;
  readonly to: number;
  readonly lo: number;
  readonly hi: number;
  readonly width: number;
  readonly height: number;
  readonly zone: number;
  readonly scale: TowerScale;
}

/** Where the audible ends and the card's samples begin (Hz), and the top of the axis: an octave of room for the waveform. */
export const CARD = 20000;
const TOP = 2 * CARD;
/** The slowest level shown: the window itself (below the scalogram's slowest period, a third of it, the structure's
 * longest nodes: a section, the line). */
const bottomOf = (window: number) => 1 / Math.max(window, 1);

/** The tower's scale for `lo` … `hi` (Hz) over `height` px, `zone` px of it the neutral zone at 20 Hz: even elsewhere. */
function scaleOf(lo: number, hi: number, height: number, zone: number): TowerScale {
  const [from, to] = [Math.log10(lo), Math.log10(hi)];
  const perDecade = Math.max(1e-6, height - zone) / Math.max(1e-6, to - from);
  const decades = zone / perDecade;
  return towerScale({ perDecade, offset: (to + decades) * perDecade, zone: decades, from, to });
}

/** A frame for a window of `window` seconds, all of it in view, `zone` px of its height the neutral zone. */
export function frameFor(window: number, width: number, height: number, zone = 0): Frame {
  const lo = bottomOf(window);
  return { from: 0, to: Math.max(window, 1e-3), lo, hi: TOP, width, height, zone, scale: scaleOf(lo, TOP, height, zone) };
}

/** The frame at another size or neutral zone, showing the same stretch of time. */
export const resized = (f: Frame, width: number, height: number, zone = f.zone): Frame => ({ ...f, width, height, zone, scale: scaleOf(f.lo, f.hi, height, zone) });

export const xOf = (f: Frame, t: number) => ((t - f.from) / (f.to - f.from)) * f.width;
export const tOf = (f: Frame, x: number) => f.from + (x / f.width) * (f.to - f.from);
export const yOf = (f: Frame, hz: number) => f.scale.y(Math.log10(hz));
export const hzOf = (f: Frame, y: number) => Math.pow(10, f.scale.at(y));

/** The shortest stretch the view zooms in to (s). */
const NARROWEST = 0.05;

/** Zoomed by `factor` (< 1: in) about the moment `at`, kept within the window. */
export function zoom(f: Frame, at: number, factor: number, window: number): Frame {
  const span = Math.min(window, Math.max(NARROWEST, (f.to - f.from) * factor));
  const from = at - ((at - f.from) / (f.to - f.from)) * span;
  return clamp({ ...f, from, to: from + span }, window);
}

/** Moved along by `dt` seconds, kept within the window. */
export const pan = (f: Frame, dt: number, window: number): Frame => clamp({ ...f, from: f.from + dt, to: f.to + dt }, window);

function clamp(f: Frame, window: number): Frame {
  const span = f.to - f.from;
  const from = Math.max(0, Math.min(window - span, f.from));
  return { ...f, from, to: from + span };
}

/** While playing, the view pages on when `now` leaves it, keeping its width. */
export function follow(f: Frame, now: number, window: number): Frame {
  if (now >= f.from && now <= f.to) return f;
  return clamp({ ...f, from: now - 0.05 * (f.to - f.from), to: now + 0.95 * (f.to - f.from) }, window);
}

/** A duration in few characters: 0.25 s, 3 s, 2 min, 1.5 h. */
function shortTime(s: number): string {
  if (s < 1) return `${+s.toFixed(2)} s`;
  if (s < 120) return `${+s.toFixed(1)} s`;
  if (s < 7200) return `${+(s / 60).toFixed(1)} min`;
  return `${+(s / 3600).toFixed(1)} h`;
}

/** Marks along time: a round step giving about `count` of them across the view. */
export function timeTicks(f: Frame, count = 8): { at: number; label: string }[] {
  const steps = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14400];
  const step = steps.find((s) => (f.to - f.from) / s <= count) ?? 21600;
  const out: { at: number; label: string }[] = [];
  for (let t = Math.ceil(f.from / step) * step; t <= f.to + 1e-9; t += step) {
    const s = +t.toFixed(3);
    out.push({ at: s, label: s >= 120 ? shortTime(s) : s < 1 && s > 0 ? `${s}` : `${s} s` });
  }
  return out;
}

/** Marks up the tower (towerscale.ts): round periods below 20 Hz (1 min, 10 s, 1 s, 0.1 s), each decade in Hz above. */
export function freqTicks(f: Frame): { hz: number; label: string }[] {
  const t = towerTicks(f.scale, 0, f.height);
  return [...t.periods, ...t.hz.filter((x) => x.decade)].map((x) => ({ hz: x.hz, label: x.label }));
}

/** The tower's strata in view, from the bottom (towerscale.ts): their names and where they are drawn. */
export const zones = (f: Frame) => f.scale.strata.filter((z) => z.bottom > 0 && z.top < f.height);
