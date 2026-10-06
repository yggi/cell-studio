/**
 * Parser for the cell language. One cell or command per line:
 *
 *   cell     := REF item*                         (REF here: a name, &theme)
 *   item     := 'over=' (REF | 'scale(' INT ',' INT ')') | 'shift=' INT | 'cycle=' INT | ('step=' | 'loop=') STEP | 'stride=' INT
 *             | 'map=' (MAP | REF) | 'off' | KEY '=' VALUE | generator | token
 *               KEY and VALUE: every attribute is in attributes.ts (what it takes, what it acts on)
 *   STEP     := (REF | 'cycle(' REF ')') (('*' | '/') NUM)*   driven by another cell (*2/3: three per two)
 *             | NUM ('bpm' | 'hz' | 'k')?                     a rate per second
 *             | ENV                                          provided by the environment: SAMPLE_RATE, A4, C#3, Bb2 …
 *   generator:= 'scan(' (NUM ('!' INT)? | 'geo(' NUM ',' INT ',' NUM+ ')')+ ')' | 'sin(' INT ')' | 'euclid(' INT ',' INT (',' INT)? ')'
 *             | 'meter(' … ')' | 'spell(' … ')'
 *               scan: running totals of intervals (scales, meters); geo(r, n, k…): intervals r^(k/n)
 *   token    := atom (('!' | '*' | '@') INT)*     each modifier at most once
 *   atom     := REF | '~' | NUM | '[' NUM (','? NUM)* ']' | '[' EXPR (',' EXPR)* ']'    the last: a mix
 *   REF      := '&' (IDENT | '(' item* ')') ('[' INT ']' | '[' INT? ':' INT? (':' INT?)? ']' | '[' INT? ':' INT? ']' | '[' ('<<' | '>>') INT? ']')?
 *               a pick from the braid as written: &x[0] first, &x[-1] last, &x[-1:], &x[:-1]
 *               or a shift: &x[<<] back one, &x[>>2] forward two (relative, climbing the helix);
 *               then, in a braid, ^n: what it plays n grid steps up (&subject^7, &subject^-12)
 *   NUM      := '-'? (DIGITS ('.' DIGITS)? | '.' DIGITS) ('#' | 'b')*
 *   EXPR     := PRODUCT (('+' | '-') PRODUCT)*        inside a mix chord
 *   PRODUCT  := FACTOR ('*' FACTOR)*
 *   FACTOR   := REF | NUM | '(' EXPR ')'
 * A line ending in '+', '*', ',' or '[' continues on the next line.
 *
 * Comments: `//` anywhere, or `#` at the start of a line or after a space
 * (a `#` glued to a number is a sharp). Errors are collected per line.
 */
import type { CellDecl, Diagnostic, ParseResult } from '../ast';
import { IDENT, LineError, LineScanner, stripComment } from './scanner';
import { parseCell } from './cell';

export { TEMPI } from './free';
export { bjorklund, meterLevels } from './generators';

export function parse(source: string): ParseResult {
  const cells: CellDecl[] = [];
  const diagnostics: Diagnostic[] = [];
  // a line ending in + * , or [ (outside comments) continues on the next one
  const lines: { text: string; line: number; parts: { line: number; start: number }[] }[] = [];
  let carry: { text: string; line: number; parts: { line: number; start: number }[] } | null = null;
  source.split('\n').forEach((raw, idx) => {
    const text = stripComment(raw);
    if (carry) {
      carry.text += ' ';
      carry.parts.push({ line: idx + 1, start: carry.text.length });
      carry.text += text;
    } else carry = { text, line: idx + 1, parts: [{ line: idx + 1, start: 0 }] };
    if (!/[+*,[]\s*$/.test(carry.text)) {
      lines.push(carry);
      carry = null;
    }
  });
  if (carry) lines.push(carry);
  lines.forEach(({ text, line: lineNo, parts }) => {
    const s: LineScanner = new LineScanner(text, lineNo, 0, [], parts, diagnostics);
    if (s.done()) return;
    try {
      const start = s.i;
      const word = s.match(IDENT);
      if (word === 'step' && s.peek() === '(') s.fail('step(…) is now a rate on the meter: &meter scan(27 23 26 24) step=84bpm', start, 4);
      else if (word === 'out' && /^\s*[(=]/.test(s.text.slice(s.i)))
        s.fail('out is a cell now: &mix [&theme * &lead, …] and &out loop=SAMPLE_RATE map=sample &mix &mix', start, 3);
      else if (word === 'cell') s.fail('The cell keyword is gone: a line starting with &name declares a cell', start, 4);
      else if (word === null) {
        s.i = start;
        const decl = parseCell(s);
        cells.push(decl, ...s.lambdas);
      } else s.fail(`A line declares a cell: &name …`, start, word.length);
    } catch (e) {
      if (!(e instanceof LineError)) throw e;
      diagnostics.push({ severity: 'error', message: e.message, span: { line: lineNo, col: e.col + 1, len: e.len } });
    }
  });
  return { cells, diagnostics };
}


/** A piece's card: the first note with a title= — its title, its description (the label, as plain text), its tags. */
export interface PieceMeta {
  readonly title: string;
  readonly description: string;
  readonly tags: readonly string[];
  /** The note it's on. */
  readonly cell: string;
}

export function pieceMeta(source: string): PieceMeta | null {
  const d = parse(source).cells.find((c) => c.title);
  if (!d) return null;
  const plain = (d.label ?? '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const tags = (d.tags ?? '')
    .split(',')
    .map((t) => t.trim()) // (as written: names keep their capitals — Bach, Wendy Carlos)
    .filter(Boolean)
    // (once each, whatever the case: the first spelling stays)
    .filter((t, i, all) => all.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i);
  // (a description that opens with the title doesn't need to say it twice)
  const description = plain.toLowerCase().startsWith(d.title!.toLowerCase()) ? plain.slice(d.title!.length).replace(/^[\s,.:;—–-]+/, '') : plain;
  return { title: d.title!, description, tags: [...new Set(tags)], cell: d.name };
}
