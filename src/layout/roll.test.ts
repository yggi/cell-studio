import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { declWords, setBraid } from '@yggi/cells/engine/edit';
import { parse } from '@yggi/cells/engine/parser/index';
import { PRESETS } from '@yggi/cells/engine/presets';
import { codeShifts } from '@yggi/cells/engine/program';
import { playedCells } from '@yggi/cells/engine/clocking';
import { frameOf, freeBraidOf, fromBraid, ghostsOf, MAX_ROWS, readBraid, remove, resize, rolls, rowRange, rowsFor, tableOf, tooWide, toBraid, toggle, type Roll } from './roll';

const roll = (text: string): Roll => {
  const r = readBraid(text.split(' ').filter(Boolean));
  if (!r.ok) throw new Error(r.problem);
  return r.roll;
};
const write = (r: Roll) => toBraid(r).join(' ');
/** Every step a braid plays, one per footprint: what sounds there (`0`, `0,4`), `-` held, `~` silent. */
function played(text: string): string[] {
  const b = parse(`&x ${text}`).cells[0].braid;
  const out: string[] = [];
  if (b.kind !== 'list') return out;
  for (const t of b.tokens)
    for (let k = 0; k < t.repeat; k++) {
      const a = t.atom;
      out.push(a.kind === 'note' ? String(a.value) : a.kind === 'chord' ? [...a.notes].sort((x, y) => x - y).join(',') : '~');
      for (let j = 1; j < t.elongate; j++) out.push(a.kind === 'rest' ? '~' : '-');
    }
  return out;
}

