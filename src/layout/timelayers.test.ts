import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { mainTempo, pieceTime, sections } from '@yggi/cells/engine/duration';
import { PRESETS } from '@yggi/cells/engine/presets';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { sectionsOver } from '@yggi/cells/engine/time/boundaries';
import { scalograms, SIGNALS, type Signal } from '@yggi/cells/engine/time/signals';
import { listening } from '@yggi/cells/engine/time/span';
import { structure } from '@yggi/cells/engine/time/structure';
import { explainLevels, sameLevel, writtenLevels } from './explained';
import { grid } from '@yggi/cells/engine/time/wavelet';
import { buildGraph } from './drawn';
import {
  cellSpans,
  familyHue,
  firstAt,
  foldOnto,
  heardLevelsOf,
  heardMarksOf,
  longestOf,
  meterOf,
  patternsOf,
  seconds,
  sectionGap,
  shownNotes,
  structureLanes,
  voiceRows,
  type CellSpan,
  type Named,
} from './timelayers';

/** The five levels heard most, each named after the level written within a semitone of it, if any (layout/explained.ts). */
function named(scal: Parameters<typeof heardLevelsOf>[0], periodic: boolean | undefined, p: { meter: Named[]; spans: CellSpan[] }) {
  const x = explainLevels(heardLevelsOf(scal, 'mix', periodic), writtenLevels(p.meter, p.spans), [0, Infinity]);
  return heardLevelsOf(scal, 'mix', periodic, 5).map((h) => ({ period: h.period, label: x.both.find((b) => sameLevel(b.heard.period, h.period))?.written.label ?? null }));
}

/** A piece as the time view takes it in (ui/TimeView.svelte): its length shown, its rounds, the notes listened to. */
function piece(key: keyof typeof PRESETS) {
  const program = compileSource(PRESETS[key].source);
  if (!program.ok) throw new Error(`${key} does not compile`);
  const time = pieceTime(program);
  const heard = listening(time);
  const length = Math.max(4, heard?.cycle ?? heard?.seconds ?? 30);
  const loop = (heard?.rounds ?? 1) > 1;
  const rounds = loop && time?.chance ? (heard?.rounds ?? 1) : 1;
  const listened = rounds > 1 ? Math.max(4, heard?.seconds ?? 30) : length;
  const planned = plan(program, codeShifts(program), new Set(program.off));
  const heardNotes = eventsBetween(planned, 0, listened);
  const notes = shownNotes(heardNotes, length, !!time?.chance && rounds > 1);
  const spans = cellSpans(program, buildGraph(program));
  const written = sectionsOver(sections(program) ?? [], length).filter((s) => s.at > 0 && s.at < length);
  const meter = meterOf(spans, mainTempo(program)?.cell, written);
  /** The scalograms as the worker makes them (ui/time.worker.ts). */
  const listenedScal = () => {
    const g = grid(listened, undefined, loop);
    const rows: Partial<Record<Signal, Float32Array[]>> = {};
    for (const [k, s] of Object.entries(scalograms(heardNotes, g, SIGNALS))) rows[k as Signal] = [...s.rows];
    return { window: listened, periods: g.periods, rows, periodic: loop };
  };
  return { program, planned, length, loop, rounds, listened, heardNotes, notes, spans, written, meter, listenedScal };
}
const round = (x: number, d = 4) => +x.toFixed(d);

