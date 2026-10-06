/**
 * Window-clocked player. Event times are seconds at the code's tempo; the
 * transport runs at 60 bpm × rate, so one transport quarter is one of those
 * seconds and the tempo control can change speed smoothly. Every sixteenth
 * it asks its engine what to play in the next window (engine/schedule.ts:
 * plain data, worked out here or in a worker, audio/engine.ts) and schedules
 * that at its exact offsets. Programs are swapped in whole (on edits and on
 * every shift) and take effect at the next window.
 */
import { clocking, tapeMotion } from '../engine/clocking';
import { type Plan } from '../engine/realize';
import { isPhysical, retime, type Window } from '../engine/schedule';
import { createVoices, type VoiceBank } from './voices';
import { transportClock } from './clock.svelte';
import { onFrames } from './ticker';
import { markDuration, marks } from './stats';
import { type Tuning, DEFAULT_TUNING } from './tuning';
import { audioInfo, openContext, readTuning, type AudioInfo } from './device';
import { HeldTapes } from './heldTapes';
import { LocalEngine, type Engine, type PieceSource } from './engine';
import type { LiveSource } from './live';

type ToneNS = typeof import('tone');
const WINDOW = 0.25; // transport quarters = code seconds
/** After a piece's end, how long its last notes (releases, reverb, echoes) ring before the transport stops. */
const TAIL = 2.5;

export class Player implements LiveSource {
  private Tone?: ToneNS;
  private voices?: VoiceBank;
  private plan: Plan | null = null;
  private repeatId: number | null = null;
  private stopFrames: () => void = () => {};
  private rate = 1;
  // (counts runs: a window answered after a stop, or after the next start, is not played)
  private run = 0;
  private held = new HeldTapes(
    () => this.plan,
    () => this.voices,
    () => (this.Tone ? this.Tone.getContext().currentTime : null),
  );

  constructor(private engine: Engine = new LocalEngine()) {}

  /** The piece to play: its plan, and the source it was compiled from (for an engine in a worker). */
  load(plan: Plan, source: PieceSource | null = null): void {
    this.plan = plan;
    this.engine.load(plan, source);
    this.voices?.sync(plan.result, plan.statics);
    this.settle();
  }

  /** How the engine's windows went (for measuring). */
  engineStats() {
    return this.engine.stats();
  }

  /** A hand on a physical cell, now: its finger's speed (1 on tempo), or null to let go. */
  grab(cell: string, speed: number | null): void {
    this.engine.grab(cell, transportClock.seconds, speed);
  }

  /** Stopped: every sound tape is held, silent, where it stands (heldTapes.ts). */
  private settle(): void {
    if (this.playing || !this.plan || !this.voices || !this.Tone) return;
    this.held.settle();
  }

  /** How the context was tuned (the safe defaults unless the address said otherwise). */
  tuning: Tuning = DEFAULT_TUNING;

  /** A tuning asked for with `retune` before the engine was awake. */
  private asked: Tuning | null = null;

  /**
   * Run on another tuning from now on: stopped, the voices gone, a new context (a context's latency is fixed when
   * it is made). For the automated latency test (ui/perfrun.ts); not kept, the address and the kept settings
   * still decide the next page load. The new context starts without a tap because the page has been tapped
   * before (sticky user activation); where it does not, `audioInfo().state` says so.
   */
  async retune(to: Tuning | null): Promise<void> {
    this.stop();
    // (null: as the address and the kept settings say)
    const t = to ?? readTuning();
    this.tuning = t;
    this.asked = to;
    if (!this.Tone) return;
    this.voices?.dispose();
    this.voices = undefined;
    openContext(this.Tone, t);
    this.resetState();
    await this.Tone.start().catch(() => undefined);
  }

  /**
   * The sound engine, awake: made on the first gesture that needs it — Play, or a hand on a resonator
   * while stopped (a body rings whether or not the clocks run). Tone is imported lazily, so no
   * AudioContext exists before then.
   */
  private async wake() {
    (globalThis as { TONE_SILENCE_LOGGING?: boolean }).TONE_SILENCE_LOGGING = true;
    if (!this.Tone) {
      const T = await import('tone');
      this.tuning = this.asked ?? readTuning();
      openContext(T, this.tuning);
      this.Tone = T;
    }
    await this.Tone.start();
    if (!this.voices) {
      this.voices = createVoices(this.Tone);
      if (this.plan) this.voices.sync(this.plan.result, this.plan.statics);
      this.settle();
    }
    return this.Tone;
  }

