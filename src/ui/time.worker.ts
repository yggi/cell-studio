/**
 * The time view's heavy arithmetic, off the main thread (a day's piece takes a minute): a piece's notes into their
 * scalograms (engine/time/signals.ts), and rendered sound into a waterfall (engine/time/spectrogram.ts), each band
 * told whose it is from the notes. One job at a time; the view ends a worker whose answer it no longer wants and
 * starts another.
 */
import { grid } from '@yggi/cells/engine/time/wavelet';
import { scalograms, type Onset, type Signal } from '@yggi/cells/engine/time/signals';
import { owners, waterfall, type Sounding } from '@yggi/cells/engine/time/spectrogram';

export type TimeJob =
  | { readonly kind: 'scalogram'; readonly window: number; readonly events: readonly Onset[]; readonly signals: readonly Signal[]; readonly periodic?: boolean }
  | { readonly kind: 'waterfall'; readonly samples: Float32Array; readonly rate: number; readonly notes: readonly Sounding[]; readonly voices: readonly string[] };

export type TimeAnswer =
  | { readonly kind: 'scalogram'; readonly window: number; readonly periods: readonly number[]; readonly rows: Partial<Record<Signal, Float32Array[]>> }
  | { readonly kind: 'waterfall'; readonly freqs: readonly number[]; readonly times: readonly number[]; readonly rows: Float32Array[]; readonly owner: Uint8Array };

self.onmessage = (e: MessageEvent<TimeJob>) => {
  const job = e.data;
  if (job.kind === 'scalogram') {
    // (a loop goes round: transformed circularly, no edges)
    const g = grid(job.window, undefined, job.periodic);
    const ss = scalograms(job.events, g, job.signals);
    const rows: Partial<Record<Signal, Float32Array[]>> = {};
    for (const [k, s] of Object.entries(ss)) rows[k as Signal] = [...s!.rows];
    const answer: TimeAnswer = { kind: 'scalogram', window: job.window, periods: g.periods, rows };
    postMessage(answer, { transfer: Object.values(rows).flatMap((rs) => rs!.map((r) => r.buffer)) });
  } else {
    const w = waterfall(job.samples, job.rate, { frames: Math.min(4096, Math.max(64, Math.round((job.samples.length / job.rate) * 20))) });
    // (whose each band is, as far as the notes say: the waterfall coloured by voice)
    const owner = owners(w, job.notes, job.voices);
    const answer: TimeAnswer = { kind: 'waterfall', freqs: w.freqs, times: w.times, rows: [...w.rows], owner };
    postMessage(answer, { transfer: [...w.rows.map((r) => r.buffer), owner.buffer] });
  }
};
