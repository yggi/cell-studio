/**
 * A piece played into a buffer, faster than real time: the same voices and the same
 * notes as live (each scheduled at its exact time), in an offline audio context.
 * For saving as WAV, and for measuring — loudness, peaks, clipping — what a test
 * can't hear.
 */
import { eventsBetween, plan, type Plan } from '../engine/realize';
import { tapeSpeeds } from '../engine/schedule';
import type { CompileResult, Shifts } from '../engine/compile';
import { pieceTime } from '../engine/duration';
import { createVoices } from './voices';

export interface Rendered {
  readonly buffer: AudioBuffer;
  /** Loudness: the RMS of both channels, in dB below full scale. */
  readonly rms: number;
  /** The loudest sample, in dB below full scale (0 is the ceiling). */
  readonly peak: number;
  /** How many samples reached the ceiling. */
  readonly clipped: number;
}

export async function renderOffline(plan: Plan, seconds: number, tail = 2): Promise<Rendered> {
  (globalThis as { TONE_SILENCE_LOGGING?: boolean }).TONE_SILENCE_LOGGING = true;
  const Tone = await import('tone');
  const out = await Tone.Offline(
    async () => {
      const voices = createVoices(Tone);
      voices.sync(plan.result, plan.statics);
      // (the reverb prepares its impulse first: without it, the first notes would ring dry)
      await voices.ready();
      for (const e of eventsBetween(plan, 0, seconds)) voices.play(e);
      // sound tapes on a moving clock: their speed over the whole render
      for (const t of tapeSpeeds(plan, 0, seconds)) voices.tapeSpeed(t.tape, t.points);
    },
    seconds + tail,
    2,
    44100,
  );
  const buffer = out.get() as AudioBuffer;
  return { buffer, ...loudness(buffer) };
}

/** 16-bit PCM WAV, interleaved. */
export function wav(buffer: AudioBuffer): Blob {
  const chs = buffer.numberOfChannels;
  const len = buffer.length;
  const data = new DataView(new ArrayBuffer(44 + len * chs * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => data.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  data.setUint32(4, 36 + len * chs * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, chs, true);
  data.setUint32(24, buffer.sampleRate, true);
  data.setUint32(28, buffer.sampleRate * chs * 2, true);
  data.setUint16(32, chs * 2, true);
  data.setUint16(34, 16, true);
  text(36, 'data');
  data.setUint32(40, len * chs * 2, true);
  const channels = Array.from({ length: chs }, (_, c) => buffer.getChannelData(c));
  let at = 44;
  for (let i = 0; i < len; i++)
    for (let c = 0; c < chs; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      data.setInt16(at, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      at += 2;
    }
  return new Blob([data.buffer], { type: 'audio/wav' });
}


/** How much of a piece to render: all of it if it ends (10 minutes at most), else one cycle (a minute at most). */
export function renderLength(result: CompileResult): number {
  const t = pieceTime(result);
  if (t.ends !== null) return Math.min(600, t.ends);
  return Math.min(60, t.cycle ?? 60);
}

/** A compiled piece, rendered: its length (or the given seconds), with a moment for the last notes to ring. */
export async function renderPiece(result: CompileResult, shifts: Shifts, seconds?: number): Promise<AudioBuffer> {
  return (await renderOffline(plan(result, shifts), seconds ?? renderLength(result))).buffer;
}

/** A buffer's loudness (RMS, dB below full scale), its peak, and how many samples reached the ceiling. */
export function loudness(buffer: AudioBuffer): { rms: number; peak: number; clipped: number } {
  let sum = 0;
  let top = 0;
  let clipped = 0;
  let n = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const v = Math.abs(d[i]);
      sum += v * v;
      if (v > top) top = v;
      if (v >= 0.999) clipped++;
      n++;
    }
  }
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { rms: db(Math.sqrt(sum / Math.max(1, n))), peak: db(top), clipped };
}

/** A hash of a buffer's samples (FNV-1a over their bits): equal hashes, the same sound to the last bit. */
export function sampleHash(buffer: AudioBuffer): string {
  let h = 0x811c9dc5;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const bits = new Uint32Array(Float32Array.from(buffer.getChannelData(ch)).buffer);
    for (let i = 0; i < bits.length; i++) h = Math.imul(h ^ bits[i], 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** The level (RMS of both channels) of each block of `size` samples: a coarse print of a sound, to compare two renders. */
export function blockLevels(buffer: AudioBuffer, size = 2048): number[] {
  const chs = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const out: number[] = [];
  for (let at = 0; at < buffer.length; at += size) {
    let sum = 0;
    const end = Math.min(buffer.length, at + size);
    for (const d of chs) for (let i = at; i < end; i++) sum += d[i] * d[i];
    out.push(Math.sqrt(sum / ((end - at) * chs.length)));
  }
  return out;
}
