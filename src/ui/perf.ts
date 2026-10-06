import { capacity, marks } from '../audio/stats';

/**
 * Performance report: what the page felt like while a piece played, on the device in your hand. The
 * numbers come from the browser itself (frame intervals, long tasks, long animation frames, the audio
 * clock and, where the browser has them, playout underruns) so a phone needs no cable. `tools/profile`
 * measures the same things from outside, headless; this is for a real device.
 *
 * The summaries and the report are plain functions (tested in node); `PerfCollector` is the browser part.
 */

// ---- summaries

export function percentile(sorted: readonly number[], p: number): number {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
}

export interface FrameStats {
  frames: number;
  fps: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
  /** Frames that took longer than 50 ms / 100 ms to arrive (a visible hitch). */
  over50: number;
  over100: number;
}

/** Frame intervals (ms between animation frames) over `seconds` of wall time. */
export function summarizeFrames(deltas: readonly number[], seconds: number): FrameStats {
  const s = [...deltas].sort((a, b) => a - b);
  return {
    frames: s.length,
    fps: seconds > 0 ? s.length / seconds : 0,
    medianMs: percentile(s, 50),
    p95Ms: percentile(s, 95),
    maxMs: s.length ? s[s.length - 1] : 0,
    over50: s.filter((d) => d > 50).length,
    over100: s.filter((d) => d > 100).length,
  };
}

export interface LongStats {
  count: number;
  totalMs: number;
  maxMs: number;
  over100: number;
  /** The share of the window the main thread spent inside long tasks (> 50 ms). */
  blockedPct: number;
}

export function summarizeLong(durations: readonly number[], seconds: number): LongStats {
  const total = durations.reduce((a, b) => a + b, 0);
  return {
    count: durations.length,
    totalMs: total,
    maxMs: durations.length ? Math.max(...durations) : 0,
    over100: durations.filter((d) => d > 100).length,
    blockedPct: seconds > 0 ? Math.min(100, (100 * total) / (seconds * 1000)) : 0,
  };
}

/** One long animation frame (Chrome 123+): how long, how much of it blocked input, what ran in it. */
export interface Loaf {
  duration: number;
  blocking: number;
  /** What started each script in it ("FrameRequestCallback", "Promise.then", "TimerHandler" …). */
  invokers: readonly string[];
}

export interface LoafStats {
  count: number;
  totalMs: number;
  blockingMs: number;
  /** Invoker → [how many scripts, ms] — most expensive first. */
  byInvoker: readonly (readonly [string, number, number])[];
}

export function summarizeLoaf(entries: readonly Loaf[]): LoafStats {
  const by = new Map<string, [number, number]>();
  for (const e of entries) {
    const each = e.duration / Math.max(1, e.invokers.length);
    for (const inv of e.invokers.length ? e.invokers : ['(none)']) {
      const v = by.get(inv) ?? [0, 0];
      v[0]++;
      v[1] += each;
      by.set(inv, v);
    }
  }
  return {
    count: entries.length,
    totalMs: entries.reduce((a, e) => a + e.duration, 0),
    blockingMs: entries.reduce((a, e) => a + e.blocking, 0),
    byInvoker: [...by]
      .map(([k, v]) => [k, v[0], v[1]] as const)
      .sort((a, b) => b[2] - a[2])
      .slice(0, 6),
  };
}

// ---- the report

export interface Playout {
  underrunEvents: number;
  underrunDuration: number;
  totalDuration: number;
  averageLatency: number;
  maximumLatency: number;
}

/** One kind of per-frame work our own code timed (audio/stats.ts `timed`): how much of the time it took, how long each run. */
export interface MarkStats {
  name: string;
  count: number;
  totalMs: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
}

