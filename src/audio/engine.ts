/**
 * Where "what to play next" is worked out (#15): the Player asks an Engine for each window of the piece and
 * schedules what comes back. Two engines, interchangeable:
 *  - local: in this thread, on the plan the app already has (the default);
 *  - worker: the same code in a Web Worker (engine.worker.ts, around engine/host.ts), which compiles the
 *    piece from its source and mirrors every hand. A window it doesn't answer in time is worked out here
 *    instead, so a busy or broken worker costs nothing worse than the local engine.
 * Either way the main thread keeps its own plan: the views read it (live state, tapes' positions).
 */
import type { Env } from '../engine/program';
import { emptyWindow, grabIn, type FromEngine, type ToEngine } from '../engine/host';
import { resetPhysics } from '../engine/physics';
import type { Plan } from '../engine/realize';
import { windowAt, type Window } from '../engine/schedule';
import { storageKey } from '../storageKey';

/** The text a plan was compiled from, and its environment: what an engine elsewhere needs to make the same plan. */
export interface PieceSource {
  readonly code: string;
  readonly env?: Env;
}

/** How the windows went: for measuring (`cellStudio.engine()`), not for playing. */
export interface EngineStats {
  readonly kind: 'local' | 'worker';
  /** Windows asked for. */
  windows: number;
  /** Time to work them out (ms), summed and at worst: here, or in the worker. */
  computeMs: number;
  computeMax: number;
  /** Worker only: from asking to the answer (ms), summed and at worst; answers too late (worked out here). */
  roundTripMs: number;
  roundTripMax: number;
  late: number;
  /** Worker only: compile + plan time of the last load in the worker (ms). */
  loadMs: number;
}

export interface Engine {
  readonly kind: 'local' | 'worker';
  /** The piece from now on: its plan (here) and the source it was compiled from (for an engine elsewhere; null: none). */
  load(plan: Plan, source: PieceSource | null): void;
  /** The window [from, from + length) of a run of windows that began at `begins` (a drone starts there): at once, or when the worker answers. */
  window(from: number, length: number, begins?: number): Window | Promise<Window>;
  /** A hand on a physical cell at transport second t (null lets go). */
  grab(cell: string, t: number, speed: number | null): void;
  /** Every hand forgotten (Reset). */
  reset(): void;
  stats(): EngineStats;
  dispose(): void;
}

const zero = (kind: EngineStats['kind']): EngineStats => ({ kind, windows: 0, computeMs: 0, computeMax: 0, roundTripMs: 0, roundTripMax: 0, late: 0, loadMs: 0 });
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class LocalEngine implements Engine {
  readonly kind = 'local';
  private plan: Plan | null = null;
  private s = zero('local');

  load(plan: Plan): void {
    this.plan = plan;
  }
  window(from: number, length: number, begins = 0): Window {
    const t0 = now();
    const w = this.plan ? windowAt(this.plan, from, length, { begins }) : emptyWindow(from, length);
    const ms = now() - t0;
    this.s.windows++;
    this.s.computeMs += ms;
    this.s.computeMax = Math.max(this.s.computeMax, ms);
    return w;
  }
  grab(cell: string, t: number, speed: number | null): void {
    if (this.plan) grabIn(this.plan, cell, t, speed);
  }
  reset(): void {
    if (this.plan) resetPhysics(this.plan.result);
  }
  stats(): EngineStats {
    return { ...this.s };
  }
  dispose(): void {}
}

/** What the worker side needs to be: a Worker, or anything that talks like one (a test's port). */
export interface Port {
  postMessage(m: ToEngine): void;
  onmessage: ((e: MessageEvent<FromEngine>) => void) | null;
  onerror?: ((e: unknown) => void) | null;
  terminate?(): void;
}

/**
 * The worker engine. `deadline` (ms) is how long a window may take to come back before it's worked out here:
 * well inside the look-ahead (0.12 s at the least), so a late answer never makes a late note.
 */
export class WorkerEngine implements Engine {
  readonly kind = 'worker';
  private local = new LocalEngine();
  private port: Port | null;
  private seq = 0;
  private pending = new Map<number, { asked: number; done: (w: Window | null) => void }>();
  private s = zero('worker');

  constructor(
    port: Port,
    private deadline = 40,
  ) {
    this.port = port;
    port.onmessage = (e) => this.answer(e.data);
    port.onerror = () => this.fail();
  }

  private answer(m: FromEngine) {
    if (m.type === 'loaded') {
      this.s.loadMs = m.ms;
      return;
    }
    const p = this.pending.get(m.id);
    if (!p) return; // (too late: already worked out here)
    this.pending.delete(m.id);
    const rt = now() - p.asked;
    this.s.computeMs += m.ms;
    this.s.computeMax = Math.max(this.s.computeMax, m.ms);
    this.s.roundTripMs += rt;
    this.s.roundTripMax = Math.max(this.s.roundTripMax, rt);
    p.done(m.window);
  }

  /** The worker is gone (it failed to load or threw): everything from here on is worked out locally. */
  private fail() {
    this.port?.terminate?.();
    this.port = null;
    for (const p of this.pending.values()) p.done(null);
    this.pending.clear();
  }

  load(plan: Plan, source: PieceSource | null): void {
    this.local.load(plan);
    if (!source) return this.fail();
    this.port?.postMessage({ type: 'load', code: source.code, env: source.env });
  }

  window(from: number, length: number, begins = 0): Window | Promise<Window> {
    if (!this.port) return this.local.window(from, length, begins);
    const id = ++this.seq;
    this.s.windows++;
    this.port.postMessage({ type: 'window', id, from, length, begins });
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!this.pending.delete(id)) return;
        this.s.late++;
        resolve(this.local.window(from, length, begins));
      }, this.deadline);
      this.pending.set(id, {
        asked: now(),
        done: (w) => (clearTimeout(timer), resolve(w ?? this.local.window(from, length, begins))),
      });
    });
  }

  grab(cell: string, t: number, speed: number | null): void {
    // (both: the plan here answers late windows and the views)
    this.local.grab(cell, t, speed);
    this.port?.postMessage({ type: 'grab', cell, t, speed });
  }
  reset(): void {
    this.local.reset();
    this.port?.postMessage({ type: 'reset' });
  }
  stats(): EngineStats {
    return { ...this.s };
  }
  dispose(): void {
    this.fail();
  }
}

/**
 * The engine to play with: the worker when asked for (`?engine=worker` in the address, or
 * `localStorage['cell-studio:engine'] = 'worker'`) and workers are available; else the local one.
 */
export function chooseEngine(): Engine {
  let want: string | null = null;
  try {
    want = new URLSearchParams(location.search).get('engine') ?? localStorage.getItem(storageKey('cell-studio:engine'));
  } catch {
    // (no storage: the default)
  }
  if (want === 'worker' && typeof Worker !== 'undefined') {
    try {
      return new WorkerEngine(new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' }) as unknown as Port);
    } catch {
      // (workers refused here: the local engine)
    }
  }
  return new LocalEngine();
}
