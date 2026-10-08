/**
 * Counters and timing marks for the performance report (docs/ui/performance.md). Both are free when nothing
 * asks: the counters are three integer increments a note; the marks record only while the overlay is on.
 */

/** Notes scheduled, and how late the page let them be: shifted a little (< 50 ms late) or left out (more). */
export const noteStats = { played: 0, late: 0, dropped: 0, worstLateMs: 0 };

export interface Mark {
  /** performance.now() when the work ended. */
  t: number;
  name: string;
  /** ms it took. */
  d: number;
}

/** The marks (kept while `on`; the newest `CAP`). */
export const marks: { on: boolean; events: Mark[] } = { on: false, events: [] };
const CAP = 60000;

export function markDuration(name: string, d: number): void {
  const e = marks.events;
  e.push({ t: performance.now(), name, d });
  if (e.length > CAP) e.splice(0, e.length - CAP);
}

/** Run `fn`, recording how long it took under `name` when the overlay is on. */
export function timed<T>(name: string, fn: () => T): T {
  if (!marks.on) return fn();
  const s = performance.now();
  try {
    return fn();
  } finally {
    markDuration(name, performance.now() - s);
  }
}

/**
 * The audio thread's own report on itself, where the browser has it (AudioContext.renderCapacity, Chrome 126+):
 * once a second, how loaded the render thread was (0…1 of the time a block may take) and what share of blocks
 * missed their deadline — the underruns `playoutStats` would count. Filled by the player.
 */
export const capacity: { supported: boolean; events: { t: number; avg: number; peak: number; underrun: number }[]; probe: CapacityProbe } = {
  supported: false,
  events: [],
  probe: { inPrototype: null, onContext: null, started: false, updates: 0, error: null },
};

/** What looking for `renderCapacity` found, so a report with no audio-thread row can say why (#91): the browser lacks it, our probe missed it, or it never reported. */
export interface CapacityProbe {
  /** `'renderCapacity' in AudioContext.prototype` (null: not asked yet, or no AudioContext). */
  inPrototype: boolean | null;
  /** The property is on the context the player made (null: not asked yet). */
  onContext: boolean | null;
  /** `start()` ran without throwing. */
  started: boolean;
  /** `update` events received since the page loaded. */
  updates: number;
  /** The first error from reading or starting it, if any. */
  error: string | null;
}