export function summarizeMarks(events: readonly { name: string; d: number }[]): MarkStats[] {
  const by = new Map<string, number[]>();
  for (const e of events) (by.get(e.name) ?? by.set(e.name, []).get(e.name)!).push(e.d);
  return [...by]
    .map(([name, ds]) => {
      const s = [...ds].sort((a, b) => a - b);
      const total = ds.reduce((a, b) => a + b, 0);
      return { name, count: ds.length, totalMs: total, meanMs: total / ds.length, p95Ms: percentile(s, 95), maxMs: s[s.length - 1] };
    })
    .sort((a, b) => b.totalMs - a.totalMs);
}

export interface QueueStats {
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}

export interface NoteStats {
  played: number;
  late: number;
  dropped: number;
  worstLateMs: number;
}

export interface ReportData {
  version: string;
  when: string;
  device: {
    userAgent: string;
    mobile: boolean | null;
    cores: number | null;
    memoryGB: number | null;
    pixelRatio: number;
    viewport: string;
    screen: string;
  };
  piece: { title: string | null; graphNodes: number | null; cells: number | null };
  /** Seconds the window lasted, and how many of them were steady playback (the first 3 s after each Play are left out: the audio engine is starting). */
  seconds: number;
  playingSeconds: number;
  /** Which samples the numbers below cover: only those taken during steady playback, or all of them. */
  basis: 'playing' | 'all';
  frames: FrameStats;
  long: LongStats;
  /** null where the browser has no long-animation-frame API. */
  loaf: LoafStats | null;
  /** Our own timed work per frame (null when none was recorded). */
  marks: MarkStats[] | null;
  /** How long a task waited for the main thread (a message to ourselves every 100 ms): null if not measured. */
  queue: QueueStats | null;
  /** Notes the player scheduled in the window, and how many the page let be late. */
  notes: NoteStats | null;
  /** The live views' refresh stretch (audio/load.ts): 1 = full rate. */
  loadScale: { mean: number; max: number };
  audio: {
    state: string | null;
    sampleRate: number | null;
    baseLatencyMs: number | null;
    outputLatencyMs: number | null;
    /** How fast the audio clock ran against the wall clock while playing (1 = in step; null: not measured). */
    clockRatio: number | null;
    /** The audio context's tuning (latency hint, look-ahead): what the figures above are for. */
    tuning: string | null;
    /** Mean seconds between a sample being made and being heard, from the output timestamp, in ms (null: no timestamp). */
    heardLatencyMs: number | null;
    /** How far the pictures are held back from the audio clock to match what is heard, in ms (null: not playing yet). */
    pictureLagMs: number | null;
    /** The render thread's own report (AudioContext.renderCapacity), over the window: null where the browser has none. */
    capacity: { updates: number; meanLoad: number; peakLoad: number; underrunRatioMean: number; underrunRatioMax: number } | null;
    /** Underruns over the window; null where the browser doesn't report them. */
    playout: { events: number; seconds: number; averageLatencyMs: number; maximumLatencyMs: number } | null;
  };
  heapMB: number | null;
}

const n1 = (x: number) => x.toFixed(1);
const n0 = (x: number) => x.toFixed(0);

