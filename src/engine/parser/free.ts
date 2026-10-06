/** free(…): a number left to the performer — a slider, a tempo marking, named choices, a text. */
import type { FreeSpec } from '../ast';
import type { LineScanner } from './scanner';

/** Tempo markings for free(…): a range in bpm, centred. */
export const TEMPI: Readonly<Record<string, readonly [number, number]>> = {
  largo: [40, 60],
  larghetto: [60, 66],
  adagio: [66, 76],
  andante: [76, 108],
  moderato: [108, 120],
  allegro: [120, 156],
  vivace: [156, 176],
  presto: [168, 200],
};

/**
 * free(default, lo..hi) or free(marking) at the scanner (it's at 'free'):
 * the value, its range, and where it's written. `units`: what the value may
 * carry (a rate: bpm, hz, k).
 */
export function parseFree(s: LineScanner, key: FreeSpec['key'], units: boolean): FreeSpec {
  const start = s.i;
  if (s.match(/free\(/y) === null) s.fail('free(…)');
  s.skipSpace();
  // a text left free: free("867 5309") — a field to type in (for spell(…))
  if (s.peek() === '"') {
    const q = s.match(/"[^"]*"/y)!;
    s.skipSpace();
    s.expect(')', `')' to close free("…")`);
    const spec: FreeSpec = { key: 'text', value: 0, unit: '', lo: 0, hi: 0, span: s.place(start), text: q.slice(1, -1) };
    s.frees.push(spec);
    return spec;
  }
  const word = s.match(/[a-z]+/y);
  let value: number;
  let unit = '';
  let lo: number;
  let hi: number;
  if (word !== null) {
    const range = TEMPI[word];
    if (!range || key === 'shift' || key === 'stride' || key === 'gain')
      s.fail(`free(${word}): a tempo marking (${Object.keys(TEMPI).join(', ')}) — for a rate`, start, s.i - start);
    [lo, hi] = range;
    value = Math.round((lo + hi) / 2);
    unit = 'bpm';
  } else {
    const n = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
    if (n === null) s.fail('free(default, lo..hi), like free(90bpm, 60..240) or free(.8, 0..1)');
    value = parseFloat(n);
    if (units) unit = s.match(/bpm|hz|k/y) ?? '';
    s.skipSpace();
    s.expect(',', `',' then the range, like free(${n}${unit}, 60..240)`);
    s.skipSpace();
    const a = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
    if (s.match(/\.\./y) === null) s.fail('a range lo..hi, like 60..240');
    const b = s.match(/-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/y);
    if (a === null || b === null) s.fail('a range lo..hi, like 60..240');
    lo = parseFloat(a);
    hi = parseFloat(b);
    if (!(lo < hi)) s.fail(`free(…): the range runs low to high (${lo}..${hi})`, start, s.i - start);
    if (value < lo || value > hi) s.fail(`free(…): ${value} is outside ${lo}..${hi}`, start, s.i - start);
  }
  s.skipSpace();
  // named choices: free(5, 0..15, "1 2 3 A …") — the names spread evenly over the range, a keypad
  let labels: string[] | undefined;
  if (s.peek() === ',') {
    s.i++;
    s.skipSpace();
    const q = s.match(/"[^"]*"/y);
    if (q === null) s.fail('names for the choices, in quotes: free(0, 0..3, "a b c d")');
    labels = q!.slice(1, -1).trim().split(/\s+/).filter(Boolean);
    // the names spread evenly over the range: one per value, or every 2nd (chords of two in a table) …
    const gap = labels.length > 1 ? (hi - lo) / (labels.length - 1) : 0;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || labels.length < 2 || !Number.isInteger(gap) || gap < 1)
      s.fail(`free(…, "${labels.join(' ')}"): the names spread evenly over ${lo}..${hi} — ${labels.length} names need ${labels.length - 1} equal whole steps (${lo}..${lo + labels.length - 1}, or every 2nd: ${lo}..${lo + 2 * (labels.length - 1)})`, start, s.i - start);
    s.skipSpace();
  }
  s.expect(')', `')' to close free(…)`);
  const spec: FreeSpec = { key, value, unit, lo, hi, span: s.place(start), ...(labels ? { labels } : {}) };
  s.frees.push(spec);
  return spec;
}
