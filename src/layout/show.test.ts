import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { liveAt } from '@yggi/cells/engine/live';
import { setAttr } from '@yggi/cells/engine/edit';
import { PRESETS } from '@yggi/cells/engine/presets';
import { cellView, hubLabel, lfoValues } from './cellview';
import { buildGraph } from './drawn';
import { flowRanks } from './ranks';
import { FITS, effectiveShow, gridOf, heardPosition, inferShow, kindOf, noteLabel, pluginOf, showProblems, tonicOf, voiceBase } from './show';

const twinkle = (show: string) => setAttr(PRESETS.twinkle.source, 'tune', 'show', show);
const labels = (src: string, cell: string) => {
  const r = compilePiece(src);
  const v = cellView(r, cell, codeShifts(r), false)!;
  const base = voiceBase(r, cell);
  const tonic = tonicOf(r, cell);
  return v.segments.flatMap((s) => (s.notes?.length ? [noteLabel(v.show!, s.notes[s.notes.length - 1], base, tonic)] : []));
};

const errors = (src: string) => compilePiece(src).diagnostics.filter((d) => d.severity === 'error');

describe('show=', () => {
  it('reads one of the shows; says which when it isn’t', () => {
    expect(compilePiece('&t show=do 0').cells.get('t')!.show).toBe('do');
    expect(errors('&t show=fancy 0')[0].message).toMatch(/show=fancy: not a show \(braid pattern equal notes midi do.*no plugin of that name/);
  });
  it('a plugin of the piece is a show of its own, for the kinds it says; not passed down', () => {
    const src = [
      '&bar scan(1 1 1 1) step=60bpm show=ring',
      '&tune step=4n 0 2',
      '=== plugin ring ===',
      '{ "fits": ["meter"], "size": 150 }',
      'function draw() { return []; }',
      '=== end ===',
    ].join('\n');
    const r = compilePiece(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.plugins.get('ring')).toMatchObject({ fits: ['meter'], size: 150, rim: true });
    expect(effectiveShow(r, 'bar')).toMatchObject({ show: 'ring', from: 'set' });
    expect(pluginOf(r, 'bar')?.name).toBe('ring');
    // (it draws a meter; the tune it steps is not one, and a plugin's show is a wheel, not a default for what is below)
    expect(pluginOf(r, 'tune')).toBeNull();
    expect(effectiveShow(r, 'tune').from).toBe('inferred');
  });
  it('a plugin on a cell it doesn’t fit is drawn as that cell is, and says so at its show= (#195)', () => {
    const r = compilePiece('&bar step=1\n&mel step=&bar 0 2 show=sun\n&v s=sine\n&out map=sample [&mel * &v]');
    expect(r.diagnostics).toEqual([]);
    expect(showProblems(r)).toEqual([
      { severity: 'warning', message: 'show=sun draws a meter, and &mel is a braid: it is drawn as one, without the plugin', span: { line: 2, col: 25, len: 3 } },
    ]);
    // (on a cell it fits: quiet; and every example is)
    expect(showProblems(compilePiece('&bar scan(1 1 1 1) step=60bpm show=sun\n&mel step=4n 0 2\n&v s=sine\n&out map=sample [&mel * &v]'))).toEqual([]);
    for (const [key, p] of Object.entries(PRESETS)) expect(showProblems(compilePiece(p.source)), key).toEqual([]);
  });
  it('the block is blanked in the cells’ text: the cells keep their line numbers', () => {
    const r = compilePiece(['=== plugin ring ===', '{ "fits": ["meter"] }', 'function draw() { return []; }', '=== end ===', '&bar scan(1 1) step=60bpm show=nope'].join('\n'));
    expect(r.diagnostics.find((d) => d.severity === 'error')!.span.line).toBe(5);
  });
  it('says what is wrong with a block', () => {
    const msgs = (s: string) => errors(s).map((d) => d.message);
    expect(msgs('=== plugin ring ===\n=== end ===')[0]).toMatch(/starts with its manifest/);
    expect(msgs('=== plugin ring ===\n{ "fits": ["meter"] }')[0]).toMatch(/no === end ===/);
    expect(msgs('=== plugin wave ===\n{ "fits": ["meter"] }\n=== end ===')[0]).toMatch(/a show of its own/);
    expect(msgs('=== plugin ring ===\n{ "fits": [] }\n=== end ===')[0]).toMatch(/"fits" lists/);
  });
  it('is the default for everything below: parts and tables — not a step driver', () => {
    const r = compilePiece(twinkle('do'));
    expect(effectiveShow(r, 'tune')).toMatchObject({ show: 'do', from: 'set' });
    expect(effectiveShow(r, 'up')).toMatchObject({ show: 'do', from: 'tune' }); // a part
    expect(effectiveShow(r, 'mid')).toMatchObject({ show: 'do', from: 'tune' });
    expect(effectiveShow(r, 'key')).toMatchObject({ show: 'do', from: 'tune' }); // its table
    expect(effectiveShow(r, 'bar').from).toBe('inferred'); // its meter: not below it
  });
  it('a show that doesn’t fit isn’t inherited: the cell keeps its own', () => {
    const r = compilePiece(setAttr(PRESETS.twinkle.source, 'tune', 'show', 'pattern'));
    expect(FITS[kindOf(r, 'key')]).not.toContain('pattern');
    expect(effectiveShow(r, 'key').from).toBe('inferred');
  });
  it('infers what cells have always looked like', () => {
    const r = compilePiece(PRESETS.royal.source);
    expect([inferShow(r, 'bar'), inferShow(r, 'key'), inferShow(r, 'scale'), inferShow(r, 'theme'), inferShow(r, 'lead')]).toEqual(['meter', 'key', 'scale', 'braid', 'wave']);
  });
  it('names the steps: notes, midi, movable do, degrees — twinkle’s first line', () => {
    expect(labels(twinkle('notes'), 'up')).toEqual(['C5', 'C5', 'G5', 'G5', 'A5', 'A5', 'G5']);
    expect(labels(twinkle('midi'), 'up')).toEqual(['72', '72', '79', '79', '81', '81', '79']);
    expect(labels(twinkle('do'), 'up')).toEqual(['do', 'do', 'sol', 'sol', 'la', 'la', 'sol']);
    expect(labels(twinkle('degrees'), 'up')).toEqual(['1', '1', '5', '5', '6', '6', '5']);
    // the middle line is &down read a step up the scale: a sequence, still in C — do stays C
    expect(labels(twinkle('do'), 'mid')).toEqual(['sol', 'sol', 'fa', 'fa', 'mi', 'mi', 're']);
  });
  it('pattern: rhythm only; adsr: a curve; mode: major and minor by name', () => {
    const r = compilePiece(twinkle('pattern'));
    expect(cellView(r, 'tune', codeShifts(r), false)!.segments.every((s) => s.bands.every((b) => b.kind !== 'pitch'))).toBe(true);
    const e = compilePiece('&e map=adsr .01 .3 .5 .4');
    expect(cellView(e, 'e', codeShifts(e), false)!).toMatchObject({ mode: 'curve', curve: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4 } });
    const royal = compilePiece(setAttr(PRESETS.royal.source, 'scale', 'show', 'mode'));
    expect(hubLabel(royal, 'scale', codeShifts(royal), false, null)).toEqual({ big: 'minor', small: 'on C' });
  });
  it('never changes the sound: every fitting show on every cell of every example', () => {
    const sound = (src: string) => {
      const r = compilePiece(src);
      // (an unnamed cell's internal name has its column in it: compare what sounds, not that)
      return JSON.stringify(eventsBetween(plan(r, codeShifts(r)), 0, 3).map((x) => [x.at.toFixed(6), x.voice.replace(/^λ.*/, 'λ'), x.freq.toFixed(4)]));
    };
    // Every (cell, show) pair is rewritten into the source, but a whole slot at once: pass k sets every cell to
    // its k-th fitting show, so a piece compiles once per slot, not once per pair. Only a pass that sounds
    // different is taken apart, one cell at a time, to name the cell.
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compilePiece(p.source);
      const before = sound(p.source);
      const cells = [...r.cells.values()].filter((c) => !c.implicit && !c.lambda).map((c) => ({ name: c.name, fits: FITS[kindOf(r, c.name)] }));
      const passes = Math.max(0, ...cells.map((c) => c.fits.length));
      for (let k = 0; k < passes; k++) {
        const set = cells.filter((c) => k < c.fits.length).map((c) => ({ name: c.name, show: c.fits[k] }));
        const src = set.reduce((s, c) => setAttr(s, c.name, 'show', c.show), p.source);
        if (src === p.source || sound(src) === before) continue;
        for (const { name, show } of set) {
          const one = setAttr(p.source, name, 'show', show);
          if (one !== p.source) expect(sound(one), `${key}: &${name} show=${show}`).toBe(before);
        }
        expect(sound(src), `${key}: show slot ${k} on every cell`).toBe(before); // (no one cell alone: together)
      }
    }
  }, 30_000); // (every show on every cell of every example)
});

