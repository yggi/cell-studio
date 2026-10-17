/**
 * The audio device: the context the player makes (`balanced`, or as the address asks), and
 * what it reports for the performance report (its latencies, its clock, the render thread's load and
 * underruns where the browser has them). Nothing here starts audio by itself.
 */
import { capacity, noteStats } from './stats';
import { resolveTuning, type Tuning, DEFAULT_TUNING } from './tuning';
import { storageKey } from '../storageKey';
import { clockOffset, type ClockOffset, type OutputClock } from '@yggi/webmidi/core';

type ToneNS = typeof import('tone');

/**
 * Make Tone's context on a tuning, in place of the one it has. Headroom by default: a context with a moderate
 * buffer (`balanced`: about 55 ms made-to-heard on the phone measured) that schedules notes 0.3 s ahead, so a busy page (a large graph drawing)
 * doesn't make notes late or starve the sound — unless the address (`readTuning`) or the latency test
 * asks otherwise, to find out how far they can go on a device (tuning.ts).
 */
export function openContext(T: ToneNS, tuning: Tuning): void {
  T.setContext(new T.Context({ latencyHint: tuning.latencyHint as AudioContextLatencyCategory, lookAhead: tuning.lookAhead ?? 0.3 }), true); // (true: dispose the old context, or it keeps running beside the new one)
  watchCapacity(T);
}

/** The native context behind Tone's wrapper (where renderCapacity and the output timestamp live). */
function nativeContext(T: ToneNS): Record<string, unknown> | null {
  const raw = (T.getContext() as unknown as { rawContext?: Record<string, unknown> }).rawContext;
  return (raw?._nativeContext as Record<string, unknown> | undefined) ?? raw ?? null;
}

/** The render thread's load and underruns, once a second, where the browser reports them (stats.ts `capacity`). */
function watchCapacity(T: ToneNS) {
  const probe = capacity.probe;
  try {
    probe.inPrototype = typeof AudioContext === 'undefined' ? null : 'renderCapacity' in AudioContext.prototype;
    const rc = nativeContext(T)?.renderCapacity as
      | { start(o: { updateInterval: number }): void; addEventListener(t: 'update', f: (e: { averageLoad: number; peakLoad: number; underrunRatio: number }) => void): void }
      | undefined;
    probe.onContext = !!rc;
    if (!rc) return;
    capacity.supported = true;
    rc.addEventListener('update', (e) => {
      probe.updates++;
      capacity.events.push({ t: performance.now(), avg: e.averageLoad, peak: e.peakLoad, underrun: e.underrunRatio });
      if (capacity.events.length > 3600) capacity.events.splice(0, capacity.events.length - 3600);
    });
    rc.start({ updateInterval: 1 });
    probe.started = true;
  } catch (e) {
    probe.error = e instanceof Error ? e.message : String(e); // (shown in the report: "not available here" is what #91 could not tell apart)
  }
}

// one clock pairing per context: a retuned context starts its own
const clocks = new WeakMap<object, ClockOffset>();

/**
 * The audio clock against the page's at the moment heard, for this context (`clockOffset`, `@yggi/webmidi/core`): what MIDI timestamps are
 * read against, and what `heardLatency` reads, so the pictures and MIDI out follow one estimate.
 */
export function contextClock(T: ToneNS): ClockOffset | null {
  const n = nativeContext(T) as (OutputClock & { getOutputTimestamp?: () => { contextTime?: number; performanceTime?: number }; outputLatency?: number }) | null;
  if (!n || typeof n.currentTime !== 'number') return null;
  let clock = clocks.get(n);
  if (!clock) {
    const native = n;
    clock = clockOffset({
      get currentTime() {
        return native.currentTime;
      },
      get latency() {
        return outputLatency(T) ?? 0;
      },
      ...(typeof native.getOutputTimestamp === 'function' && { outputTimestamp: () => native.getOutputTimestamp!() }),
    });
    clocks.set(n, clock);
  }
  return clock;
}

/** Seconds between a sample being made and being heard now, from the output timestamp's pairing (null where there is none). */
export function heardLatency(T: ToneNS): number | null {
  try {
    const clock = contextClock(T);
    if (!clock?.paired) return null;
    clock.update();
    const n = nativeContext(T) as { currentTime: number };
    return Math.max(0, n.currentTime - clock.heard());
  } catch {
    return null;
  }
}

