import type { Tuning } from '../audio/tuning';
import type { ReportData } from './perf';

/**
 * The automated latency test (the performance overlay's "Run full test"): a series of tuning settings, each played
 * on a few heavy pieces for a while, and one combined report that says which setting stayed clean. The question it
 * answers is the one in docs/ui/performance.md: how far can the output latency be lowered on this device before
 * notes go late or the audio thread misses its deadlines?
 *
 * Pure, so it is tested in node: the page is reached through `RunController`, the numbers through `Recorder`.
 */

export interface Setting {
  id: string;
  label: string;
  tuning: Tuning;
}

/** From the safe default down to the most aggressive: in this order, so a run that is cut short has the safe ones. */
export const SETTINGS: readonly Setting[] = [
  { id: 'playback', label: 'playback (the old default)', tuning: { latencyHint: 'playback', lookAhead: null } },
  { id: 'balanced', label: 'balanced (today)', tuning: { latencyHint: 'balanced', lookAhead: null } },
  { id: 'interactive', label: 'interactive', tuning: { latencyHint: 'interactive', lookAhead: null } },
  { id: 'interactive-la100', label: 'interactive, look-ahead 0.1 s', tuning: { latencyHint: 'interactive', lookAhead: 0.1 } },
];

/** The heaviest pieces: the dense drum-and-synth one, the longest counterpoint, the tape and noise one, the resonating bodies (hands: a shorter look-ahead). */
export const PIECES: readonly { key: string; label: string }[] = [
  { key: 'hypercell', label: 'Hypercell' },
  { key: 'bwv847', label: 'Bach 847' },
  { key: 'testtones', label: 'Test Tones on Tape' },
  { key: 'resonanz', label: 'Baustelle II: Resonanz' },
];

export interface RunOptions {
  /** Seconds of steady playback per test (the 3 s start-up after each Play comes on top). */
  seconds: number;
  settings: readonly Setting[];
  pieces: readonly { key: string; label: string }[];
}

const DEFAULT_SECONDS = 25;
/** Seconds the report leaves out after Play (perf.ts WARMUP), and the pause between two tests. */
const WARMUP_S = 3;
const GAP_S = 1;