describe('braid ↔ roll', () => {
  it('reads steps, holds, chords, rests and repeats into columns', () => {
    expect(roll('0 2@2 [0,4,7] ~ 5!2')).toEqual({
      length: 7,
      columns: [
        { start: 0, len: 1, rows: [0] },
        { start: 1, len: 2, rows: [2] },
        { start: 3, len: 1, rows: [0, 4, 7] },
        { start: 5, len: 1, rows: [5] },
        { start: 6, len: 1, rows: [5] },
      ],
    });
    expect(roll('')).toEqual({ length: 0, columns: [] });
    expect(roll('-3 [7, 4]@3!2')).toEqual({
      length: 7,
      columns: [
        { start: 0, len: 1, rows: [-3] },
        { start: 1, len: 3, rows: [4, 7] },
        { start: 4, len: 3, rows: [4, 7] },
      ],
    });
  });

  it('writes the short form: holds x@n, chords [a,b], rests ~ and ~@n, runs x!n', () => {
    expect(write(roll('0 2@2 [0,4,7] ~ 5!2'))).toBe('0 2@2 [0,4,7] ~ 5!2');
    expect(write(roll('0 0 0 ~ ~ ~ ~ 12 12'))).toBe('0!3 ~@4 12!2');
    expect(write(roll('[0, 4]@2 [4,0]@2 [0,4]@2'))).toBe('[0,4]@2!3');
    expect(write(roll(''))).toBe('');
    expect(write(roll('~ ~ ~'))).toBe('~@3');
    expect(write(roll('0 0 ~!2'))).toBe('0!2 ~@2');
  });

  it('reports what it cannot show, rather than mangling it', () => {
    const why = (t: string) => {
      const r = readBraid(t.split(' '));
      return r.ok ? null : r.problem;
    };
    expect(why('euclid(3,8)')).toMatch(/euclid\(\)/);
    expect(why('scan(2 2 1 2 2 2 1)')).toMatch(/scan\(\)/);
    expect(why('&motif 0')).toMatch(/splices &motif/);
    expect(why('0*2 1')).toMatch(/ratchet/);
    expect(why('0? 1')).toMatch(/chance/);
    expect(why('0 [2|4]')).toMatch(/choice/);
    expect(why('C E G')).toMatch(/by name/);
    expect(why('6#')).toMatch(/accidental/);
    expect(why('.5')).toMatch(/decimal/);
    expect(why('[0,0]')).toMatch(/doubles/);
    expect(why('degree(&m, 1)')).toMatch(/degree\(\)/);
    expect(fromBraid({ kind: 'wave', shape: 'sin', n: 12, span: { line: 1, col: 1, len: 1 } }).ok).toBe(false);
  });

  // the law: toBraid(fromBraid(b)) is b, or its canonical equal — over every braid of every example the roll can show
  const cases: { piece: string; cell: string; words: string[] }[] = [];
  const refused: string[] = [];
  for (const [key, { source }] of Object.entries(PRESETS))
    for (const d of parse(source).cells) {
      if (d.lambda || (d.braid.kind !== 'list' && d.braid.kind !== 'blank')) continue;
      const words = declWords(source, d.name)?.braid;
      if (!words) continue;
      if (readBraid(words).ok) cases.push({ piece: key, cell: d.name, words });
      else refused.push(`${key}:${d.name}`);
    }

  it('the round trip holds over every example braid the roll can show', () => {
    expect(cases.length).toBeGreaterThan(200);
    expect(refused.length).toBeGreaterThan(20);
    for (const { piece, cell, words } of cases) {
      const back = toBraid(roll(words.join(' ')));
      const where = `${piece}: &${cell} ${words.join(' ')} → ${back.join(' ')}`;
      // the same steps, the same notes, the same holds
      expect(played(back.join(' ')), where).toEqual(played(words.join(' ')));
      // canonical: writing it again changes nothing
      expect(toBraid(roll(back.join(' '))), where).toEqual(back);
    }
  });

  it('gives back the text itself when it was written in the short form', () => {
    const same = cases.filter(({ words }) => toBraid(roll(words.join(' '))).join(' ') === words.join(' '));
    // most examples are written as the roll writes them
    expect(same.length / cases.length).toBeGreaterThan(0.7);
    for (const t of ['0 2 4 5@2 ~ 7', '[0,2,4]@4 [3,5,7]@4', '0!4 ~ 2!2', '-5 -3 ~@3 12@3']) expect(write(roll(t))).toBe(t);
  });

  it('every example cell that rolls compiles the same after a round trip (its events unchanged)', () => {
    for (const key of ['twinkle', 'korobeiniki', 'chords', 'canon', 'lullaby']) {
      const source = PRESETS[key as keyof typeof PRESETS].source;
      const before = compileSource(source);
      let after = source;
      for (const name of before.cells.keys()) {
        if (!rolls(before, name)) continue;
        const w = declWords(source, name)?.braid;
        const r = w && readBraid(w);
        if (r && r.ok && r.roll.length) after = setBraid(after, name, toBraid(r.roll));
      }
      const a = compileSource(after);
      expect(a.ok, key).toBe(true);
      for (const [name, c] of before.cells) expect(a.cells.get(name)?.steps, `${key}: &${name}`).toBe(c.steps);
    }
  });
});

describe('editing in the roll', () => {
  it('a tap adds a note, a tap on it takes it away; an empty column rests', () => {
    let r = roll('0 2 4');
    r = toggle(r, 1, 3);
    expect(write(r)).toBe('0 [2,3] 4');
    r = toggle(r, 1, 2);
    r = toggle(r, 1, 3);
    expect(write(r)).toBe('0 ~ 4');
    expect(write(toggle(roll(''), 0, 4))).toBe('4');
  });

  it('past the end, the braid grows (the gap rests)', () => {
    expect(write(toggle(roll('0 2'), 5, 7))).toBe('0 2 ~@3 7');
  });

  it('a note inside a hold cuts the hold short', () => {
    expect(write(toggle(roll('0@4'), 2, 5))).toBe('0@2 5 ~');
  });

  it('a tap inside a held note takes it away; its steps stay as rests', () => {
    expect(write(toggle(roll('0@4 2'), 3, 0))).toBe('~@4 2');
    expect(write(remove(roll('[0,4]@2'), 1, 4))).toBe('0@2');
  });

  it('dragging right holds it (@n), up to the next note; past the end the braid grows', () => {
    expect(write(resize(roll('0 ~ ~ 4'), 0, 3))).toBe('0@3 4');
    expect(write(resize(roll('0 ~ ~ 4'), 0, 9))).toBe('0@3 4');
    expect(write(resize(roll('0 2'), 1, 3))).toBe('0 2@3');
    expect(write(resize(roll('0@3 4'), 0, 1))).toBe('0 ~@2 4');
  });

  it('rewrites the cell’s line through edit.setBraid, attributes and comment kept', () => {
    const src = '&tune over=&scale step=&bar 0 2 4 # a tune';
    const next = setBraid(src, 'tune', toBraid(toggle(roll('0 2 4'), 3, 7)));
    expect(next).toBe('&tune over=&scale step=&bar 0 2 4 7 # a tune');
  });
});

