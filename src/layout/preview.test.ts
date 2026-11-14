// A fragment heard alone, pictured by its facet (#623): one of each facet the seed library names, drawn from its text
// and the events its host plays.
import { describe, expect, it } from 'vitest';
import { catalogue } from '@yggi/cells/repository/catalogue';
import { auditionOf, compilePiece, heardOf } from '../compile';
import { controlsOf, pictureKind, pictureOf, type Picture } from './preview';

const pictured = (id: string): Picture => {
  const e = catalogue().find((x) => x.id === id)!;
  const { notes, bar } = heardOf(compilePiece(auditionOf(e.text).text));
  return pictureOf(e.facets, e.text, notes, bar);
};
const text = (id: string) => catalogue().find((x) => x.id === id)!.text;

describe('a fragment pictured by its facet', () => {
  it('draws a rhythm as a grid: a row per drum, its hits in the first bar’s sixteenths', () => {
    const p = pictured('techno_drums');
    if (p.kind !== 'grid') throw new Error(p.kind);
    const row = (voice: string) =>
      p.rows
        .find((r) => r.voice === voice)!
        .slots.map((v) => (v ? 'x' : '.'))
        .join('');
    // (four on the floor, less the fourth: the groove as written, `&bd ~ ~ ~ &bd …`)
    expect(row('bd')).toBe('x...x.......x...');
    expect(p.rows.every((r) => r.slots.length === 16 && r.slots.every((v) => v >= 0 && v <= 1))).toBe(true);
  });

  it('draws a line as a roll, a form as its sections lettered, a meter as its ticks, a band as its parts', () => {
    const roll = pictured('kinderlied/twinkle');
    expect(roll.kind === 'roll' && roll.notes.length).toBeGreaterThan(8);
    const form = pictured('ternary');
    expect(form.kind === 'sections' && form.sections.map((s) => s.letter).join('')).toBe('ABCCAB');
    const meter = pictured('meter');
    expect(meter.kind === 'ticks' && meter.ticks.map((t) => [t.x, t.strong])).toEqual([
      [0, true],
      [0.25, false],
      [0.5, false],
      [0.75, false],
    ]);
    const band = pictured('band');
    expect(band.kind === 'roles' && band.roles).toEqual(['drums', 'bass', 'pad', 'stab', 'lead']);
  });

  it('draws an instrument as the keys it is played on, the lit ones within them', () => {
    const p = pictured('lead');
    if (p.kind !== 'keys') throw new Error(p.kind);
    expect(p.lit.length).toBeGreaterThan(0);
    expect(p.lit.every((m) => m >= p.lo && m <= p.hi)).toBe(true);
    expect(p.lo % 12).toBe(0);
  });

  it('reads what it reads as controls: a module’s knobs, a style’s sliders, the text as written otherwise', () => {
    expect(pictureKind(['module'])).toBe('none');
    expect(controlsOf(text('lowpass')).slice(0, 2)).toEqual([
      { kind: 'knob', name: 'cutoff', value: 0.5 },
      { kind: 'knob', name: 'res', value: 0.3 },
    ]);
    const style = controlsOf(text('lead'))[0]!;
    expect(style.kind === 'sliders' && style.axes.length).toBeGreaterThanOrEqual(4);
    expect(controlsOf(text('meter'))[0]).toEqual({ kind: 'text', name: 'grouping', text: 'meter("4/4")' });
    // (a style alone plays nothing and reads nothing: no picture, no controls)
    expect([pictured('styles').kind, controlsOf(text('styles'))]).toEqual(['none', []]);
  });

  it('pictures every fragment of the seed library without throwing, each by its first facet', () => {
    for (const e of catalogue()) {
      const { notes, bar } = heardOf(compilePiece(auditionOf(e.text).text));
      // (a form whose head plays no sections by name is drawn as the roll it plays)
      expect([pictureKind(e.facets), 'roll'], e.id).toContain(pictureOf(e.facets, e.text, notes, bar).kind);
    }
  });
});
