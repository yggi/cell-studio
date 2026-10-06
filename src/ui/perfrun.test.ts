import { describe, expect, it } from 'vitest';
import { summarizeFrames, summarizeLong, type ReportData } from './perf';
import {
  audioProblems,
  combinedReport,
  estimateMinutes,
  parseRunOptions,
  planSteps,
  PIECES,
  runScenario,
  SETTINGS,
  summarizeSettings,
  type RunController,
  type RunResult,
} from './perfrun';

const data = (over: Partial<ReportData> = {}, audio: Partial<ReportData['audio']> = {}): ReportData => ({
  version: '0.9.0 (abc1234)',
  when: '2026-10-06T12:00:00.000Z',
  device: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/141', mobile: true, cores: 8, memoryGB: 4, pixelRatio: 2.6, viewport: '412×800', screen: '412×915' },
  piece: { title: 'Hypercell', graphNodes: 60, cells: 80 },
  seconds: 28,
  playingSeconds: 25,
  basis: 'playing',
  frames: summarizeFrames(Array(1500).fill(16.7), 25),
  long: summarizeLong([], 25),
  loaf: null,
  marks: null,
  queue: null,
  notes: { played: 400, late: 0, dropped: 0, worstLateMs: 3 },
  loadScale: { mean: 1, max: 1 },
  audio: {
    state: 'running',
    sampleRate: 48000,
    baseLatencyMs: 21,
    outputLatencyMs: 280,
    clockRatio: 1,
    tuning: 'playback, look-ahead default',
    heardLatencyMs: 280,
    pictureLagMs: null,
    capacity: { updates: 25, meanLoad: 0.3, peakLoad: 0.5, underrunRatioMean: 0, underrunRatioMax: 0 },
    playout: null,
    ...audio,
  },
  heapMB: 50,
  ...over,
});

const results = (bad: string | null = null): RunResult[] =>
  planSteps({ seconds: 25, settings: SETTINGS, pieces: PIECES }).map(({ piece, setting }) => ({
    piece: piece.label,
    setting,
    data:
      setting.id === bad
        ? data({ notes: { played: 400, late: 5, dropped: 2, worstLateMs: 80 } }, { heardLatencyMs: 40 })
        : data({}, { heardLatencyMs: ({ playback: 280, balanced: 90, interactive: 50 } as Record<string, number>)[setting.id] ?? 40 }),
  }));

describe('the scenario', () => {
  it('plans every piece under each setting, a setting at a time', () => {
    const steps = planSteps({ seconds: 25, settings: SETTINGS, pieces: PIECES });
    expect(steps).toHaveLength(SETTINGS.length * PIECES.length);
    expect(steps.slice(0, PIECES.length).every((s) => s.setting.id === 'playback')).toBe(true);
    expect(estimateMinutes({ seconds: 25, settings: SETTINGS, pieces: PIECES })).toBe(8);
  });
  it('the address can shorten it for trying out; anything unusable falls back to the defaults', () => {
    const o = parseRunOptions('?perf&runseconds=5&runsettings=balanced&runpieces=testtones');
    expect([o.seconds, o.settings.map((s) => s.id), o.pieces.map((p) => p.key)]).toEqual([5, ['balanced'], ['testtones']]);
    const d = parseRunOptions('?runseconds=1&runsettings=nonsense&runpieces=');
    expect([d.seconds, d.settings.length, d.pieces.length]).toEqual([25, SETTINGS.length, PIECES.length]);
  });
});