/** The test as the address asks for it (`?runseconds=10&runsettings=playback,interactive&runpieces=hypercell`): for trying it out; the button runs the defaults. */
export function parseRunOptions(search: string): RunOptions {
  const q = new URLSearchParams(search);
  const seconds = Number(q.get('runseconds'));
  const list = (k: string) =>
    (q.get(k) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  const wantSettings = list('runsettings');
  const wantPieces = list('runpieces');
  const settings = wantSettings.length ? SETTINGS.filter((s) => wantSettings.includes(s.id)) : SETTINGS;
  const pieces = wantPieces.length ? PIECES.filter((p) => wantPieces.includes(p.key)) : PIECES;
  return {
    seconds: Number.isFinite(seconds) && seconds >= 4 && seconds <= 120 ? seconds : DEFAULT_SECONDS,
    settings: settings.length ? settings : SETTINGS,
    pieces: pieces.length ? pieces : PIECES,
  };
}

export interface Step {
  piece: { key: string; label: string };
  setting: Setting;
}

/** Every piece under each setting, a setting at a time (a new audio context per setting, not per piece). */
export function planSteps(o: RunOptions): Step[] {
  return o.settings.flatMap((setting) => o.pieces.map((piece) => ({ piece, setting })));
}

export function estimateMinutes(o: RunOptions): number {
  return Math.ceil((planSteps(o).length * (o.seconds + WARMUP_S + GAP_S)) / 60);
}

// ---- running it

/** What the runner needs from the page. */
export interface RunController {
  /** Open an example by its key (fresh: stopped, nothing sounding); false if it is not there. */
  open(key: string): Promise<boolean>;
  retune(t: Tuning): Promise<void>;
  play(): Promise<void>;
  stop(): void;
  audioState(): string | null;
  /** Whether the page is in the background now (a browser then stops drawing and may slow the audio). */
  hidden(): boolean;
  /** Put back the piece and tuning that were there before the test. */
  finish(): Promise<void>;
}

export interface Recorder {
  now(): number;
  report(from: number, to: number): ReportData;
}

export interface Progress {
  /** 1-based number of the test, of `total`; `elapsed` of `of` seconds into it. */
  index: number;
  total: number;
  piece: string;
  setting: string;
  elapsed: number;
  of: number;
}

export interface RunResult {
  piece: string;
  setting: Setting;
  data: ReportData | null;
  /** Why there is no (or a doubtful) report: the page was in the background, the piece would not open, audio did not start. */
  problem?: string;
}

export interface Outcome {
  results: RunResult[];
  /** Why the series stopped early (null: it ran to the end). */
  stoppedBecause: string | null;
}

export async function runScenario(
  steps: readonly Step[],
  o: { seconds: number },
  ctl: RunController,
  rec: Recorder,
  io: { wait(ms: number): Promise<void>; onProgress(p: Progress): void; cancelled(): boolean },
): Promise<Outcome> {
  const results: RunResult[] = [];
  let stoppedBecause: string | null = null;
  let tuned: string | null = null;
  try {
    for (let i = 0; i < steps.length; i++) {
      if (io.cancelled()) {
        stoppedBecause = 'cancelled';
        break;
      }
      const { piece, setting } = steps[i];
      const where = { index: i + 1, total: steps.length, piece: piece.label, setting: setting.label, of: o.seconds + WARMUP_S };
      io.onProgress({ ...where, elapsed: 0 });
      if (tuned !== setting.id) {
        await ctl.retune(setting.tuning);
        tuned = setting.id;
      }
      if (!(await ctl.open(piece.key))) {
        results.push({ piece: piece.label, setting, data: null, problem: 'the piece could not be opened' });
        continue;
      }
      await ctl.play();
      const from = rec.now();
      if (ctl.audioState() !== 'running') {
        // (a context made without a tap that the browser keeps suspended: nothing after it can be measured either)
        ctl.stop();
        results.push({
          piece: piece.label,
          setting,
          data: null,
          problem: `the audio did not start (${ctl.audioState() ?? 'no context'}): the browser wants a tap for a new audio context`,
        });
        stoppedBecause = 'the browser would not start audio without a tap';
        break;
      }
      let hidden = false;
      for (let t = 0; t < where.of && !io.cancelled(); t++) {
        await io.wait(1000);
        hidden ||= ctl.hidden();
        io.onProgress({ ...where, elapsed: t + 1 });
      }
      const data = rec.report(from, rec.now());
      ctl.stop();
      results.push({ piece: piece.label, setting, data, problem: hidden ? 'the page was in the background for part of this test: its numbers are not to be trusted' : undefined });
      await io.wait(GAP_S * 1000);
    }
    if (!stoppedBecause && io.cancelled()) stoppedBecause = 'cancelled';
  } finally {
    ctl.stop();
    await ctl.finish();
  }
  return { results, stoppedBecause };
}

// ---- the combined report

/** What would be audible in one run (not what is merely slow to draw): why this setting did not hold. */
export function audioProblems(d: ReportData): string[] {
  const out: string[] = [];
  if (d.notes && d.notes.dropped > 0) out.push(`${d.notes.dropped} note(s) left out`);
  if (d.notes && d.notes.late > 0 && d.notes.worstLateMs >= 30) out.push(`notes up to ${Math.round(d.notes.worstLateMs)} ms late`);
  if (d.audio.capacity && d.audio.capacity.underrunRatioMax > 0)
    out.push(`audio thread missed deadlines (${(d.audio.capacity.underrunRatioMax * 100).toFixed(1)} % of blocks in its worst second)`);
  if (d.audio.playout && d.audio.playout.events > 0) out.push(`${d.audio.playout.events} audio underrun(s)`);
  if (d.audio.clockRatio !== null && d.audio.clockRatio < 0.98) out.push(`audio clock slow (${d.audio.clockRatio.toFixed(3)}×)`);
  return out;
}

const n0 = (x: number) => x.toFixed(0);
const n1 = (x: number) => x.toFixed(1);

interface Row {
  piece: string;
  setting: string;
  fps: number;
  blockedPct: number;
  played: number | null;
  late: number | null;
  dropped: number | null;
  worstLateMs: number | null;
  baseMs: number | null;
  outputMs: number | null;
  heardMs: number | null;
  loadMean: number | null;
  loadPeak: number | null;
  missedMax: number | null;
  underruns: number | null;
  clock: number | null;
  tuning: string | null;
  problems: string[];
}

function row(r: RunResult): Row | null {
  const d = r.data;
  if (!d) return null;
  return {
    piece: r.piece,
    setting: r.setting.id,
    fps: Math.round(d.frames.fps * 10) / 10,
    blockedPct: Math.round(d.long.blockedPct * 10) / 10,
    played: d.notes?.played ?? null,
    late: d.notes?.late ?? null,
    dropped: d.notes?.dropped ?? null,
    worstLateMs: d.notes ? Math.round(d.notes.worstLateMs) : null,
    baseMs: d.audio.baseLatencyMs === null ? null : Math.round(d.audio.baseLatencyMs * 10) / 10,
    outputMs: d.audio.outputLatencyMs === null ? null : Math.round(d.audio.outputLatencyMs * 10) / 10,
    heardMs: d.audio.heardLatencyMs === null ? null : Math.round(d.audio.heardLatencyMs * 10) / 10,
    loadMean: d.audio.capacity ? Math.round(d.audio.capacity.meanLoad * 1000) / 10 : null,
    loadPeak: d.audio.capacity ? Math.round(d.audio.capacity.peakLoad * 1000) / 10 : null,
    missedMax: d.audio.capacity ? Math.round(d.audio.capacity.underrunRatioMax * 1000) / 10 : null,
    underruns: d.audio.playout?.events ?? null,
    clock: d.audio.clockRatio === null ? null : Math.round(d.audio.clockRatio * 1000) / 1000,
    tuning: d.audio.tuning,
    problems: [...audioProblems(d), ...(r.problem ? [r.problem] : [])],
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Per setting: did every piece stay clean, and how long between made and heard. */
export function summarizeSettings(results: readonly RunResult[], settings: readonly Setting[]) {
  return settings
    .map((s) => {
      const mine = results.filter((r) => r.setting.id === s.id);
      const rows = mine.map(row).filter((x): x is Row => x !== null);
      const complete = mine.length > 0 && mine.every((r) => r.data && !r.problem);
      return {
        setting: s,
        ran: mine.length,
        clean: complete && rows.every((x) => x.problems.length === 0),
        heardMs: mean(rows.map((x) => x.heardMs).filter((h): h is number => h !== null)),
        outputMs: mean(rows.map((x) => x.outputMs).filter((h): h is number => h !== null)),
      };
    })
    .filter((s) => s.ran > 0);
}

/** One report for the whole series, to paste into the issue (small: a table, the verdict, then each run's own lines). */
export function combinedReport(out: Outcome, o: RunOptions): string {
  const first = out.results.find((r) => r.data)?.data;
  const L: string[] = [];
  L.push('### Latency test: how far can the output latency be lowered?');
  L.push('');
  if (first) {
    L.push(`Cell studio ${first.version} · ${first.when}`);
    L.push(`Device: ${first.device.userAgent}`);
    L.push(
      `${first.device.mobile === null ? '' : first.device.mobile ? 'mobile · ' : 'desktop · '}${first.device.cores ?? '?'} cores · ${first.device.memoryGB ?? '?'} GB (reported) · viewport ${first.device.viewport}`,
    );
  }
  L.push(`Test: ${o.settings.length} setting(s) × ${o.pieces.length} piece(s), ${o.seconds} s of steady playback each, settings from the safest down.`);
  if (out.stoppedBecause) L.push(`**Stopped early: ${out.stoppedBecause}.**`);
  L.push('');

  const sum = summarizeSettings(out.results, o.settings);
  const supported = out.results.some((r) => r.data?.audio.capacity);
  L.push('**Result**');
  L.push('');
  const clean = sum.filter((s) => s.clean);
  // (lowest heard latency among those that held; the list is in order from the safest, so ties go to the safer)
  const best = clean.length ? clean.reduce((a, b) => ((b.heardMs ?? Infinity) < (a.heardMs ?? Infinity) ? b : a)) : null;
  if (best)
    L.push(`- Lowest setting that stayed clean on every piece: **${best.setting.label}**${best.heardMs !== null ? `, about ${n0(best.heardMs)} ms from made to heard` : ''}.`);
  else L.push('- No setting stayed clean on every piece (or the series did not complete).');
  for (const s of sum)
    L.push(
      `- ${s.setting.label}: ${s.clean ? 'clean' : 'not clean'}${s.heardMs !== null ? ` · made-to-heard ${n0(s.heardMs)} ms` : ''}${s.outputMs !== null ? ` · output latency ${n0(s.outputMs)} ms` : ''}`,
    );
  if (!supported)
    L.push('- This browser gives no audio-thread report (renderCapacity): underruns inside the audio thread cannot be seen, only late notes and the clock. Listen too.');
  L.push('');

  L.push('| Piece | Setting | fps | blocked | notes late / left out | audio thread peak / missed | output / heard | |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of out.results) {
    const x = row(r);
    if (!x) {
      L.push(`| ${r.piece} | ${r.setting.label} | | | | | | ✗ ${r.problem ?? ''} |`);
      continue;
    }
    L.push(
      `| ${x.piece} | ${r.setting.label} | ${n0(x.fps)} | ${n0(x.blockedPct)} % | ${x.late ?? '?'} / ${x.dropped ?? '?'}${x.worstLateMs ? ` (worst ${x.worstLateMs} ms)` : ''} | ${x.loadPeak === null ? 'n/a' : `${n0(x.loadPeak)} % / ${n1(x.missedMax ?? 0)} %`} | ${x.outputMs === null ? '?' : n0(x.outputMs)} / ${x.heardMs === null ? '?' : n0(x.heardMs)} ms | ${x.problems.length ? `✗ ${x.problems.join('; ')}` : '✓'} |`,
    );
  }
  L.push('');
  L.push('<details><summary>data</summary>');
  L.push('');
  L.push('```json');
  L.push(JSON.stringify(out.results.map(row).filter(Boolean)));
  L.push('```');
  L.push('');
  L.push('</details>');
  return L.join('\n');
}
