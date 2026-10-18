import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { PRESETS } from '@yggi/cells/engine/presets';
import { lapOf } from '@yggi/cells/engine/readers';
import { cellView, drawnOf, type CellView, type Segment } from './cellview';
import { BORDER } from './coarse';
import { noteFrame } from './show';
import { layTrack } from './track';
import { wheelGeometry } from './wheel';
import {
  SlotCache,
  accessedOf,
  barrelNow,
  barrelPins,
  beatLabels,
  borderOf,
  brightnessOf,
  bulbLabels,
  clockTicks,
  firstOf,
  handOf,
  hubGears,
  hubSlots,
  lfoDotOf,
  lfoPathOf,
  litSet,
  litSteps,
  litSections,
  markerOf,
  plainTicks,
  readAt,
  segmentPaths,
  sieveOf,
  spaceOf,
  stepLabels,
  stepUnits,
  sectionCursors,
  tapDots,
  sectionRings,
  sectionSuffix,
} from './glyph';

// Each cell as CellGlyph draws it in the graph, on a 128 px wheel: its view (what it draws: a gate's trigger's, a read
// head's tape's), its track when it has bulbs.
const g = wheelGeometry(128);
const view = (r: CompileResult, name: string, isMeter = false): CellView => cellView(r, drawnOf(r, name), codeShifts(r), isMeter)!;
const trackOf = (v: CellView) => (v.bulbs?.length ? layTrack(g.c, g.c, (g.rInner + g.rOuter) / 2, g.rOuter - g.rInner, v.bulbs) : null);

const pop = compileSource(PRESETS.pop.source);
const transpose = compileSource(PRESETS.transpose.source);

describe('a table of sections (Pop’s &sections: &bassBar &keysBar …)', () => {
  const parts = view(pop, 'sections');
  const track = trackOf(parts);
  const cell = pop.cells.get('sections');
  it('its bulbs are named by their sections, less what all of them end in', () => {
    expect(sectionSuffix(['hatsBar', 'beatBar', 'bassBar'])).toBe('Bar');
    // (each keeps two letters of its own; none in common, or none at all: nothing)
    expect(sectionSuffix(['aBar', 'bBar'])).toBe('ar');
    expect(sectionSuffix(['x', 'y'])).toBe('');
    expect(sectionSuffix([])).toBe('');
    const bulbs = bulbLabels(pop, track, true, 'Bar');
    expect(bulbs.map((b) => b.text)).toEqual(['bass', 'keys', 'hook', 'hats', 'beat', 'end']);
    expect(bulbs.map((b) => b.font)).toEqual([7.9, 7.9, 7.9, 7.9, 7.9, 10.5]);
    expect(bulbs.every((b) => b.sub === '' && b.outline === null)).toBe(true);
    // (they fit inside: nothing round a rim)
    expect(bulbs.every((b) => b.rim === null)).toBe(true);
    // (a name too long for its bulb goes round its rim, at a readable size)
    const long = bulbLabels(pop, track, true, '').filter((b) => b.rim);
    expect(long.length).toBeGreaterThan(0);
    for (const b of long) expect([b.font, b.rim!.font >= 7, b.rim!.d.startsWith('M ')]).toEqual([null, true, true]);
  });
  it('lit where its selector has a section on; each ring its part’s, a hand across those on', () => {
    const key = litSections(parts, cell, new Set(['cell:beatBar', 'cell:keysBar']));
    expect(key).toBe('1,4');
    expect(litSections(parts, cell, undefined)).toBe('');
    const rings = sectionRings(bulbLabels(pop, track, true, 'Bar'), parts, 6, litSet(key));
    expect(rings.map((t) => [t.part, t.parts, t.on])).toEqual([
      [0, 6, false],
      [1, 6, true],
      [2, 6, false],
      [3, 6, false],
      [4, 6, true],
      [5, 6, false],
    ]);
    const hands = sectionCursors(rings, g);
    expect(hands).toHaveLength(2);
    // (from the hub's edge)
    const [x, y] = hands[0]!.split(' ').slice(1, 3).map(Number);
    expect(Math.hypot(x! - g.c, y! - g.c)).toBeCloseTo(g.rHub);
  });
  it('no plain ticks', () => expect(plainTicks(parts, spaceOf(parts, false), true, g)).toEqual([]));
});

describe('a selector’s barrel (Pop’s &song, show=matrix)', () => {
  const song = view(pop, 'song');
  it('a ring per part, a pin where a step picks it', () => {
    const pins = barrelPins(song, g);
    expect(pins).toHaveLength(60); // (6 parts × 10 sections)
    expect(pins.filter((p) => p.on)).toHaveLength(34);
    expect(pins[0]).toEqual({
      d: 'M 64.862 29.711 A 34.3 34.3 0 0 1 83.457 35.753 L 81.88 38.042 A 31.52 31.52 0 0 0 64.792 32.49 Z',
      // (the bass's row: the intro is keys and hats)
      on: false,
      step: 0,
      row: 0,
      rows: 6,
    });
  });
  it('the section under the playhead; stopped, none', () => {
    expect(barrelNow(song, 0.15)).toBe(1);
    expect(barrelNow(song, null)).toBe(-1);
    expect(barrelNow(view(pop, 'major'), 0.15)).toBe(-1);
  });
});