/** A verdict in words, from the same numbers (the thresholds `tools/profile` and issue #13 use). */
export function verdict(r: ReportData): string[] {
  const out: string[] = [];
  if (r.playingSeconds < 3)
    out.push('Too little steady playback in this window to judge (the first 3 s after Play do not count): press Record, play the piece for 20 s or more, then stop.');
  if (r.audio.playout && r.audio.playout.events > 0)
    out.push(`Audio underran ${r.audio.playout.events} time(s) (${n1(r.audio.playout.seconds * 1000)} ms in all): that is audible.`);
  else if (r.audio.playout) out.push('No audio underruns reported.');
  if (r.audio.capacity && r.audio.capacity.underrunRatioMax > 0)
    out.push(`The audio thread missed deadlines (up to ${n1(r.audio.capacity.underrunRatioMax * 100)} % of blocks in a second): that is audible.`);
  else if (r.audio.capacity && r.audio.capacity.peakLoad > 0.8)
    out.push(`The audio thread peaked at ${n0(r.audio.capacity.peakLoad * 100)} % load: little room left for a smaller buffer.`);
  if (r.audio.clockRatio !== null && r.audio.clockRatio < 0.98) out.push(`The audio clock ran slow (${r.audio.clockRatio.toFixed(3)} of real time): the audio thread was starved.`);
  if (r.notes && r.notes.dropped > 0)
    out.push(`${r.notes.dropped} note(s) were left out for starting more than 50 ms late (worst ${n0(r.notes.worstLateMs)} ms): that is audible.`);
  else if (r.notes && r.notes.late > 0) out.push(`${r.notes.late} note(s) started a little late (worst ${n0(r.notes.worstLateMs)} ms).`);
  if (r.queue && r.queue.p95Ms > 50) out.push(`The main thread answered slowly: a task waited up to ${n0(r.queue.maxMs)} ms (95th percentile ${n0(r.queue.p95Ms)} ms).`);
  if (r.loaf && r.playingSeconds >= 3 && r.loaf.totalMs / (r.playingSeconds * 1000) > 0.05)
    out.push(
      `Frames longer than 50 ms took ${n0((100 * r.loaf.totalMs) / (r.playingSeconds * 1000))} % of the time (${r.loaf.count} of them): the page is not keeping up with the screen, whatever the long-task count says.`,
    );
  if (r.long.maxMs > 100) out.push(`The longest main-thread stall was ${n0(r.long.maxMs)} ms (target: none over 100 ms).`);
  if (r.long.blockedPct > 25) out.push(`The main thread was inside long tasks ${n0(r.long.blockedPct)} % of the time (target: under 25 %).`);
  if (r.frames.fps && r.frames.fps < 45) out.push(`Only ${n0(r.frames.fps)} frames a second reached the screen (60 is full rate).`);
  if (r.loadScale.mean > 1.5) out.push(`The page was behind: the live views refreshed ${r.loadScale.mean.toFixed(1)}× slower than normal on average.`);
  if (!out.length) out.push('Nothing over the targets in this window.');
  return out;
}

