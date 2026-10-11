/**
 * The time view's geometry (ui/TimeView.svelte; docs/notes/scalogram.md): time across, from the piece's start to its
 * end and zoomable; frequency up, on the tower's logarithmic axis (layout/tower.ts), from the piece's slowest level at
 * the bottom through the pulse and the audible to the sound card's samples at the top. Every layer sits at its own
 * height: the scalogram (periods as frequencies) in the slow and the pulse, the notes at their pitch and the waterfall
 * in the audible, the waveform above it, where the card is. Pure: numbers in, numbers out.
 */
import { TOWER_ZONES } from './tower';

/** What the view shows: seconds `from` to `to` across `width` px, frequencies `lo` to `hi` (Hz) up `height` px. */
export interface Frame {
  readonly from: number;
  readonly to: number;
  readonly lo: number;
  readonly hi: number;
  readonly width: number;
  readonly height: number;
}

/** Where the audible ends and the card's samples begin (Hz), and the top of the axis: an octave of room for the waveform. */
export const CARD = 20000;
const TOP = 2 * CARD;
/** The slowest level shown: a third of the window (the scalogram's slowest period), at most. */
const bottomOf = (window: number) => 3 / Math.max(window, 1);

/** A frame for a window of `window` seconds, all of it in view. */
export function frameFor(window: number, width: number, height: number): Frame {
  return { from: 0, to: Math.max(window, 1e-3), lo: bottomOf(window), hi: TOP, width, height };
}

export const xOf = (f: Frame, t: number) => ((t - f.from) / (f.to - f.from)) * f.width;
export const tOf = (f: Frame, x: number) => f.from + (x / f.width) * (f.to - f.from);
export const yOf = (f: Frame, hz: number) => f.height * (1 - Math.log(hz / f.lo) / Math.log(f.hi / f.lo));
export const hzOf = (f: Frame, y: number) => f.lo * Math.pow(f.hi / f.lo, 1 - y / f.height);

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

/**
 * Marks up the tower: each decade, labelled as a time below 20 Hz (1 h, 1 min, 10 s, 1 s) and as a frequency above
 * (100 Hz, 1 kHz); a slow piece's day has its hours too.
 */
export function freqTicks(f: Frame): { hz: number; label: string }[] {
  const out: { hz: number; label: string }[] = [];
  const marks = [1 / 86400, 1 / 3600, 1 / 600, 1 / 60, 1 / 10, 1, 10, 100, 1000, 10000];
  for (const hz of marks) {
    if (hz < f.lo || hz > f.hi) continue;
    out.push({ hz, label: hz < 20 ? shortTime(1 / hz).replace('.0 ', ' ') : hz < 1000 ? `${hz} Hz` : `${hz / 1000} kHz` });
  }
  return out;
}

/** The tower's zones in view, from the bottom: their names and their frequency bands (Hz). */
export function zones(f: Frame): { name: string; lo: number; hi: number }[] {
  const bounds = [...TOWER_ZONES.map((z) => ({ name: z.name, lo: z.from === -Infinity ? 0 : Math.pow(10, z.from) })), { name: 'card', lo: CARD }];
  return bounds.map((z, i) => ({ name: z.name, lo: Math.max(z.lo, f.lo), hi: Math.min(bounds[i + 1]?.lo ?? Infinity, f.hi) })).filter((z) => z.hi > z.lo);
}
