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
  [/^[@!*^](?:-?[0-9]+(?:\.[0-9]+)?)?/, 'mod'],
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
    if ((rest[0] === '#' && (i === 0 || /\s/.test(line[i - 1]))) || rest.startsWith('//')) {
      push(rest, 'comment');
      break;
    }
    const fn = FUNCS.exec(rest);
    if (fn) {
      push(fn[1], 'func');
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
      push(rest[0], 'punct');
      i++;
    }
  }
  return out;
}
