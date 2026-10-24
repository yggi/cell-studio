/**
 * Window-clocked player. Event times are seconds at the code's tempo; the
 * transport runs at 60 bpm × rate, so one transport quarter is one of those
 * seconds and the tempo control can change speed smoothly. Every sixteenth
 * it asks its engine what to play in the next window (engine/schedule.ts:
 * plain data, worked out here or in a worker, audio/engine.ts) and schedules
 * that at its exact offsets. Programs are swapped in whole (on edits and on
 * every shift) and take effect at the next window.
 */
import { clocking, tapeMotion } from '@yggi/cells/engine/clocking';
import { eventsBetween, type Plan, type Played } from '@yggi/cells/engine/realize';
import { isPhysical, retime, type Window } from '@yggi/cells/engine/schedule';
import type { ClockTicks } from '@yggi/cells/engine/midiclock';
import { createVoices, type VoiceBank } from './voices';
import { transportClock } from './clock.svelte';
import { transition, type TransportEvent, type TransportState } from './transport';
import { onFrames } from './ticker';
import { markDuration, marks } from './stats';
import { type Tuning, DEFAULT_TUNING } from './tuning';
import { audioInfo, contextClock, heardLatency, openContext, outputLatency, readTuning, type AudioInfo } from './device';
import { HeldTapes } from './heldTapes';
import { heardLag } from './heard';
import { LocalEngine, type Engine, type PieceSource } from './engine';
import type { LiveSource } from './live';

type ToneNS = typeof import('tone');
const WINDOW = 0.25; // transport quarters = code seconds
/** After a piece's end, how long its last notes (releases, reverb, echoes) ring before the transport stops. */
const TAIL = 2.5;

/** How often a feed is asked what to play next (transport quarters: seconds at 60 bpm), and how far ahead of now it is asked to. */
const FEED_EVERY = 0.125;
// (a host tells a bar's start a beat before it, 0.33 s at 180 bpm: a note laid within that has its bar's end)
const FEED_LEAD = 0.35;

/**
 * A song another clock lays (a Jambot session's, #478 rung 3), played in place of the transport's run: asked, every
 * FEED_EVERY on the audio clock, what to play from where it left off to `horizon`, both on the page's clock.
 */
export interface Feed {
  next(now: number, horizon: number): readonly Fed[];
}

/** A window of a plan, and where its start is heard on the page's clock (`performance.now()`, in seconds), stretched by `scale`. */
export interface Fed {
  readonly plan: Plan;
  readonly window: Window;
  readonly time: number;
  readonly scale: number;
}