describe('label=, and the rest of show=', () => {
  const tiny = '&m step=1\n&t step=&m 0 4 7\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
  it('label= names a cell; alone, it is a note in the graph (a # inside isn’t a comment)', () => {
    const r = compilePiece(tiny + '\n&why label="C major #1: a triad, arpeggiated" # a real comment\n&t2 label="the triad" step=&m 0');
    expect(r.cells.get('why')).toMatchObject({ label: 'C major #1: a triad, arpeggiated', note: true });
    expect(r.cells.get('t2')).toMatchObject({ label: 'the triad', note: false });
    expect(kindOf(r, 'why')).toBe('note');
    expect(compilePiece('&a label=hello').diagnostics[0].message).toMatch(/label= takes a text in quotes/);
  });
  it('notes sit at the top of the flow', () => {
    const r = compilePiece(tiny + '\n&why label="a note"');
    const ranks = flowRanks(buildGraph(r));
    expect(ranks.get('cell:why')).toBe(Math.max(...ranks.values()));
  });
  it('show=off hides a cell and its edges; show=petal hangs it from its user', () => {
    const src = '&m step=1\n&a 0 4\n&t step=&m &a 7\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
    const off = buildGraph(compilePiece(setAttr(src, 'a', 'show', 'off')));
    expect(off.nodes.some((n) => n.id === 'cell:a')).toBe(false);
    expect(off.edges.some((e) => e.source === 'cell:a' || e.target === 'cell:a')).toBe(false);
    const petal = buildGraph(compilePiece(setAttr(src, 'a', 'show', 'petal')));
    expect(petal.nodes.find((n) => n.id === 'cell:a')!.petalOf).toBe('cell:t');
    // and they're the cell's own: not passed down
    const r = compilePiece(setAttr(src, 't', 'show', 'off'));
    expect(effectiveShow(r, 'a').show).not.toBe('off');
  });
  it('show=levels: a volume as bars, as tall as its levels (decibels converted)', () => {
    const r = compilePiece('&m step=1\n&vol map=db step=&m show=levels 0 -6 -20\n&t step=&m 0\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &vol * &v]');
    const v = cellView(r, 'vol', codeShifts(r), false)!;
    expect(v.segments.map((s) => (s.bands[0].kind === 'level' ? +s.bands[0].v.toFixed(2) : null))).toEqual([1, 0.5, 0.1]);
  });
  it('naming conventions: notes:flats, notes:sharps, notes:german, do:fixed', () => {
    const n = (semis: number) => ({ semis, value: 0, alter: 0, lap: 12 });
    const C4 = 261.6256;
    expect(noteLabel('notes', n(10), C4, 0, 'flats')).toBe('B♭4');
    expect(noteLabel('notes', n(10), C4, 0, 'sharps')).toBe('A♯4');
    expect(noteLabel('notes', n(10), C4, 0, 'german')).toBe('B4'); // German B is B♭
    expect(noteLabel('notes', n(11), C4, 0, 'german')).toBe('H4');
    // fixed do: C is do whatever the key; movable do: the tonic is
    expect(noteLabel('do', n(7), C4, 7, 'fixed')).toBe('sol');
    expect(noteLabel('do', n(7), C4, 7, '')).toBe('do');
    expect(compilePiece('&t show=notes:klingon 0').diagnostics[0].message).toMatch(/flats, sharps or german/);
  });
  it('show=wave fits a voice', () => {
    const r = compilePiece(setAttr(tiny, 'v', 'show', 'wave'));
    expect(effectiveShow(r, 'v')).toMatchObject({ show: 'wave', from: 'set' });
  });
});

