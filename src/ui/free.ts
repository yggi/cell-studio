import type { FreeSpec } from '../engine/ast';
import { ATTRIBUTES } from '../engine/attributes';

/**
 * A free(…) value in words, the same wherever it's shown (the pills on a node, the controls drawer,
 * a cell's sheet). `freeKey` is the short name (pills, drawer: "bpm: 90"); `freeLabel` the one
 * over a large control (the sheet: "tempo", "choose").
 */
export function freeKey(f: FreeSpec): string {
  switch (f.key) {
    case 'param':
      return f.param ?? 'value';
    case 'step':
    case 'loop':
      return f.unit === 'bpm' ? 'bpm' : f.key;
    case 'interval':
      // (a scan interval is a ratio between beats: 1 straight, 2 the triplet swing)
      return 'ratio';
    case 'gain':
      return 'level';
    default:
      return f.key;
  }
}

export function freeLabel(f: FreeSpec): string {
  if (f.key === 'choice') return 'choose';
  if ((f.key === 'step' || f.key === 'loop') && f.unit === 'bpm') return 'tempo';
  return freeKey(f);
}

/** A slider's step: whole numbers for shifts, strides and wide ranges; a hundredth of the range otherwise. */
export function freeStep(f: FreeSpec): number {
  return f.key === 'shift' || f.key === 'stride' || f.hi - f.lo >= 20 ? 1 : (f.hi - f.lo) / 100;
}

/** A number of it with its unit (wide ranges whole, narrow ones to two places): "90bpm", "0.25". */
export function freeAmount(f: FreeSpec, v: number = f.value): string {
  return `${+v.toFixed(f.hi - f.lo >= 20 ? 0 : 2)}${f.unit}`;
}

/** Its value now, short (beside `freeKey`, which already says bpm): a text, a named choice, or a number. */
export function freeValue(f: FreeSpec): string {
  if (f.key === 'text') return f.text ?? '';
  if (f.labels) {
    const step = f.labels.length > 1 ? (f.hi - f.lo) / (f.labels.length - 1) : 1;
    return f.labels[Math.round((f.value - f.lo) / (step || 1))] ?? String(f.value);
  }
  return f.unit === 'bpm' ? freeAmount({ ...f, unit: '' }) : freeAmount(f);
}

/**
 * How a control runs from lo to hi: `choice` a keypad's named choices, one each; `log` a frequency or a rate (a
 * setting in Hz, `attributes.ts`; a clock's step or loop not in bpm; a value written in hz) over a positive range of
 * three octaves or more (200..5000), so each turn of the hand multiplies it alike; `linear` everything else, in
 * `freeStep`s (tempo whole bpm, a `drive=` in hundredths). The slider and a MIDI knob both go through `freeAt` and
 * `freePosition`, so a knob is the slider.
 */
export function freeScale(f: FreeSpec): 'choice' | 'log' | 'linear' {
  if (f.labels) return 'choice';
  const rate = f.key === 'param' ? f.unit === 'hz' || !!(f.param && ATTRIBUTES[f.param]?.hz) : (f.key === 'step' || f.key === 'loop') && f.unit !== 'bpm';
  return rate && f.lo > 0 && f.hi / f.lo >= 8 ? 'log' : 'linear';
}

/** How many steps a slider takes from lo to hi: one per choice gap, one per `freeStep`, or a thousand along a log scale. */
export function freeSteps(f: FreeSpec): number {
  const scale = freeScale(f);
  if (scale === 'choice') return Math.max(1, f.labels!.length - 1);
  if (scale === 'log') return 1000;
  return Math.max(1, Math.ceil((f.hi - f.lo) / freeStep(f) - 1e-9));
}

// (a value as a slider leaves it: no 0.30000000000000004)
const clean = (v: number) => Math.round(v * 1e9) / 1e9;

/** The value at a place along the control (0 its start, 1 its end): both ends exactly lo and hi, steps between. */
export function freeAt(f: FreeSpec, t: number): number {
  const at = Math.min(1, Math.max(0, t));
  if (at <= 0) return f.lo;
  if (at >= 1) return f.hi;
  switch (freeScale(f)) {
    case 'choice': {
      // (the range in as many equal parts as there are choices: a knob's whole turn covers each alike)
      const n = f.labels!.length;
      return clean(f.lo + Math.min(n - 1, Math.floor(at * n)) * ((f.hi - f.lo) / Math.max(1, n - 1)));
    }
    case 'log': {
      const step = freeStep(f);
      const v = f.lo * (f.hi / f.lo) ** at;
      return clean(Math.min(f.hi, Math.max(f.lo, f.lo + Math.round((v - f.lo) / step) * step)));
    }
    default: {
      const step = freeStep(f);
      return clean(Math.min(f.hi, f.lo + Math.round((at * (f.hi - f.lo)) / step) * step));
    }
  }
}

/** Where a value sits along the control (0 its start, 1 its end): `freeAt`'s inverse (a choice at the middle of its part). */
export function freePosition(f: FreeSpec, v: number): number {
  if (f.hi === f.lo) return 0;
  const at = (x: number) => Math.min(1, Math.max(0, x));
  switch (freeScale(f)) {
    case 'choice': {
      const n = f.labels!.length;
      const i = Math.round((v - f.lo) / ((f.hi - f.lo) / Math.max(1, n - 1)));
      return at((Math.min(n - 1, Math.max(0, i)) + 0.5) / n);
    }
    case 'log':
      return at(Math.log(Math.max(f.lo, v) / f.lo) / Math.log(f.hi / f.lo));
    default:
      return at((v - f.lo) / (f.hi - f.lo));
  }
}