/** Where the notes played also go (MIDI out, #205): each window's notes and MIDI clock ticks (#206), retimed onto the audio clock, and the stops. */
export interface NoteSink {
  /** A window's notes and clock ticks (AudioContext seconds) and where that window ends: nothing later starts before it. */
  play(T: ToneNS, events: readonly Played[], until: number, ticks: ClockTicks | null): void;
  /** Stopped now: what was sent ahead and is still held is let go, and nothing later is sent that could cut a resume. */
  stop(T: ToneNS): void;
}

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

  /** Told when a piece that ends (`laps=`) has rung out and the transport paused itself there: where it ended (code seconds). */
  onEnded: ((end: number) => void) | null = null;

  constructor(private engine: Engine = new LocalEngine()) {}

  get state(): TransportState {
    return transportClock.state;
  }

  /** Something happened to the transport (audio/transport.ts says what it becomes). */
  private move(event: TransportEvent): void {
    transportClock.state = transition(transportClock.state, event);
  }

  /** When the timeline last moved by hand (ms). */
  private scrolledAt = 0;

  /**
   * The timeline moved from `from` to `to` (code seconds) while not playing: a hand turned it (`hand`), or the slider
   * jumped. Every sound tape goes to where the timeline has it (held.ts), and, for a hand, the notes it passed over
   * sound as it passes them, in either direction — a tine rings as its pin goes by, whichever way the drum turns.
   */
  scroll(from: number, to: number, hand: boolean): void {
    if (this.playing) return;
    this.touch();
    this.held.follow(to);
    if (!hand || from === to) return;
    const now = typeof performance === 'undefined' ? 0 : performance.now();
    // (how long the hand took: the notes it passed are spread over that, not over the piece's own time)
    const took = this.scrolledAt ? Math.min(100, Math.max(8, now - this.scrolledAt)) : 16;
    this.scrolledAt = now;
    void this.wake().then(() => {
      const plan = this.plan;
      if (!plan || !this.voices || !this.Tone || this.playing) return;
      const [lo, hi] = from < to ? [from, to] : [to, from];
      const scale = Math.min(1.5, Math.max(0.02, took / 1000 / (hi - lo)));
      const start = this.Tone.getContext().currentTime + 0.01;
      // (at most 32, the ones nearest where the hand started)
      // (a drone's held note isn't a note a hand passes: it sounds while playing)
      const passed = eventsBetween(plan, lo, hi, true).filter((e) => !e.held);
      for (const e of from < to ? passed.slice(0, 32) : passed.slice(-32)) {
        // (where the hand passes it: forward from the low end, backward from the high)
        const at = start + (from < to ? e.at - lo : hi - e.at) * scale;
        for (const x of retime({ from: e.at, to: e.at, events: [e], tapes: [] }, at, scale).events) this.voices.play(x);
      }
    });
  }

  /** A hand on anything, or a move in time: a stopped transport is paused from now on (the hands below call it). */
  touch(): void {
    this.voices?.open();
    this.move('touch');
  }

  /** The piece to play: its plan, and the source it was compiled from (for an engine in a worker). */
  load(plan: Plan, source: PieceSource | null = null): void {
    this.plan = plan;
    this.engine.load(plan, source);
    // (a feed's voices are its windows' plans')
    if (!this.feeding) this.voices?.sync(plan.result, plan.statics, plan.muted);
    this.settle();
  }

  /** How the engine's windows went (for measuring). */
  engineStats() {
    return this.engine.stats();
  }

  /**
   * A hand on a physical cell, now: its finger's speed (1 on tempo), or null to let go. Every hand —
   * this, `strike`, `damp`, `bow`, `scrub` — takes a stopped transport to paused when it lays hold
   * (letting go does not: a hand can be lifted after Stop).
   */
  grab(cell: string, speed: number | null): void {
    if (speed !== null) this.touch();
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

  /** Where the notes played go besides the voices (MIDI out, #205): none until one is given. */
  sink: NoteSink | null = null;
  private heard = true;
  /** Whether the built-in sound is heard: off, the voices go silent and the sink alone sounds, on the same audio clock. */
  set internal(on: boolean) {
    this.heard = on;
    if (this.Tone) this.Tone.getDestination().mute = !on;
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
    this.lag = null;
    if (!this.Tone) return;
    this.voices?.dispose();
    this.voices = undefined;
    openContext(this.Tone, t);
    this.resetState();
    await this.Tone.start().catch(() => undefined);
  }

  /** How far the pictures are held back from the audio clock, so that they show what is heard (audio/heard.ts); null until measured. */
  private lag: number | null = null;
  private refreshLag(): void {
    if (this.Tone) this.lag = heardLag(this.lag, heardLatency(this.Tone), outputLatency(this.Tone));
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
      if (this.plan) this.voices.sync(this.plan.result, this.plan.statics, this.plan.muted);
      this.settle();
    }
    this.Tone.getDestination().mute = !this.heard;
    return this.Tone;
  }

  /** A hand on a resonator: strike at x (0 edge … 1), damp while held, bow (null lifts it) — playing or not. */
  strike(name: string, x: number, index?: number): void {
    this.touch();
    void this.wake().then(() => this.voices?.strike(name, x, index));
  }
  // the keys held: the player's id for each, and the voice bank's once the bank has answered (`settled`); `up`: let go
  // before that, so it sounds and lets go at once
  private keys = new Map<number, { bank: number | null; settled: boolean; up: boolean }>();
  private lastKey = 0;
  /** Told when Stop cuts every key held (state/keys.svelte.ts forgets them). */
  onKeysCut: (() => void) | null = null;

  /**
   * A key pressed (MIDI in, the computer keys, on-screen keys) on a voice: a held note at once, at the context clock
   * rather than through the look-ahead, sounding with the voice's own envelope until `release`. A hand, as a strike is:
   * a stopped transport is paused from now on. Pause leaves it sounding (the plan's notes let go, a hand's don't);
   * Stop cuts it.
   */
  press(voice: string, freq: number, velocity: number): number {
    this.touch();
    const id = ++this.lastKey;
    const key = { bank: null as number | null, settled: false, up: false };
    this.keys.set(id, key);
    void this.wake().then(
      () => {
        if (this.keys.get(id) !== key) return; // (cut by Stop before it sounded)
        key.bank = this.voices?.press(voice, freq, velocity) ?? null;
        key.settled = true;
        if (key.up) this.release(id);
      },
      () => this.keys.delete(id),
    );
    return id;
  }

  /** A key let go: its note goes into its release. An id never pressed, or let go already, is ignored. */
  release(id: number): void {
    const key = this.keys.get(id);
    if (!key) return;
    if (!key.settled) {
      key.up = true;
      return;
    }
    this.keys.delete(id);
    if (key.bank !== null) this.voices?.release(key.bank);
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
    if (on) this.touch();
    void this.wake().then(() => this.voices?.damp(name, on));
  }
  bow(name: string, amount: number | null): void {
    if (amount !== null) this.touch();
    void this.wake().then(() => this.voices?.bow(name, amount));
  }

  /** How loud what a tape is recording is now (0 … 1): a sound tape's input, a note tape's source. */
  tapeLevel(tape: string): number | null {
    if (!this.plan || !this.voices || this.state === 'stopped') return null;
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
    if (u !== null) this.touch();
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

  /** The note a voice is sounding now (its latest started), unless stopped: paused, it is the last one. */
  note(voice: string) {
    return this.state !== 'stopped' ? (this.voices?.note(voice) ?? null) : null;
  }

  /** Live spectrum of a voice, unless stopped (paused, whatever still rings: tails, a body, a held tape). */
  spectrum(voice: string) {
    return this.state !== 'stopped' ? (this.voices?.spectrum(voice) ?? null) : null;
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
    return { ...audioInfo(this.Tone, this.tuning), pictureLag: this.lag };
  }

  get playing(): boolean {
    return transportClock.state === 'playing';
  }

  /** Play — from the start, or from `from` seconds in (the time slider). */
  async start(from = 0): Promise<void> {
    if (this.playing) return;
    const offset = Math.max(0, from);
    // Tone is imported lazily so no AudioContext exists before the first gesture.
    const Tone = await this.wake();
    // physics: a hand's effect comes quickly (and stays, through pause and play, until Reset)
    if (this.plan) (Tone.getContext() as unknown as { lookAhead: number }).lookAhead = this.tuning.lookAhead ?? (isPhysical(this.plan.result) ? 0.12 : 0.3);
    if (this.plan) this.voices!.sync(this.plan.result, this.plan.statics, this.plan.muted);
    // motors on: held tapes run on from where they stand
    this.held.release();
    this.voices!.open();

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
      const { events, tapes, clock } = retime(w, time, secPerQuarter);
      // sound tapes on a moving clock: their speed over this window, for the delays to follow
      for (const t of tapes) this.voices.tapeSpeed(t.tape, t.points);
      for (const e of events) this.voices.play(e);
      this.sink?.play(Tone, events, time + (w.to - w.from) * secPerQuarter, clock);
    };
    this.repeatId = tr.scheduleRepeat(
      (time) => {
        const from = Math.round((tr.getTicksAtTime(time) / ppq) * 4) / 4 + offset;
        const secPerQuarter = 60 / tr.bpm.getValueAtTime(time);
        if (!this.plan) return;
        // (a drone starts where this run began: decision 028)
        const w = this.engine.window(from, WINDOW, offset);
        if (w instanceof Promise) void w.then((x) => play(x, time, secPerQuarter));
        else play(w, time, secPerQuarter);
      },
      '16n',
      0,
    );

    const startsAt = Tone.now() + 0.05;
    tr.start(startsAt);
    this.running = { startsAt, offset };
    this.move('play');
    this.stopFrames();
    let lagAt = 0;
    this.refreshLag();
    const frame = (t: number) => {
      // (until it has started, the transport still reports where the last run stopped: count from 0)
      const t0 = marks.on ? performance.now() : 0;
      // (the position of what is heard now: the audio clock says what is made, the speaker plays it `lag` later)
      if (t - lagAt > 500) {
        lagAt = t;
        this.refreshLag();
      }
      const heard = Tone.immediate() - (this.lag ?? 0);
      transportClock.seconds = offset + (heard < startsAt ? 0 : Math.max(0, tr.getTicksAtTime(heard) / ppq));
      // (what this write sets going — the reactive flush of every live view — runs as a microtask queued
      // before this one: when this one runs, the flush is done)
      if (t0) queueMicrotask(() => markDuration('transport + flush', performance.now() - t0));
      // a piece that ends (laps=): stop once its last notes have rung out
      if (this.plan && Number.isFinite(this.plan.end) && transportClock.seconds > this.plan.end + TAIL) {
        const end = this.plan.end;
        this.pause();
        this.onEnded?.(end);
      }
    };
    // (the live views: about 24 times a second — plenty for the eye, and a large graph leaves the
    // page free to keep the sound fed)
    this.stopFrames = onFrames(frame, () => 40, 'clock');
  }

  /** Whether a feed is playing (`feed`), in place of the transport's run. */
  private feeding = false;

  /**
   * Play what a feed lays (a session's song, #478 rung 3) in place of the piece from the cursor: each window it gives,
   * its plan's voices sounding it, on the audio clock where its time on the page's clock is heard; MIDI out sends it
   * too. Pause or Stop ends it, as a run of the transport.
   */
  async feed(feed: Feed): Promise<void> {
    if (this.playing) return;
    const Tone = await this.wake();
    (Tone.getContext() as unknown as { lookAhead: number }).lookAhead = this.tuning.lookAhead ?? 0.3;
    this.held.release();
    this.voices!.open();
    const tr = Tone.getTransport();
    tr.stop();
    tr.cancel(0);
    tr.position = 0;
    tr.bpm.value = 60;
    const run = ++this.run;
    let synced: Plan | null = null;
    let lagAt = -Infinity;
    this.feeding = true;
    this.repeatId = tr.scheduleRepeat(
      () => {
        if (run !== this.run || !this.voices) return;
        const now = performance.now() / 1000;
        if (now - lagAt > 0.5) {
          lagAt = now;
          this.refreshLag();
        }
        for (const f of feed.next(now, now + FEED_LEAD)) {
          if (f.plan !== synced) {
            synced = f.plan;
            this.voices.sync(f.plan.result, f.plan.statics, f.plan.muted);
          }
          const time = this.audioAt(Tone, f.time);
          const { events, tapes, clock } = retime(f.window, time, f.scale);
          for (const t of tapes) this.voices.tapeSpeed(t.tape, t.points);
          for (const e of events) this.voices.play(e);
          this.sink?.play(Tone, events, time + (f.window.to - f.window.from) * f.scale, clock);
        }
      },
      FEED_EVERY,
      0,
    );
    tr.start(Tone.now() + 0.05);
    this.move('play');
  }

  /** Where a moment on the page's clock (seconds) is heard, on the audio clock. */
  private audioAt(T: ToneNS, page: number): number {
    const clock = contextClock(T);
    return clock ? clock.fromDeviceMs(page * 1000) : T.immediate() - (this.lag ?? 0) + (page - performance.now() / 1000);
  }

  // the run playing: when its transport started (audio clock) and where in the piece (code seconds)
  private running: { startsAt: number; offset: number } | null = null;

  /**
   * Where the piece is (code seconds) heard at a moment on the page's clock (`performance.now()` ms, as a MIDI message's
   * or a key event's `timeStamp`): the moment heard then, on the audio clock (webmidi's `clockOffset`, as MIDI out's timestamps),
   * through the transport. Null while not playing. A take reads its keys' times through this (#210).
   */
  heardAt(ms: number): number | null {
    const T = this.Tone;
    const run = this.running;
    if (!this.playing || !T || !run) return null;
    const clock = contextClock(T);
    const made = clock ? clock.fromDeviceMs(ms) : T.immediate() - (this.lag ?? 0) - (performance.now() - ms) / 1000;
    const tr = T.getTransport();
    return run.offset + (made < run.startsAt ? 0 : Math.max(0, tr.getTicksAtTime(made) / tr.PPQ));
  }

  /** Pause: the clocks stand, no trigger or gate is left open, every sound tape is held where it is, what is on it kept. */
  pause(): void {
    if (!this.playing) return;
    this.running = null;
    // (a feed's voices were its plans': the piece's again)
    if (this.feeding && this.plan) this.voices?.sync(this.plan.result, this.plan.statics, this.plan.muted);
    this.feeding = false;
    this.stopFrames();
    const at = transportClock.seconds;
    transportClock.seconds = 0;
    this.move('pause');
    if (!this.Tone || this.repeatId === null) return;
    const tr = this.Tone.getTransport();
    tr.stop();
    tr.clear(this.repeatId);
    this.repeatId = null;
    this.run++;
    // every note lets go (its release and the effects' tails ring on: Stop is what silences)
    this.voices?.dropGates();
    this.sink?.stop(this.Tone);
    // motors off: every sound tape stops where it is — held, silent, what's on it kept
    this.held.pause(at);
  }

  /** Stop: back to the initial state: every note cut, every body at rest, tapes wound off, hands' forces gone. */
  stop(): void {
    this.pause();
    this.voices?.releaseAll();
    this.keys.clear();
    this.onKeysCut?.();
    this.resetState();
    this.move('stop');
  }

  /** Back to the start as written: tapes wound off, hands' forces gone (part of Stop). */
  resetState(): void {
    this.engine.reset();
    this.voices?.clearTapes();
    this.held.reset();
  }

  dispose(): void {
    this.pause();
    this.engine.dispose();
    this.voices?.dispose();
    this.voices = undefined;
  }
}
