/**
 * The code's tokens, for colouring the editor. A small scanner that follows the
 * language's own rules (a # starts a comment at a line's start or after a space;
 * quoted text is one piece), not the parser: it colours even code that doesn't parse.
 */
type Kind = 'comment' | 'string' | 'ref' | 'attr' | 'func' | 'note' | 'num' | 'rest' | 'mod' | 'word' | 'punct' | 'space';
export interface Token {
  readonly text: string;
  readonly kind: Kind;
}

const FUNCS = /^(scan|free|geo|sin|cycle|scale|ed|euclid)\(/;
const RULES: readonly [RegExp, Kind][] = [
  [/^"[^"]*"?/, 'string'],
  [/^\.\.(?=[0-9.-])/, 'punct'], // a range's .. (before numbers: .160 would otherwise swallow a dot)
  [/^&\(/, 'ref'],
  [/^&[A-Za-z_][A-Za-z0-9_]*/, 'ref'],
  [/^[a-z][A-Za-z]*(?==)/, 'attr'],
  [/^[A-G](?:#|b)?-?[0-9](?![0-9A-Za-z])/, 'note'],
  [/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:\/[0-9]+)?(?:bpm|hz)?(?:#|b)*/, 'num'],
  [/^~/, 'rest'],
  [/^(?:\^\$?|[@!*/])(?:-?[0-9]+(?:\.[0-9]+)?)?/, 'mod'], // x@2 x!3, a clock's *2 and /2, &x^1 and &x^$7
  [/^\?(?:[0-9]*\.?[0-9]+)?/, 'mod'], // x?p: a chance
  [/^[A-Za-z_][A-Za-z0-9_]*/, 'word'],
  [/^\s+/, 'space'],
];

/** One line's tokens (adjacent pieces of the same kind merged). */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  const push = (text: string, kind: Kind) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) out[out.length - 1] = { text: last.text + text, kind };
    else out.push({ text, kind });
  };
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);
    // a comment: # at the line's start or after a space, or //
    if ((rest[0] === '#' && (i === 0 || /\s/.test(line[i - 1]!))) || rest.startsWith('//')) {
      push(rest, 'comment');
      break;
    }
    const fn = FUNCS.exec(rest);
    if (fn) {
      push(fn[1]!, 'func');
      push('(', 'punct');
      i += fn[0].length;
      continue;
    }
    let matched = false;
    for (const [re, kind] of RULES) {
      const m = re.exec(rest);
      if (m && m[0].length) {
        push(m[0], kind);
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      push(rest[0]!, 'punct');
      i++;
    }
  }
  return out;
}

/** A painted piece of a line: a token, or the part of one a link covers (`link` its fragment's id, #624). */
export interface Painted extends Token {
  readonly link?: string;
}

/** A line's tokens cut where links begin and end (`from`/`to` 0-based within the line), each piece inside one marked. */
export function withLinks(tokens: readonly Token[], links: readonly { readonly from: number; readonly to: number; readonly id: string }[]): Painted[] {
  if (!links.length) return [...tokens];
  const out: Painted[] = [];
  let at = 0;
  for (const t of tokens) {
    const end = at + t.text.length;
    let i = at;
    // (each boundary inside the token cuts it)
    const cuts = [...new Set(links.flatMap((l) => [l.from, l.to]).filter((c) => c > at && c < end))].sort((a, b) => a - b);
    for (const c of [...cuts, end]) {
      const piece = t.text.slice(i - at, c - at);
      const link = links.find((l) => i >= l.from && c <= l.to);
      if (piece) out.push(link ? { ...t, text: piece, link: link.id } : { ...t, text: piece });
      i = c;
    }
    at = end;
  }
  return out;
}
