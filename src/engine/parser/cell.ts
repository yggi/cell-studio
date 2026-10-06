/** A cell's line: its name, then attributes and its braid, in any order. */
import type { Braid, CellDecl, MapSpec, ParamCells, Ref, Span, StepSpec, Token } from '../ast';
import { RETIRED_PARAMS, TIME_PARAMS, canonical, isDoughParam } from '../dough-params';
import { CELL_PARAMS, CORE, PARAMS, nearestAttribute } from '../attributes';
import { IDENT, type LineScanner } from './scanner';
import { parseToken } from './braid';
import { parseFree } from './free';
import { parseGenerator } from './generators';
import { parseMap, parseStep } from './values';

export function parseCell(s: LineScanner): CellDecl {
  s.skipSpace();
  if (s.text.startsWith('&(', s.i)) s.fail('An unnamed cell &( … ) goes where a cell is used; a line declares a named one: &name …');
  const head = s.ref('a cell name like &theme');
  if (head.pick || head.shift)
    s.fail('Brackets go where a cell is used (&x[0], &x[<<]), not where it is named — use shift= here', head.span.col - 1, head.span.len);
  if (s.peek() === '(') s.fail(`&name(…) is gone — write over=&…`);
  return parseBody(s, head);
}

/** A cell's body: attributes and braid, up to the end of the scanner's text. */
export function parseBody(s: LineScanner, head: Ref): CellDecl {
  let over: Ref | null = null;
  let shift: number | null = null;
  let cycle: number | null = null;
  let step: StepSpec | null = null;
  let map: MapSpec | null = null;
  let stride: number | null = null;
  let env: Ref | null = null;
  let pitch: Ref | null = null;
  let show: string | null = null;
  let label: string | null = null;
  let laps: number | null = null;
  let title: string | null = null;
  let tags: string | null = null;
  let about: Ref[] | null = null;
  let chance: number | null = null;
  let seed: number | null = null;
  let size: number | null = null;
  const paramCells: Record<string, ParamCells> = {};
  const paramClocks: Record<string, StepSpec> = {};
  let off = false;
  const params: Record<string, number | string> = {};
  const paramSpans: Record<string, Span> = {};
  const tokens: Token[] = [];
  let generator: Braid | null = null;

  while (!s.done()) {
    const at = s.i;
    const word = s.match(IDENT);
    if (word !== null && s.peek() === '=') {
      s.i++;
      const twice = () => s.fail(`${word}= is given twice`, at, word.length);
      if (word === 'over') {
        if (over) twice();
        const sc = s.match(/scale\(\s*(-?[0-9]+)\s*,\s*([0-9]+)\s*\)/y);
        if (sc) {
          // scale(tonic, phase): the 12 shifted to the tonic, even(7,12,phase) over it — written once
          const [, tonic, phase] = /scale\(\s*(-?[0-9]+)\s*,\s*([0-9]+)\s*\)/.exec(sc)!;
          over = { name: `scale:${parseInt(tonic, 10)}:${parseInt(phase, 10)}`, pick: null, shift: 0, span: s.span(at + 5) };
        } else if (s.match(/scale\(/y)) s.fail('scale(tonic, phase): like scale(0,2) for C Aeolian');
        else over = s.ref('a cell or scale(tonic, phase) after over=, like over=&scale');
        if (over.pick) s.fail('over= takes a whole table (shifting it is fine: over=&scale[<<])', over.span.col - 1, over.span.len);
      } else if (word === 'shift') {
        if (shift !== null) twice();
        shift = s.text.startsWith('free(', s.i) ? Math.round(parseFree(s, 'shift', false).value) : s.int('a whole number after shift=');
      } else if (word === 'chance') {
        // what a bare x? means in this cell: a probability, or a slider for one
        if (chance !== null) twice();
        if (s.text.startsWith('free(', s.i)) chance = parseFree(s, 'chance', false).value;
        else {
          const at2 = s.i;
          const n = s.match(/(?:0?\.[0-9]+|0|1(?:\.0+)?)(?![0-9])/y);
          if (n === null) s.fail('chance= is a probability from 0 to 1: chance=.3, or chance=free(.3, 0..1)', at2, 1);
          chance = parseFloat(n!);
        }
      } else if (word === 'size') {
        // how large it's drawn, against the others: size=2 twice, size=.5 half
        if (size !== null) twice();
        const at2 = s.i;
        const n = s.match(/[0-9]*\.?[0-9]+/y);
        if (n === null || !(+n >= 0.25 && +n <= 4)) s.fail('size= is how large it is drawn, from .25 to 4: size=2', at2, Math.max(1, (n ?? '').length));
        size = +n!;
      } else if (word === 'seed') {
        if (seed !== null) twice();
        seed = s.int('a whole number after seed=');
      } else if (word === 'title' || word === 'tags') {
        // a piece's card: its title and tags, on a note
        if ((word === 'title' ? title : tags) !== null) twice();
        const q = s.match(/"([^"]*)"/y);
        if (q === null) s.fail(`${word}= takes a text in quotes: ${word === 'title' ? 'title="Swing blues"' : 'tags="jazz, blues"'}`);
        if (word === 'title') title = q!.slice(1, -1);
        else tags = q!.slice(1, -1);
      } else if (word === 'about') {
        // a note's links: the cells it explains. One cell, or several in parentheses: about=(&fenv &accent)
        if (about !== null) twice();
        const what = 'a cell after about=, like about=&fenv or about=(&fenv &accent)';
        about = [];
        if (s.peek() === '(') {
          s.i++;
          s.skipSpace();
          while (s.peek() !== ')') {
            if (s.done()) s.fail(`')' to close about=(…)`);
            about.push(s.ref(what));
            s.skipSpace();
          }
          s.i++;
          if (about.length === 0) s.fail(what, at, word.length + 1);
        } else about.push(s.ref(what));
      } else if (word === 'laps') {
        // laps=n: n laps, then silence — a piece that ends
        if (laps !== null) twice();
        const n = s.match(/[0-9]+/y);
        if (n === null || !(parseInt(n, 10) >= 1)) s.fail('laps= takes a count of laps, 1 or more: laps=1', at, word.length + 1);
        laps = parseInt(n!, 10);
      } else if (word === 'show') {
        // how the cell is shown (never how it sounds); the default for everything below it
        if (show !== null) twice();
        const at2 = s.i;
        const w = s.match(/[a-z]+/y);
        const SHOWS = ['braid', 'pattern', 'notes', 'midi', 'do', 'degrees', 'table', 'scale', 'mode', 'key', 'grid', 'meter', 'spectrum', 'wave', 'levels', 'adsr', 'mix', 'note', 'petal', 'off', 'matrix', 'lfo'];
        if (w === null || !SHOWS.includes(w)) s.fail(`show= takes one of: ${SHOWS.join(' ')}`, at2, Math.max(1, (w ?? '').length));
        // a naming convention: notes:flats, notes:sharps, notes:german, do:fixed
        let conv = '';
        if (s.peek() === ':') {
          s.i++;
          const cw = s.match(/[a-z]+/y) ?? '';
          const ok = (w === 'notes' && ['flats', 'sharps', 'german'].includes(cw)) || (w === 'do' && ['fixed', 'movable'].includes(cw));
          if (!ok) s.fail(`show=${w}: takes ${w === 'notes' ? 'flats, sharps or german' : w === 'do' ? 'fixed or movable' : 'no convention'}`, at2, s.i - at2);
          conv = `:${cw}`;
        }
        show = w + conv;
      } else if (word === 'label') {
        // a name to show (instead of &name) — or, alone on a line, a note in the graph
        if (label !== null) twice();
        const q = s.match(/"([^"]*)"/y);
        if (q === null) s.fail('label= takes a text in quotes: label="the King\'s theme"');
        label = q.slice(1, -1);
      } else if (word === 'env' || word === 'pitch') {
        // a voice's own: a volume (env=) or a pitch (pitch=) acting on every note it plays
        if ((word === 'env' ? env : pitch) !== null) twice();
        const r = s.ref(`a cell after ${word}=, like ${word}=&pluck or ${word}=&(map=adsr .01 .3 .5 .4)`);
        if (word === 'env') env = r;
        else pitch = r;
      } else if (word === 'cycle') {
        if (cycle !== null) twice();
        const vs = s.i;
        cycle = s.int('a whole number after cycle=');
        if (cycle < 1) s.fail('cycle must be at least 1', vs, s.i - vs);
      } else if (word === 'step' || word === 'loop') {
        if (step) s.fail(step.whole === (word === 'loop') ? `${word}= is given twice` : 'step= and loop= say the same thing two ways — pick one', at, word.length);
        step = parseStep(s, word === 'loop');
      } else if (word === 'map') {
        if (map) twice();
        map = parseMap(s);
      } else if (word === 'stride') {
        if (stride !== null) twice();
        stride = s.text.startsWith('free(', s.i) ? Math.round(parseFree(s, 'stride', false).value) : s.int('a whole number after stride=');
      } else if (CELL_PARAMS.has(word)) {
        // a cell named: fm= its modulator; write= a tape's source; play= a read head's tape
        if (word in params) twice();
        const r = s.ref(
          word === 'fm' ? 'a voice after fm=, like fm=&op'
          : word === 'write' ? 'what the tape records, like write=&melody'
          : word === 'play' ? 'the tape it reads, like play=&tape'
          : word === 'couple' ? 'the resonator it shares a table with, like couple=&fork'
          : word === 'sun' ? 'the law whose day it shows, like sun=&cycle'
          : 'what drives it, like excite=&mix',
        );
        params[word] = r.name;
        paramSpans[word] = r.span;
      } else if (isDoughParam(word)) {
        const key = canonical(word);
        if (key in params || key in paramCells || key in paramClocks) twice();
        if (key !== word) s.warn(`${word}= is dough's other name for ${key}=: write ${key}=`, at, word.length);
        const vs = s.i;
        // a time as a clock: delaytime=&bar/2
        if (s.peek() === '&' && TIME_PARAMS.has(key)) {
          const st = parseStep(s, false);
          if (st.kind !== 'driven') s.fail(`${word}= takes seconds, or a clock: ${word}=&bar/2`, vs, s.i - vs);
          paramClocks[key] = st;
          paramSpans[key] = s.span(vs);
          if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
          continue;
        }
        // left free: lpf=free(1200, 200..5000), swing=free(.5, .5...75) — a slider, its name the setting's
        if (s.text.startsWith('free(', s.i)) {
          const f = parseFree(s, 'param', false);
          (f as { param?: string }).param = key;
          params[key] = f.value;
          paramSpans[key] = s.span(vs);
          if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
          continue;
        }
        // moving: lpf=&sweep, lpf=200..3000 * &fenv * &accent
        const range = s.text.slice(s.i).match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)\.\.([0-9]+(?:\.[0-9]+)?|\.[0-9]+)/);
        if (s.peek() === '&' || range) {
          if (range) s.i += range[0].length;
          const factors: Ref[] = [];
          if (!range) factors.push(s.ref(`a cell after ${word}=`));
          for (;;) {
            const save = s.i;
            s.skipSpace();
            if (s.peek() !== '*') {
              s.i = save;
              break;
            }
            s.i++;
            s.skipSpace();
            factors.push(s.ref(`a cell after *, like ${word}=200..3000 * &fenv`));
          }
          if (range && factors.length === 0) s.fail(`${word}=${range[0]}: a range is scaled by cells — ${word}=${range[0]} * &fenv`, vs, s.i - vs);
          if (!range && factors.length > 1) s.fail(`${word}=: several cells multiply a range — ${word}=200..3000 * &a * &b`, vs, s.i - vs);
          paramCells[key] = { range: range ? [parseFloat(range[1]), parseFloat(range[2])] : null, factors, span: s.span(vs) };
          paramSpans[key] = s.span(vs);
          if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
          continue;
        }
        const v = s.match(/-?[A-Za-z0-9_.]+/y);
        if (v === null) s.fail(`Expected a value after ${word}=`);
        params[canonical(word)] = /^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/.test(v) ? parseFloat(v) : v;
        paramSpans[canonical(word)] = s.span(vs);
      } else if (word === 'init') s.fail('init= is now shift=', at, word.length);
      else if (word === 'out' || word === 'time') s.fail(`${word}= is now a command: out(voice, &cell) / step(&meter, bpm=…)`, at, word.length);
      else if (word in RETIRED_PARAMS) s.fail(RETIRED_PARAMS[word], at, word.length);
      else {
        const near = nearestAttribute(word);
        s.fail(`Unknown attribute ${word}=${near ? ` — did you mean ${near}=?` : ''} (a cell: ${Object.keys(CORE).join(' ')}; a sound or a physical cell: ${Object.keys(PARAMS).join(' ')})`, at, word.length);
      }
      if (!s.atBoundary()) s.fail(`Unexpected '${s.peek()}'`);
      continue;
    }
    if ((word === 'scan' || word === 'even' || word === 'euclid' || word === 'agogic' || word === 'sin' || word === 'spell' || word === 'meter') && s.peek() === '(') {
      if (generator || tokens.length) s.fail('A cell has one braid: a generator or a list of steps', at, word.length);
      generator = parseGenerator(s, word, at);
      continue;
    }
    if (word === 'off' && s.atBoundary()) {
      if (off) s.fail('off is given twice', at, word.length);
      off = true;
      continue;
    }
    if (word !== null) s.fail(`Unexpected '${word}'`, at, word.length);
    if (generator) s.fail('A cell has one braid: a generator or a list of steps');
    tokens.push(parseToken(s));
  }

  const braid: Braid = generator ?? (tokens.length ? { kind: 'list', tokens } : { kind: 'blank' });
  return { name: head.name, span: head.span, over, shift, off, step, map, stride, cycle, env, pitch, show, label, title, tags, about: about ?? undefined, laps, chance, seed, size, params, paramSpans, paramCells, paramClocks, braid, frees: [...s.frees] };
}