describe('running it', () => {
  const fake = (state = 'running') => {
    const log: string[] = [];
    let t = 0;
    const ctl: RunController = {
      open: async (k) => (log.push(`open ${k}`), k !== 'missing'),
      retune: async (x) => void log.push(`retune ${x.latencyHint}`),
      play: async () => void log.push('play'),
      stop: () => void log.push('stop'),
      audioState: () => state,
      hidden: () => false,
      finish: async () => void log.push('finish'),
    };
    const rec = { now: () => t, report: () => data() };
    const io = { wait: async (ms: number) => void (t += ms), onProgress: () => {}, cancelled: () => false };
    return { log, ctl, rec, io };
  };
  const two = planSteps({ seconds: 4, settings: SETTINGS.slice(0, 2), pieces: PIECES.slice(0, 2) });

  it('retunes once per setting, plays each piece for the time, and puts the page back', async () => {
    const { log, ctl, rec, io } = fake();
    const out = await runScenario(two, { seconds: 4 }, ctl, rec, io);
    expect(out.results).toHaveLength(4);
    expect(out.stoppedBecause).toBeNull();
    expect(log.filter((l) => l.startsWith('retune'))).toEqual(['retune playback', 'retune balanced']);
    expect(log.filter((l) => l === 'play')).toHaveLength(4);
    expect(log[log.length - 1]).toBe('finish');
  });
  it('stops, and says why, when the browser will not start the new context', async () => {
    const { log, ctl, rec, io } = fake('suspended');
    const out = await runScenario(two, { seconds: 4 }, ctl, rec, io);
    expect(out.results).toHaveLength(1);
    expect(out.results[0].problem).toMatch(/did not start/);
    expect(out.stoppedBecause).toMatch(/tap/);
    expect(log[log.length - 1]).toBe('finish');
  });
  it('cancelling keeps what has run', async () => {
    const { ctl, rec, io } = fake();
    let steps = 0;
    const out = await runScenario(two, { seconds: 4 }, ctl, { ...rec, report: () => (steps++, data()) }, { ...io, cancelled: () => steps >= 2 });
    expect(out.results).toHaveLength(2);
    expect(out.stoppedBecause).toBe('cancelled');
  });
  it('a piece that will not open is noted and the series goes on', async () => {
    const { ctl, rec, io } = fake();
    const out = await runScenario([{ piece: { key: 'missing', label: 'Missing' }, setting: SETTINGS[0] }, two[0]], { seconds: 4 }, ctl, rec, io);
    expect(out.results.map((r) => !!r.data)).toEqual([false, true]);
  });
});

describe('the combined report', () => {
  it('finds nothing wrong in a clean run, and names late and left-out notes', () => {
    expect(audioProblems(data())).toEqual([]);
    expect(audioProblems(data({ notes: { played: 10, late: 3, dropped: 1, worstLateMs: 80 } }))).toEqual(['1 note(s) left out', 'notes up to 80 ms late']);
    expect(audioProblems(data({}, { capacity: { updates: 5, meanLoad: 0.5, peakLoad: 1, underrunRatioMean: 0.01, underrunRatioMax: 0.05 } }))[0]).toMatch(/missed deadlines/);
    expect(audioProblems(data({}, { clockRatio: 0.9 }))[0]).toMatch(/clock slow/);
  });
  it('recommends the lowest setting that held on every piece', () => {
    const md = combinedReport({ results: results('interactive-la100'), stoppedBecause: null }, { seconds: 25, settings: SETTINGS, pieces: PIECES });
    expect(md).toContain('Lowest setting that stayed clean on every piece: **interactive**');
    expect(md).toContain('interactive, look-ahead 0.1 s: not clean');
    expect(md).toContain('✗ 2 note(s) left out');
  });
  it('says when nothing held, or the series was cut short', () => {
    const none = combinedReport({ results: [], stoppedBecause: 'cancelled' }, { seconds: 25, settings: SETTINGS, pieces: PIECES });
    expect(none).toContain('Stopped early: cancelled');
    expect(none).toContain('No setting stayed clean');
  });
  it('a setting with a doubtful run is not called clean', () => {
    const r = results().map((x) => (x.setting.id === 'balanced' && x.piece === 'Bach 847' ? { ...x, problem: 'the page was in the background' } : x));
    const s = summarizeSettings(r, SETTINGS);
    expect(s.find((x) => x.setting.id === 'balanced')!.clean).toBe(false);
    expect(s.find((x) => x.setting.id === 'interactive')!.clean).toBe(true);
  });
  it('stays small enough for an issue comment', () => {
    const md = combinedReport({ results: results(), stoppedBecause: null }, { seconds: 25, settings: SETTINGS, pieces: PIECES });
    expect(md.length).toBeLessThan(20000);
    expect(md).toContain('| Hypercell | playback (the old default) |');
  });
});
