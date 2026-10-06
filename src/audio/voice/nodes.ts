/**
 * The bridge between Tone's wrapped nodes and native Web Audio ones, typed in one place so the voices
 * needn't cast (#9). If Tone goes (#16), this is what changes.
 */
import type { ToneAudioNode } from 'tone';

export type ToneNS = typeof import('tone');

/** Anything made for a voice that has to be let go of. */
export interface Disposable {
  dispose(): void;
}

/** An audio parameter that can be scheduled (Tone's Param and the Web Audio one share these). */
export interface Movable {
  setValueAtTime(v: number, t: number): unknown;
  linearRampToValueAtTime(v: number, t: number): unknown;
  exponentialRampToValueAtTime(v: number, t: number): unknown;
  cancelScheduledValues(t: number): unknown;
}

/**
 * Tone's context, used as an AudioContext: it makes native nodes (createGain, createOscillator …) that
 * connect to Tone's own, and has the clock (currentTime) and sampleRate.
 */
export const audioContext = (Tone: ToneNS): AudioContext => Tone.getContext() as unknown as AudioContext;

/**
 * A Tone node's own native input. A native node connects itself to it (`native.connect(inputOf(tone))`):
 * Tone's connect helper doesn't take a native source, silently.
 */
export const inputOf = (node: ToneAudioNode): AudioNode => (node as unknown as { input: AudioNode }).input;

/** A Tone parameter (a filter's frequency, a gain), to schedule as a Movable. */
export const movable = (param: object): Movable => param as unknown as Movable;

/** Something to dispose, from a function that unwires it. */
export const disposer = (f: () => void): Disposable => ({ dispose: f });