describe('show=lfo: what moves other cells', () => {
  it('a vibrato: 5 Hz, ±0.15 — a smooth swing round the ring', () => {
    const r = compilePiece(PRESETS.royal.source);
    const vib = [...r.cells.values()].find((c) => c.lambda?.startsWith('map=lin loop=5'))!.name;
    expect(kindOf(r, vib)).toBe('lfo');
    expect(effectiveShow(r, vib).show).toBe('lfo');
    expect(hubLabel(r, vib, codeShifts(r), false, null)).toEqual({ big: '5 Hz', small: '±0.15' });
    const w = cellView(r, vib, codeShifts(r), false)!.wave!;
    expect(w).toHaveLength(96);
    // 0 .15 0 -.15 0, gliding: it starts in the middle, peaks a fifth of the way round, and is lowest at three fifths
    expect(w[0]).toBeCloseTo(0.5, 6);
    expect(w.indexOf(Math.max(...w))).toBe(19);
    expect(w.indexOf(Math.min(...w))).toBe(58);
    expect(Math.max(...w)).toBeCloseTo(1, 1);
  });
  it('a breath on the bar: 24 beats a cycle, 0.1 to 1', () => {
    const r = compilePiece((PRESETS as Record<string, { source: string }>).cellscape.source);
    expect(hubLabel(r, 'breath', codeShifts(r), false, null)).toEqual({ big: '24 beats', small: '0.1–1' });
  });
  it('a wave on a tap of the bar counts in the bar’s beats: eight eighths, 4 beats (decision 040)', () => {
    const r = compilePiece('&bar scan(1 1 1 1) step=90bpm\n&w map=lin step=8n 0 .5 1 .5 0 -.5 -1 -.5\n&v s=sine loop=C4 lpf=200..2000 * &w\n&out map=sample [&v]');
    expect(lfoValues(r, 'w', codeShifts(r))?.rate).toBe('4 beats');
  });
  it('playing, its phase runs', () => {
    const r = compilePiece((PRESETS as Record<string, { source: string }>).cellscape.source);
    const at = (t: number) => liveAt(r, codeShifts(r), new Set(), t).cells.get('breath')!.local!;
    expect(at(10)).toBeGreaterThan(at(5));
    // it oscillates; it doesn't turn like a table (its range stays its own)
    expect(liveAt(r, codeShifts(r), new Set(), 30).shifts('breath')).toBe(0);
  });
});