/** The report as markdown, to paste into an issue; the data follows as JSON for tools. */
export function buildReport(r: ReportData): string {
  const lines: string[] = [];
  lines.push(`### Performance report — ${r.piece.title ?? '(no piece open)'}`);
  lines.push('');
  lines.push(`Cell studio ${r.version} · ${r.when}`);
  lines.push(`Device: ${r.device.userAgent}`);
  lines.push(
    `${r.device.mobile === null ? '' : r.device.mobile ? 'mobile · ' : 'desktop · '}${r.device.cores ?? '?'} cores · ${r.device.memoryGB ?? '?'} GB (reported) · pixel ratio ${r.device.pixelRatio} · viewport ${r.device.viewport} · screen ${r.device.screen}`,
  );
  lines.push(`Piece: ${r.piece.cells ?? '?'} cells, ${r.piece.graphNodes ?? '?'} graph nodes`);
  lines.push(
    `Window: ${n0(r.seconds)} s, steady playback ${n0(r.playingSeconds)} s (the first 3 s after each Play are left out) — numbers below cover ${r.basis === 'playing' ? 'the steady playback' : 'the whole window'}.`,
  );
  lines.push('');
  lines.push('| | |');
  lines.push('|---|---|');
  lines.push(
    `| Frames | ${n1(r.frames.fps)} fps · interval median ${n1(r.frames.medianMs)} ms, p95 ${n1(r.frames.p95Ms)} ms, max ${n0(r.frames.maxMs)} ms · ${r.frames.over50} over 50 ms, ${r.frames.over100} over 100 ms |`,
  );
  lines.push(`| Long tasks (> 50 ms) | ${r.long.count} · longest ${n0(r.long.maxMs)} ms · ${r.long.over100} over 100 ms · main thread blocked ${n1(r.long.blockedPct)} % |`);
  if (r.loaf)
    lines.push(
      `| Long animation frames | ${r.loaf.count} · ${n0(r.loaf.totalMs)} ms in all, ${n0(r.loaf.blockingMs)} ms blocking · ${r.loaf.byInvoker.map(([k, c, ms]) => `${k} ×${c} (${n0(ms)} ms)`).join(', ') || '—'} |`,
    );
  if (r.queue) lines.push(`| Main-thread responsiveness | a task waited median ${n1(r.queue.medianMs)} ms, p95 ${n1(r.queue.p95Ms)} ms, max ${n0(r.queue.maxMs)} ms |`);
  if (r.notes)
    lines.push(`| Notes | ${r.notes.played} scheduled · ${r.notes.late} started late · ${r.notes.dropped} left out (> 50 ms late) · worst ${n0(r.notes.worstLateMs)} ms late |`);
  lines.push(`| Live views' refresh stretch | mean ${r.loadScale.mean.toFixed(2)}×, max ${r.loadScale.max.toFixed(2)}× (1× = full rate) |`);
  lines.push(
    `| Audio | ${r.audio.state ?? 'not started'}${r.audio.sampleRate ? ` · ${r.audio.sampleRate} Hz` : ''}${r.audio.baseLatencyMs !== null ? ` · base latency ${n1(r.audio.baseLatencyMs)} ms` : ''}${r.audio.outputLatencyMs !== null ? ` · output latency ${n1(r.audio.outputLatencyMs)} ms` : ''}${r.audio.clockRatio !== null ? ` · clock ${r.audio.clockRatio.toFixed(3)}× real time` : ''} |`,
  );
  if (r.audio.tuning || r.audio.heardLatencyMs !== null)
    lines.push(
      `| Latency tuning | ${r.audio.tuning ?? '?'}${r.audio.heardLatencyMs !== null ? ` · made-to-heard (output timestamp) ${n1(r.audio.heardLatencyMs)} ms` : ''}${r.audio.pictureLagMs !== null ? ` · pictures held back ${n0(r.audio.pictureLagMs)} ms` : ''} |`,
    );
  if (r.audio.capacity)
    lines.push(
      `| Audio thread (renderCapacity) | load mean ${n0(r.audio.capacity.meanLoad * 100)} %, peak ${n0(r.audio.capacity.peakLoad * 100)} % · missed deadlines: mean ${n1(r.audio.capacity.underrunRatioMean * 100)} %, worst second ${n1(r.audio.capacity.underrunRatioMax * 100)} % (${r.audio.capacity.updates} s) |`,
    );
  lines.push(
    r.audio.playout
      ? `| Audio underruns | ${r.audio.playout.events} (${n1(r.audio.playout.seconds * 1000)} ms) · latency average ${n1(r.audio.playout.averageLatencyMs)} ms, max ${n1(r.audio.playout.maximumLatencyMs)} ms |`
      : '| Audio underruns | not reported by this browser |',
  );
  if (r.heapMB !== null) lines.push(`| JS heap | ${n0(r.heapMB)} MB |`);
  if (r.marks?.length) {
    lines.push('');
    lines.push('Our own per-frame work (steady playback; share = of the window):');
    lines.push('');
    lines.push('| work | runs | total | share | mean | p95 | max |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const m of r.marks)
      lines.push(
        `| ${m.name} | ${m.count} | ${n0(m.totalMs)} ms | ${n1((100 * m.totalMs) / Math.max(1, (r.basis === 'playing' ? r.playingSeconds : r.seconds) * 1000))} % | ${n1(m.meanMs)} ms | ${n1(m.p95Ms)} ms | ${n1(m.maxMs)} ms |`,
      );
    lines.push('');
  }
  lines.push('');
  lines.push(...verdict(r).map((v) => `- ${v}`));
  lines.push('');
  lines.push('<details><summary>data</summary>');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(r));
  lines.push('```');
  lines.push('');
  lines.push('</details>');
  return lines.join('\n');
}

