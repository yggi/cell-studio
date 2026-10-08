import type { FreeSpec } from '../engine/ast';

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
  return f.key === 'shift' || f.key === 'stride' || f.key === 'tonic' || f.hi - f.lo >= 20 ? 1 : (f.hi - f.lo) / 100;
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