describe('a table that selects (Pop’s &major, from the 12)', () => {
  const major = view(pop, 'major');
  it('drawn by pitch: its hub’s slots, the ones it takes held, each wired to its entry', () => {
    expect(spaceOf(major, false)).toBe('pitch');
    expect(hubSlots(major, g).map((s) => s.held)).toEqual([true, false, true, false, true, true, false, true, false, true, false, true]);
    const gears = hubGears(major, g);
    expect(gears).toHaveLength(7);
    expect(gears[0]).toEqual({ d: 'M64.0,40.2 Q64.0,36.7 64.0,33.3', fill: { kind: 'pitch', hue: 0, octave: 0 } });
  });
  it('its taps round the rim, the first under the marker, outlined; the steps it leaves out sieved', () => {
    const taps = tapDots(major, g);
    expect(taps).toHaveLength(7);
    expect(taps[0]).toMatchObject({ x: 64, fill: { kind: 'pitch', hue: 0 } });
    expect(taps[0]!.y).toBeCloseTo(g.c - g.rTap);
    expect(markerOf(major, 0, g, 128)).toBe('M59.52,-3.84 L68.48,-3.84 L64,8 Z');
    expect(firstOf(major, g)).toBe('M 49.247 8.942 A 57 57 0 0 1 104.305 23.695 L 85.722 42.278 A 30.72 30.72 0 0 0 56.049 34.327 Z');
    // (the five whole steps of the major scale)
    expect(sieveOf(major, 'pitch', g)).toHaveLength(5);
    expect(sieveOf(major, null, g)).toEqual([]);
  });
  it('the entries being read: a dot in each (its entry, round the detents)', () => {
    expect([...accessedOf(major, '0,9')]).toEqual([0, 2]);
    expect(accessedOf(major, '')).toEqual(new Set());
    const at = readAt(major.segments[0]!, g);
    expect(at.x).toBeCloseTo(g.c);
    expect(g.c - at.y).toBeCloseTo(g.rInner + (g.rOuter - g.rInner) * 0.22);
    // (a braid's: none)
    expect(accessedOf(view(transpose, 'theme'), '0')).toEqual(new Set());
  });
  it('no playhead', () => expect(handOf(major, () => 3, 1)).toBeNull());
});

describe('a braid (Transpose’s &theme, show=notes)', () => {
  const theme = view(transpose, 'theme');
  it('each step named on the ring; the sheet’s tokens instead when it has them', () => {
    expect(stepLabels(theme, null, g, noteFrame(transpose, 'theme'), undefined).map((l) => l.text)).toEqual(['E4', 'G4', 'B4', 'E5', 'B4', 'G4', 'E4']);
    expect(stepLabels(theme, null, g, noteFrame(transpose, 'theme'), ['0'])).toEqual([]);
  });
  it('drawn by time: its rim a clock, a tick a step, the first and every fourth long', () => {
    expect(spaceOf(theme, false)).toBe('time');
    const ticks = clockTicks(theme, 'time', null, g);
    expect(ticks).toHaveLength(8);
    expect(ticks.map((t) => t.long)).toEqual([true, false, false, false, true, false, false, false]);
    expect(plainTicks(theme, 'time', false, g)).toEqual([]);
  });
  it('the step under the playhead lit; its hand, in turns', () => {
    expect(litSteps(theme, () => 0.3)).toBe('2');
    expect(litSteps(theme, () => null)).toBe('');
    // (a wheel without a playhead does not read where it would be)
    const never = () => {
      throw new Error('read');
    };
    expect(litSteps(view(pop, 'major'), never)).toBe('');
    expect(handOf(view(pop, 'major'), never, 1)).toBeNull();
    expect(lfoDotOf(theme, never, 1, g)).toBeNull();
    expect(litSet('2')).toEqual(new Set([2]));
    expect(litSet('')).toEqual(new Set());
    expect(lapOf(transpose, 'theme')).toBe(8);
    expect(handOf(theme, () => 3, 8)).toBe(0.375);
    expect(handOf(theme, () => null, 8)).toBeNull();
  });
  it('a marker only once it is turned', () => {
    expect(markerOf(theme, 0, g, 128)).toBeNull();
    expect(markerOf(theme, 1, g, 128)).not.toBeNull();
  });
});

