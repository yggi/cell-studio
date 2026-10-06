/**
 * Sound tapes while the transport is stopped: each is held, silent, where it stands (a fresh one at
 * its start), and a hand can move it there; its heads read what sat under them when it was there.
 * Play lets them run on from where they stand.
 */
import { clocking, tapeMotion } from '../engine/clocking';
import type { Plan } from '../engine/realize';
import type { VoiceBank } from './voices';

export class HeldTapes {
  /** Where each held tape stands (tape-seconds). */
  private at = new Map<string, number>();
  /** The transport's position when it stopped, and the audio clock then. */
  private pausedAt = 0;
  private pausedAudio = 0;

  constructor(
    private readonly plan: () => Plan | null,
    private readonly voices: () => VoiceBank | undefined,
    /** The audio clock now (null: no audio yet). */
    private readonly audioNow: () => number | null,
  ) {}

  /** Where a held tape stands (null: none held). */
  position(tape: string): number | null {
    return this.at.get(tape) ?? null;
  }

  /**
   * Hold every sound tape where it stands (a fresh one at its start). A tape's hiss runs from the moment
   * its nets are made (made on every load), so without this a piece just opened would hiss before
   * anything is played.
   */
  settle(): void {
    for (const tp of this.plan()?.result.tapes ?? []) {
      const u = this.at.get(tp.name) ?? 0;
      this.at.set(tp.name, u);
      this.hold(tp.name, u);
    }
  }

  /** The transport stopped at `at` (code seconds): every sound tape stops where it is, what's on it kept. */
  pause(at: number): void {
    this.pausedAt = at;
    this.pausedAudio = this.audioNow() ?? 0;
    const p = this.plan();
    if (!p) return;
    for (const tp of p.result.tapes) {
      const u = tapeMotion(p.result, clocking(p.result, p.statics), tp.name).pos(at);
      this.at.set(tp.name, u);
      this.hold(tp.name, u);
    }
  }

  /** A hand moves a held tape to u (null: lets go, it stays where it was left). */
  scrub(tape: string, u: number | null): void {
    if (u !== null) this.at.set(tape, u);
    const at = this.at.get(tape);
    if (at !== undefined) this.hold(tape, at);
  }

  /** Motors on: held tapes run on from where they stand. */
  release(): void {
    for (const t of this.at.keys()) this.voices()?.tapeScrub(t, null);
    this.at.clear();
  }

  /** Back to the start as written: tapes wound off. */
  reset(): void {
    this.at.clear();
    this.pausedAt = 0;
    this.pausedAudio = this.audioNow() ?? 0;
  }

  // a sound tape held still at u: its heads read what sat under them when it was there
  private hold(tape: string, u: number) {
    const p = this.plan();
    const voices = this.voices();
    const now = this.audioNow();
    if (!p || !voices || now === null) return;
    const motion = tapeMotion(p.result, clocking(p.result, p.statics), tape);
    const since = now - this.pausedAudio;
    voices.tapeScrub(tape, (at) => this.pausedAt - motion.real(u - at) + since);
  }
}
