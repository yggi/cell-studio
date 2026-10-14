/**
 * The time view's pictures as pixels (ui/TimeView.svelte): the scalogram (each row against its mean, on a ramp or as
 * the three signals' colours added), the waterfall (each band in its voice's colour, as bright as it is loud), the
 * notes when there are too many to draw one by one, and the waveform's columns. RGBA buffers, row by row from the
 * top, for the component to put in an ImageData; the colours come in (ui/theme.ts `TIME`). Pure: no DOM.
 */
import type { Played } from '@yggi/cells/engine/realize';
import type { Signal } from '@yggi/cells/engine/time/signals';
import { MIXED, type Listening } from './timelayers';
import { tOf, xOf, yOf, type Frame } from './timeview';

type Rgb = readonly [number, number, number];
/** A picture: `width` × `height` RGBA pixels, row by row from the top. */
export interface Pixels {
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  readonly width: number;
  readonly height: number;
}

/** A colour on the ramp `stops` for t in [0, 1]; not heard clearly (not finite), black. */
export function ramp(t: number, stops: readonly Rgb[]): Rgb {
  if (!Number.isFinite(t)) return [0, 0, 0];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const [a, b] = [stops[i] ?? [0, 0, 0], stops[i + 1] ?? [0, 0, 0]];
  return [Math.round(a[0] + (b[0] - a[0]) * f), Math.round(a[1] + (b[1] - a[1]) * f), Math.round(a[2] + (b[2] - a[2]) * f)];
}

/** Each row against its mean (dB), as the probe does: where a level is louder than usual. A moment not heard clearly
 * (NaN: folded, and no round clear of the window's edges) stays NaN, and is drawn dark. */
export const relative = (rows: readonly Float32Array[]): Float32Array[] =>
  rows.map((r) => {
    let acc = 0;
    let n = 0;
    for (const v of r)
      if (Number.isFinite(v)) {
        acc += v;
        n++;
      }
    const mean = acc / (n || 1) || 1;
    return r.map((v) => (Number.isFinite(v) ? 10 * Math.log10(Math.max(1e-30, v / mean)) : NaN));
  });

/** The scalogram's picture, a row a period (the fastest at the top), a column a moment: one signal on the ramp, ±10 dB
 * about its mean; the mix, each of the three signals' colours as loud as it is above its mean (to 10 dB), added. Null
 * when there is nothing to show. */
export function scalogramPixels(
  scal: { readonly periods: readonly number[]; readonly rows: Partial<Record<Signal, readonly Float32Array[]>> },
  mode: Listening,
  colours: { readonly ramp: readonly Rgb[]; readonly mix: Readonly<Record<(typeof MIXED)[number], Rgb>> },
): Pixels | null {
  const chosen: readonly Signal[] = mode === 'mix' ? MIXED : [mode];
  const dbs = chosen.map((s) => relative(scal.rows[s] ?? []));
  const height = scal.periods.length;
  const width = dbs[0]?.[0]?.length ?? 0;
  if (!height || !width) return null;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < height; i++)
    for (let c = 0; c < width; c++) {
      const k = (i * width + c) * 4;
      let rgb: readonly number[];
      if (mode === 'mix') {
        const acc = [0, 0, 0];
        MIXED.forEach((s, j) => {
          const t = Math.max(0, Math.min(1, (dbs[j]?.[i]?.[c] ?? NaN) / 10));
          for (let ch = 0; ch < 3; ch++) acc[ch] = (acc[ch] ?? 0) + (colours.mix[s][ch] ?? 0) * t;
        });
        rgb = acc;
      } else rgb = ramp(0.5 + (dbs[0]?.[i]?.[c] ?? NaN) / 20, colours.ramp);
      data[k] = Math.min(255, rgb[0] ?? 0);
      data[k + 1] = Math.min(255, rgb[1] ?? 0);
      data[k + 2] = Math.min(255, rgb[2] ?? 0);
      data[k + 3] = 255;
    }
  return { data, width, height };
}

/** The waterfall's picture, a row a band (the lowest at the bottom), a column a moment: each band in the colour of
 * whose it is (`owner`: an index in `colours`, 0 no note's), as bright as it is loud (70 dB below the loudest: dark). */
export function waterfallPixels(
  fall: { readonly freqs: readonly number[]; readonly times: readonly number[]; readonly rows: readonly Float32Array[]; readonly owner: Uint8Array },
  colours: readonly Rgb[],
  unowned: Rgb,
): Pixels {
  const bands = fall.freqs.length;
  const cols = fall.times.length;
  let top = -Infinity;
  for (const r of fall.rows) for (const v of r) top = Math.max(top, v);
  const data = new Uint8ClampedArray(cols * bands * 4);
  for (let b = 0; b < bands; b++)
    for (let c = 0; c < cols; c++) {
      const level = Math.max(0, Math.min(1, 1 + ((fall.rows[b]?.[c] ?? NaN) - top) / 70)) ** 1.5;
      const rgb = colours[fall.owner[b * cols + c] ?? -1] ?? unowned;
      const k = ((bands - 1 - b) * cols + c) * 4;
      data[k] = rgb[0] * level;
      data[k + 1] = rgb[1] * level;
      data[k + 2] = rgb[2] * level;
      data[k + 3] = 255;
    }
  return { data, width: cols, height: bands };
}

/** The notes `ns[from]` to `ns[to]` as pixels over the frame (`width` × `height`): each a bar `semi` px high at its
 * pitch, from its start to its end, in its voice's colour (for a day's piece zoomed out: too many to draw one by one). */
export function notePixels(
  ns: readonly Pick<Played, 'at' | 'dur' | 'freq' | 'voice'>[],
  from: number,
  to: number,
  f: Frame,
  width: number,
  height: number,
  semi: number,
  colour: (voice: string) => Rgb,
): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  const half = Math.max(1, Math.round(semi / 2));
  for (let i = from; i < to; i++) {
    const e = ns[i];
    if (!e || e.at + e.dur < f.from || !(e.freq > 0)) continue;
    const rgb = colour(e.voice);
    const x0 = Math.max(0, Math.floor(xOf(f, e.at)));
    const x1 = Math.min(width - 1, Math.max(x0, Math.floor(xOf(f, e.at + e.dur))));
    const y = Math.round(yOf(f, e.freq));
    for (let y1 = Math.max(0, y - half); y1 <= Math.min(height - 1, y + half - 1); y1++)
      for (let x = x0; x <= x1; x++) {
        const k = (y1 * width + x) * 4;
        data[k] = rgb[0];
        data[k + 1] = rgb[1];
        data[k + 2] = rgb[2];
        data[k + 3] = 255;
      }
  }
  return { data, width, height };
}

/** The waveform a pixel column at a time across the frame, as far as it was rendered (`done` s): the lowest and the
 * highest of its peaks (`peaks`: low, high pairs, `per` a second) in each column. */
export function waveColumns(f: Frame, peaks: Float32Array, done: number, per: number): { x: number; lo: number; hi: number }[] {
  const out: { x: number; lo: number; hi: number }[] = [];
  for (let x = 0; x < f.width; x++) {
    const a = Math.floor(tOf(f, x) * per);
    const b = Math.max(a + 1, Math.floor(tOf(f, x + 1) * per));
    if (a >= done * per) break;
    let lo = 0;
    let hi = 0;
    for (let k = a; k < b && 2 * k + 1 < peaks.length; k++) {
      lo = Math.min(lo, peaks[2 * k] ?? 0);
      hi = Math.max(hi, peaks[2 * k + 1] ?? 0);
    }
    out.push({ x, lo, hi });
  }
  return out;
}