// ---- the browser part

interface Sample {
  t: number;
  playing: boolean;
  scale: number;
  audioTime: number | null;
  playout: Playout | null;
  notes: NoteStats | null;
  heardLatency: number | null;
  heap: number | null;
}

interface AudioNow {
  state: string | null;
  sampleRate: number | null;
  baseLatency: number | null;
  outputLatency: number | null;
  currentTime: number | null;
  playout: Playout | null;
  notes: NoteStats | null;
  heardLatency?: number | null;
  tuning?: string | null;
  pictureLag?: number | null;
}

export interface PerfSources {
  playing(): boolean;
  loadScale(): number;
  audio(): AudioNow;
}

const CAP = 60000;
/** Milliseconds after Play that a report leaves out. */
const WARMUP = 3000;

/** Collects frame intervals, long tasks and long animation frames from `start()` on, and reports over any window of them. */
export class PerfCollector {
  private frames: { t: number; d: number; p: boolean }[] = [];
  private tasks: { t: number; d: number; p: boolean }[] = [];
  private loafs: { t: number; l: Loaf; p: boolean }[] = [];
  private queue: { t: number; d: number; p: boolean }[] = [];
  private channel: MessageChannel | null = null;
  private pingAt = 0;
  private samples: Sample[] = [];
  private raf = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private observers: PerformanceObserver[] = [];
  private lastFrame = 0;
  /** Whether this browser has the long-animation-frame API. */
  hasLoaf = false;
  hasLongTask = false;
  private playStart: number | null = null;

  /** Playing, and for long enough that the audio engine's start-up (reverb impulse, first windows) is over. */
  private steady(): boolean {
    if (!this.src.playing()) {
      this.playStart = null;
      return false;
    }
    const t = performance.now();
    if (this.playStart === null) this.playStart = t;
    return t - this.playStart > WARMUP;
  }

  constructor(private src: PerfSources) {}

  start(): void {
    if (this.raf) return;
    const frame = (t: number) => {
      this.raf = requestAnimationFrame(frame);
      if (document.hidden) {
        this.lastFrame = 0;
        return;
      }
      if (this.lastFrame) this.push(this.frames, { t, d: t - this.lastFrame, p: this.steady() });
      this.lastFrame = t;
    };
    this.raf = requestAnimationFrame(frame);
    this.sample();
    marks.events.length = 0;
    marks.on = true;
    this.timer = setInterval(() => {
      this.sample();
      // how long a task waits for the main thread: a message to ourselves, answered when the thread is free
      if (this.channel) {
        this.pingAt = performance.now();
        this.channel.port2.postMessage(0);
      }
    }, 100);
    if (typeof MessageChannel !== 'undefined') {
      this.channel = new MessageChannel();
      this.channel.port1.onmessage = () => this.push(this.queue, { t: performance.now(), d: performance.now() - this.pingAt, p: this.steady() });
    }
    this.observe('longtask', (e) => {
      this.hasLongTask = true;
      this.push(this.tasks, { t: e.startTime, d: e.duration, p: this.steady() });
    });
    this.observe('long-animation-frame', (e) => {
      this.hasLoaf = true;
      const scripts = ((e as unknown as { scripts?: { invoker?: string; invokerType?: string }[] }).scripts ?? []).map((s) => s.invokerType ?? s.invoker ?? '?');
      const blocking = (e as unknown as { blockingDuration?: number }).blockingDuration ?? 0;
      this.push(this.loafs, { t: e.startTime, l: { duration: e.duration, blocking, invokers: scripts }, p: this.steady() });
    });
  }

  stop(): void {
    marks.on = false;
    this.channel?.port1.close();
    this.channel = null;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    clearInterval(this.timer);
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
  }

