import { untrack } from 'svelte';
import { clocking } from '@yggi/cells/engine/clocking';
import { recordTarget, Take, tableReader, type RecordTarget, type Written } from '@yggi/cells/engine/capture';
import { freeIndex, freeList } from '@yggi/cells/engine/held';
import { keyFrequency } from '@yggi/cells/engine/keys';
import { transportClock } from '../../audio/clock.svelte';
import { recordTransition, type RecordEvent, type RecordState, type TransportState } from '../../audio/transport';
import type { Piece } from './piece.svelte';
import type { Keys } from './keys.svelte';

/** What a take needs of playing: whether it plays or is starting, play, and where the piece is heard at a moment (`Player.heardAt`). */
interface Playing {
  readonly playing: boolean;
  readonly starting: boolean;
  toggle(): Promise<void>;
  readonly player: { heardAt(ms: number): number | null };
}

/** A take under way: where it goes, how its keys become steps and numbers, and the take itself. */
interface Taking {
  readonly target: RecordTarget;
  /** The braid's place among the code's free()s (held by it, as a slider's value is). */
  readonly index: number;
  readonly take: Take;
  /** The cell's step at a moment of the piece (code seconds), through its clock's time map. */
  stepAt(seconds: number): number;
  /** A MIDI note as what the cell writes for it, under the setting for keys off its table; null: nothing. */
  written(note: number): Written | null;
}

/**
 * Recording a braid left free (#210, decision 018): a take of one pass of the armed cell's loop, from the keys (MIDI in,
 * the computer's, the on-screen ones and the rows, all through `Keys`), held as the braid's value until Keep. Record
 * (the transport's ●) arms it and starts play; the next whole pass is taken, its keys read through the time the piece
 * was heard at their `timeStamp` (`Player.heardAt`) to the cell's steps (`engine/clocking.ts`) and through its table
 * (`engine/capture.ts`); at the pass's end the take is held (one recompile a pass). A new take replaces the last. Pause
 * or Stop calls a take off; Stop also lets go of what was held, as of any free(). `dispose` when it goes.
 */
export class Recorder {
  /** Off, armed (the pass not begun) or taking (audio/transport.ts). */
  state = $state<RecordState>('off');
  /** Where a take would go now (the armed cell, or the first braid left free that plays the armed voice), or null. */
  readonly target = $derived.by(() => recordTarget(this.piece.program, this.keys.armed));
  /** Whether the piece has a braid left free at all (the transport shows ● only then). */
  readonly any = $derived.by(() => this.piece.program.ok && [...this.piece.program.cells.values()].some((c) => c.frees.some((f) => f.key === 'braid')));
  /** The steps of the last take held, as written, or null. */
  last = $state<string | null>(null);

  #taking: Taking | null = null;

  /** The step the take's pass starts on, once placed; null: no take, or not placed yet. */
  get start(): number | null {
    return this.#taking?.take.start ?? null;
  }
  readonly #stop: () => void;

  constructor(
    private readonly piece: Piece,
    private readonly playback: Playing,
    private readonly keys: Keys,
  ) {
    keys.listener = {
      down: (at, what, ms) => {
        const t = this.#taking;
        const step = this.#stepOf(ms);
        if (!t || step === null) return;
        const w = 'note' in what ? t.written(what.note) : what.cell === t.target.cell ? { value: what.value, alter: 0 } : null;
        t.take.down(at, w, step);
      },
      up: (at, ms) => {
        const step = this.#stepOf(ms);
        if (this.#taking && step !== null) this.#taking.take.up(at, step);
      },
    };
    // (per frame only while recording: off, it reads nothing of the clock)
    this.#stop = $effect.root(() => {
      $effect(() => {
        if (this.state === 'off') return;
        const [state, seconds] = [transportClock.state, transportClock.seconds];
        untrack(() => this.tick(state, seconds));
      });
    });
  }

  dispose(): void {
    this.#stop();
    if (this.keys.listener) this.keys.listener = null;
  }

  /** The record button: arm a take (playing, if it isn't), or call one off. Nothing to record into: nothing. */
  record(): void {
    if (this.state !== 'off') return this.#move('record');
    const target = this.target;
    const program = this.piece.program;
    const index = target ? freeIndex(program, target.spec) : -1;
    if (!target || index < 0) return;
    // the frame: the braid's length as written (a take held leaves it as it was)
    const written = this.piece.result.ok ? freeList(this.piece.result)[index] : undefined;
    const length = written?.key === 'braid' ? written.hi : target.spec.hi;
    const cell = program.cells.get(target.cell)!;
    const map = clocking(program, this.piece.shifts).map(cell.clock!);
    const reader = tableReader(program, target.out, this.piece.shifts);
    const base = program.cells.get(target.out.voice)?.freq ?? 0;
    const a4 = this.piece.env.A4;
    this.#taking = {
      target,
      index,
      take: new Take(length),
      stepAt: (seconds) => map.stepAt(Math.max(0, seconds)) * cell.rate,
      written: (note) => (base > 0 ? reader.read(12 * Math.log2(keyFrequency(note, a4) / base), this.keys.mode) : null),
    };
    this.#move('record');
    if (!this.playback.playing && !this.playback.starting) void this.playback.toggle();
  }

  /** The transport moved (its state, and where it is heard: code seconds): place the pass, and hold the take at its end. */
  tick(state: TransportState, seconds: number): void {
    const t = this.#taking;
    if (this.state === 'off' || !t) return;
    if (state !== 'playing') {
      if (!this.playback.starting) this.#move('cancel');
      return;
    }
    const step = t.stepAt(seconds);
    t.take.begin(step);
    if (this.state === 'armed' && step >= t.take.start! - 0.5) this.#move('begin', state);
    if (this.state === 'taking' && step >= t.take.end!) {
      const steps = t.take.write();
      this.#move('done', state);
      const spec = freeList(this.piece.program)[t.index];
      if (!steps || spec?.key !== 'braid') return;
      this.last = steps.join(' ');
      this.piece.hold(spec, this.last);
    }
  }

  // the piece's time heard at a key's moment, as the cell's step; null: not playing, or no take
  #stepOf(ms: number): number | null {
    if (!this.#taking) return null;
    const seconds = this.playback.player.heardAt(ms > 0 ? ms : performance.now());
    return seconds === null ? null : this.#taking.stepAt(seconds);
  }

  #move(event: RecordEvent, transport: TransportState = transportClock.state): void {
    this.state = recordTransition(this.state, event, transport);
    if (this.state === 'off') this.#taking = null;
  }
}
