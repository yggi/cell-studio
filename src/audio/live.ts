/**
 * What the views ask of the sound while it plays, and how a hand reaches it: one object (the Player
 * implements it) instead of a callback per question passed down through the graph (#9).
 */
export interface LiveSource {
  /** Frequency of the note a voice sounds now (null when not playing). */
  note(voice: string): number | null;
  /** Live FFT of a voice, a mix or the sound card (null when not playing). */
  spectrum(voice: string): { left: Float32Array; right: Float32Array; sampleRate: number } | null;
  /** What something sounds like now, as a waveform (null: it doesn't sound, or nothing plays). */
  waveform(name: string): Float32Array | null;
  /** What something sounds like now, as a fine spectrum (dB per bin, Hz per bin). */
  freqs(name: string): { db: Float32Array; hz: number } | null;
  /** How strongly each of a resonator's modes and exciters rings now (0 … 1), null when not playing. */
  resonance(name: string): { modes: number[]; exciters: number[] } | null;
  /** A sound tape: where it is now (tape-seconds; null: not playing). */
  tapePos(tape: string): number | null;
  /** How loud what a tape records is now (0 … 1), null when not playing. */
  tapeLevel(tape: string): number | null;
  /** A hand holding a sound tape at u (tape-seconds; null lets go). */
  scrub(tape: string, u: number | null): void;
  /** A hand on a physical cell (now): its finger's speed (1 on tempo), or null to let go. */
  grab(cell: string, speed: number | null): void;
  /** A resonator: strike at x (0 rim … .5 centre), damp while held, bow (null lifts it). */
  strike(name: string, x: number, index?: number): void;
  damp(name: string, on: boolean): void;
  bow(name: string, amount: number | null): void;
  /** A key pressed on a voice, now (a hand: stopped becomes paused), until `release(id)`; velocity 1 … 127. */
  press(voice: string, freq: number, velocity: number): number;
  /** The key pressed as `id` let go (one never pressed, or let go already, is ignored). */
  release(id: number): void;
}