  /** A hand on a resonator: strike at x (0 edge … 1), damp while held, bow (null lifts it) — playing or not. */
  strike(name: string, x: number, index?: number): void {
    void this.wake().then(() => this.voices?.strike(name, x, index));
  }
  /** What something sounds like now, as a fine spectrum — for a scope's spectrum and waterfall. */
  freqs(name: string): { db: Float32Array; hz: number } | null {
    return this.voices?.freqs(name) ?? null;
  }
  /** What something sounds like now, as a waveform — for an oscilloscope. */
  waveform(name: string): Float32Array | null {
    // (whether or not the clocks run: a struck body, a scratched tape, sound)
    return this.voices?.waveform(name) ?? null;
  }
  resonance(name: string): { modes: number[]; exciters: number[] } | null {
    // (a body rings whether or not the clocks run)
    return this.voices?.resonance(name) ?? null;
  }
  damp(name: string, on: boolean): void {
    void this.wake().then(() => this.voices?.damp(name, on));
  }
  bow(name: string, amount: number | null): void {
    void this.wake().then(() => this.voices?.bow(name, amount));
  }

  /** How loud what a tape is recording is now (0 … 1): a sound tape's input, a note tape's source. */
  tapeLevel(tape: string): number | null {
    if (!this.plan || !this.voices || !this.playing) return null;
    const sound = this.voices.tapeLevel(tape);
    if (sound !== null) return sound;
    const src = this.plan.result.cells.get(tape)?.params.write;
    const o = typeof src === 'string' ? this.plan.result.outputs.find((x) => x.cell === src) : undefined;
    const spec = o ? this.spectrum(o.voice) : null;
    if (!spec) return 0;
    let top = -Infinity;
    for (const ch of [spec.left, spec.right]) for (const v of ch) if (v > top) top = v;
    return Math.min(1, Math.max(0, (top + 90) / 60));
  }

  /** Where a sound tape is now (tape-seconds), while playing. */
  tapePos(tape: string): number | null {
    if (!this.plan) return null;
    if (!this.playing) return this.held.position(tape);
    return tapeMotion(this.plan.result, clocking(this.plan.result, this.plan.statics), tape).pos(transportClock.seconds);
  }

  /**
   * A hand holding a sound tape at u (tape-seconds; null lets go): what sits under each head was
   * written when the tape was at u − at — its delay, now minus then. Moving u back faster than time
   * runs reads backwards; holding it still, the sound stops.
   */
  scrub(tape: string, u: number | null): void {
    if (!this.plan || !this.voices) return;
    // stopped: the tape stays where the hand leaves it
    if (!this.playing) return this.held.scrub(tape, u);
    if (u === null) return this.voices.tapeScrub(tape, null);
    const motion = tapeMotion(this.plan.result, clocking(this.plan.result, this.plan.statics), tape);
    const now = transportClock.seconds;
    this.voices.tapeScrub(tape, (at) => now - motion.real(u - at));
  }

  /** Speed relative to the code's tempo. */
  setRate(rate: number): void {
    this.rate = rate > 0 && Number.isFinite(rate) ? rate : 1;
    if (this.Tone) this.Tone.getTransport().bpm.value = 60 * this.rate;
  }

  /** The note a voice is sounding now (its latest started), while playing. */
  note(voice: string) {
    return this.playing ? (this.voices?.note(voice) ?? null) : null;
  }

  /** Live spectrum of a voice, while playing. */
  spectrum(voice: string) {
    return this.playing ? (this.voices?.spectrum(voice) ?? null) : null;
  }

  /** The audio device's sample rate, once audio has started. */
  get sampleRate(): number | null {
    return this.Tone ? this.Tone.getContext().sampleRate : null;
  }