/** The browser's own output latency, for a browser without an output timestamp (null where it says nothing). */
export function outputLatency(T: ToneNS): number | null {
  const own = nativeContext(T)?.outputLatency;
  return typeof own === 'number' && Number.isFinite(own) ? own : null;
}

export interface AudioInfo {
  state: string | null;
  sampleRate: number | null;
  baseLatency: number | null;
  outputLatency: number | null;
  currentTime: number | null;
  playout: { underrunEvents: number; underrunDuration: number; totalDuration: number; averageLatency: number; maximumLatency: number } | null;
  /** Notes scheduled / shifted late / left out for being > 50 ms late, since the page loaded. */
  notes: { played: number; late: number; dropped: number; worstLateMs: number };
  /** Seconds between a sample being made and being heard, from the output timestamp (null where there is none). */
  heardLatency: number | null;
  /** The tuning in force (the latency hint and the look-ahead), as words. */
  tuning: string;
  /** Seconds the pictures are held back from the audio clock now (null: not playing yet); the player fills it in. */
  pictureLag: number | null;
}

/** What the audio context looks like now (T: none yet, before the first gesture). */
export function audioInfo(T: ToneNS | undefined, tuning: Tuning): AudioInfo {
  const tuned = `${typeof tuning.latencyHint === 'number' ? `${tuning.latencyHint} s` : tuning.latencyHint}, look-ahead ${tuning.lookAhead ?? 'default'}`;
  // (the worst lateness is since the last time it was asked: the report reads it every half second, so a window
  // can tell its own worst from one at the start of the page)
  const notes = { ...noteStats };
  noteStats.worstLateMs = 0;
  if (!T)
    return { state: null, sampleRate: null, baseLatency: null, outputLatency: null, currentTime: null, playout: null, notes, heardLatency: null, pictureLag: null, tuning: tuned };
  const tc = T.getContext() as unknown as { rawContext?: Record<string, unknown>; state?: string; sampleRate?: number; currentTime?: number };
  const raw = (tc.rawContext ?? {}) as {
    playoutStats?: Record<string, number>;
    _nativeContext?: { playoutStats?: Record<string, number>; baseLatency?: number; outputLatency?: number };
    baseLatency?: number;
    outputLatency?: number;
  };
  // (Tone wraps the native context: the stats are on the native one)
  const stats = raw.playoutStats ?? raw._nativeContext?.playoutStats;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    state: tc.state ?? null,
    sampleRate: num(tc.sampleRate),
    baseLatency: num(raw.baseLatency ?? raw._nativeContext?.baseLatency),
    outputLatency: num(raw.outputLatency ?? raw._nativeContext?.outputLatency),
    currentTime: num(tc.currentTime),
    notes,
    tuning: tuned,
    heardLatency: heardLatency(T),
    pictureLag: null,
    playout: stats
      ? {
          underrunEvents: stats.underrunEvents ?? 0,
          underrunDuration: stats.underrunDuration ?? 0,
          totalDuration: stats.totalDuration ?? 0,
          averageLatency: stats.averageLatency ?? 0,
          maximumLatency: stats.maximumLatency ?? 0,
        }
      : null,
  };
}

const KEPT = { latency: storageKey('cell-studio-latency'), lookahead: storageKey('cell-studio-lookahead') };
/** The tuning the address and the kept settings ask for (and keeps the address's). */
export function readTuning(): Tuning {
  if (typeof location === 'undefined') return DEFAULT_TUNING;
  let kept = { latency: null as string | null, lookahead: null as string | null };
  try {
    kept = { latency: localStorage.getItem(KEPT.latency), lookahead: localStorage.getItem(KEPT.lookahead) };
  } catch {
    /* no storage here */
  }
  const { tuning, keep } = resolveTuning(location.search, kept);
  try {
    for (const k of ['latency', 'lookahead'] as const) keep[k] === null ? localStorage.removeItem(KEPT[k]) : localStorage.setItem(KEPT[k], keep[k]!);
  } catch {
    /* no storage here */
  }
  return tuning;
}
