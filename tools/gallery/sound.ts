/**
 * A made-up sound for the harness: what the wheels ask of the Player while a piece plays, answered with
 * fixed, plausible values (a note with its overtones, a sine, modes ringing), the same every time.
 */
import type { LiveSource } from '../../src/audio/live';

const BINS = 1024;
const RATE = 44100;
/** A note at f with overtones falling off, in dB per bin (as an analyser gives it). */
function partials(f: number, pan = 0): Float32Array {
  const db = new Float32Array(BINS).fill(-110);
  const binHz = RATE / 2 / BINS;
  for (let k = 1; k <= 12; k++) {
    const i = Math.round((f * k) / binHz);
    if (i > 0 && i < BINS) db[i] = Math.max(db[i], -18 - 20 * Math.log10(k) - 6 * pan);
  }
  return db;
}
const sine = Float32Array.from({ length: 1024 }, (_, i) => 0.7 * Math.sin((2 * Math.PI * i * 4) / 1024));

export function madeUpSound(playing: () => boolean): LiveSource {
  const on = <T>(v: () => T) => (playing() ? v() : null);
  return {
    note: () => on(() => 261.63),
    spectrum: () => on(() => ({ left: partials(261.63), right: partials(261.63, 1), sampleRate: RATE })),
    waveform: () => on(() => sine),
    freqs: () => on(() => ({ db: partials(261.63), hz: RATE / 2 / BINS })),
    resonance: () => on(() => ({ modes: [0.9, 0.6, 0.4, 0.25, 0.15], exciters: [0.7, 0.3, 0.1] })),
    tapePos: () => on(() => 1.5),
    tapeLevel: () => on(() => 0.6),
    scrub: () => {},
    grab: () => {},
    strike: () => {},
    damp: () => {},
    bow: () => {},
    press: () => 0,
    release: () => {},
  };
}
