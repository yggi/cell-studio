/**
 * Window-clocked player. Event times are seconds at the code's tempo; the
 * transport runs at 60 bpm × rate, so one transport quarter is one of those
 * seconds and the tempo control can change speed smoothly. Every sixteenth
 * it asks its engine what to play in the next window (engine/schedule.ts:
 * plain data, worked out here or in a worker, audio/engine.ts) and schedules
 * that at its exact offsets. Programs are swapped in whole (on edits and on
 * every shift) and take effect at the next window.
 */
import { clocking, tapeMotion, type Plan } from '../engine/realize';
import { isPhysical, retime, type Window } from '../engine/schedule';
import { createVoices, type VoiceBank } from './voices';
import { transportClock } from './clock.svelte';
import { load, watchLoad } from './load';
import { capacity, markDuration, marks, noteStats } from './stats';
import { resolveTuning, type Tuning, DEFAULT_TUNING } from './tuning';
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
  private raf = 0;
  private rate = 1;
  // (counts runs: a window answered after a stop, or after the next start, is not played)
  private run = 0;

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

  /**
   * Stopped: every sound tape is held, silent, where it stands (a fresh one at its start). A tape's hiss
   * runs from the moment its nets are made — made on every load — so without this a piece just opened
   * would hiss before anything is played.
   */
  private settle(): void {
    if (this.playing || !this.plan || !this.voices || !this.Tone) return;
    for (const tp of this.plan.result.tapes) {
      const u = this.heldTapes.get(tp.name) ?? 0;
      this.heldTapes.set(tp.name, u);
      this.holdTape(tp.name, u);
    }
  }

  /** How the context was tuned (the safe defaults unless the address said otherwise). */
  tuning: Tuning = DEFAULT_TUNING;

  /** A tuning asked for with `retune` before the engine was awake. */
  private asked: Tuning | null = null;

  private context(T: ToneNS, t: Tuning) {
    return new T.Context({ latencyHint: t.latencyHint as AudioContextLatencyCategory, lookAhead: t.lookAhead ?? 0.3 });
  }

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
    this.Tone.setContext(this.context(this.Tone, t), true);
    this.watchCapacity();
    this.resetState();
    await this.Tone.start().catch(() => undefined);
  }

  /** The native context behind Tone's wrapper (where renderCapacity and the output timestamp live). */
  private native(): Record<string, unknown> | null {
    if (!this.Tone) return null;
    const raw = (this.Tone.getContext() as unknown as { rawContext?: Record<string, unknown> }).rawContext;
    return ((raw?._nativeContext as Record<string, unknown> | undefined) ?? raw) ?? null;
  }

  /** The render thread's load and underruns, once a second, where the browser reports them (stats.ts `capacity`). */
  private watchCapacity() {
    try {
      const rc = this.native()?.renderCapacity as
        | { start(o: { updateInterval: number }): void; addEventListener(t: 'update', f: (e: { averageLoad: number; peakLoad: number; underrunRatio: number }) => void): void }
        | undefined;
      if (!rc) return;
      capacity.supported = true;
      rc.addEventListener('update', (e) => {
        capacity.events.push({ t: performance.now(), avg: e.averageLoad, peak: e.peakLoad, underrun: e.underrunRatio });
        if (capacity.events.length > 3600) capacity.events.splice(0, capacity.events.length - 3600);
      });
      rc.start({ updateInterval: 1 });
    } catch {
      /* not available here */
    }
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
      // headroom: a context tuned for playback (a larger buffer) that schedules notes 0.3 s ahead —
      // a busy page (a large graph drawing) then doesn't make notes late or starve the sound
      // (the defaults, unless the address asks otherwise to find out how far they can go on a device: audio/tuning.ts)
      this.tuning = this.asked ?? readTuning();
      T.setContext(this.context(T, this.tuning), true); // (true: dispose Tone's default context, or it keeps running beside ours)
      this.Tone = T;
      this.watchCapacity();
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
    if (!this.playing) return this.heldTapes.get(tape) ?? null;
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
    if (!this.playing) {
      if (u !== null) this.heldTapes.set(tape, u);
      const at = this.heldTapes.get(tape);
      if (at !== undefined) this.holdTape(tape, at);
      return;
    }
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
  audioInfo(): {
    state: string | null;
    sampleRate: number | null;
    baseLatency: number | null;
    outputLatency: number | null;
    currentTime: number | null;
    playout: { underrunEvents: number; underrunDuration: number; totalDuration: number; averageLatency: number; maximumLatency: number } | null;
    /** Notes scheduled / shifted late / left out for being > 50 ms late, since the page loaded. */
    notes: { played: number; late: number; dropped: number; worstLateMs: number };
    /** Seconds between a sample being made and being heard, from the output timestamp (null where there is none). */
    heardLatency: number | null;
    /** The tuning in force (the latency hint and the look-ahead), as words. */
    tuning: string;
  } {
    const tuned = `${typeof this.tuning.latencyHint === 'number' ? `${this.tuning.latencyHint} s` : this.tuning.latencyHint}, look-ahead ${this.tuning.lookAhead ?? 'default'}`;
    // (the worst lateness is since the last time it was asked: the report reads it every half second, so a window
    // can tell its own worst from one at the start of the page)
    const notes = { ...noteStats };
    noteStats.worstLateMs = 0;
    if (!this.Tone) return { state: null, sampleRate: null, baseLatency: null, outputLatency: null, currentTime: null, playout: null, notes, heardLatency: null, tuning: tuned };
    const tc = this.Tone.getContext() as unknown as { rawContext?: Record<string, unknown>; state?: string; sampleRate?: number; currentTime?: number };
    const raw = (tc.rawContext ?? {}) as { playoutStats?: Record<string, number>; _nativeContext?: { playoutStats?: Record<string, number>; baseLatency?: number; outputLatency?: number }; baseLatency?: number; outputLatency?: number };
    // (Tone wraps the native context: the stats are on the native one)
    const stats = raw.playoutStats ?? raw._nativeContext?.playoutStats;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
      state: tc.state ?? null,
      sampleRate: num(tc.sampleRate),
      baseLatency: num(raw.baseLatency ?? raw._nativeContext?.baseLatency),
      outputLatency: num(raw.outputLatency ?? raw._nativeContext?.outputLatency),
      currentTime: num(tc.currentTime),
      notes,
      tuning: tuned,
      heardLatency: (() => {
        try {
          const n = this.native() as { getOutputTimestamp?: () => { contextTime?: number }; currentTime?: number } | null;
          const ts = n?.getOutputTimestamp?.();
          return ts && typeof ts.contextTime === 'number' && ts.contextTime > 0 && typeof n?.currentTime === 'number' ? Math.max(0, n.currentTime - ts.contextTime) : null;
        } catch {
          return null;
        }
      })(),
      playout: stats
        ? {
            underrunEvents: stats.underrunEvents ?? 0,
            underrunDuration: stats.underrunDuration ?? 0,
            totalDuration: stats.totalDuration ?? 0,
            averageLatency: stats.averageLatency ?? 0,
            maximumLatency: stats.maximumLatency ?? 0,
          }
        : null,
    };
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
    for (const t of this.heldTapes.keys()) this.voices!.tapeScrub(t, null);
    this.heldTapes.clear();

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

    watchLoad();
    const startsAt = Tone.now() + 0.05;
    tr.start(startsAt);
    transportClock.playing = true;
    let shown = 0;
    const frame = (t: number) => {
      // (the live views: about 24 times a second — plenty for the eye, and a large graph leaves the
      // page free to keep the sound fed)
      if (t - shown < 40 * load.scale) {
        this.raf = requestAnimationFrame(frame);
        return;
      }
      shown = t;
      // (until it has started, the transport still reports where the last run stopped: count from 0)
      const t0 = marks.on ? performance.now() : 0;
      transportClock.seconds = offset + (Tone.immediate() < startsAt ? 0 : Math.max(0, tr.getTicksAtTime(Tone.immediate()) / ppq));
      // (what this write sets going — the reactive flush of every live view — runs as a microtask queued
      // before this one: when this one runs, the flush is done)
      if (t0) queueMicrotask(() => markDuration('transport + flush', performance.now() - t0));
      // a piece that ends (laps=): stop once its last notes have rung out
      if (this.plan && Number.isFinite(this.plan.end) && transportClock.seconds > this.plan.end + TAIL) {
        this.stop();
        return;
      }
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  private pausedAt = 0;
  private pausedAudio = 0;
  private heldTapes = new Map<string, number>();

  stop(): void {
    cancelAnimationFrame(this.raf);
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
    this.pausedAt = at;
    this.pausedAudio = this.Tone.getContext().currentTime;
    if (this.plan)
      for (const tp of this.plan.result.tapes) {
        const u = tapeMotion(this.plan.result, clocking(this.plan.result, this.plan.statics), tp.name).pos(at);
        this.heldTapes.set(tp.name, u);
        this.holdTape(tp.name, u);
      }
  }

  /** Back to the start as written: tapes wound off, hands' forces gone (Reset). */
  resetState(): void {
    this.engine.reset();
    this.voices?.clearTapes();
    this.heldTapes.clear();
    this.pausedAt = 0;
    this.pausedAudio = this.Tone?.getContext().currentTime ?? 0;
  }

  // a sound tape held still at u (stopped): its heads read what sat under them when it was there
  private holdTape(tape: string, u: number) {
    if (!this.plan || !this.voices || !this.Tone) return;
    const motion = tapeMotion(this.plan.result, clocking(this.plan.result, this.plan.statics), tape);
    const since = this.Tone.getContext().currentTime - this.pausedAudio;
    this.voices.tapeScrub(tape, (at) => this.pausedAt - motion.real(u - at) + since);
  }

  dispose(): void {
    this.stop();
    this.engine.dispose();
    this.voices?.dispose();
    this.voices = undefined;
  }
}

const KEPT = { latency: 'cell-studio-latency', lookahead: 'cell-studio-lookahead' };
/** The tuning the address and the kept settings ask for (and keeps the address's). */
function readTuning(): Tuning {
  if (typeof location === 'undefined') return DEFAULT_TUNING;
  let kept = { latency: null as string | null, lookahead: null as string | null };
  try {
    kept = { latency: localStorage.getItem(KEPT.latency), lookahead: localStorage.getItem(KEPT.lookahead) };
  } catch {
    /* no storage here */
  }
  const { tuning, keep } = resolveTuning(location.search, kept);
  try {
    for (const k of ['latency', 'lookahead'] as const) keep[k] === null ? localStorage.removeItem(KEPT[k]) : localStorage.setItem(KEPT[k], keep[k]!);
  } catch {
    /* no storage here */
  }
  return tuning;
}
