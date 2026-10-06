/** The values with a syntax of their own: step= and loop= (rates, clocks, chains), map= (kinds, grids, tables). */
import type { MapSpec, StepSpec } from '../ast';
import type { LineScanner } from './scanner';
import { parseFree } from './free';

export function parseStep(s: LineScanner, whole: boolean): StepSpec {
  const start = s.i;
  if (s.text.startsWith('free(', s.i)) {
    const f = parseFree(s, whole ? 'loop' : 'step', true);
    const perSecond = (f.value * (f.unit === 'k' ? 1000 : 1)) / (f.unit === 'bpm' ? 60 : 1);
    if (!(perSecond > 0)) s.fail('A rate must be positive', start, s.i - start);
    return { whole, kind: 'rate', perSecond, span: s.span(start), free: f };
  }
  const rate = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
  if (rate !== null) {
    const unit = s.match(/bpm|hz|k/y);
    const perSecond = (parseFloat(rate) * (unit === 'k' ? 1000 : 1)) / (unit === 'bpm' ? 60 : 1);
    if (!(perSecond > 0)) s.fail('A rate must be positive', start, s.i - start);
    return { whole, kind: 'rate', perSecond, span: s.span(start) };
  }
  const env = s.match(/[A-Z](?:[A-Z0-9_]*|[#b]?-?[0-9]+)(?![A-Za-z0-9_#])/y);
  if (env !== null) return { whole, kind: 'env', name: env, span: s.span(start) };
  if (s.peek() === '{') s.fail('{&x} is now written cycle(&x)');
  const cycle = s.match(/cycle\(/y) !== null;
  const what = whole ? 'loop' : 'step';
  const driver = s.ref(cycle ? 'a cell inside cycle( ), like cycle(&theme)' : `a cell or a rate after ${what}=, like ${what}=&meter`);
  if (driver.pick || driver.shift) s.fail(`${what}= takes a whole cell`, driver.span.col - 1, driver.span.len);
  if (cycle) s.expect(')', `')' to close cycle(&${driver.name})`);
  // a chain of *n and /n, read left to right: *2 once per two steps, /2 twice per step, *2/3 three per two
  let ratio = 1;
  let label = '';
  while (s.peek() === '*' || s.peek() === '/') {
    const op = s.text[s.i++];
    const at = s.i;
    const n = s.match(/[0-9]+(?:\.[0-9]+)?|\.[0-9]+/y);
    if (n === null || !(parseFloat(n) > 0)) s.fail(`a positive number after ${op}`, at);
    ratio = op === '*' ? ratio / parseFloat(n) : ratio * parseFloat(n);
    label += `${op === '*' ? '×' : '÷'}${n}`;
  }
  return { whole, kind: 'driven', driver, cycle, ratio, label, span: s.span(start) };
}

export function parseMap(s: LineScanner): MapSpec {
  const start = s.i;
  if (s.peek() === '&') {
    const table = s.ref('a table cell, like map=&curve');
    if (table.pick || table.shift) s.fail('map= takes a whole table', table.span.col - 1, table.span.len);
    return { kind: 'table', table, span: s.span(start) };
  }
  if (s.match(/sin\b/y)) s.fail('map=sin is gone: write the sine as the braid, sin(12) — or map=&table', start, 3);
  // ed(r): equal divisions of a ratio — a number or a fraction, ed(5), ed(3/2)
  if (s.match(/ed\(/y)) {
    const at = s.i;
    const r = s.match(/[0-9]+(?:\.[0-9]+)?(?:\/[0-9]+(?:\.[0-9]+)?)?/y);
    const [a, b = '1'] = (r ?? '').split('/');
    const period = parseFloat(a) / parseFloat(b);
    if (r === null || !(period > 1)) s.fail('ed(r) divides a ratio above 1: ed(2) is the octave, ed(3/2) the fifth, ed(5)', at);
    s.expect(')', `')' to close ed(…)`);
    return { kind: 'edo', period, span: s.span(start) };
  }
  const w = s.match(/amp|lin|sample|edo|adsr|ratios|db/y);
  if (w === null) s.fail('map= takes amp, lin, db, adsr, sample, edo, ed(r), ratios or a table cell (&curve)');
  if (w === 'edo') return { kind: 'edo', period: 2, span: s.span(start) };
  return { kind: w as 'amp' | 'lin' | 'sample' | 'adsr' | 'ratios' | 'db', span: s.span(start) };
}
