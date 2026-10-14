import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SAILOR_WITH_KIT } from '../engine/fixtures';
import { compileSource } from '../engine/compile';
import { codeShifts, type Shifts } from '../engine/program';
import { blank, cellView, drawnOf, hubLabel, isGrid, type CellView } from './cellview';
import { PRESETS } from '../engine/presets';

const r = compileSource(PRESETS.royal.source);
const with_ =
  (o: Record<string, number>): Shifts =>
  (n) =>
    o[n] ?? codeShifts(r)(n);

describe('cellView', () => {
  it('an unplayed set of entries in its own order is a table, drawn evenly (the circle of fifths); a curve or a motif with a repeat stays a braid', () => {
    const q = compileSource('&circle fifths()\n&curve 0 1 .3 -1\n&tune 0 2 4 2\n&wide 0 7 14');
    const mode = (n: string) => cellView(q, n, codeShifts(q), false)?.mode;
    expect(['circle', 'curve', 'tune', 'wide'].map(mode)).toEqual(['grid', 'braid', 'braid', 'braid']);
    // (evenly round, in its own order)
    expect(cellView(q, 'circle', codeShifts(q), false)?.taps?.slice(0, 3)).toEqual([0, 1 / 12, 2 / 12]);
  });
  it('draws tables as grids and melodies as braids', () => {
    expect(['fifths12TET', 'bar', 'key', 'scale'].map((n) => isGrid(r, n))).toEqual([true, true, true, true]);
    expect(['theme', 'pedal'].map((n) => cellView(r, n, codeShifts(r), false)!.mode)).toEqual(['braid', 'braid']);
  });

  it('is null for a name the program does not have', () => {
    expect(cellView(r, 'noSuchCell', codeShifts(r), false)).toBeNull();
  });

  it('places scale entries on the 12-grid, each slot centred on its tap', () => {
    const v = cellView(r, 'scale', codeShifts(r), false)!;
    expect(v.mode).toBe('grid');
    expect(v.ticks).toBe(12);
    expect(v.detents).toBe(7);
    expect(v.segments.map((s) => Math.round(s.at! * 12))).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(v.segments[0].t0).toBeCloseTo(-0.5 / 12);
    expect(v.taps!.map((t) => Math.round(t * 12))).toEqual([0, 2, 3, 5, 7, 8, 10]);
  });

  it('the ring turns: the entry now first sits under the marker, its taps ride it (pattern) or stay (equal)', () => {
    // turned one: the same seven notes, the next one on top — its steps from there
    const rotated = cellView(r, 'scale', with_({ scale: 1 }), false)!;
    expect(rotated.segments.find((s) => s.index === 0)!.at).toBeCloseTo(0);
    expect(rotated.taps!.map((t) => Math.round(t * 12))).toEqual([0, 1, 3, 5, 6, 8, 10]);
    const key = cellView(r, 'key', with_({ key: 3 }), false)!;
    expect(key.segments[0]).toMatchObject({ index: 0 });
    expect(key.taps!.map((t) => Math.round(t * 12))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    const equal = compileSource('&key shift=2\n&mode over=&key scan(2 2 1 2 2 2 1) shift=1 show=equal\n&lead over=&mode 0 2 4');
    expect(cellView(equal, 'mode', codeShifts(equal), false)!.taps).toEqual([0, 1, 2, 3, 4, 5, 6].map((j) => j / 7));
  });

  it('a mode’s hub: the key’s 12 coming in as the key pushes them, the 7 it takes lit, each wired to its entry', () => {
    const b = compileSource('&key shift=2\n&mode over=&key scan(2 2 1 2 2 2 1) shift=1');
    const v = cellView(b, 'mode', codeShifts(b), false)!;
    const hub = v.hub!;
    expect(hub.slots).toHaveLength(12);
    expect(hub.slots.map((sl) => sl.held)).toEqual([true, false, true, false, true, true, false, true, false, true, false, true]);
    // (slot 0 is the key's first, D; the mode's first, E — the key's slot 2 — is under the marker)
    const hue = (f: { kind: string; hue?: number }) => (f.kind === 'pitch' ? f.hue : null);
    expect(hue(hub.slots[0].fill)).toBe(60);
    expect(hub.slots[2].t0 + hub.slots[2].t1).toBeCloseTo(0);
    expect(hub.gears.map((g) => hue(g.fill))).toEqual([4, 6, 7, 9, 11, 1, 2].map((p) => p * 30));
    expect(hub.gears.every((g, j) => Math.abs(g.to - v.taps![j]) < 1e-9 && Math.abs(((g.from - g.to + 1.5) % 1) - 0.5) < 1e-9)).toBe(true);
    // a key of all twelve takes every slot: no hub to show
    expect(cellView(b, 'key', codeShifts(b), false)!.hub).toBeUndefined();
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

describe('a table of taps', () => {
  it('counts its taps as paths at its hub, not steps', () => {
    const src = readFileSync('tools/gallery/golden/golden.cells', 'utf8');
    const r = compileSource(src);
    expect(hubLabel(r, 'parts', codeShifts(r), false, null)).toEqual({ big: '2', small: 'paths' });
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
    const r2 = compileSource('&m step=1\n&s scan(2 1 2 2 1 2 2)\n&pedal over=&s step=&m*2 0\n&v loop=65\n&mix_ [&pedal * &v]\n&out_ loop=44k map=sample &mix_');
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
  for (const [cell, delta] of [
    ['key', 1],
    ['key', -2],
    ['scale', 1],
  ] as const)
    it(`a table turns as a braid does: royal &${cell} turned ${delta}, turned back by the start angle, is the old one`, () => {
      const r = compileSource(PRESETS.royal.source);
      const at = (n: number) => cellView(r, cell, (x) => (x === cell ? n : codeShifts(r)(x)), false)!;
      const old = at(0);
      const k = ((delta % old.detents) + old.detents) % old.detents;
      const first = old.segments.find((sg) => sg.index === k)!.at!;
      const turn = delta > 0 ? first : first - 1;
      for (let i = 0; i < 48; i++) {
        const t = (i + 0.5) / 48;
        expect(colourAt(at(delta), t - turn), `at ${t}`).toBe(colourAt(old, t));
      }
    });
});

describe('drawnOf', () => {
  it('a gate draws its trigger’s braid, a read head its tape’s source, any other cell its own', () => {
    const gate = compileSource(PRESETS.gate.source);
    expect([drawnOf(gate, 'leadOut'), drawnOf(gate, 'drumOut')]).toEqual(['tune', 'beat']);
    const tape = compileSource(PRESETS.echotape.source);
    expect(['near', 'mid', 'far'].map((n) => drawnOf(tape, n))).toEqual(['tune', 'tune', 'tune']);
    expect(drawnOf(r, 'theme')).toBe('theme');
    expect(drawnOf(r, 'noSuchCell')).toBe('noSuchCell');
  });
});

describe('a 0 that means nothing but now is white (decision 036)', () => {
  const of = (key: keyof typeof PRESETS) => compileSource(PRESETS[key].source);
  it("is white where another value would change nothing: a section's clock, a groove of one drum", () => {
    const pop = of('pop');
    expect(blank(pop, 'bassBar')).toBe(true);
    expect(blank(of('korobeiniki'), 'hats')).toBe(true);
    const bands = cellView(pop, 'bassBar', codeShifts(pop), false)!.segments.flatMap((s) => s.bands);
    expect(bands.every((b) => b.kind !== 'pitch' || b.unit)).toBe(true);
  });
  it('stays red where the 0 is a pitch or a choice: played on a voice, spliced, another drum; any other value is a value', () => {
    expect(blank(of('hypercell'), 'off')).toBe(false);
    expect(blank(of('waltz'), 'I')).toBe(false);
    expect(blank(of('bossa'), 'rim')).toBe(false);
    expect(blank(of('pop'), 'hats')).toBe(false);
  });
});
