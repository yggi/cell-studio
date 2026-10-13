import { storageKey } from '../../storageKey';
import type { StoryStep } from '../../engine/midiimport';

const KEY = 'conversion-speed';
/** A frame's time at speed 1 (ms): a cell coming in, the graph settling round it. */
export const FRAME_MS = 900;
/** The speed slider's range (× FRAME_MS's pace), logarithmic. */
export const SPEEDS = { min: 0.25, max: 4 } as const;

const clampSpeed = (v: number) => Math.min(SPEEDS.max, Math.max(SPEEDS.min, v));

function keptSpeed(): number {
  try {
    const v = Number(localStorage.getItem(storageKey(KEY)));
    return v > 0 ? clampSpeed(v) : 1;
  } catch {
    return 1;
  }
}

/**
 * Convert to cells, watched (#390): the folding (in a worker: `folding`), then its story replayed (`playing`): the code
 * set to one frame after another (engine/fold/story.ts), and nothing else: the compile, the graph, its layout, the editor
 * and the stats follow as they follow any edit. Its pace, a speed the user sets (kept in this browser); it can be stopped
 * where it is (the piece as far as it got: every frame plays the same notes) or skipped to its end. An edit of the code
 * while it plays (not a frame of its own) stops it.
 */
export class Conversion {
  phase = $state<'folding' | 'playing' | null>(null);
  /** The frames, and the one shown. */
  frames = $state.raw<readonly StoryStep[]>([]);
  frame = $state(0);
  /** × the pace of FRAME_MS. */
  speed = $state(keptSpeed());
  #timer: ReturnType<typeof setTimeout> | undefined;
  #shown = '';

  constructor(
    /** Shows a frame: sets the code. */
    private readonly show: (source: string) => void,
    /** The code as it is now (an edit of the user's stops the replay). */
    private readonly code: () => string,
    /** At the end, played or skipped to. */
    private readonly ended: () => void,
  ) {}

  /** The share done, 0 … 1 (folding: 0). */
  get progress(): number {
    return this.phase === 'playing' && this.frames.length ? (this.frame + 1) / this.frames.length : 0;
  }
  /** What the frame shown did. */
  get says(): string {
    return this.phase === 'playing' ? (this.frames[this.frame]?.says ?? '') : '';
  }

  folding(): void {
    this.#clear();
    this.phase = 'folding';
    this.frames = [];
    this.frame = 0;
  }

  /** Replay a story from its first frame. */
  play(frames: readonly StoryStep[]): void {
    this.#clear();
    this.frames = frames;
    this.phase = 'playing';
    this.#to(0);
  }

  /** The last frame now, and the end (a frame's time later). */
  skip(): void {
    if (this.phase !== 'playing' || this.frame === this.frames.length - 1) return;
    this.#clear();
    this.#to(this.frames.length - 1);
  }

  /** Stop where it is (the piece as far as it got). */
  stop(): void {
    this.#clear();
    this.phase = null;
  }

  setSpeed(v: number): void {
    this.speed = clampSpeed(v);
    try {
      localStorage.setItem(storageKey(KEY), String(this.speed));
    } catch {
      // (kept for this visit only)
    }
  }

  #to(i: number): void {
    this.frame = i;
    this.#shown = this.frames[i]!.source;
    this.show(this.#shown);
    // (the last frame too has its time, laid out as gently as the others, before the end)
    const last = i >= this.frames.length - 1;
    this.#timer = setTimeout(
      () => {
        if (last) {
          this.phase = null;
          return this.ended();
        }
        // (the code changed under it: the user's edit, kept; the replay stops there)
        if (this.code() !== this.#shown) return this.stop();
        this.#to(i + 1);
      },
      last ? FRAME_MS : FRAME_MS / this.speed,
    );
  }

  #clear(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }
}