  /**
   * What the audio context looks like now, for the performance report: its state and latencies, its clock, and
   * — where the browser reports them — the playout underruns. Nothing here starts audio.
   */
  audioInfo(): AudioInfo {
    return audioInfo(this.Tone, this.tuning);
  }

  get playing(): boolean {
    return this.repeatId !== null;
  }

  /** Play — from the start, or from `from` seconds in (the time slider). */
  async start(from = 0): Promise<void> {
    if (this.playing) return;
    const offset = Math.max(0, from);
    // Tone is imported lazily so no AudioContext exists before the first gesture.
    const Tone = await this.wake();
    // physics: a hand's effect comes quickly (and stays, through pause and play, until Reset)
    if (this.plan) (Tone.getContext() as unknown as { lookAhead: number }).lookAhead = this.tuning.lookAhead ?? (isPhysical(this.plan.result) ? 0.12 : 0.3);
    if (this.plan) this.voices!.sync(this.plan.result, this.plan.statics);
    // motors on: held tapes run on from where they stand
    this.held.release();

    const tr = Tone.getTransport();
    tr.stop();
    tr.cancel(0);
    tr.position = 0;
    tr.bpm.value = 60 * this.rate;
    const ppq = tr.PPQ;

    const run = ++this.run;
    // a window onto the audio clock, from `time` (its start) at `secPerQuarter`
    const play = (w: Window, time: number, secPerQuarter: number) => {
      if (run !== this.run || !this.voices) return;
      const { events, tapes } = retime(w, time, secPerQuarter);
      // sound tapes on a moving clock: their speed over this window, for the delays to follow
      for (const t of tapes) this.voices.tapeSpeed(t.tape, t.points);
      for (const e of events) this.voices.play(e);
    };
    this.repeatId = tr.scheduleRepeat(
      (time) => {
        const from = Math.round((tr.getTicksAtTime(time) / ppq) * 4) / 4 + offset;
        const secPerQuarter = 60 / tr.bpm.getValueAtTime(time);
        if (!this.plan) return;
        const w = this.engine.window(from, WINDOW);
        if (w instanceof Promise) void w.then((x) => play(x, time, secPerQuarter));
        else play(w, time, secPerQuarter);
      },
      '16n',
      0,
    );

    const startsAt = Tone.now() + 0.05;
    tr.start(startsAt);
    transportClock.playing = true;
    this.stopFrames();
    const frame = () => {
      // (until it has started, the transport still reports where the last run stopped: count from 0)
      const t0 = marks.on ? performance.now() : 0;
      transportClock.seconds = offset + (Tone.immediate() < startsAt ? 0 : Math.max(0, tr.getTicksAtTime(Tone.immediate()) / ppq));
      // (what this write sets going — the reactive flush of every live view — runs as a microtask queued
      // before this one: when this one runs, the flush is done)
      if (t0) queueMicrotask(() => markDuration('transport + flush', performance.now() - t0));
      // a piece that ends (laps=): stop once its last notes have rung out
      if (this.plan && Number.isFinite(this.plan.end) && transportClock.seconds > this.plan.end + TAIL) this.stop();
    };
    // (the live views: about 24 times a second — plenty for the eye, and a large graph leaves the
    // page free to keep the sound fed)
    this.stopFrames = onFrames(frame, () => 40, 'clock');
  }

  stop(): void {
    this.stopFrames();
    const at = transportClock.seconds;
    transportClock.playing = false;
    transportClock.seconds = 0;
    if (!this.Tone || this.repeatId === null) return;
    const tr = this.Tone.getTransport();
    tr.stop();
    tr.clear(this.repeatId);
    this.repeatId = null;
    this.run++;
    this.voices?.releaseAll();
    // motors off: every sound tape stops where it is — held, silent, what's on it kept
    this.held.pause(at);
  }

  /** Back to the start as written: tapes wound off, hands' forces gone (Reset). */
  resetState(): void {
    this.engine.reset();
    this.voices?.clearTapes();
    this.held.reset();
  }

  dispose(): void {
    this.stop();
    this.engine.dispose();
    this.voices?.dispose();
    this.voices = undefined;
  }
}
