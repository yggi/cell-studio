import { describe, expect, it } from 'vitest';
import { SAILOR_WITH_KIT } from '../engine/fixtures';
import { compileSource } from '../engine/compile';
import { codeShifts, type Shifts } from '../engine/program';
import { cellView, hubLabel, isGrid, type CellView } from './cellview';
import { PRESETS } from '../engine/presets';

const r = compileSource(PRESETS.royal.source);
const with_ =
  (o: Record<string, number>): Shifts =>
  (n) =>
    o[n] ?? codeShifts(r)(n);

describe('cellView', () => {
  it('draws tables as grids and melodies as braids', () => {
    expect(['fifths12TET', 'bar', 'key', 'scale'].map((n) => isGrid(r, n))).toEqual([true, true, true, true]);
    expect(['theme', 'pedal'].map((n) => cellView(r, n, codeShifts(r), false)!.mode)).toEqual(['braid', 'braid']);
  });

  it('is null for a name the program does not have', () => {
    expect(cellView(r, 'noSuchCell', codeShifts(r), false)).toBeNull();
  });

  it('places scale entries on the 12-grid, so turning reshapes it', () => {
    const v = cellView(r, 'scale', codeShifts(r), false)!;
    expect(v.mode).toBe('grid');
    expect(v.ticks).toBe(12);
    expect(v.detents).toBe(7);
    expect(v.segments.map((s) => Math.round(s.t0 * 12))).toEqual([0, 2, 3, 5, 7, 8, 10]);
    // shifting rotates: the same seven notes, entry 0 now on D
    const rotated = cellView(r, 'scale', with_({ scale: 1 }), false)!;
    expect(rotated.segments.map((s) => Math.round(s.t0 * 12))).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(rotated.segments.find((s) => s.index === 0)!.t0).toBeCloseTo(2 / 12);
  });

  it('a turned key rotates its ring and keeps entry 0 identifiable', () => {
    const v = cellView(r, 'key', with_({ key: 3 }), false)!;
    expect(v.segments[0]).toMatchObject({ index: 9 }); // entry 9 → position 12 ≡ 0
    expect(v.segments.find((s) => s.index === 0)!.t0).toBeCloseTo(3 / 12);
  });

  it('agogic time cells show bent beats with the downbeat marked', () => {
    const v = cellView(r, 'bar', codeShifts(r), true)!;
    expect(v.segments.map((s) => +(s.t1 - s.t0).toFixed(2))).toEqual([0.27, 0.23, 0.26, 0.24]);
    expect(v.segments[0].bands[0]).toEqual({ kind: 'beat', down: true });
  });

  it('braids lay slots out by duration', () => {
    const v = cellView(r, 'theme', codeShifts(r), false)!;
    expect(v.mode).toBe('braid');
    expect(v.ticks).toBe(20);
    expect(v.segments[0]).toMatchObject({ t0: 0, t1: 0.1 });
    expect(v.segments[5].bands[0]).toEqual({ kind: 'rest' });
  });
});

describe('hubLabel', () => {
  it('names keys, modes, meters and the grid', () => {
    expect(hubLabel(r, 'key', with_({ key: 3 }), false, null)).toEqual({ big: 'E♭', small: '' });
    expect(hubLabel(r, 'scale', codeShifts(r), false, null)).toEqual({ big: 'Aeolian', small: 'on C' });
    expect(hubLabel(r, 'scale', with_({ scale: 3 }), false, null)).toEqual({ big: 'Dorian', small: 'on F' }); // rotated: F Dorian, same notes
    expect(hubLabel(r, 'bar', codeShifts(r), true, null)).toEqual({ big: '84', small: 'bpm, 4/bar' }); // at rest: its tempo;
    expect(hubLabel(r, 'bar', codeShifts(r), true, 2)).toEqual({ big: '3', small: '4/bar' });
    expect(hubLabel(r, 'fifths12TET', codeShifts(r), false, null)).toEqual({ big: '12', small: 'grid' });
    expect(hubLabel(r, 'theme', codeShifts(r), false, null)).toEqual({ big: '20', small: 'steps' });
  });
});

describe('kits and voices', () => {
  it('draws a kit as its voices', () => {
    const r2 = compileSource('&bd s=sine step=55\n&sd s=white\n&kit &bd &sd');
    expect(cellView(r2, 'kit', codeShifts(r2), false)!.segments).toHaveLength(2);
    expect(hubLabel(r2, 'kit', codeShifts(r2), false, null)).toEqual({ big: '2', small: 'voices' });
  });
});

describe('voices', () => {
  it('draws a voice’s braid as its steps (a waveform), not as a set on the grid', () => {
    const r2 = compileSource('&v loop=440 0 1\n&m step=1\n&t step=&m 0\n&mix_ [&t * &v]\n&out_ loop=44k map=sample &mix_');
    expect(cellView(r2, 'v', codeShifts(r2), false)!.mode).toBe('braid');
    expect(hubLabel(r2, 'v', codeShifts(r2), false, null)).toEqual({ big: '2', small: 'steps' });
  });
});