describe('how far the rows go', () => {
  const FAR = ['0 5000', '0 100000', '0 1000000000', '1000000000', '-5000 2', '-1000000000'];
  const tooFar = (text: string) => {
    const r = readBraid(text.split(' '));
    return { problem: r.ok ? tooWide(r.roll, 12) : r.problem };
  };

  it('a note far outside the table is refused (not drawn as thousands of rows; how fast: timing.slow.test.ts)', () => {
    for (const t of FAR) expect(tooFar(t).problem, t).toBe('a note far outside its table');
    expect(tooFar('0 2 4 24 -12').problem).toBeNull();
    expect(tooFar(`0 ${MAX_ROWS - 1}`).problem).toBeNull();
    expect(tooFar(`0 ${MAX_ROWS}`).problem).not.toBeNull();
    // within a table larger than the roll: not far outside it
    expect(tooWide(roll('300 310'), 500)).toBeNull();
  });

  it('never more than MAX_ROWS rows: laps asked for past it, or a table larger than it, are windowed round the notes', () => {
    const span = ([lo, hi]: [number, number]) => hi - lo + 1;
    expect(span(rowRange(roll('0 2 4'), 12, false, { below: 20, above: 20 }))).toBe(MAX_ROWS);
    // a 500-entry table: its first lap doesn't fit, the notes do
    const [lo, hi] = rowRange(roll('300 310'), 500, false);
    expect([lo <= 300, hi >= 310, hi - lo + 1]).toEqual([true, true, MAX_ROWS]);
    const [lo2, hi2] = rowRange(roll('3 100'), 500, false);
    expect([lo2 <= 3, hi2 >= 100, hi2 - lo2 + 1]).toEqual([true, true, MAX_ROWS]);
  });
});

describe('the frame', () => {
  it('bars and beats from its meter, in its own steps', () => {
    const q = compileSource('&bar scan(4 4 4 4) step=84bpm\n&tune step=4n 0 2 4\n&fast step=16n 0 1\n&slow step=2n 0');
    expect(frameOf(q, 'tune', 3)).toEqual({ length: 3, steps: 4, bar: 4, beat: 1 });
    expect(frameOf(q, 'fast', 2)).toEqual({ length: 2, steps: 16, bar: 16, beat: 4 });
    // a beat of two bar-steps doesn't fall on its own steps
    expect(frameOf(q, 'slow', 1)).toMatchObject({ bar: 2, beat: null });
    // room to grow: a bar more once it fills one
    expect(frameOf(q, 'tune', 4).steps).toBe(8);
  });

  it('a meter written as levels: its beats', () => {
    const q = compileSource('&bar meter("4/4", 2) step=100bpm\n&tune step=8n 0 2 4 5');
    expect(frameOf(q, 'tune', 4)).toEqual({ length: 4, steps: 8, bar: 8, beat: 2 });
  });

  it('a cell that is its own clock has no bars', () => {
    const q = compileSource('&tune step=2 0 2 4');
    expect(frameOf(q, 'tune', 3)).toEqual({ length: 3, steps: 4, bar: null, beat: null });
  });
});

