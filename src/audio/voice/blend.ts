/**
 * A blend of two built-in waves (`s=tri..square * &x`, cells decision 066): their harmonics crossfaded, each at the
 * peak it has alone, so the first wave is heard at share 0 and the second at 1. A note plays the share it starts on,
 * read in hundredths, as cells' renderer reads it (`blendWave`, `engine/render.ts`).
 */

export type Builtin = 'sine' | 'triangle' | 'sawtooth' | 'square';

/** As many harmonics as cells' tables hold (2048 samples a cycle). */
const HARMONICS = 1023;
const CYCLE = 2048;
/** A share read in hundredths: each one's wave made once. */
const STEPS = 100;

/** A built-in wave's sine terms, by harmonic, as Web Audio's oscillators define them. */
export function terms(type: Builtin): Float64Array {
  const n = type === 'sine' ? 1 : HARMONICS;
  const imag = new Float64Array(n + 1);
  for (let k = 1; k <= n; k++)
    imag[k] =
      type === 'sine'
        ? 1
        : type === 'sawtooth'
          ? (2 / (Math.PI * k)) * (k % 2 ? 1 : -1)
          : type === 'square'
            ? (2 / (Math.PI * k)) * (1 - (k % 2 ? -1 : 1))
            : (8 * Math.sin((Math.PI * k) / 2)) / (Math.PI * k) ** 2;
  return imag;
}

const SINES = Float64Array.from({ length: CYCLE }, (_, i) => Math.sin((2 * Math.PI * i) / CYCLE));
const PEAKS = new Map<Builtin, number>();

/** A built-in wave's peak over one cycle, from its terms. */
function peakOf(type: Builtin): number {
  let p = PEAKS.get(type);
  if (p !== undefined) return p;
  const imag = terms(type);
  p = 0;
  for (let i = 0; i < CYCLE; i++) {
    let v = 0;
    for (let k = 1; k < imag.length; k++) if (imag[k]) v += imag[k]! * SINES[(k * i) % CYCLE]!;
    p = Math.max(p, Math.abs(v));
  }
  PEAKS.set(type, (p ||= 1));
  return p;
}

/** A share in hundredths, 0 … 1. */
export const shareOf = (w: number): number => Math.round(Math.min(1, Math.max(0, Number.isFinite(w) ? w : 0)) * STEPS) / STEPS;

/** The blend's sine terms at share `w` of the second wave: each wave at its own peak, then mixed. */
export function blendTerms(a: Builtin, b: Builtin, w: number): Float64Array {
  const s = shareOf(w);
  const [x, y] = [terms(a), terms(b)];
  const [px, py] = [peakOf(a), peakOf(b)];
  const imag = new Float64Array(Math.max(x.length, y.length));
  for (let k = 0; k < imag.length; k++) imag[k] = ((1 - s) * (x[k] ?? 0)) / px + (s * (y[k] ?? 0)) / py;
  return imag;
}

/** The blend's wave at share `w` (Web Audio scales it to peak at 1, as each built-in wave does), made once a share. */
export function blendWave(ctx: AudioContext, cache: Map<number, PeriodicWave>, a: Builtin, b: Builtin, w: number): PeriodicWave {
  const s = shareOf(w);
  let wave = cache.get(s);
  if (!wave) {
    const imag = blendTerms(a, b, s);
    cache.set(s, (wave = ctx.createPeriodicWave(new Float32Array(imag.length), Float32Array.from(imag))));
  }
  return wave;
}
