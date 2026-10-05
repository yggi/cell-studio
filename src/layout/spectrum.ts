/**
 * Voice wheels: a spectral waterfall in polar form. Frequency is the angle,
 * log-scaled: 20 Hz meets at the bottom, 20 kHz at the top; the left channel
 * on the left half, the right channel on the right. Time is the radius: the
 * newest frame at the hub, flowing outward. Colour is the note: one rainbow
 * per octave, by pitch class (C red, D yellow, E green, G light blue, A blue,
 * B magenta …) — and brightness is level. Bands are a semitone wide, each
 * centred on a note, C0 to B9.
 * Drawn with a precomputed pixel → (side, frame, band) lookup, so each frame
 * is one pass over the pixels.
 */
import { harmonics, waveform } from '../engine/wave';
import { fmLines } from '../engine/fm';
import { DOUGH_SOURCES } from '../engine/dough-params';
import type { CompileResult, Shifts } from '../engine/compile';

/** C0. Bands are a semitone wide, centred on notes: the range runs half a semitone below C0, ten octaves up. */
export const C0 = 16.3516;
export const F_LO = C0 * Math.pow(2, -1 / 24);
export const F_HI = F_LO * 1024;

/** 0 at the bottom of the range … 1 at the top (log). On the wheel: 0 at the bottom, 1 at the top. */
export const freqTurn = (f: number) => Math.min(1, Math.max(0, Math.log(f / F_LO) / Math.log(F_HI / F_LO)));

/** Centre frequency of band b of n (log-spaced). */
export const bandFreq = (b: number, n: number) => F_LO * Math.pow(F_HI / F_LO, (b + 0.5) / n);

/**
 * For each pixel of a size×size wheel: -1 outside the ring, else
 * side·frames·bands + frame·bands + band (side 0 = left, 1 = right; band 0 =
 * lowest, at the bottom; frame 0 = newest, at the hub).
 */
export function wheelLUT(size: number, r0: number, r1: number, bands: number, frames: number): Int32Array {
  const lut = new Int32Array(size * size).fill(-1);
  const c = size / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const r = Math.hypot(dx, dy);
      if (r < r0 || r > r1) continue;
      const a = Math.atan2(dx, -dy); // 0 at the top, clockwise positive
      const side = a >= 0 ? 1 : 0;
      const band = Math.min(bands - 1, Math.floor((1 - Math.abs(a) / Math.PI) * bands));
      const frame = Math.min(frames - 1, Math.floor(((r - r0) / (r1 - r0)) * frames));
      lut[y * size + x] = side * frames * bands + frame * bands + band;
    }
  return lut;
}

/** Collapse an FFT (dB per bin) into log bands, as levels 0…1 (−100 dB … −30 dB). */
export function bandsFromFFT(db: Float32Array, sampleRate: number, bands: number): Float32Array {
  const out = new Float32Array(bands);
  const binHz = sampleRate / 2 / db.length;
  out.fill(-Infinity);
  for (let i = 1; i < db.length; i++) {
    const f = i * binHz;
    if (f < F_LO || f > F_HI) continue;
    const b = Math.min(bands - 1, Math.floor(freqTurn(f) * bands));
    out[b] = Math.max(out[b], db[i]);
  }
  // low notes are narrower than a bin: a band with no bin of its own reads the bin at its centre
  for (let b = 0; b < bands; b++)
    if (!Number.isFinite(out[b])) {
      const i = Math.round(bandFreq(b, bands) / binHz);
      if (i >= 1 && i < db.length) out[b] = db[i];
    }
  for (let b = 0; b < bands; b++) out[b] = Number.isFinite(out[b]) ? Math.min(1, Math.max(0, (out[b] + 100) / 70)) : 0;
  return out;
}

/**
 * What a voice would show at rest: the harmonics of its waveform at its
 * pitch 0 (or a noise slope), split by its pan. Levels 0…1 per band.
 */
