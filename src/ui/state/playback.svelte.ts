import { plan } from '../../engine/realize';
import { liveAt } from '../../engine/live';
import { anchoredAt, mainLength, pieceTime } from '../../engine/duration';
import { Player } from '../../audio/player';
import { chooseEngine } from '../../audio/engine';
import type { LiveSource } from '../../audio/live';
import { transportClock } from '../../audio/clock.svelte';
import { screenAwake } from '../wakeLock';
import type { Piece } from './piece.svelte';

/**
 * Playing the piece: the Player (fed the piece's plan whenever it changes), where play starts and how
 * far it reaches, and what hands did to the sound since it was opened or reset. Made while a component
 * initialises (its effects belong to that component); `dispose` when it goes.
 */
export class Playback {
  readonly player = new Player(chooseEngine());
  /** Where play begins, stopped (the time slider). */
  cursor = $state(0);
  starting = $state(false);
  /** Counts resets (reload from code): hands' traces — tapes' recordings, reels' turns — are gone. */
  epoch = $state(0);
  /** A hand has been on the sound (Reset pulses while anything is changed). */
  touched = $state(false);
  played = $state(false);
  /** How far the slider reaches: the piece, its cycle, or its longest layer (a few seconds at least: DTMF's whole cycle is a tone and a pause, nothing to move in). */
  readonly span = $derived.by(() => {
    const l = this.piece.program.ok ? mainLength(pieceTime(this.piece.program)) : null;
    return l !== null && l >= 2 ? l : null;
  });
  /** Where it is (seconds; within one lap for a loop). */
  readonly now = $derived(transportClock.playing ? (this.span ? transportClock.seconds % this.span : transportClock.seconds) : this.cursor);
  /** Anything changed from the initial state? */
  readonly dirty = $derived.by(() => this.piece.held.size > 0 || this.touched || this.played || this.cursor > 0.01 || transportClock.seconds > 0.01);
  /** The live view while playing (playheads, lit entries, the live routing), null stopped. */
  readonly live = $derived.by(() => (transportClock.playing ? liveAt(this.piece.program, this.piece.shifts, this.piece.muted, transportClock.seconds) : null));

  /** The sound, for the views: what plays now, and hands on it (a hand marks the piece touched). */
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
      scrub: (t, u) => ((this.touched = true), p.scrub(t, u)),
      grab: (c, speed) => p.grab(c, speed),
      strike: (n, x, i) => ((this.touched = true), p.strike(n, x, i)),
      damp: (n, on) => p.damp(n, on),
      bow: (n, a) => ((this.touched = true), p.bow(n, a)),
    };
    $effect(() => p.load(plan(piece.program, piece.shifts, piece.muted), piece.good.source));
    // keep the screen awake while playing (where the browser allows it: Android Chrome does)
    $effect(() => this.#awake.set(transportClock.playing));
  }

  get playing(): boolean {
    return transportClock.playing;
  }

  /** Play from the cursor, or pause (keeping the place: play goes on from there). */
  async toggle(): Promise<void> {
    if (transportClock.playing) {
      this.cursor = this.now;
      return this.player.stop();
    }
    this.starting = true;
    try {
      // a piece anchored to the clock (anchor=11.55), started fresh: it plays where the day stands
      const anchored = this.cursor === 0 && !this.played && !this.touched ? anchoredAt(this.piece.program, new Date()) : null;
      if (anchored !== null) this.cursor = anchored;
      await this.player.start(this.cursor);
      this.played = true;
      this.piece.sampleRate = this.player.sampleRate ?? this.piece.sampleRate;
    } catch (err) {
      console.error('Audio failed to start:', err);
    } finally {
      this.starting = false;
    }
  }

  stop(): void {
    if (transportClock.playing) this.player.stop();
  }

  async seek(to: number): Promise<void> {
    this.cursor = to;
    if (!transportClock.playing) return;
    this.player.stop();
    await this.player.start(to);
  }

  /** Reload from the code: what hands did is gone (held free() values, tapes' recordings, reels turned by hand), and it starts again from the start (playing: on from there). */
  async reset(): Promise<void> {
    this.piece.held = new Map();
    this.epoch++;
    this.player.resetState();
    this.touched = false;
    await this.seek(0);
    this.played = transportClock.playing;
  }

  /** Stopped: a turntable turned by hand moves where play starts. */
  nudge(seconds: number): void {
    if (transportClock.playing) return;
    this.cursor = Math.max(0, Math.min(this.span ?? Infinity, this.cursor + seconds));
    this.touched = true;
  }

  /**
   * A piece just opened starts from rest: transport stopped at 0, nothing sounding, nothing held or
   * touched — whatever was playing (or ringing, or recorded on a tape) is gone. (Stop first: it reads the old plan.)
   */
  fresh(): void {
    this.player.stop();
    this.player.resetState();
    this.epoch++;
    this.cursor = 0;
    this.piece.held = new Map();
    this.touched = false;
    this.played = false;
  }

  dispose(): void {
    this.player.dispose();
    this.#awake.dispose();
  }
}
