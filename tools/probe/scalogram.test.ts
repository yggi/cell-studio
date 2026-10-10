// Probe (not part of the gate): the rhythm scalogram (#286, docs/notes/multiscale.md lead 7). Every example's notes
// (`eventsBetween`, code seconds) turned into a signal four ways, a continuous Morlet wavelet transform of each, and
// the cells' spans on the tower (`towerSpans`) beside it, to see which written levels are heard and what is heard that
// nobody wrote. Writes the tables to PROBE and, with SHEETS=dir, one JSON per piece for tools/probe/scalogram-sheets.mjs.
// Run: PROBE=out.txt SHEETS=dir [ONLY=clock,drums] npx vitest run tools/probe/scalogram.test.ts
import { describe, it } from 'vitest';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGraph } from '../../src/engine/graph';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { eventsBetween, plan, type Played } from '../../src/engine/realize';
import { PRESETS } from '../../src/engine/presets';
import { towerSpans } from '../../src/layout/tower';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');

/** Samples per second, the longest window (s; a piece that ends sooner, its length), and the periods looked at: 12 an
 * octave from FAST to SLOW seconds. */
const RATE = 50;
const LONGEST = 240;
const FAST = 1 / 16;
const SLOW = 48;
const PER_OCTAVE = 12;
/** Morlet's centre frequency, and its Fourier period per unit of scale (Torrence & Compo 1998, table 1). */
const W0 = 6;
const FOURIER = (4 * Math.PI) / (W0 + Math.sqrt(2 + W0 * W0));
/** Columns kept for the pictures (COLUMNS=240 for a contact sheet of the whole library: smaller files). */
const COLUMNS = Number(process.env.COLUMNS ?? 960);

const PERIODS: number[] = [];
for (let p = FAST; p <= SLOW * 1.0001; p *= Math.pow(2, 1 / PER_OCTAVE)) PERIODS.push(p);

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
 * levels compare across periods, sampled at COLUMNS points in time. One FFT of the signal, one inverse per period.
 */
