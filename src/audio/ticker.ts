/**
 * One frame loop for everything that redraws by the clock (the player's transport clock, the scopes,
 * spectrum wheels, resonators and tapes), instead of a `requestAnimationFrame` loop each: ~50 views
 * meant over a thousand callbacks a second, most of them only to find it wasn't their turn yet.
 *
 * Each job says how often it wants to run (`every`, in ms, read each frame); the clock's jobs run
 * first, the views' after the reactive flush that the clock's write sets going, so a view reads the
 * frame's position and what derives from it. Views that fall due together (they share one clock now,
 * so they would) are spread over frames: a frame runs them, in turn, until its budget is spent, and
 * the rest go first in the next. The loop runs only while there are jobs, and does nothing while the
 * page is hidden.
 *
 * It also tells how much the page is struggling, so the views can ease off before the sound starves:
 * when frames come late (the main thread is saturated), `load.scale` rises from 1 towards MAX and every
 * job's interval stretches by it (spectra 15 → ~4 a second at worst); when frames come on time it falls
 * back. The sound doesn't depend on it, only how often the pictures are redrawn.
 */
const MAX = 4;
export const load = { scale: 1 };
/** How long the views may take in one frame (ms) before the rest wait for the next; at least one runs. */
const BUDGET = 6;

interface Job {
  readonly run: (t: number) => void;
  readonly every: () => number;
  last: number;
  done: boolean;
}

/** 'clock': runs first (the transport position); 'view': after it, once what the clock's write set going has run. */
export type Phase = 'clock' | 'view';

const jobs: Record<Phase, Job[]> = { clock: [], view: [] };
let raf = 0;
// (where the views' turn starts: after the last one that ran)
let turn = 0;
let lastFrame = 0;
let ema = 16.7;
let decided = 0;

/**
 * Run `run(t)` on the frame (t: the frame's timestamp, as `requestAnimationFrame` gives it) at most
 * every `every()` ms, stretched by `load.scale`. Returns how to stop.
 */
export function onFrames(run: (t: number) => void, every: () => number = () => 0, phase: Phase = 'view'): () => void {
  const job: Job = { run, every, last: -Infinity, done: false };
  jobs[phase].push(job);
  if (!raf && typeof requestAnimationFrame !== 'undefined') {
    lastFrame = 0;
    raf = requestAnimationFrame(frame);
  }
  return () => {
    if (job.done) return;
    job.done = true;
    jobs[phase] = jobs[phase].filter((j) => j !== job);
  };
}

function frame(t: number): void {
  if (jobs.clock.length + jobs.view.length === 0) {
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(frame);
  if (document.hidden) {
    lastFrame = 0;
    return;
  }
  watch(t);
  due('clock', t);
  // (a microtask: it runs after the flush the clock's write queued, so the views see this frame's position)
  if (jobs.view.length) queueMicrotask(() => due('view', t));
}

function due(phase: Phase, t: number): void {
  const list = jobs[phase];
  const n = list.length;
  const start = phase === 'view' ? turn % Math.max(1, n) : 0;
  const began = performance.now();
  let ran = 0;
  for (let k = 0; k < n; k++) {
    const job = list[(start + k) % n];
    if (job.done || t - job.last < job.every() * load.scale) continue;
    // (the clock always runs; a view waits for the next frame once this one's budget is spent)
    if (phase === 'view' && ran > 0 && performance.now() - began > BUDGET) {
      turn = start + k;
      return;
    }
    job.last = t;
    ran++;
    try {
      job.run(t);
    } catch (e) {
      // (one view failing doesn't stop the others, nor the clock)
      console.error(e);
    }
  }
  if (phase === 'view') turn = start;
}

function watch(t: number): void {
  if (lastFrame) ema += (Math.min(250, t - lastFrame) - ema) * 0.1;
  lastFrame = t;
  // decide twice a second: 60 fps is ~17 ms a frame; past ~45 ms the page is behind
  if (t - decided < 500) return;
  decided = t;
  if (ema > 45) load.scale = Math.min(MAX, load.scale * 1.3);
  else if (ema < 26) load.scale = Math.max(1, load.scale / 1.3);
}
