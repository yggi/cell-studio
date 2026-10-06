import { describe, expect, it } from 'vitest';
import { codeShifts, compileSource } from '../engine/compile';
import { eventsBetween, plan } from '../engine/realize';
import { liveAt } from '../engine/live';
import { setAttr } from '../engine/edit';
import { PRESETS } from '../engine/presets';
import { cellView, hubLabel } from './cellview';
import { buildGraph } from '../engine/graph';
import { flowRanks } from './physics';
import { FITS, effectiveShow, inferShow, kindOf, noteLabel, tonicOf, voiceBase } from './show';

const twinkle = (show: string) => setAttr(PRESETS.twinkle.source, 'tune', 'show', show);
const labels = (src: string, cell: string) => {
  const r = compileSource(src);
  const v = cellView(r, cell, codeShifts(r), false);
  const base = voiceBase(r, cell);
  const tonic = tonicOf(r, cell);
  return v.segments.flatMap((s) => (s.notes?.length ? [noteLabel(v.show!, s.notes[s.notes.length - 1], base, tonic)] : []));
};

describe('show=', () => {
  it('reads one of the shows; says which when it isn’t', () => {
    expect(compileSource('&t show=do 0').cells.get('t')!.show).toBe('do');
    expect(compileSource('&t show=fancy 0').diagnostics[0].message).toMatch(/show= takes one of: braid pattern notes midi do/);
  });
  it('is the default for everything below: parts and tables — not a step driver', () => {
    const r = compileSource(twinkle('do'));
    expect(effectiveShow(r, 'tune')).toMatchObject({ show: 'do', from: 'set' });
    expect(effectiveShow(r, 'up')).toMatchObject({ show: 'do', from: 'tune' }); // a part
    expect(effectiveShow(r, 'mid')).toMatchObject({ show: 'do', from: 'tune' });
    expect(effectiveShow(r, 'scale')).toMatchObject({ show: 'do', from: 'tune' }); // its table
    expect(effectiveShow(r, 'bar').from).toBe('inferred'); // its meter: not below it
  });
  it('a show that doesn’t fit isn’t inherited: the cell keeps its own', () => {
    const r = compileSource(setAttr(PRESETS.twinkle.source, 'tune', 'show', 'pattern'));
    expect(FITS[kindOf(r, 'scale')]).not.toContain('pattern');
    expect(effectiveShow(r, 'scale').from).toBe('inferred');
  });
  it('infers what cells have always looked like', () => {
    const r = compileSource(PRESETS.royal.source);
    expect([inferShow(r, 'bar'), inferShow(r, 'key'), inferShow(r, 'scale'), inferShow(r, 'theme'), inferShow(r, 'lead')]).toEqual([
      'meter',
      'key',
      'scale',
      'braid',
      'spectrum',
    ]);
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
    const r = compileSource(twinkle('pattern'));
    expect(cellView(r, 'tune', codeShifts(r), false).segments.every((s) => s.bands.every((b) => b.kind !== 'pitch'))).toBe(true);
    const e = compileSource('&e map=adsr .01 .3 .5 .4');
    expect(cellView(e, 'e', codeShifts(e), false)).toMatchObject({ mode: 'curve', curve: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.4 } });
    const royal = compileSource(setAttr(PRESETS.royal.source, 'scale', 'show', 'mode'));
    expect(hubLabel(royal, 'scale', codeShifts(royal), false, null)).toEqual({ big: 'minor', small: 'on C' });
  });
  it('never changes the sound: every fitting show on every cell of every example', () => {
    const sound = (src: string) => {
      const r = compileSource(src);
      // (an unnamed cell's internal name has its column in it: compare what sounds, not that)
      return JSON.stringify(eventsBetween(plan(r, codeShifts(r)), 0, 3).map((x) => [x.at.toFixed(6), x.voice.replace(/^λ.*/, 'λ'), x.freq.toFixed(4)]));
    };
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      const before = sound(p.source);
      for (const c of r.cells.values()) {
        if (c.implicit || c.lambda) continue;
        for (const show of FITS[kindOf(r, c.name)]) {
          const src = setAttr(p.source, c.name, 'show', show);
          if (src === p.source) continue;
          expect(sound(src), `${key}: &${c.name} show=${show}`).toBe(before);
        }
      }
    }
  }, 60_000); // (every show on every cell of every example: a lot of compiling)
});

