// The rhythm scalogram's arithmetic, for the probe (tools/probe/scalogram.test.ts, #286; docs/notes/scalogram.md): a
// piece's notes as signals, their continuous Morlet transform, and the cones a change of section leaves in it.
import type { Played } from '../../src/engine/realize';

/**
 * The signal's samples: 50 a second, fewer for a long piece (at most 2^18 over its length: a day at 3 a second). The
 * periods looked at, 12 an octave: from 1/16 s (a long piece: 8 samples) to a third of the length (beyond that the window's
 * edges are all there is).
 */
export const MOST_RATE = 50;
const MOST_SAMPLES = 2 ** 18;
export const PER_OCTAVE = 12;
/** Morlet's centre frequency, and its Fourier period per unit of scale (Torrence & Compo 1998, table 1). */
export const W0 = 6;
export const FOURIER = (4 * Math.PI) / (W0 + Math.sqrt(2 + W0 * W0));
/** Points in time kept of each period: every sample, or 4096 across the window (the pictures thin them further). */
const FINE = 4096;

/** The rate and the periods for a length of `window` seconds (`most`: at most so many samples a second). */
export function grid(window: number, most = MOST_RATE) {
  const rate = Math.min(most, MOST_SAMPLES / window);
  const periods: number[] = [];
  // (a long piece's fastest period: 8 samples, so that the Gaussians below have smoothed away the pulse folded down)
  for (let p = rate < MOST_RATE ? 8 / rate : 1 / 16; p <= window / 3; p *= Math.pow(2, 1 / PER_OCTAVE)) periods.push(p);
  return { rate, periods };
}
export type Grid = ReturnType<typeof grid>;

/** An in-place radix-2 FFT (inverse: conjugated twiddles, unscaled). */
function fft(re: Float64Array, im: Float64Array, inverse = false) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(a);
    const wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/**
 * The power |W(s, t)|² of a signal at each period, normalised by scale (Liu et al. 2007) so that an impulse train's
 * levels compare across periods, at min(samples, FINE) points in time. One FFT of the signal, one inverse a period.
 */
function scalogram(x: Float64Array, { rate, periods }: Grid): Float32Array[] {
  let n = 1;
  while (n < x.length * 2) n <<= 1;
  const xr = new Float64Array(n);
  const xi = new Float64Array(n);
  // (its mean taken away over the window, so the window's edges aren't a step; zero-padded beyond)
  const mean = x.reduce((a, v) => a + v, 0) / x.length;
  for (let i = 0; i < x.length; i++) xr[i] = x[i] - mean;
  fft(xr, xi);
  const rows: Float32Array[] = [];
  for (const p of periods) {
    const s = p / FOURIER;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    // (the analytic Morlet's spectrum: positive frequencies only, ψ̂(sω) = π^-¼ e^{-(sω-ω0)²/2}, energy-normalised by √s)
    for (let k = 1; k < n / 2; k++) {
      const w = (2 * Math.PI * k * rate) / n;
      const h = Math.pow(Math.PI, -0.25) * Math.sqrt((2 * Math.PI * s * rate) / n) * Math.exp(-((s * w - W0) ** 2) / 2);
      re[k] = xr[k] * h;
      im[k] = xi[k] * h;
    }
    fft(re, im, true);
    const columns = Math.min(x.length, FINE);
    const row = new Float32Array(columns);
    for (let c = 0; c < columns; c++) {
      const i = Math.floor(((c + 0.5) / columns) * x.length);
      row[c] = (re[i] ** 2 + im[i] ** 2) / n ** 2 / s;
    }
    rows.push(row);
  }
  return rows;
}

const add = (a: Float32Array[], b: Float32Array[]) => a.map((r, i) => r.map((v, j) => v + b[i][j]));

/**
 * The signals, open-minded: what an onset is worth is the question.
 * - `impulses`: each note an impulse of its gain (the first pass, #286).
 * - `envelope`: each note held for its length at its gain (a sounding signal: fewer of a train's harmonics).
 * - `voices`: `impulses` per voice, their powers summed (no beating between voices that don't share a pulse).
 * - `change`: an impulse only where something changes: a voice's new pitch, or a voice entering after a rest, weighed
 *   by how far it moved (semitones, capped at an octave) or 12 for an entry: the form, if anything shows it.
 */
export const SIGNALS = ['impulses', 'envelope', 'voices', 'change'] as const;
export type Signal = (typeof SIGNALS)[number];