  /** The time (performance.now) to start a window from. */
  now(): number {
    return performance.now();
  }

  private observe(type: string, f: (e: PerformanceEntry) => void) {
    try {
      if (!(PerformanceObserver.supportedEntryTypes ?? []).includes(type)) return;
      const o = new PerformanceObserver((l) => l.getEntries().forEach(f));
      o.observe({ type, buffered: false });
      this.observers.push(o);
    } catch {
      /* not supported here */
    }
  }

  private push<T>(a: T[], x: T) {
    a.push(x);
    if (a.length > CAP) a.splice(0, a.length - CAP);
  }

  private ticks = 0;
  private sample() {
    // (the timer runs every 100 ms for the responsiveness probe; the samples are every 500 ms)
    if (this.ticks++ % 5 !== 0) return;
    const a = this.src.audio();
    const heap = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? null;
    this.push(this.samples, {
      t: performance.now(),
      playing: this.steady(),
      scale: this.src.loadScale(),
      audioTime: a.currentTime,
      playout: a.playout,
      notes: a.notes,
      heardLatency: a.heardLatency ?? null,
      heap,
    });
  }

  /** What the last `seconds` (or the window from `from`) looked like, for the live readout. */
  live(seconds = 10): { fps: number; p95Ms: number; maxMs: number; longCount: number; longMaxMs: number; blockedPct: number; scale: number } {
    const to = performance.now();
    const from = to - seconds * 1000;
    const f = summarizeFrames(
      this.frames.filter((x) => x.t >= from).map((x) => x.d),
      seconds,
    );
    const l = summarizeLong(
      this.tasks.filter((x) => x.t >= from).map((x) => x.d),
      seconds,
    );
    return { fps: f.fps, p95Ms: f.p95Ms, maxMs: f.maxMs, longCount: l.count, longMaxMs: l.maxMs, blockedPct: l.blockedPct, scale: this.src.loadScale() };
  }

