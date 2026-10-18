/**
 * An out's loudness over a bar (the tower layout's socket, docs/notes/tower-sky.md): a ring of slots round one lap of
 * the piece's main meter, each holding the loudest level heard while the lap was in it, so the ring traces the out's
 * rhythm and dynamics, the same shape again each bar. The slots not yet reached in this lap keep the last one's, older.
 */
import type { CompileResult, Shifts } from '@yggi/cells/engine/program';
import { liveAt } from '@yggi/cells/engine/live';
import { clocking } from '@yggi/cells/engine/clocking';
import { mainMeter } from '@yggi/cells/engine/midiclock';

/** Levels from this many dB under full scale up to it read 0 … 1. */
export const FLOOR_DB = -60;

/** A level 0 … 1 for an amplitude (RMS or peak, 1 full scale): on the dB scale, FLOOR_DB … 0 dB. */
export const levelOf = (amp: number): number => (amp > 0 ? Math.min(1, Math.max(0, 1 - (20 * Math.log10(amp)) / FLOOR_DB)) : 0);

export class LoudRing {
  /** Each slot's level (0 … 1), and the lap it was written in. */
  readonly level: Float32Array;
  readonly lap: Float64Array;
  #at = -1;
  #lap = -Infinity;
  constructor(readonly slots = 64) {
    this.level = new Float32Array(slots);
    this.lap = new Float64Array(slots).fill(-Infinity);
  }

  /** Where the lap is now (0 … 1), which lap, and the level heard: written to the slot it is in and any passed since. */
  write(phase: number, lap: number, level: number): void {
    const n = this.slots;
    const at = Math.min(n - 1, Math.max(0, Math.floor((((phase % 1) + 1) % 1) * n)));
    // (the slots passed over since the last write, in this lap or round from the last: none left empty; the rest of
    // the last lap's are its own)
    const last = this.#at;
    if (last >= 0 && lap === this.#lap && at > last) for (let i = last + 1; i < at; i++) this.#set(i, lap, level);
    else if (last >= 0 && lap === this.#lap + 1 && at <= last) {
      for (let i = last + 1; i < n; i++) this.#set(i, this.#lap, level);
      for (let i = 0; i < at; i++) this.#set(i, lap, level);
    }
    this.#set(at, lap, level);
    this.#at = at;
    this.#lap = lap;
  }

  // (a slot's first write in a lap replaces the last lap's; later ones keep the loudest)
  #set(i: number, lap: number, level: number): void {
    if (this.lap[i] !== lap) {
      this.lap[i] = lap;
      this.level[i] = level;
    } else this.level[i] = Math.max(this.level[i] ?? 0, level);
  }

  /** How fresh a slot is: 1 written in the lap now (or the one just ended, ahead of the hand), fading to 0 after. */
  fresh(i: number, lap: number): number {
    const age = lap - (this.lap[i] ?? -Infinity);
    return age <= 0 ? 1 : age === 1 ? 0.55 : 0;
  }

  /** Every slot set to the levels given (stopped: the score's shape), as written in `lap`. */
  fill(levels: ArrayLike<number>, lap: number): void {
    for (let i = 0; i < this.slots; i++) {
      this.level[i] = levels[i] ?? 0;
      this.lap[i] = lap;
    }
    this.#at = -1;
    this.#lap = lap;
  }
}

/**
 * The lap a socket's ring goes round: a bar of the piece's main meter (its steps a bar, doubled until it lasts at least
 * 1.5 s, halved while it lasts over 8 s, so a fast meter's bar and a slow one's both read), or 2 s without a meter.
 * `q(step)` the seconds a step falls at, `stepAt(seconds)` the step at a time.
 */
export interface Lap {
  readonly steps: number;
  q(step: number): number;
  stepAt(seconds: number): number;
}

const SECONDS: Lap = { steps: 2, q: (s) => s, stepAt: (t) => t };
const laps = new WeakMap<CompileResult, WeakMap<Shifts, Lap>>();

export function lapOf(program: CompileResult, shifts: Shifts): Lap {
  let byShifts = laps.get(program);
  if (!byShifts) laps.set(program, (byShifts = new WeakMap()));
  let lap = byShifts.get(shifts);
  if (lap) return lap;
  lap = SECONDS;
  const meter = program.ok ? mainMeter(program) : null;
  if (meter)
    try {
      const map = clocking(program, shifts, 0).map(meter.cell);
      const long = (s: number) => map.q(s) - map.q(0);
      let steps = Math.max(1, map.beats);
      for (let guard = 0; guard < 8 && long(steps) < 1.5; guard++) steps *= 2;
      for (let guard = 0; guard < 8 && long(steps) > 8 && steps % 2 === 0; guard++) steps /= 2;
      if (Number.isFinite(long(steps)) && long(steps) > 0) lap = { steps, q: (s) => map.q(s), stepAt: (t) => map.stepAt(t) };
    } catch {
      // (a clock that can't say: the ring goes round in seconds)
    }
  byShifts.set(shifts, lap);
  return lap;
}

/** Slots of a lap the score is sampled at, stopped. */
export const SCORE_SLOTS = 32;

/**
 * What the score plays over one lap, stopped: each voice's slots, 1 where it is played (a note starts or holds); its
 * shape reaches out where a voice starts to play, a lower ring where it goes on, and fades after. Sampled a few slots at a time (`advance`), shared by every socket of the piece: one moment of a
 * big piece is a few ms to work out (Hypercell's 2.4 ms here), a lap's 32 of them too long for one frame.
 */
export class Score {
  readonly voices = new Map<string, Float32Array>();
  filled = 0;
  constructor(
    readonly program: CompileResult,
    readonly shifts: Shifts,
    readonly muted: ReadonlySet<string>,
    readonly from: number,
  ) {}

  /** Sample `n` more slots; false when it is done. */
  advance(n: number): boolean {
    const lap = lapOf(this.program, this.shifts);
    const start = Math.floor(lap.stepAt(this.from) / lap.steps) * lap.steps;
    for (let k = 0; k < n && this.filled < SCORE_SLOTS; k++, this.filled++) {
      const at = lap.q(start + (this.filled / SCORE_SLOTS) * lap.steps);
      if (!Number.isFinite(at)) continue;
      for (const id of liveAt(this.program, this.shifts, this.muted, at).voices) {
        let v = this.voices.get(id);
        if (!v) this.voices.set(id, (v = new Float32Array(SCORE_SLOTS)));
        v[this.filled] = 1;
      }
    }
    return this.filled < SCORE_SLOTS;
  }

  /** The slots of the voices given, together (their loudest), as levels: a start .85, a hold .45, a tail fading. */
  shape(ids: readonly string[]): Float32Array {
    const out = new Float32Array(SCORE_SLOTS);
    for (const id of ids) {
      const v = this.voices.get(id);
      // (a slot where it starts to play reaches out, one where it goes on playing a lower ring)
      if (v) for (let i = 0; i < SCORE_SLOTS; i++) if (v[i]) out[i] = Math.max(out[i] ?? 0, v[(i + SCORE_SLOTS - 1) % SCORE_SLOTS] ? 0.45 : 0.85);
    }
    // (after a slot played, its sound fades over the next few: a groove's hits read as spikes, a pad as a ring)
    for (let k = 0; k < 2 * SCORE_SLOTS; k++) {
      const i = k % SCORE_SLOTS;
      const prev = out[(i + SCORE_SLOTS - 1) % SCORE_SLOTS] ?? 0;
      out[i] = Math.max(out[i] ?? 0, prev * 0.55);
    }
    return out;
  }
}