export function signals(events: readonly Played[], window: number, g: Grid): Record<Signal, Float32Array[]> {
  const n = Math.round(window * g.rate);
  const gain = (e: Played) => Math.max(e.gains[0], e.gains[1]);
  // (an impulse put down as a small Gaussian at its exact time, σ = 1.2 samples, not rounded to a sample: at a long
  // piece's few samples a second, a pulse faster than half the rate, rounded onto the grid, would come back as slow
  // levels that aren't there: aliasing)
  const SIGMA = 1.2;
  const put = (x: Float64Array, t: number, w: number) => {
    const c = t * g.rate;
    for (let k = Math.max(0, Math.floor(c - 3 * SIGMA)); k <= Math.min(n - 1, Math.ceil(c + 3 * SIGMA)); k++)
      x[k] += (w * Math.exp(-(((k - c) / SIGMA) ** 2) / 2)) / (SIGMA * Math.sqrt(2 * Math.PI));
  };
  const impulses = new Float64Array(n);
  // (a held note: its start up and its end down, summed afterwards, so its edges are as smooth as an impulse)
  const edges = new Float64Array(n);
  const change = new Float64Array(n);
  const byVoice = new Map<string, Played[]>();
  for (const e of events) {
    if (e.at < 0 || e.at >= window) continue;
    put(impulses, e.at, gain(e));
    put(edges, e.at, gain(e));
    put(edges, Math.min(window, e.at + e.dur), -gain(e));
    const notes = byVoice.get(e.voice);
    if (notes) notes.push(e);
    else byVoice.set(e.voice, [e]);
  }
  const envelope = new Float64Array(n);
  for (let i = 0, acc = 0; i < n; i++) envelope[i] = acc += edges[i];
  let voices: Float32Array[] | null = null;
  for (const notes of byVoice.values()) {
    notes.sort((a, b) => a.at - b.at);
    const x = new Float64Array(n);
    let last: Played | null = null;
    for (const e of notes) {
      put(x, e.at, gain(e));
      const entry = !last || e.at - (last.at + last.dur) > 0.5;
      const moved = last ? Math.min(12, Math.abs(12 * Math.log2(e.freq / last.freq))) : 12;
      const w = entry ? 12 : moved;
      if (w > 0.01) put(change, e.at, w * gain(e));
      last = e;
    }
    const s = scalogram(x, g);
    voices = voices ? add(voices, s) : s;
  }
  return {
    impulses: scalogram(impulses, g),
    envelope: scalogram(envelope, g),
    voices: voices ?? scalogram(new Float64Array(n), g),
    change: scalogram(change, g),
  };
}

/**
 * A piece's sections (`sections`: the selector's steps, one round of it) repeated over the window: a loop's cycle is
 * several rounds. A round's length is guessed from its last two sections (the last one as long as the one before).
 */
export function around(one: readonly { at: number; label: string }[], window: number) {
  if (one.length < 2) return [...one];
  const round = 2 * one[one.length - 1].at - one[one.length - 2].at - one[0].at;
  if (!(round > 0)) return [...one];
  const out: { at: number; label: string }[] = [];
  for (let k = 0; k * round < window; k++) for (const x of one) if (x.at + k * round < window) out.push({ at: x.at + k * round, label: x.label });
  return out;
}

/** How far the window's edges reach into a period's row, as a fraction of the window (the cone of influence × `k`). */
export const reach = (period: number, window: number, k = 1) => Math.min(0.5, (k * Math.SQRT2 * (period / FOURIER)) / window);

/** Each row against its own mean over the columns the window's edges leave clear (twice their reach). */
export function byRow(rows: readonly Float32Array[], periods: readonly number[], window: number): Float32Array[] {
  return rows.map((r, i) => {
    const edge = Math.min(Math.floor(r.length * reach(periods[i], window, 2)), Math.floor(r.length / 2) - 1);
    let acc = 0;
    for (let c = edge; c < r.length - edge; c++) acc += r[c];
    const mean = acc / (r.length - 2 * edge) || 1;
    return r.map((v) => v / mean);
  });
}

/** A cone: where it points (its apex, s), the slowest and fastest periods it spans, its score, and its path. */
export interface Cone {
  readonly at: number;
  readonly top: number;
  readonly bottom: number;
  readonly score: number;
  readonly path: readonly (readonly [number, number])[];
}