describe('the rows', () => {
  it('without over=, semitones on the 12: C4 … C5, the black keys marked', () => {
    const q = compileSource('&tune step=2 0 4 7');
    const rows = rowsFor(q, 'tune', codeShifts(q), ...rowRange(roll('0 4 7'), tableOf(q, 'tune').perLap, false));
    expect(rows.map((r) => r.label)).toEqual(['C4', 'C♯4', 'D4', 'E♭4', 'E4', 'F4', 'F♯4', 'G4', 'A♭4', 'A4', 'B♭4', 'B4', 'C5']);
    expect(rows.filter((r) => r.black).map((r) => r.value)).toEqual([1, 3, 6, 8, 10]);
  });

  it('over 19-EDO: its 19 steps to the octave', () => {
    const q = compileSource('&edo19 cycle=19 map=edo\n&tune over=&edo19 step=2 0 5 11');
    const { perLap } = tableOf(q, 'tune');
    expect(perLap).toBe(19);
    const rows = rowsFor(q, 'tune', codeShifts(q), ...rowRange(roll('0 5 11'), perLap, false));
    expect(rows.length).toBe(20);
    expect(rows.map((r) => r.position)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(rows.every((r) => r.root === 'edo19' && !r.black)).toBe(true);
  });

  it('over a scale: its entries over the laps, never a wrong note', () => {
    const q = compileSource('&tune over=scale(major, D) step=2 0 2 4 9');
    const { perLap } = tableOf(q, 'tune');
    expect(perLap).toBe(7);
    const rows = rowsFor(q, 'tune', codeShifts(q), ...rowRange(roll('0 2 4 9'), perLap, false));
    expect(rows.map((r) => r.label)).toEqual(['D4', 'E4', 'F♯4', 'G4', 'A4', 'B4', 'C♯5', 'D5', 'E5', 'F♯5']);
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 1, 2]);
    expect(rowRange(roll('-2 3'), 7, false, { below: 1, above: 0 })).toEqual([-9, 7]);
  });

  it('over a kit: one row per voice, by name', () => {
    const q = compileSource('&bd s=sine loop=C2\n&sd s=white\n&kit &bd &sd\n&beat over=&kit step=4 0 1 0 1\n&out loop=SAMPLE_RATE map=sample [&beat * .5]');
    expect(q.ok).toBe(true);
    const { table, perLap } = tableOf(q, 'beat');
    expect(table?.kit).toBe(true);
    expect(rowsFor(q, 'beat', codeShifts(q), ...rowRange(roll('0 1 0 1'), perLap, true)).map((r) => r.label)).toEqual(['&bd', '&sd']);
  });
});

