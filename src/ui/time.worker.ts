/**
 * The time view's heavy arithmetic, off the main thread (a day's piece takes a minute): a piece's notes into their
 * scalograms (engine/time/signals.ts), and rendered sound into a waterfall (engine/time/spectrogram.ts). One job at a
 * time; the view ends a worker whose answer it no longer wants and starts another.
 */
import { grid } from '../engine/time/wavelet';
import { scalograms, type Onset, type Signal } from '../engine/time/signals';
import { waterfall } from '../engine/time/spectrogram';

export type TimeJob =
  | { readonly kind: 'scalogram'; readonly window: number; readonly events: readonly Onset[]; readonly signals: readonly Signal[] }
  | { readonly kind: 'waterfall'; readonly samples: Float32Array; readonly rate: number };

export type TimeAnswer =
  | { readonly kind: 'scalogram'; readonly window: number; readonly periods: readonly number[]; readonly rows: Partial<Record<Signal, Float32Array[]>> }
  | { readonly kind: 'waterfall'; readonly freqs: readonly number[]; readonly times: readonly number[]; readonly rows: Float32Array[] };

self.onmessage = (e: MessageEvent<TimeJob>) => {
  const job = e.data;
  if (job.kind === 'scalogram') {
    const g = grid(job.window);
    const ss = scalograms(job.events, g, job.signals);
    const rows: Partial<Record<Signal, Float32Array[]>> = {};
    for (const [k, s] of Object.entries(ss)) rows[k as Signal] = [...s!.rows];
    const answer: TimeAnswer = { kind: 'scalogram', window: job.window, periods: g.periods, rows };
    postMessage(answer, { transfer: Object.values(rows).flatMap((rs) => rs!.map((r) => r.buffer)) });
  } else {
    const w = waterfall(job.samples, job.rate, { frames: Math.min(4096, Math.max(64, Math.round((job.samples.length / job.rate) * 20))) });
    const answer: TimeAnswer = { kind: 'waterfall', freqs: w.freqs, times: w.times, rows: [...w.rows] };
    postMessage(answer, { transfer: w.rows.map((r) => r.buffer) });
  }
};