export function restingSpectrum(result: CompileResult, voice: string, shifts: Shifts, bands: number): { left: Float32Array; right: Float32Array } {
  const c = result.cells.get(voice)!;
  const level = new Float32Array(bands);
  const put = (f: number, mag: number) => {
    if (f < F_LO || f > F_HI || mag <= 0) return;
    const b = Math.min(bands - 1, Math.floor(freqTurn(f) * bands));
    level[b] = Math.max(level[b], Math.min(1, Math.max(0, (20 * Math.log10(mag) + 60) / 60)));
  };
  const src = c.params.s !== undefined ? DOUGH_SOURCES[String(c.params.s)] : null;
  if (src === 'white' || src === 'pink' || src === 'brown') {
    const tilt = src === 'white' ? 0 : src === 'pink' ? 0.5 : 1; // amplitude ~ f^-tilt
    for (let b = 0; b < bands; b++) put(bandFreq(b, bands), 0.5 * Math.pow(bandFreq(b, bands) / 200, -tilt));
  } else if (typeof c.params.fm === 'string') {
    // FM: its sidebands, exactly (Bessel), at its brightest
    for (const l of fmLines(result, voice, c.freq)) put(l.f, l.a);
  } else {
    const f0 = c.freq;
    let mags: number[];
    if (src === 'sine') mags = [1];
    else if (src === 'sawtooth') mags = Array.from({ length: 64 }, (_, k) => 1 / (k + 1));
    else if (src === 'square') mags = Array.from({ length: 64 }, (_, k) => ((k + 1) % 2 ? 1 / (k + 1) : 0));
    else if (src === 'triangle') mags = Array.from({ length: 64 }, (_, k) => ((k + 1) % 2 ? 1 / ((k + 1) * (k + 1)) : 0));
    else {
      const { real, imag } = harmonics(waveform(result, voice, shifts, 256), 64);
      const m = Array.from({ length: 64 }, (_, k) => Math.hypot(real[k + 1], imag[k + 1]));
      const top = Math.max(...m, 1e-9);
      mags = m.map((x) => x / top);
    }
    mags.forEach((m, k) => put(f0 * (k + 1), m));
  }
  return { left: level, right: new Float32Array(level) };
}

/** Rainbow by frequency: red at 20 Hz (hue 0°) to deep violet at 20 kHz (hue 275°). */
/** The hue of a band: its note's pitch class round a rainbow, one per octave (C red, D yellow, G light blue …). */
export const bandHue = (band: number, bands: number) => {
  const semis = Math.round(12 * Math.log2(bandFreq(band, bands) / C0));
  return (((semis % 12) + 12) % 12) * 30;
};

/** RGB for an HSL colour (h in degrees, s and l in 0…1). */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** Combine profiles: level-wise max after a gain (dB-like levels: a gain g shifts by 20·log10(g)/60). */
function combine(parts: { left: Float32Array; right: Float32Array; gl: number; gr: number }[], bands: number) {
  const left = new Float32Array(bands);
  const right = new Float32Array(bands);
  const shift = (g: number) => (g > 0 ? (20 * Math.log10(g)) / 60 : -Infinity);
  for (const p of parts)
    for (let b = 0; b < bands; b++) {
      if (p.left[b] > 0) left[b] = Math.max(left[b], Math.min(1, p.left[b] + shift(p.gl)));
      if (p.right[b] > 0) right[b] = Math.max(right[b], Math.min(1, p.right[b] + shift(p.gr)));
    }
  return { left, right };
}

/**
 * The profile any wheel shows at rest: a voice's partials; a mix, its voices
 * at their gains; the sound card, its first channel's mix on the left and the
 * second's on the right (one channel: both).
 */
export function restingProfile(result: CompileResult, name: string, shifts: Shifts, bands: number): { left: Float32Array; right: Float32Array } {
  const c = result.cells.get(name);
  const empty = { left: new Float32Array(bands), right: new Float32Array(bands) };
  if (!c) return empty;
  if (c.voice) return restingSpectrum(result, name, shifts, bands);
  if (c.mix) {
    const parts = c.mix
      .filter((b) => result.cells.get(b.voice.name)?.voice)
      .map((b) => ({ ...restingSpectrum(result, b.voice.name, shifts, bands), gl: b.gain, gr: b.gain }));
    return combine(parts, bands);
  }
  if (c.sink) {
    const ch = c.units.map((u) => (u.atom.kind === 'ref' ? restingProfile(result, u.atom.name, shifts, bands) : empty));
    if (ch.length === 0) return empty;
    const l = ch[0];
    const r = ch[1] ?? ch[0];
    return { left: l.left.map((v, i) => Math.max(v, l.right[i])), right: r.left.map((v, i) => Math.max(v, r.right[i])) };
  }
  return empty;
}