/**
 * The cones in a scalogram: lines of maxima chained from slow periods down to fast ones, converging on a moment (Mallat
 * & Hwang 1992: a singularity, here a change of section, leaves a cone of maxima pointing at it).
 * - **A maximum**: at a period, a point in time louder than `loud` × the row's mean and the loudest within a quarter
 *   period either side, clear of the window's edges.
 * - **A chain**: from each maximum not yet taken, slowest first, the nearest maximum one period faster within a
 *   quarter period (wider, a chain wanders from one cone into the next at the slow periods), down to `fastest` (a cone ends where the beat begins: 1 s, or the long piece's fastest period).
 * - **Kept**: a chain spanning at least `octaves` octaves; its score is the sum of its loudness in dB along the way
 *   (long and bright beats short and faint); its apex is where it ends. Cones with apexes within `merge` seconds of
 *   each other are one, the best scored.
 */
export function cones(rows: readonly Float32Array[], periods: readonly number[], window: number, { fastest = 1, octaves = 2, merge = 1, loud = 1.5 } = {}): Cone[] {
  const r = byRow(rows, periods, window);
  const cols = r[0]?.length ?? 0;
  const secondsOf = (c: number) => ((c + 0.5) / cols) * window;
  const maxima = r.map((row, i) => {
    const h = Math.max(1, Math.round((0.25 * periods[i] * cols) / window));
    const edge = Math.ceil(cols * reach(periods[i], window));
    const out: number[] = [];
    if (periods[i] < fastest) return out;
    for (let c = edge; c < cols - edge; c++) {
      if (row[c] < loud) continue;
      let top = true;
      for (let k = Math.max(0, c - h); k <= Math.min(cols - 1, c + h) && top; k++) if (row[k] > row[c] || (row[k] === row[c] && k < c)) top = false;
      if (top) out.push(c);
    }
    return out;
  });
  const taken = maxima.map(() => new Set<number>());
  const found: Cone[] = [];
  for (let i = r.length - 1; i >= 0; i--)
    for (const c0 of maxima[i]) {
      if (taken[i].has(c0)) continue;
      let c = c0;
      let score = 10 * Math.log10(r[i][c]);
      const path: [number, number][] = [[secondsOf(c), periods[i]]];
      let j = i;
      while (j > 0 && maxima[j - 1].length) {
        const within = (0.25 * periods[j] * cols) / window;
        let best = -1;
        for (const m of maxima[j - 1]) if (Math.abs(m - c) <= within && (best < 0 || Math.abs(m - c) < Math.abs(best - c))) best = m;
        if (best < 0) break;
        j--;
        c = best;
        taken[j].add(c);
        score += 10 * Math.log10(r[j][c]);
        if ((i - j) % 6 === 0) path.push([secondsOf(c), periods[j]]);
      }
      path.push([secondsOf(c), periods[j]]);
      if ((i - j) / PER_OCTAVE >= octaves) found.push({ at: secondsOf(c), top: periods[i], bottom: periods[j], score, path });
    }
  found.sort((a, b) => b.score - a.score);
  const kept: Cone[] = [];
  for (const x of found) if (!kept.some((k) => Math.abs(k.at - x.at) <= merge)) kept.push(x);
  return kept;
}

/**
 * The cones against the written boundaries. Only cones that reach up to `tall` seconds count (a boundary between
 * sections of ten minutes is a cone up to minutes, not the bar's: a day has thousands of those). Of them, the best
 * `boundaries.length` (as many as there are boundaries): how
 * many of them land within `tolerance` of one (precision), how many boundaries one lands on (recall), and what chance
 * would give (the share of the window within `tolerance` of a boundary: a cone dropped at random lands on one so often).
 */
export function score(found: readonly Cone[], boundaries: readonly number[], window: number, tolerance: number, tall = 0) {
  const best = found.filter((c) => c.top >= tall).slice(0, boundaries.length);
  const near = (t: number) => boundaries.some((b) => Math.abs(b - t) <= tolerance);
  const hits = best.filter((c) => near(c.at)).length;
  const met = boundaries.filter((b) => best.some((c) => Math.abs(b - c.at) <= tolerance)).length;
  // (the covered share, overlaps counted once: on a grid of a thousandth of the window)
  let covered = 0;
  for (let k = 0; k < 1000; k++) if (near(((k + 0.5) / 1000) * window)) covered++;
  return {
    precision: best.length ? hits / best.length : 0,
    recall: boundaries.length ? met / boundaries.length : 0,
    chance: covered / 1000,
    hits: new Set(best.filter((c) => near(c.at))),
  };
}