describe('the time view: the notes and the cells', () => {
  it('Pop: one round of notes by start, its voices hued, its cells spanned, its meter', () => {
    const p = piece('pop');
    expect([p.length, p.loop, p.rounds, p.listened]).toEqual([96, false, 1, 96]);
    expect(p.notes.length).toBe(1502);
    expect(p.notes.every((e, i) => i === 0 || p.notes[i - 1]!.at <= e.at)).toBe(true);
    expect(longestOf(p.notes)).toBeCloseTo(2.4);
    // (the neutral zone's rows: each voice as first heard, ranked first by `rank`; its notes merged into spans)
    const rows = voiceRows(p.heardNotes, (v) => (v === 'lead' ? 0 : 1));
    expect(rows.map((r) => r.voice)).toEqual(['lead', 'hh', 'keys', 'bd', 'bass', 'sd']);
    expect(rows.every((r) => r.spans.every(([a, b], i) => b > a && (i === 0 || r.spans[i - 1]![1] < a)))).toBe(true);
    expect(p.spans.slice(0, 3).map((s) => [s.name, round(s.step), round(s.turn)])).toEqual([
      ['bar', 0.6, 2.4],
      ['chords', 0.3, 9.6],
      ['roots', 0.3, 9.6],
    ]);
    expect(p.spans.find((s) => s.name === 'song')).toMatchObject({ step: expect.closeTo(9.6), turn: expect.closeTo(96) });
    expect(p.written.length).toBe(10);
    expect(sectionGap(p.written)).toBeCloseTo(9.6);
    expect(p.meter.map((m) => [m.label, round(m.period)])).toEqual([
      ['beat', 0.6],
      ['bar', 2.4],
      ['section', 9.6],
    ]);
    expect(patternsOf(p.heardNotes, p.spans, p.listened, p.length)).toEqual({ motifs: [], folded: [] });
  });

  it('Korobeiniki: a loop of one round, its motifs at two scales folded onto it', () => {
    const p = piece('korobeiniki');
    expect([p.length, p.loop, p.rounds, p.listened]).toEqual([200, true, 1, 200]);
    expect(p.notes.length).toBe(2055);
    expect(longestOf(p.notes)).toBeCloseTo(5 / 3);
    const pt = patternsOf(p.heardNotes, p.spans, p.listened, p.length)!;
    expect(pt.motifs.map((m) => [m.shape, m.heard.length])).toEqual([
      ['-2 -2 -1 -2 | 1 1 1 1', 8],
      ['-1 -2 3 4 | 1 1 1 1', 8],
    ]);
    expect(pt.motifs.every((m) => m.heard.every((o) => o.at >= 0 && o.at < p.length))).toBe(true);
    expect(p.meter.map((m) => [m.label, round(m.period)])).toEqual([
      ['beat', 0.4167],
      ['bar', 1.6667],
      ['section', 13.3333],
    ]);
  });

  it('5 to 12: a day, metered by its sections alone; its foldings alike', () => {
    const p = piece('fiveto12');
    expect(p.length).toBe(86400);
    expect(p.notes.length).toBe(282240);
    expect(p.meter).toEqual([{ period: 7200, label: 'section' }]);
    expect(patternsOf(p.heardNotes, p.spans, p.listened, p.length)?.folded.map((f) => f.name)).toEqual(['2 2 2 1 2 2 1']);
  });

  it('Pachelbel: no sections, no section line; its structure in lanes', () => {
    const p = piece('pachelbel');
    expect(p.written).toEqual([]);
    expect(sectionGap(p.written)).toBeNull();
    expect(p.meter.map((m) => [m.label, round(m.period)])).toEqual([
      ['beat', 0.9091],
      ['bar', 3.6364],
    ]);
    const lanes = structureLanes(structure(p.planned, p.length));
    expect(lanes.length).toBe(176);
    expect(lanes.slice(0, 2).map((n) => [n.cell.replace(/^λ\d+_\d+$/, 'λ'), round(n.at, 3), round(n.to, 3), n.lane])).toEqual([
      ['line', 0, 21.818, 0],
      ['λ', 0, 7.273, 0], // (an unnamed cell: named by its line and column, which an edit above it moves)
    ]);
  });

  it('stacks overlapping nodes of one length in lanes, by start', () => {
    const node = (cell: string, at: number, to: number, depth = 1) => ({ cell, at, to, depth, output: 'out' });
    const laned = structureLanes([node('b', 1, 3), node('a', 0, 2), node('c', 2, 4), node('d', 0, 8, 0)]);
    expect(laned.map((n) => [n.cell, n.lane])).toEqual([
      ['d', 0],
      ['a', 0],
      ['b', 1],
      ['c', 0],
    ]);
    const k = piece('korobeiniki');
    expect(Math.max(...structureLanes(structure(k.planned, k.length)).map((n) => n.lane))).toBe(8);
  });

  it('finds the first note at or after a moment, hues a family by its name, writes a period short', () => {
    const ns = [0, 1, 1, 2, 5].map((at) => ({ at }));
    expect([-1, 0, 0.5, 1, 1.5, 5, 6].map((t) => firstAt(ns, t))).toEqual([0, 0, 1, 1, 3, 4, 5]);
    expect(firstAt([], 3)).toBe(0);
    expect(['tune', 'hook', 'a'].map(familyHue)).toEqual([familyHue('tune'), familyHue('hook'), (97 * 7) % 360]);
    expect(familyHue('')).toBe(0);
    expect([0.4167, 13.3, 7200].map(seconds)).toEqual(['0.42 s', '13 s', '120 min']);
  });
});

describe('the time view: what the scalogram hears', () => {
  it('Pop: the levels it hears most, named; the boundaries heard', { timeout: 60000 }, () => {
    const p = piece('pop');
    const l = p.listenedScal();
    const scal = foldOnto(l, p.length);
    expect(scal.window).toBe(96);
    expect(scal.periods.length).toBe(108);
    expect(scal.rows.envelope?.[0]?.length).toBe(4096);
    expect(named(scal, l.periodic, p).map((r) => [round(r.period, 3), r.label])).toEqual([
      [0.297, 'chords step'],
      [0.149, null],
      [0.595, 'beat'],
      [15.102, null],
      // (every signal's ridges weighed, not its three strongest: a fourth of one outweighs 1.19 s)
      [0.198, null],
    ]);
    expect(heardMarksOf(l, p.written, p.rounds, p.length).map((b) => round(b.at, 3))).toEqual([57.551, 9.574, 75.902, 47.121, 28.793, 86.543, 33.387]);
  });

  it('Korobeiniki: a loop, folded onto its round; the boundaries one where they agree', { timeout: 60000 }, () => {
    const p = piece('korobeiniki');
    const l = p.listenedScal();
    const scal = foldOnto(l, p.length);
    expect(named(scal, l.periodic, p).map((r) => [round(r.period, 3), r.label])).toEqual([
      [32, null],
      [0.21, 'tune step'],
      [0.105, null],
      [22.627, null],
      [0.07, null],
    ]);
    const marks = heardMarksOf(l, p.written, p.rounds, p.length);
    expect(marks.length).toBe(16);
    expect(marks.every((b, i) => marks.every((c, j) => i === j || Math.abs(b.at - c.at) > 1))).toBe(true);
  });
});