describe('a braid with splices (#221)', () => {
  it('Pachelbel’s &line: its steps named along its track, its unnamed bulbs without a name', () => {
    const p = compileSource(PRESETS.pachelbel.source);
    const line = view(p, 'line');
    const track = trackOf(line);
    expect(track).not.toBeNull();
    expect(stepLabels(line, track, g, noteFrame(p, 'line'), undefined).map((l) => l.text)).toEqual([
      'F♯5',
      'E5',
      'D5',
      'C♯5',
      'B4',
      'A4',
      'B4',
      'C♯5',
      'D5',
      'C♯5',
      'B4',
      'A4',
      'G4',
      'F♯4',
      'G4',
      'E4',
    ]);
    expect(bulbLabels(p, track, false, '').map((b) => b.text)).toEqual(['', '', '']);
  });
  it('Twinkle’s &tune in its sheet: a token on each written step, none while the text is a step ahead', () => {
    const t = compileSource(PRESETS.twinkle.source);
    const tune = view(t, 'tune');
    const tokens = t.cells.get('tune')!.units.map((_, i) => `t${i}`);
    const units = stepUnits(tune, tokens, tokens.length, 0, trackOf(tune), g);
    expect(units.map((u) => [u.written, u.text, u.font])).toEqual([
      [0, 't0', 15],
      [1, 't1', 15],
      [2, 't2', 15],
      [3, 't3', 15],
      [4, 't4', 15],
    ]);
    // (turned one: each span's token the one written a step on)
    expect(stepUnits(tune, tokens, tokens.length, 1, trackOf(tune), g).map((u) => u.written)).toEqual([1, 2, 3, 4, 0]);
    expect(stepUnits(tune, tokens, tokens.length + 1, 0, trackOf(tune), g)).toEqual([]);
  });
});

describe('the segments’ paths (#41)', () => {
  const theme = view(transpose, 'theme');
  it('a band each, on the ring; the border as ever unless the cap merged them', () => {
    expect(segmentPaths(theme.segments[0]!, g, null)).toHaveLength(1);
    expect(borderOf(theme.segments[0]!, false)).toBe(BORDER);
    expect(borderOf({ ...theme.segments[0]!, t0: 0, t1: 0.001 }, true)).toBe(0);
  });
  it('kept, the very same array, while the layout is the same: a turn changes the fills, not the paths', () => {
    const cache = new SlotCache();
    let laid = 0;
    const lay = (s: Segment) => (laid++, { d: segmentPaths(s, g, null), w: BORDER });
    const a = cache.slots('k', theme.segments, lay);
    expect(laid).toBe(7);
    const turned = theme.segments.map((s) => ({ ...s, bands: s.bands.map(() => ({ kind: 'pitch' as const, hue: 90 })) }));
    expect(cache.slots('k', turned, lay)).toBe(a);
    expect(laid).toBe(7);
    // (one segment longer: that one laid out again, the rest kept)
    const longer = theme.segments.map((s, i) => (i === 6 ? { ...s, t1: s.t1 + 0.01 } : s));
    const b = cache.slots('k', longer, lay);
    expect(b).not.toBe(a);
    expect(laid).toBe(8);
    expect(b.slice(0, 6)).toEqual(a.slice(0, 6));
    expect(b[0]).toBe(a[0]);
    // (another key: all of them)
    cache.slots('other', longer, lay);
    expect(laid).toBe(15);
  });
});

describe('the rest of what a wheel can be', () => {
  it('show=brightness (the golden graph’s &blues): each degree by the brightness of the mode on it', () => {
    const golden = compileSource(readFileSync('tools/gallery/golden/golden.cells', 'utf8'));
    expect(brightnessOf(view(golden, 'blues'))).toEqual([0.5, 0, 0, 0.5, 1, 0.5]);
    expect(brightnessOf(view(pop, 'major'))).toBeNull();
  });
  it('show=lfo (Royal’s): a cycle round the ring, a dot at its phase while it plays', () => {
    const royal = compileSource(PRESETS.royal.source);
    const lfo = view(royal, 'λ12_79');
    expect(lfoPathOf(lfo, g)!.startsWith('M64.0,20.1 L66.9,19.7 L69.9,19.5 ')).toBe(true);
    expect(lfoPathOf(lfo, g)!.endsWith('Z')).toBe(true);
    expect(lfoDotOf(lfo, () => 0, royal.cells.get('λ12_79')!.steps, g)).toEqual({ x: 64, y: 20.14 });
    expect(lfoDotOf(lfo, () => null, 1, g)).toBeNull();
    expect(lfoPathOf(view(pop, 'major'), g)).toBeNull();
  });
  it('a meter (Pop’s &bar): its beats numbered, from 64 px; drawn in a space of its own', () => {
    const bar = view(pop, 'bar', true);
    expect(beatLabels(bar, true, 128, g).map((l) => l.text)).toEqual(['1', '2', '3', '4']);
    expect(beatLabels(bar, true, 44, g)).toEqual([]);
    expect(beatLabels(bar, false, 128, g)).toEqual([]);
    expect(spaceOf(bar, true)).toBeNull();
  });
});