describe('which cells roll, and their ghosts', () => {
  it('melodies and chords roll; voices, mixes, meters, tables and curves do not', () => {
    const q = compileSource(PRESETS.royal.source);
    expect(rolls(q, 'theme') && rolls(q, 'pedal')).toBe(true);
    // (the theme rolls, but writes accidentals: the sheet says the roll can't show it)
    expect(readBraid(declWords(PRESETS.royal.source, 'theme')!.braid)).toMatchObject({ ok: false, problem: /accidental/ });
    expect(['bar', 'key', 'scale', 'fifths12TET'].some((n) => rolls(q, n))).toBe(false);
    for (const [name, c] of q.cells) if (c.voice || c.mix || c.sink) expect(rolls(q, name), name).toBe(false);
  });

  it('a tape, its read heads and a law are not melodies: no roll (echotape, fiveto12)', () => {
    const echo = compileSource(PRESETS.echotape.source);
    for (const n of ['tape', 'near', 'mid', 'far', 'reel']) expect(rolls(echo, n), `echotape: &${n}`).toBe(false);
    // (what the tape records is a melody, and plays: it rolls)
    expect(rolls(echo, 'tune')).toBe(true);
    const day = compileSource(PRESETS.fiveto12.source);
    for (const n of ['cycle', 'memory', 'recall', 'message']) expect(rolls(day, n), `fiveto12: &${n}`).toBe(false);
  });

  it('a blank cell rolls only when something plays it as a melody', () => {
    const src = (extra: string) => `&bar scan(1 1 1 1) step=100bpm\n&lead s=saw\n&up over=scale(major) step=4n\n${extra}`;
    // played: it plays its table, and a note written here makes it a braid
    expect(rolls(compileSource(src('&out loop=SAMPLE_RATE map=sample [&up * &lead]')), 'up')).toBe(true);
    // nothing plays it, or something only reads it: not a melody
    expect(rolls(compileSource(src('&out loop=SAMPLE_RATE map=sample [&lead]')), 'up')).toBe(false);
    // a tap of the bar, a clock no one plays, a table map= reads, a waveform at audio rate
    const q = compileSource('&bar scan(1 1 1 1) step=100bpm\n&tap step=4n 1 0\n&t step=&tap 0 2\n&curve 0 1 .3 -1\n&shaped loop=262hz map=&curve 0 1 2 3\n&chip step=8k 1!2 -1!2');
    for (const n of ['tap', 'curve', 'chip']) expect(rolls(q, n), n).toBe(false);
    expect(rolls(q, 't')).toBe(true);
  });

  // the sweep: in every example, what the roll accepts is a melody — a braid of notes, or a blank something plays
  it('over every example, the cells that roll are melodic braids, or blanks played as melodies', () => {
    let count = 0;
    for (const [key, { source }] of Object.entries(PRESETS)) {
      const q = compileSource(source);
      const played = playedCells(q);
      const tapeCells = new Set(q.tapes.flatMap((t) => [t.name, ...t.heads.map((h) => h.head)]));
      const driving = new Set([...q.cells.values()].flatMap((x) => (x.step ? [x.step.driver] : [])));
      for (const [name, c] of q.cells) {
        if (!rolls(q, name)) continue;
        count++;
        const where = `${key}: &${name}`;
        expect(c.braid === 'list' || c.braid === 'blank', where).toBe(true);
        for (const k of ['write', 'play', 'law', 'scope', 'motor', 'body']) expect(c.params[k], `${where} ${k}=`).toBeUndefined();
        expect(tapeCells.has(name), where).toBe(false);
        expect(c.voice || c.mix || c.sink || c.root || c.note || !!c.map, where).toBe(false);
        if (c.braid === 'blank') expect(played.has(name), `${where}: a blank nothing plays`).toBe(true);
        else if (!played.has(name)) expect(driving.has(name), `${where}: a clock no one plays`).toBe(false);
        // its steps are notes, rests, splices or subsequences of them (never levels, a waveform, a list of mixes)
        for (const u of c.units) expect(['note', 'chord', 'rest', 'ref', 'choice', 'seq'], `${where} ${u.atom.kind}`).toContain(u.atom.kind);
      }
    }
    expect(count).toBeGreaterThan(150);
  });

  it('ghosts: what else plays the same table on the same clock, in this cell’s steps', () => {
    const q = compileSource(
      '&bar scan(1 1 1 1) step=100bpm\n&lead s=saw\n&tune over=&s step=4n 0 2\n&low over=&s step=2n 4\n&s scale(major)\n&out loop=SAMPLE_RATE map=sample [&tune * &lead, &low * &lead]',
    );
    const g = ghostsOf(q, 'tune', 4);
    expect(g.map((x) => [x.start, x.len, x.row, x.from])).toEqual([
      [0, 2, 4, 'low'],
      [2, 2, 4, 'low'],
    ]);
    expect(ghostsOf(q, 'low', 2).map((x) => [x.start, x.len, x.row])).toEqual([
      [0, 0.5, 0],
      [0.5, 0.5, 2],
      [1, 0.5, 0],
      [1.5, 0.5, 2],
    ]);
  });
});

describe('a braid left free in the roll (#210)', () => {
  const RIFF = '&key scan(2 2 1 2 2 2 1)\n&riff over=&key step=4 free(0 2 4 ~ [0,4]@2 ~ ~)\n&v s=sine\n&out map=sample [&riff * &v]';
  it('reads its steps as they play (a take held, else as written); an edit is the text a take would hold', () => {
    const r = compileSource(RIFF);
    expect(rolls(r, 'riff')).toBe(true);
    const free = freeBraidOf(r, 'riff')!;
    expect(free.spec.key).toBe('braid');
    const read = readBraid(free.words);
    expect(read.ok && toBraid(read.roll)).toEqual(['0', '2', '4', '~', '[0,4]@2', '~@2']);
    const held = compileSource(RIFF.replace('free(0 2 4 ~ [0,4]@2 ~ ~)', 'free(7 ~ 0@2 ~ ~ ~ ~)'));
    const again = readBraid(freeBraidOf(held, 'riff')!.words);
    expect(again.ok && toBraid(toggle(again.roll, 1, 2))).toEqual(['7', '2', '0@2', '~@4']);
    expect(freeBraidOf(r, 'key')).toBeNull();
  });
});
