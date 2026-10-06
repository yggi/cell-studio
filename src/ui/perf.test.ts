import { describe, expect, it } from 'vitest';
import { buildReport, percentile, summarizeFrames, summarizeLong, summarizeLoaf, summarizeMarks, verdict, type ReportData } from './perf';

const base = (over: Partial<ReportData> = {}): ReportData => ({
  version: '0.9.0 (abc1234)',
  when: '2026-10-06T12:00:00.000Z',
  device: { userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/141', mobile: true, cores: 8, memoryGB: 4, pixelRatio: 2.6, viewport: '412×800', screen: '412×915' },
  piece: { title: 'Hypercell', graphNodes: 60, cells: 80 },
  seconds: 30,
  playingSeconds: 25,
  basis: 'playing',
  frames: summarizeFrames(Array(1500).fill(16.7), 25),
  long: summarizeLong([60, 80], 25),
  loaf: null,
  marks: null,
  queue: null,
  notes: null,
  loadScale: { mean: 1.2, max: 2 },
  audio: {
    state: 'running',
    sampleRate: 48000,
    baseLatencyMs: 10,
    outputLatencyMs: 40,
    clockRatio: 1,
    tuning: null,
    heardLatencyMs: null,
    pictureLagMs: null,
    capacity: null,
    playout: { events: 0, seconds: 0, averageLatencyMs: 40, maximumLatencyMs: 60 },
  },
  heapMB: 55,
  ...over,
});

describe('summaries', () => {
  it('percentile picks from the sorted values', () => {
    expect(percentile([], 50)).toBe(0);
    expect(percentile([1, 2, 3, 4], 50)).toBe(2);
    expect(percentile([1, 2, 3, 4], 95)).toBe(4);
    expect(percentile([5], 99)).toBe(5);
  });
  it('frames: rate, median, p95, hitches', () => {
    const f = summarizeFrames([16, 16, 16, 16, 16, 16, 16, 16, 60, 120], 1);
    expect(f.frames).toBe(10);
    expect(f.fps).toBe(10);
    expect(f.medianMs).toBe(16);
    expect(f.maxMs).toBe(120);
    expect(f.over50).toBe(2);
    expect(f.over100).toBe(1);
    expect(summarizeFrames([], 0)).toMatchObject({ frames: 0, fps: 0, maxMs: 0 });
  });
  it('long tasks: count, longest, blocked share', () => {
    const l = summarizeLong([100, 200], 10);
    expect(l).toMatchObject({ count: 2, maxMs: 200, over100: 1 });
    expect(l.blockedPct).toBeCloseTo(3);
    expect(summarizeLong([], 10)).toMatchObject({ count: 0, maxMs: 0, blockedPct: 0 });
  });
  it('long animation frames: by invoker, most expensive first', () => {
    const s = summarizeLoaf([
      { duration: 100, blocking: 50, invokers: ['frame-callback', 'promise-resolve'] },
      { duration: 60, blocking: 10, invokers: ['promise-resolve'] },
      { duration: 20, blocking: 0, invokers: [] },
    ]);
    expect(s.count).toBe(3);
    expect(s.totalMs).toBe(180);
    expect(s.blockingMs).toBe(60);
    expect(s.byInvoker[0]).toEqual(['promise-resolve', 2, 110]);
    expect(s.byInvoker.map((x) => x[0])).toContain('(none)');
  });
});

describe('marks', () => {
  it('sums our own timed work by name, most expensive first', () => {
    const m = summarizeMarks([
      { name: 'wheel', d: 2 },
      { name: 'wheel', d: 4 },
      { name: 'scope', d: 10 },
      { name: 'wheel', d: 6 },
    ]);
    expect(m.map((x) => x.name)).toEqual(['wheel', 'scope']);
    expect(m[0]).toMatchObject({ count: 3, totalMs: 12, meanMs: 4, maxMs: 6 });
    expect(summarizeMarks([])).toEqual([]);
  });
});

describe('latency and the audio thread', () => {
  const audio = (over: object) => ({
    state: 'running',
    sampleRate: 48000,
    baseLatencyMs: 21,
    outputLatencyMs: 280,
    clockRatio: 1,
    tuning: 'playback, look-ahead default',
    heardLatencyMs: 262.5,
    pictureLagMs: 262.5,
    capacity: null,
    playout: null,
    ...over,
  });
  it('reports the tuning, the heard latency and the audio thread', () => {
    const md = buildReport(base({ audio: audio({ capacity: { updates: 40, meanLoad: 0.31, peakLoad: 0.55, underrunRatioMean: 0, underrunRatioMax: 0 } }) }));
    expect(md).toMatch(/Latency tuning \| playback, look-ahead default · made-to-heard \(output timestamp\) 262\.5 ms · pictures held back 263 ms/);
    expect(md).toMatch(/Audio thread \(renderCapacity\) \| load mean 31 %, peak 55 % · missed deadlines: mean 0\.0 %, worst second 0\.0 % \(40 s\)/);
  });
  it('says when the audio thread missed deadlines, or peaked high', () => {
    expect(verdict(base({ audio: audio({ capacity: { updates: 10, meanLoad: 0.5, peakLoad: 0.9, underrunRatioMean: 0.01, underrunRatioMax: 0.05 } }) })).join('\n')).toMatch(
      /missed deadlines \(up to 5\.0 % of blocks/,
    );
    expect(verdict(base({ audio: audio({ capacity: { updates: 10, meanLoad: 0.5, peakLoad: 0.9, underrunRatioMean: 0, underrunRatioMax: 0 } }) })).join('\n')).toMatch(
      /peaked at 90 % load/,
    );
  });
});

describe('verdict', () => {
  it('names late and dropped notes, a slow main thread, long frames and a low frame rate', () => {
    const v = verdict(
      base({
        notes: { played: 400, late: 5, dropped: 2, worstLateMs: 80 },
        queue: { medianMs: 2, p95Ms: 70, maxMs: 120 },
        loaf: summarizeLoaf(Array.from({ length: 40 }, () => ({ duration: 60, blocking: 0, invokers: ['user-callback'] }))),
        frames: summarizeFrames(Array(800).fill(25), 20),
      }),
    ).join('\n');
    expect(v).toMatch(/2 note\(s\) were left out/);
    expect(v).toMatch(/waited up to 120 ms/);
    expect(v).toMatch(/Frames longer than 50 ms took 10 % of the time \(40 of them\)/);
    expect(v).toMatch(/Only 40 frames a second/);
  });
  it('says a few late notes are only late, not lost', () => {
    expect(verdict(base({ notes: { played: 100, late: 3, dropped: 0, worstLateMs: 20 } })).join('\n')).toMatch(/3 note\(s\) started a little late/);
  });
  it('says plainly when nothing is over the targets', () => {
    expect(verdict(base({ long: summarizeLong([], 25) }))).toEqual(['No audio underruns reported.']);
  });
  it('names underruns, a starved audio clock, long stalls and a page that is behind', () => {
    const v = verdict(
      base({
        long: summarizeLong([300, 120], 1),
        audio: {
          state: 'running',
          sampleRate: 48000,
          baseLatencyMs: 10,
          outputLatencyMs: 40,
          clockRatio: 0.9,
          tuning: null,
          heardLatencyMs: null,
          pictureLagMs: null,
          capacity: null,
          playout: { events: 3, seconds: 0.02, averageLatencyMs: 40, maximumLatencyMs: 90 },
        },
        loadScale: { mean: 2.5, max: 4 },
        frames: summarizeFrames(Array(200).fill(60), 20),
      }),
    ).join('\n');
    expect(v).toMatch(/underran 3 time/);
    expect(v).toMatch(/audio clock ran slow/);
    expect(v).toMatch(/longest main-thread stall was 300 ms/);
    expect(v).toMatch(/inside long tasks/);
    expect(v).toMatch(/Only 10 frames/);
    expect(v).toMatch(/2\.5× slower/);
  });
  it('asks for a longer window when it was barely playing', () => {
    expect(verdict(base({ playingSeconds: 1, basis: 'all' }))[0]).toMatch(/Too little steady playback/);
  });
});

describe('buildReport', () => {
  it('is markdown with the numbers, the verdict and the data as JSON', () => {
    const r = base({ loaf: summarizeLoaf([{ duration: 100, blocking: 40, invokers: ['frame-callback'] }]) });
    const md = buildReport(r);
    expect(md).toContain('### Performance report — Hypercell');
    expect(md).toContain('Cell studio 0.9.0 (abc1234)');
    expect(md).toContain('mobile · 8 cores · 4 GB');
    expect(md).toMatch(/\| Frames \| 60\.0 fps/);
    expect(md).toMatch(/Long tasks \(> 50 ms\) \| 2 · longest 80 ms/);
    expect(md).toMatch(/Long animation frames \| 1 · 100 ms in all, 40 ms blocking · frame-callback ×1/);
    expect(md).toMatch(/Audio underruns \| 0 \(0\.0 ms\)/);
    const json = md.split('```json\n')[1].split('\n```')[0];
    expect(JSON.parse(json).piece.title).toBe('Hypercell');
  });
  it('lists our own timed work, the responsiveness and the notes', () => {
    const md = buildReport(
      base({
        marks: summarizeMarks([
          { name: 'wheel', d: 5 },
          { name: 'wheel', d: 7 },
        ]),
        queue: { medianMs: 1, p95Ms: 4, maxMs: 30 },
        notes: { played: 500, late: 2, dropped: 0, worstLateMs: 12 },
      }),
    );
    expect(md).toMatch(/\| wheel \| 2 \| 12 ms \| 0\.0 % \| 6\.0 ms \| 7\.0 ms \| 7\.0 ms \|/);
    expect(md).toMatch(/Main-thread responsiveness \| a task waited median 1\.0 ms, p95 4\.0 ms, max 30 ms/);
    expect(md).toMatch(/Notes \| 500 scheduled · 2 started late · 0 left out/);
  });
  it('says when the browser reports no underruns or no piece is open', () => {
    const md = buildReport(
      base({
        piece: { title: null, graphNodes: null, cells: null },
        audio: {
          state: null,
          sampleRate: null,
          baseLatencyMs: null,
          outputLatencyMs: null,
          clockRatio: null,
          tuning: null,
          heardLatencyMs: null,
          pictureLagMs: null,
          capacity: null,
          playout: null,
        },
        heapMB: null,
      }),
    );
    expect(md).toContain('(no piece open)');
    expect(md).toContain('not reported by this browser');
    expect(md).toContain('not started');
    expect(md).not.toContain('JS heap');
  });
});
