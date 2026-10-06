/** A braid's steps: numbers, rests, chords, choices, cells (picked, shifted, transposed) and their modifiers. */
import type { Atom, Token } from '../ast';
import { MAX_REPS, type LineScanner } from './scanner';
import { isMixChord, parseMixChord } from './mix';

export function parseAtom(s: LineScanner): Atom {
  const c = s.peek();
  if (c === '&') {
    const r = s.ref('a cell like &motif');
    return { kind: 'ref', name: r.name, pick: r.pick, shift: r.shift, ...(r.transpose ? { transpose: r.transpose } : {}) };
  }
  if (c === '~') {
    s.i++;
    return { kind: 'rest' };
  }
  if (c === '[') {
    const start = s.i;
    if (isMixChord(s.text, s.i)) return parseMixChord(s);
    // [a|b|c]: one of them, each time round
    const close = s.text.indexOf(']', s.i);
    if (s.text.slice(s.i, close < 0 ? undefined : close).includes('|')) {
      s.i++;
      const values: number[] = [];
      const alters: number[] = [];
      for (;;) {
        s.skipSpace();
        const n = s.num('a number to choose from, like [0|4|7]');
        values.push(n.value);
        alters.push(n.alter);
        s.skipSpace();
        if (s.peek() === '|') {
          s.i++;
          continue;
        }
        if (s.peek() !== ']') s.fail(`A choice is numbers between bars, closed: [0|4|7]`, start, s.i - start + 1);
        s.i++;
        break;
      }
      if (values.length < 2) s.fail('A choice needs at least two: [0|4]', start, s.i - start);
      return { kind: 'choice', values, alters };
    }
    s.i++;
    const notes: number[] = [];
    const alters: number[] = [];
    for (;;) {
      s.skipSpace();
      if (s.peek() === ']') break;
      if (notes.length > 0 && s.peek() === ',') {
        s.i++;
        s.skipSpace();
      }
      const n = s.num('a number in chord');
      notes.push(n.value);
      alters.push(n.alter);
    }
    s.i++;
    if (notes.length === 0) s.fail('Chord is empty', start, s.i - start);
    return { kind: 'chord', notes, alters };
  }
  if (c === '-' || c === '.' || (c >= '0' && c <= '9')) {
    const n = s.num('a number');
    return { kind: 'note', value: n.value, alter: n.alter };
  }
  return s.fail(`Unexpected '${c}' — expected a number, ~, [chord], &cell or key=value`);
}

export const MODIFIERS = { '!': 'repeat', '*': 'subdivide', '@': 'elongate' } as const;
type ModKey = keyof typeof MODIFIERS;

export function parseToken(s: LineScanner): Token {
  const start = s.i;
  const atom = parseAtom(s);
  const mods = { repeat: 1, subdivide: 1, elongate: 1 };
  let chance: number | null | undefined;
  const seen = new Set<string>();
  while (s.peek() in MODIFIERS || s.peek() === '?') {
    if (s.peek() === '?') {
      // x?p: it sounds with probability p; x? alone: the cell's chance=
      if (chance !== undefined) s.fail(`'?' can only appear once per step`);
      s.i++;
      const at = s.i;
      const p = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
      chance = p === null ? null : parseFloat(p);
      if (p === null && /[0-9]/.test(s.peek() ?? '')) s.fail('A probability is from 0 to 1: x?.3', at, 1);
      continue;
    }
    const op = s.peek() as ModKey;
    if (seen.has(op)) s.fail(`'${op}' can only appear once per step`);
    seen.add(op);
    s.i++;
    const at = s.i;
    const n = s.int(`a count after ${op}`);
    if (n < 1 || n > MAX_REPS) s.fail(`Count must be between 1 and ${MAX_REPS}`, at, s.i - at);
    mods[MODIFIERS[op]] = n;
  }
  if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}' — separate steps with spaces`);
  return { atom, ...mods, ...(chance !== undefined ? { chance } : {}), span: s.span(start) };
}
