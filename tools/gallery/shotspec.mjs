// What the gallery's `shot` and `pair` subjects read from their arguments, kept apart from the browser so it can be
// tested (tools/gallery/shotspec.test.ts): the states an element is shown in, a tile's file name, and which tiles of two
// runs pair up.

/**
 * The states to show each element in, from `STATES` (comma-separated): `rest` (the pointer away, nothing focused),
 * `hover`, `focus`, `type=<text>` (focused, its value replaced by the text, then left: a field's problem state), and
 * `click`. Unknown words are an error, so a typo doesn't silently picture nothing.
 */
export function parseStates(text = 'rest') {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = /^(rest|hover|focus|click)$|^type=(.*)$/.exec(s);
      if (!m) throw new Error(`STATES: "${s}" is not rest, hover, focus, click or type=<text>`);
      return m[1] ? { kind: m[1], label: m[1] } : { kind: 'type', text: m[2], label: `type-${slug(m[2]) || 'empty'}` };
    });
}

/** A file-safe name: words joined by dashes, lower case. */
export const slug = (s) =>
  String(s)
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

/** A tile's file name: the piece, the element's place among the matches, the state. */
export const tileName = (piece, index, state) => `${slug(piece)}-${index}-${slug(state)}.png`;

/** Two runs' tiles by name: those in both (in order), and those in only one. */
export function pairUp(before, after) {
  const a = new Set(before);
  const b = new Set(after);
  return {
    both: [...b].filter((f) => a.has(f)).sort(),
    onlyBefore: [...a].filter((f) => !b.has(f)).sort(),
    onlyAfter: [...b].filter((f) => !a.has(f)).sort(),
  };
}

/** The pieces' `data-id`s from what was asked: `example:<key>` as given, else a title's words (matched by the caller). */
export const isId = (s) => /^[a-z]+:/.test(s);