  /** The report over [from, to] (performance.now times). */
  report(from: number, to: number, meta: { version: string; piece: ReportData['piece'] }): ReportData {
    const win = (t: number) => t >= from && t <= to;
    const samples = this.samples.filter((s) => win(s.t));
    const seconds = Math.max(0.001, (to - from) / 1000);
    const playingSeconds = Math.min(seconds, samples.filter((s) => s.playing).length * 0.5);
    const basis: 'playing' | 'all' = playingSeconds >= 3 ? 'playing' : 'all';
    const keep = (p: boolean) => basis === 'all' || p;
    const span = basis === 'playing' ? playingSeconds : seconds;
    const frames = summarizeFrames(
      this.frames.filter((x) => win(x.t) && keep(x.p)).map((x) => x.d),
      span,
    );
    const long = summarizeLong(
      this.tasks.filter((x) => win(x.t) && keep(x.p)).map((x) => x.d),
      span,
    );
    const loaf = this.hasLoaf ? summarizeLoaf(this.loafs.filter((x) => win(x.t) && keep(x.p)).map((x) => x.l)) : null;
    const ps = samples.filter((s) => keep(s.playing));
    const scales = ps.map((s) => s.scale);
    const audio = this.src.audio();
    // the audio clock against the wall clock, over the stretch that was playing (first and last samples of it)
    let clockRatio: number | null = null;
    const withClock = ps.filter((s) => s.audioTime !== null);
    if (withClock.length >= 4) {
      const a = withClock[0];
      const b = withClock[withClock.length - 1];
      const wall = (b.t - a.t) / 1000;
      if (wall >= 2) clockRatio = (b.audioTime! - a.audioTime!) / wall;
    }
    let playout: ReportData['audio']['playout'] = null;
    const withPlayout = samples.filter((s) => s.playout);
    if (withPlayout.length >= 2) {
      const a = withPlayout[0].playout!;
      const b = withPlayout[withPlayout.length - 1].playout!;
      playout = {
        events: b.underrunEvents - a.underrunEvents,
        seconds: b.underrunDuration - a.underrunDuration,
        averageLatencyMs: b.averageLatency * 1000,
        maximumLatencyMs: b.maximumLatency * 1000,
      };
    }
    // our own timed work, for the stretches that were steady playback
    const steadyAt = (t: number) => {
      let lo = 0;
      let hi = this.samples.length - 1;
      let at = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (this.samples[mid].t <= t) ((at = mid), (lo = mid + 1));
        else hi = mid - 1;
      }
      return at >= 0 && this.samples[at].playing;
    };
    const markEvents = marks.events.filter((e) => win(e.t) && (basis === 'all' || steadyAt(e.t)));
    const queueDs = this.queue
      .filter((x) => win(x.t) && keep(x.p))
      .map((x) => x.d)
      .sort((a, b) => a - b);
    const withNotes = samples.filter((s) => s.notes);
    const notes: NoteStats | null =
      withNotes.length >= 2
        ? (() => {
            const a = withNotes[0].notes!;
            const b = withNotes[withNotes.length - 1].notes!;
            // (each sample carries the worst since the one before it: the window's worst is the largest after its first)
            return {
              played: b.played - a.played,
              late: b.late - a.late,
              dropped: b.dropped - a.dropped,
              worstLateMs: Math.max(0, ...withNotes.slice(1).map((s) => s.notes!.worstLateMs)),
            };
          })()
        : null;
    const heard = samples.map((s) => s.heardLatency).filter((h): h is number => h !== null);
    const caps = capacity.events.filter((e) => win(e.t));
    const cap: ReportData['audio']['capacity'] = caps.length
      ? {
          updates: caps.length,
          meanLoad: caps.reduce((a, e) => a + e.avg, 0) / caps.length,
          peakLoad: Math.max(...caps.map((e) => e.peak)),
          underrunRatioMean: caps.reduce((a, e) => a + e.underrun, 0) / caps.length,
          underrunRatioMax: Math.max(...caps.map((e) => e.underrun)),
        }
      : null;
    const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } };
    const heaps = samples.map((s) => s.heap).filter((h): h is number => h !== null);
    return {
      version: meta.version,
      when: new Date().toISOString(),
      device: {
        userAgent: navigator.userAgent,
        mobile: nav.userAgentData?.mobile ?? null,
        cores: navigator.hardwareConcurrency ?? null,
        memoryGB: nav.deviceMemory ?? null,
        pixelRatio: window.devicePixelRatio,
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        screen: `${screen.width}×${screen.height}`,
      },
      piece: meta.piece,
      seconds,
      playingSeconds,
      basis,
      frames,
      long,
      loaf,
      marks: markEvents.length ? summarizeMarks(markEvents) : null,
      queue: queueDs.length ? { medianMs: percentile(queueDs, 50), p95Ms: percentile(queueDs, 95), maxMs: queueDs[queueDs.length - 1] } : null,
      notes,
      loadScale: { mean: scales.length ? scales.reduce((a, b) => a + b, 0) / scales.length : 1, max: scales.length ? Math.max(...scales) : 1 },
      audio: {
        state: audio.state,
        sampleRate: audio.sampleRate,
        baseLatencyMs: audio.baseLatency === null ? null : audio.baseLatency * 1000,
        outputLatencyMs: audio.outputLatency === null ? null : audio.outputLatency * 1000,
        clockRatio,
        tuning: audio.tuning ?? null,
        pictureLagMs: audio.pictureLag == null ? null : audio.pictureLag * 1000,
        heardLatencyMs: heard.length ? (heard.reduce((a, b) => a + b, 0) / heard.length) * 1000 : null,
        capacity: cap,
        playout,
      },
      heapMB: heaps.length ? Math.max(...heaps) / 1048576 : null,
    };
  }
}