function scalogram(x: Float64Array): Float32Array[] {
  let n = 1;
  while (n < x.length * 2) n <<= 1;
  const xr = new Float64Array(n);
  const xi = new Float64Array(n);
  // (its mean taken away over the window, so the window's edges aren't a step; zero-padded beyond)
  const mean = x.reduce((a, v) => a + v, 0) / x.length;
  for (let i = 0; i < x.length; i++) xr[i] = x[i] - mean;
  fft(xr, xi);
  const rows: Float32Array[] = [];
  for (const p of PERIODS) {
    const s = p / FOURIER;
    const re = new Float64Array(n);
    const im = new Float64Array(n);
    // (the analytic Morlet's spectrum: positive frequencies only, ψ̂(sω) = π^-¼ e^{-(sω-ω0)²/2}, energy-normalised by √s)
    for (let k = 1; k < n / 2; k++) {
      const w = (2 * Math.PI * k * RATE) / n;
      const h = Math.pow(Math.PI, -0.25) * Math.sqrt((2 * Math.PI * s * RATE) / n) * Math.exp(-((s * w - W0) ** 2) / 2);
      re[k] = xr[k] * h;
      im[k] = xi[k] * h;
    }
    fft(re, im, true);
    const row = new Float32Array(COLUMNS);
    for (let c = 0; c < COLUMNS; c++) {
      const i = Math.floor(((c + 0.5) / COLUMNS) * x.length);
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
const SIGNALS = ['impulses', 'envelope', 'voices', 'change'] as const;
type Signal = (typeof SIGNALS)[number];

function signals(events: readonly Played[], window: number): Record<Signal, Float32Array[]> {
  const n = Math.round(window * RATE);
  const gain = (e: Played) => Math.max(e.gains[0], e.gains[1]);
  const at = (t: number) => Math.round(t * RATE);
  const impulses = new Float64Array(n);
  const envelope = new Float64Array(n);
  const change = new Float64Array(n);
  const byVoice = new Map<string, Played[]>();
  for (const e of events) {
    const i = at(e.at);
    if (i < 0 || i >= n) continue;
    impulses[i] += gain(e);
    for (let j = i; j < Math.min(n, at(e.at + e.dur)); j++) envelope[j] += gain(e);
    byVoice.set(e.voice, [...(byVoice.get(e.voice) ?? []), e]);
  }
  let voices: Float32Array[] | null = null;
  for (const notes of byVoice.values()) {
    notes.sort((a, b) => a.at - b.at);
    const x = new Float64Array(n);
    let last: Played | null = null;
    for (const e of notes) {
      x[at(e.at)] += gain(e);
      const entry = !last || e.at - (last.at + last.dur) > 0.5;
      const moved = last ? Math.min(12, Math.abs(12 * Math.log2(e.freq / last.freq))) : 12;
      const w = entry ? 12 : moved;
      if (w > 0.01) change[at(e.at)] += w * gain(e);
      last = e;
    }
    const s = scalogram(x);
    voices = voices ? add(voices, s) : s;
  }
  return {
    impulses: scalogram(impulses),
    envelope: scalogram(envelope),
    voices: voices ?? scalogram(new Float64Array(n)),
    change: scalogram(change),
  };
}

/** The global spectrum (mean over time, inside the cone of influence) and its peaks above 5 % of the highest. */
function profile(rows: Float32Array[], window: number) {
  const mean = rows.map((r, i) => {
    const edge = Math.min(0.45, (Math.SQRT2 * (PERIODS[i] / FOURIER)) / window);
    const from = Math.floor(edge * COLUMNS);
    const to = Math.ceil((1 - edge) * COLUMNS);
    let acc = 0;
    for (let c = from; c < to; c++) acc += r[c];
    return to > from ? acc / (to - from) : 0;
  });
  const top = Math.max(...mean);
  const peaks = mean.flatMap((v, i) => (i > 0 && i < mean.length - 1 && v > mean[i - 1] && v >= mean[i + 1] && v > 0.05 * top ? [i] : []));
  return { mean, peaks };
}

describe.runIf(process.env.PROBE)('the rhythm scalogram', () => {
  it('turns every piece into a scalogram, four ways', () => {
    const only = process.env.ONLY?.split(',');
    const sheets = process.env.SHEETS;
    if (sheets) mkdirSync(sheets, { recursive: true });
    log(`window up to ${LONGEST} s (a piece that ends: its length) at ${RATE} Hz; periods ${FAST}–${SLOW} s, ${PER_OCTAVE} an octave; Morlet ω0=${W0}`);
    log(`a peak matches a cell when within 1/6 octave of its step or its turn; * a match, ½ a half (or ⅓) of a peak that matches\n`);
    const tally = Object.fromEntries(SIGNALS.map((s) => [s, { peaks: 0, matched: 0, harmonic: 0, slow: 0 }]));
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      const program = compileSource(p.source);
      if (!program.ok) continue;
      const model = buildGraph(program);
      const played = plan(program, codeShifts(program));
      // (a piece that ends: its length, the last note's end; one that loops: the longest window)
      const all = eventsBetween(played, 0, LONGEST);
      const window = Number.isFinite(played.end) ? Math.min(LONGEST, Math.max(8, ...all.map((e) => e.at + e.dur))) : LONGEST;
      const events = all.filter((e) => e.at < window);
      // (the cells' spans in seconds, from the tower: a span from its step to its turn; voices and the card are audible)
      const cells = [...towerSpans(program, model)].flatMap(([id, { at, lo }]) => {
        const node = model.nodes.find((n) => n.id === id);
        if (!node?.cell || node.kind === 'voice' || node.kind === 'junction' || !Number.isFinite(at)) return [];
        const step = Math.pow(10, -at);
        const turn = Number.isFinite(lo) ? Math.pow(10, -lo) : step;
        if (turn < FAST || step > SLOW) return [];
        return [{ name: node.cell.name, step, turn }];
      });
      const near = (a: number, b: number) => Math.abs(Math.log2(a / b)) < 1 / 6;
      const sig = signals(events, window);
      const out: Record<string, unknown> = {
        key,
        window,
        periods: PERIODS,
        cells,
        events: events.map((e) => [+e.at.toFixed(3), +e.dur.toFixed(3), e.voice, Math.round(12 * Math.log2(e.freq / 440)) + 69]),
        signals: {},
      };
      const line: string[] = [];
      for (const s of SIGNALS) {
        const { mean, peaks } = profile(sig[s], window);
        const marks = peaks.map((i) => {
          const q = PERIODS[i];
          const hit = cells.some((c) => near(q, c.step) || near(q, c.turn));
          const harmonic =
            !hit && peaks.some((j) => j > i && [2, 3].some((k) => near(PERIODS[j] / k, q)) && cells.some((c) => near(PERIODS[j], c.step) || near(PERIODS[j], c.turn)));
          tally[s].peaks++;
          if (hit) tally[s].matched++;
          if (harmonic) tally[s].harmonic++;
          if (q >= 4) tally[s].slow++;
          return `${q < 1 ? q.toFixed(2) : q.toFixed(1)}${hit ? '*' : harmonic ? '½' : ''}`;
        });
        line.push(`${s} ${marks.join(' ') || '–'}`);
        (out.signals as Record<string, unknown>)[s] = { rows: sig[s].map((r) => Array.from(r, (v) => +v.toPrecision(3))), mean: mean.map((v) => +v.toPrecision(3)) };
      }
      const spans = [...new Set(cells.flatMap((c) => [c.step, c.turn]).map((x) => (x < 1 ? x.toFixed(2) : x.toFixed(1))))].sort((a, b) => +a - +b);
      log(`${key.padEnd(14)} ${String(events.length).padStart(5)} notes in ${window.toFixed(0)} s | cells ${spans.join(' ')}`);
      for (const l of line) log(`${''.padEnd(21)}${l}`);
      if (sheets) writeFileSync(join(sheets, `${key}.json`), JSON.stringify(out));
    }
    log('\nsignal     peaks  on a cell  a harmonic  at ≥ 4 s');
    for (const s of SIGNALS) {
      const t = tally[s];
      log(`${s.padEnd(10)} ${String(t.peaks).padStart(5)}  ${String(t.matched).padStart(9)}  ${String(t.harmonic).padStart(10)}  ${String(t.slow).padStart(8)}`);
    }
  }, 600_000);
});
