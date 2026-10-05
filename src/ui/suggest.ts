/**
 * Autocomplete for the braid editors: what the word being typed could become.
 * Pure, so it's tested on its own.
 */

export interface Suggestion {
  /** What replaces the word. */
  readonly text: string;
  /** What the list shows. */
  readonly label: string;
  readonly kind: 'ref' | 'bracket' | 'rest' | 'function' | 'value';
}

const BRACKETS: readonly [string, string][] = [
  ['[<<]', 'one back'],
  ['[>>]', 'one forward'],
  ['[0]', 'first'],
  ['[-1]', 'last'],
  ['[1:]', 'all but first'],
  ['[:-1]', 'all but last'],
  ['[::-1]', 'backwards (retrograde)'],
];

const FUNCTIONS: readonly [string, string][] = [
  ['scan(2 2 1 2 2 2 1)', 'scan(intervals) — the major scale (lap 12)'],
  ['scan(2 1 2 2 1 2 2)', 'scan — the minor (Aeolian) scale'],
  ['scan(3 3 2)', 'scan — the tresillo (lap 8)'],
  ['scan(27 23 26 24)', 'scan — a 4/4 bar, the first beat long'],
  ['scan(28 37 35)', 'scan — a waltz bar, beat 2 early'],
  ['sin(12)', 'sin(n) — one cycle of a sine in n steps (a waveform)'],
];

/**
 * Suggestions for `word` (the token being typed). `functions`: also offer
 * generators (only for a whole braid).
 */
export function suggest(word: string, names: readonly string[], functions = false): Suggestion[] {
  const w = word.trim();
  const out: Suggestion[] = [];
  // &name[ → bracket forms for that cell
  const br = /^&([A-Za-z_][A-Za-z0-9_]*)\[([^\]]*)$/.exec(w);
  if (br && names.includes(br[1])) {
    for (const [b, what] of BRACKETS) if (b.startsWith(`[${br[2]}`)) out.push({ text: `&${br[1]}${b}`, label: `&${br[1]}${b} — ${what}`, kind: 'bracket' });
    return out;
  }
  // cells by name (with or without the &)
  const q = w.replace(/^&/, '').toLowerCase();
  if (w === '' || /^&?[A-Za-z_][A-Za-z0-9_]*$/.test(w) || w === '&') {
    const hits = names.filter((n) => n.toLowerCase().includes(q));
    hits.sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)));
    for (const n of hits.slice(0, 8)) out.push({ text: `&${n}`, label: `&${n}`, kind: 'ref' });
    if (functions) for (const [f, what] of FUNCTIONS) if (f.startsWith(q)) out.push({ text: f, label: what, kind: 'function' });
  }
  if (w === '' || w === '~') out.push({ text: '~', label: '~ rest', kind: 'rest' });
  return out;
}

/** The word at the end of a line being typed (the one to complete). */
export function lastWord(line: string): { before: string; word: string } {
  // a word can hold brackets: &m[<<], [0, 4, 7]
  let depth = 0;
  for (let i = line.length - 1; i >= 0; i--) {
    const c = line[i];
    if (c === ']' || c === ')') depth++;
    else if (c === '[' || c === '(') depth = Math.max(0, depth - 1);
    else if (/\s/.test(c) && depth === 0) return { before: line.slice(0, i + 1), word: line.slice(i + 1) };
  }
  return { before: '', word: line };
}

