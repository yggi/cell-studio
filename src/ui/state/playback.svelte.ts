import { plan } from '../../engine/realize';
import { liveAt } from '../../engine/live';
import { anchoredAt, mainLength, pieceTime } from '../../engine/duration';
import { Player } from '../../audio/player';
import { chooseEngine } from '../../audio/engine';
import type { LiveSource } from '../../audio/live';
import { transportClock } from '../../audio/clock.svelte';
import { screenAwake } from '../wakeLock';
import type { TransportState } from '../../audio/transport';
import type { Piece } from './piece.svelte';

/**
 * Playing the piece: the Player (fed the piece's plan whenever it changes) and the transport's state
 * (stopped, paused, playing: audio/transport.ts), where play starts and how far it reaches. Made while a
 * component initialises (its effects belong to that component); `dispose` when it goes.
 */
export class Playback {
  readonly player = new Player(chooseEngine());
  /** Where play begins, not playing (the time slider, a turned wheel). */
  cursor = $state(0);
  starting = $state(false);
  /** Counts stops: hands' traces — tapes' recordings, reels' turns — are gone. */
  epoch = $state(0);
  /** Where a piece that ends (`laps=`) ended, while it is paused there; Play then goes on from the start. */
  #endedAt: number | null = null;
  /** How far the slider reaches: the piece, its cycle, or its longest layer (a few seconds at least: DTMF's whole cycle is a tone and a pause, nothing to move in). */
  readonly span = $derived.by(() => {
    const l = this.piece.program.ok ? mainLength(pieceTime(this.piece.program)) : null;
    return l !== null && l >= 2 ? l : null;
  });
  /** Where it is (seconds; within one lap for a loop). */
  readonly now = $derived(this.playing ? (this.span ? transportClock.seconds % this.span : transportClock.seconds) : this.cursor);
  /** Anything to go back from: not stopped, or a free() value held by hand (Stop pulses). */
  readonly resettable = $derived.by(() => transportClock.state !== 'stopped' || this.piece.held.size > 0);
  /**
   * Where everything is at the transport's time (playheads, lit entries, the live routing): the clock while playing,
   * else where play will start. Always there, so the heads are drawn stopped (at the start) and paused too; at rest
   * it is worked out once, not every frame.
   */
  readonly heads = $derived.by(() => liveAt(this.piece.program, this.piece.shifts, this.piece.muted, this.playing ? transportClock.seconds : this.cursor));

  /** The sound, for the views: what plays now, and hands on it (the Player takes a stopped transport to paused when one lays hold). */
  readonly sound: LiveSource;
  readonly #awake = screenAwake();

  constructor(readonly piece: Piece) {
    const p = this.player;
    this.sound = {
      note: (v) => p.note(v),
      spectrum: (v) => p.spectrum(v),
      waveform: (n) => p.waveform(n),
      freqs: (n) => p.freqs(n),
      resonance: (n) => p.resonance(n),
      tapePos: (t) => p.tapePos(t),
      tapeLevel: (t) => p.tapeLevel(t),
      scrub: (t, u) => p.scrub(t, u),
      grab: (c, speed) => p.grab(c, speed),
      strike: (n, x, i) => p.strike(n, x, i),
      damp: (n, on) => p.damp(n, on),
      bow: (n, a) => p.bow(n, a),
    };
    p.onEnded = (end) => {
      this.#endedAt = end;
      this.cursor = Math.min(end, this.span ?? end);
    };
    $effect(() => p.load(plan(piece.program, piece.shifts, piece.muted), piece.good.source));
    // keep the screen awake while playing (where the browser allows it: Android Chrome does)
    $effect(() => this.#awake.set(transportClock.state === 'playing'));
  }

  get playing(): boolean {
    return transportClock.state === 'playing';
  }

  get state(): TransportState {
    return transportClock.state;
  }

  /** Play from the cursor, or pause (keeping the place: play goes on from there). */
  async toggle(): Promise<void> {
    if (this.playing) return this.pause();
    this.starting = true;
    try {
      // a piece that ended plays again from the start, with what hands did kept
      if (this.#endedAt !== null) this.cursor = 0;
      this.#endedAt = null;
      // a piece anchored to the clock (anchor=11.55), started fresh: it plays where the day stands
      const anchored = this.state === 'stopped' ? anchoredAt(this.piece.program, new Date()) : null;
      if (anchored !== null) this.cursor = anchored;
      await this.player.start(this.cursor);
      this.piece.sampleRate = this.player.sampleRate ?? this.piece.sampleRate;
    } catch (err) {
      console.error('Audio failed to start:', err);
    } finally {
      this.starting = false;
    }
  }

  pause(): void {
    if (!this.playing) return;
    this.cursor = this.now;
    this.player.pause();
  }

  /** To another place in time: playing, on from there; else paused there. */
  async seek(to: number): Promise<void> {
    this.cursor = to;
    this.#endedAt = null;
    if (!this.playing) return this.player.touch();
    this.player.pause();
    await this.player.start(to);
  }

  /** Not playing: a turntable turned by hand moves where play starts (a stopped transport is paused from then on). */
  nudge(seconds: number): void {
    if (this.playing) return;
    this.cursor = Math.max(0, Math.min(this.span ?? Infinity, this.cursor + seconds));
    this.#endedAt = null;
    this.player.touch();
  }

  /**
   * Stop: back to the initial state — time 0, what hands did gone (held free() values, tapes' recordings,
   * reels turned by hand), nothing sounding from the clocks. A piece just opened starts here too. (The
   * Player reads the old plan to stop, so it goes first.)
   */
  stop(): void {
    this.player.stop();
    this.epoch++;
    this.cursor = 0;
    this.#endedAt = null;
    this.piece.held = new Map();
  }

  dispose(): void {
    this.player.dispose();
    this.#awake.dispose();
  }
}
