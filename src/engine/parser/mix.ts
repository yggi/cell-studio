/** A mix chord, `[&theme * &lead, …]`: sums and products of cells and numbers, kept as written (compile types them: algebra.ts). */
import type { Atom, Expr } from '../ast';
import { NUM, type LineScanner } from './scanner';
import { parseFree } from './free';

/** A chord holding cells (`[&theme * &lead, …]`) is a mix of sounds, not a chord of numbers. */
export function isMixChord(text: string, at: number): boolean {
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']' && --depth === 0) return false;
    else if (text[i] === '&') return true;
  }
  return false;
}

export function parseMixChord(s: LineScanner): Atom {
  s.i++; // [
  const exprs: Expr[] = [];
  for (;;) {
    exprs.push(parseExpr(s));
    s.skipSpace();
    if (s.peek() === ',') {
      s.i++;
      continue;
    }
    s.expect(']', `',' or ']' in the mix`);
    return { kind: 'mix', exprs };
  }
}


export function parseExpr(s: LineScanner): Expr {
  const start = s.i;
  const items: { e: Expr; sign: 1 | -1 }[] = [{ e: parseProduct(s), sign: 1 }];
  for (;;) {
    s.skipSpace();
    const op = s.peek();
    if (op !== '+' && op !== '-') break;
    s.i++;
    items.push({ e: parseProduct(s), sign: op === '-' ? -1 : 1 });
  }
  return items.length === 1 ? items[0].e : { k: 'sum', items, span: s.span(start) };
}

function parseProduct(s: LineScanner): Expr {
  s.skipSpace();
  const start = s.i;
  const factors: Expr[] = [parseFactor(s)];
  for (;;) {
    s.skipSpace();
    if (s.peek() !== '*') break;
    s.i++;
    factors.push(parseFactor(s));
  }
  return factors.length === 1 ? factors[0] : { k: 'prod', factors, span: s.span(start) };
}

function parseFactor(s: LineScanner): Expr {
  s.skipSpace();
  const start = s.i;
  if (s.peek() === '(') {
    s.i++;
    const e = parseExpr(s);
    s.skipSpace();
    s.expect(')', `')' to close the group`);
    return e;
  }
  if (s.peek() === '&') return { k: 'ref', ref: s.ref('a cell, like &theme') };
  if (s.text.startsWith('free(', s.i)) {
    const f = parseFree(s, 'gain', false);
    return { k: 'num', value: f.value, span: s.span(start) };
  }
  const n = s.match(NUM);
  if (n !== null) return { k: 'num', value: parseFloat(n), span: s.span(start) };
  if (s.match(/gate\(/y)) s.fail('gate(…) is planned but not built yet: for now a step= term articulates, loop= terms bend', start, 5);
  return s.fail(`Expected a cell, a number or '(' here`);
}