describe('label=, and the rest of show=', () => {
  const tiny = '&m step=1\n&t step=&m 0 4 7\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
  it('label= names a cell; alone, it is a note in the graph (a # inside isn’t a comment)', () => {
    const r = compileSource(tiny + '\n&why label="C major #1: a triad, arpeggiated" # a real comment\n&t2 label="the triad" step=&m 0');
    expect(r.cells.get('why')).toMatchObject({ label: 'C major #1: a triad, arpeggiated', note: true });
    expect(r.cells.get('t2')).toMatchObject({ label: 'the triad', note: false });
    expect(kindOf(r, 'why')).toBe('note');
    expect(compileSource('&a label=hello').diagnostics[0].message).toMatch(/label= takes a text in quotes/);
  });
  it('notes sit at the top of the flow', () => {
    const r = compileSource(tiny + '\n&why label="a note"');
    const ranks = flowRanks(buildGraph(r));
    expect(ranks.get('cell:why')).toBe(Math.max(...ranks.values()));
  });
  it('show=off hides a cell and its edges; show=petal hangs it from its user', () => {
    const src = '&m step=1\n&a 0 4\n&t step=&m &a 7\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
    const off = buildGraph(compileSource(setAttr(src, 'a', 'show', 'off')));
    expect(off.nodes.some((n) => n.id === 'cell:a')).toBe(false);
    expect(off.edges.some((e) => e.source === 'cell:a' || e.target === 'cell:a')).toBe(false);
    const petal = buildGraph(compileSource(setAttr(src, 'a', 'show', 'petal')));
    expect(petal.nodes.find((n) => n.id === 'cell:a')!.petalOf).toBe('cell:t');
    // and they're the cell's own: not passed down
    const r = compileSource(setAttr(src, 't', 'show', 'off'));
    expect(effectiveShow(r, 'a').show).not.toBe('off');
  });
  it('show=levels: a volume as bars, as tall as its levels (decibels converted)', () => {
    const r = compileSource('&m step=1\n&vol map=db step=&m show=levels 0 -6 -20\n&t step=&m 0\n&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &vol * &v]');
    const v = cellView(r, 'vol', codeShifts(r), false);
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
    expect(compileSource('&t show=notes:klingon 0').diagnostics[0].message).toMatch(/flats, sharps or german/);
  });
  it('show=wave fits a voice', () => {
    const r = compileSource(setAttr(tiny, 'v', 'show', 'wave'));
    expect(effectiveShow(r, 'v')).toMatchObject({ show: 'wave', from: 'set' });
  });
});

describe('show=lfo: what moves other cells', () => {
  it('a vibrato: 5 Hz, ±0.15 — a smooth swing round the ring', () => {
    const r = compileSource(PRESETS.royal.source);
    const vib = [...r.cells.values()].find((c) => c.lambda?.startsWith('map=lin loop=5'))!.name;
    expect(kindOf(r, vib)).toBe('lfo');
    expect(effectiveShow(r, vib).show).toBe('lfo');
    expect(hubLabel(r, vib, codeShifts(r), false, null)).toEqual({ big: '5 Hz', small: '±0.15' });
    const w = cellView(r, vib, codeShifts(r), false).wave!;
    expect(w).toHaveLength(96);
    // 0 .15 0 -.15 0, gliding: it starts in the middle, peaks a fifth of the way round, and is lowest at three fifths
    expect(w[0]).toBeCloseTo(0.5, 6);
    expect(w.indexOf(Math.max(...w))).toBe(19);
    expect(w.indexOf(Math.min(...w))).toBe(58);
    expect(Math.max(...w)).toBeCloseTo(1, 1);
  });
  it('a breath on the bar: 24 beats a cycle, 0.1 to 1', () => {
    const r = compileSource((PRESETS as Record<string, { source: string }>).cellscape.source);
    expect(hubLabel(r, 'breath', codeShifts(r), false, null)).toEqual({ big: '24 beats', small: '0.1–1' });
  });
  it('playing, its phase runs', () => {
    const r = compileSource((PRESETS as Record<string, { source: string }>).cellscape.source);
    const at = (t: number) => liveAt(r, codeShifts(r), new Set(), t).cells.get('breath')!.local!;
    expect(at(10)).toBeGreaterThan(at(5));
    // it oscillates; it doesn't turn like a table (its range stays its own)
    expect(liveAt(r, codeShifts(r), new Set(), 30).shifts('breath')).toBe(0);
  });
});