/** A number token: value, accidentals, modifiers (`6#@2` → 6, '#', '@2'); null for anything else. */
export function numberToken(t: string): { value: number; acc: string; mods: string } | null {
  const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([#b]*)((?:[!*@]\d+)*)$/.exec(t.trim());
  return m ? { value: parseFloat(m[1]), acc: m[2], mods: m[3] } : null;
}

/** Move a number token by `by` (a step, or an octave = the length of its table), keeping accidentals and modifiers. */
export function nudge(t: string, by: number): string {
  const n = numberToken(t);
  if (!n) return t;
  return `${+(n.value + by).toFixed(6)}${n.acc}${n.mods}`;
}

/** The parameters a cell can have, in the order the editor offers them, with what each means. */
export const PARAM_KEYS: readonly [string, string][] = [
  ['over', 'the table its numbers read'],
  ['step', 'what moves it, step by step'],
  ['loop', 'what moves it, the whole braid at a time'],
  ['shift', 'how far it is turned'],
  ['stride', 'how far each step turns it'],
  ['map', 'how its values sound'],
  ['show', 'how it’s shown: notes, do, scale, pattern … (and everything below it)'],
  ['label', 'a name to show, in quotes — alone on a cell, a note in the graph'],
  ['env', 'a voice’s own volume on every note: an envelope'],
  ['pitch', 'a voice’s own pitch on every note: a vibrato'],
  ['cycle', 'size of a grid'],
  ['size', 'how large it’s drawn, against the others: 2 twice, .5 half'],
  ['laps', 'how many laps it plays, then it ends'],
  ['chance', 'what a bare x? means here: a probability, or free() for a slider'],
  ['seed', 'a different sequence of chance'],
  ['title', 'on a note: the piece’s title (its card)'],
  ['tags', 'on a note: the piece’s tags, comma-separated'],
];

/**
 * Suggestions for a parameter's value, by key: cells and scales for over=;
 * cells, cycles, rates and notes for step= / loop=; maps; sound sources.
 */
export function suggestValue(key: string, text: string, names: readonly string[], sources: readonly string[]): Suggestion[] {
  const w = text.trim();
  const q = w.toLowerCase();
  const pick = (items: [string, string][], kind: Suggestion['kind'] = 'value') =>
    items.filter(([t]) => t.toLowerCase().startsWith(q) || t.toLowerCase().includes(q) && q.length > 1).slice(0, 10).map(([t, l]) => ({ text: t, label: l, kind }));
  if (/^&[A-Za-z_][A-Za-z0-9_]*\[/.test(w)) return suggest(w, names).filter((s) => !/\[(-?\d|:|-1)/.test(s.text) || key !== 'over');
  const refs = (prefix = '') => names.map((n): [string, string] => [`${prefix}&${n}`, `${prefix}&${n}`]);
  switch (key) {
    case 'over':
      return [
        ...pick(refs(), 'ref'),
        ...pick([
          ['scale(0,5)', 'scale(0,5) — C major'],
          ['scale(0,2)', 'scale(0,2) — C minor (Aeolian)'],
          ['scale(2,3)', 'scale(2,3) — D Dorian'],
          ['scale(7,5)', 'scale(7,5) — G major'],
        ]),
      ];
    case 'step':
    case 'loop':
      return [
        ...pick(refs(), 'ref'),
        ...pick(names.map((n): [string, string] => [`cycle(&${n})`, `cycle(&${n}) — once per cycle of &${n}`]), 'function'),
        ...pick([
          ['96bpm', '96bpm — a rate, beats per minute'],
          ['1', '1 — per second'],
          ['C4', 'C4 — a note (for a voice: its pitch 0)'],
          ['A4', 'A4 — 440 Hz'],
          ['C2', 'C2 — a bass note'],
          ['SAMPLE_RATE', 'SAMPLE_RATE — the sound card'],
        ]),
      ];
    case 'map':
      return [
        ...pick([
          ['amp', 'amp — a volume (in a mix it multiplies; a voice’s waveform), held'],
          ['lin', 'lin — the same, ramping to each next value (smooth)'],
          ['adsr', 'adsr — an envelope: attack decay sustain release (seconds), for each note'],
          ['edo', 'edo — this cell is a grid: cycle= equal steps per octave'],
          ['ed(3/2)', 'ed(r) — a grid of equal steps to a ratio: ed(3/2) the fifth (Carlos’ alpha: cycle=9)'],
          ['ed(5)', 'ed(5) — equal steps to 5:1 (Stockhausen’s Studie II: cycle=25)'],
          ['sample', 'sample — this cell is the sound card'],
        ]),
        ...pick(refs(), 'ref'),
      ];
    case 'env':
      return [
        ...pick([
          ['&(map=adsr .01 .3 .5 .4)', 'an envelope: attack decay sustain release (seconds)'],
          ['&(map=adsr 0 .2 0 .05)', 'a pluck: no sustain'],
          ['&(map=adsr .3 .2 .8 1)', 'a pad: slow in, long release'],
        ], 'function'),
        ...pick(refs(), 'ref'),
      ];
    case 'pitch':
      return [...pick([['&(map=lin loop=5 0 .15 0 -.15 0)', 'a vibrato: ±0.15 semitones, 5 a second, gliding']], 'function'), ...pick(refs(), 'ref')];
    case 's':
      return pick(sources.map((src): [string, string] => [src, src]));
    default:
      return [];
  }
}