describe("a voice's grid, and where a note it sounds is on it", () => {
  const r = compilePiece(`&edo19 cycle=19 map=edo
&bar scan(1 1 1 1) step=1
&a step=4n 0 2 4
&b over=&edo19 step=4n 0 3 6
&v1 s=sine loop=C4
&v2 s=saw loop=C4
&both [&a * &v1, &b * &v2]
&out map=sample [&both * .3]`);
  it('gridOf: heardGrid with its cycle; null where heardGrid is', () => {
    expect(gridOf(r, 'v1')).toEqual({ name: 'fifths12TET', cycle: 12 });
    expect(gridOf(r, 'v2')).toEqual({ name: 'edo19', cycle: 19 });
    expect(gridOf(r, 'both')).toBeNull();
  });
  it("heardPosition: from the voice's pitch 0, on the grid; null without a note, a grid or a pitch 0", () => {
    const base = r.cells.get('v1')!.freq;
    expect(heardPosition(r, 'v1', gridOf(r, 'v1'), base * Math.pow(2, 7 / 12))).toBeCloseTo(7);
    expect(heardPosition(r, 'v2', gridOf(r, 'v2'), base * 2)).toBeCloseTo(19);
    expect(heardPosition(r, 'v1', gridOf(r, 'v1'), null)).toBeNull();
    expect(heardPosition(r, 'v1', gridOf(r, 'v1'), 0)).toBeNull();
    expect(heardPosition(r, 'v1', null, base)).toBeNull();
    expect(heardPosition(r, 'nothing', gridOf(r, 'v1'), base)).toBeNull();
  });
});