describe('played cells', () => {
  it('a one-step braid that is played is drawn as a braid (with a hand), not as a set', () => {
    const r2 = compileSource('&m step=1\n&s scan(2 1 2 2 1 2 2)\n&pedal over=&s step=&m/2 0\n&v loop=65\n&mix_ [&pedal * &v]\n&out_ loop=44k map=sample &mix_');
    expect(cellView(r2, 'pedal', codeShifts(r2), false)!).toMatchObject({ mode: 'braid', segments: [{ t0: 0, t1: 1 }] });
    expect(hubLabel(r2, 'pedal', codeShifts(r2), false, null)).toEqual({ big: '1', small: 'step' });
    // the same braid used as a table stays a grid
    const r3 = compileSource('&t 0\n&x over=&t 0 1');
    expect(cellView(r3, 't', codeShifts(r3), false)!.mode).toBe('grid');
  });
});

describe('braids made of references', () => {
  it('carry the colours of what they reference, transitively, through their own table', () => {
    const r2 = compileSource(SAILOR_WITH_KIT);
    const hues = (n: string) => cellView(r2, n, codeShifts(r2), false)!.segments.map((s) => s.bands.map((b) => (b.kind === 'pitch' ? b.hue : b.kind)));
    // &A = &m1 &m2: eight coloured notes, no grey reference slots
    expect(hues('A')).toHaveLength(8);
    expect(
      hues('A')
        .flat()
        .every((h) => typeof h === 'number'),
    ).toBe(true);
    // &m1 is one note four times: four of the same colour
    expect(
      new Set(
        hues('A')
          .slice(0, 4)
          .map((h) => JSON.stringify(h)),
      ).size,
    ).toBe(1);
    // two levels down: &tune → &A → &m1
    expect(hues('tune').slice(0, 8)).toEqual(hues('A'));
    // read through &lead[<<], the same motifs take other colours
    expect(hues('B')).not.toEqual(hues('A'));
  });

  it('keeps rests as rests and chords as bands', () => {
    const r2 = compileSource('&c [0,4,7]\n&x 0 ~ &c');
    const v = cellView(r2, 'x', codeShifts(r2), false)!;
    expect(v.segments.map((s) => s.bands.length)).toEqual([1, 1, 3]);
    expect(v.segments[1].bands[0]).toEqual({ kind: 'rest' });
  });
});

describe('a turn eases from where the wheel was', () => {
  // the colour at a turn t (0 … 1) of a wheel's drawing
  const colourAt = (v: CellView, t: number) => {
    const x = ((t % 1) + 1) % 1;
    const s = v.segments.find((sg) => {
      const a = ((sg.t0 % 1) + 1) % 1;
      return (x - a + 1) % 1 < sg.t1 - sg.t0 - 1e-9;
    });
    // (pitch class and place: an entry turned into the next octave changes shade, not what it is)
    return s ? JSON.stringify(s.bands.map((b) => (b.kind === 'pitch' ? { kind: b.kind, hue: b.hue } : b))) : 'none';
  };
  // CellGlyph's start angle: the new first step's start in the old drawing (back a lap for a turn down)
  const start = (old: CellView, delta: number) => {
    const k = ((delta % old.detents) + old.detents) % old.detents;
    const first = old.segments.find((sg) => sg.index === k)!;
    return delta > 0 ? first.t0 : first.t0 - 1;
  };
  for (const [example, cell, delta] of [
    ['transpose', 'theme', 1],
    ['transpose', 'theme', -1],
    ['twinkle', 'down', 2],
  ] as const) {
    it(`${example} &${cell} turned ${delta > 0 ? '+' : ''}${delta}: the new drawing, turned back by the start angle, is the old one`, () => {
      const r = compileSource(PRESETS[example].source);
      const at = (n: number) => cellView(r, cell, (x) => (x === cell ? n : codeShifts(r)(x)), false)!;
      const old = at(0);
      const now = at(delta);
      const turn = start(old, delta);
      for (let k = 0; k < 64; k++) {
        const t = (k + 0.5) / 64;
        expect(colourAt(now, t - turn), `at ${t}`).toBe(colourAt(old, t));
      }
    });
  }
  it('a table’s entries stay where they are as it turns (only its hub changes)', () => {
    const r = compileSource(PRESETS.royal.source);
    const at = (n: number) => cellView(r, 'key', (x) => (x === 'key' ? n : codeShifts(r)(x)), false)!;
    for (let k = 0; k < 24; k++) expect(colourAt(at(1), (k + 0.5) / 24)).toBe(colourAt(at(0), (k + 0.5) / 24));
  });
});
