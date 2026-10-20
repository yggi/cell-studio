import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { lastNoteAt } from '@yggi/cells/engine/values';
import { PRESETS } from '@yggi/cells/engine/presets';
import { cellView } from './cellview';
import { wheelGeometry } from './wheel';
import { curvePoints, envelopeAt, envelopeAxis, envelopeCrossing, envelopeCurve, envelopeLabels, envelopeNotes, envelopeOf, latestNoteAt, voiceNotes } from './envelope';

const E = { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.4 };

describe('an envelope now', () => {
  it('rises, falls to the sustain, holds, releases after the note ends, then has rung out', () => {
    const hold = envelopeAxis(E).hold;
    expect(envelopeAt(E, 0.05, 1)).toEqual({ t: 0.05, level: 0.5 });
    expect(envelopeAt(E, 0.2, 1)!.level).toBeCloseTo(0.75);
    expect(envelopeAt(E, 0.65, 1)!.t).toBeCloseTo(0.3 + hold / 2);
    expect(envelopeAt(E, 0.65, 1)!.level).toBe(0.5);
    const r = envelopeAt(E, 1.2, 1)!;
    expect(r.t).toBeCloseTo(0.3 + hold + 0.2);
    expect(r.level).toBeCloseTo(0.25);
    expect(envelopeAt(E, 1.5, 1)).toBeNull();
  });
  it('a note shorter than its attack releases from where it got to', () => {
    expect(envelopeAt(E, 0.06, 0.05)!.level).toBeCloseTo(0.5 * (1 - 0.01 / 0.4));
  });
});

describe("a voice's envelope and the notes through it", () => {
  const r = compileSource(`&bar scan(4) step=120bpm
&env map=adsr .01 .2 .5 .3
&tune step=1m 0 2 4 5
&bass step=1m/2 0 3
&lead s=saw loop=C4 env=&env
&pad s=sine loop=C3
&mix map=sample [&tune * &lead, &bass * &lead, &tune * &pad]`);
  it('compiles without a word', () => expect(r.diagnostics).toEqual([]));
  it('envelopeOf: the env= cell, as an ADSR; none written: null', () => {
    expect(envelopeOf(r, 'lead')).toEqual({ attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.3 });
    expect(envelopeOf(r, 'pad')).toBeNull();
    expect(envelopeOf(r, 'nothing')).toBeNull();
  });
  it('envelopeNotes: what plays a voice it shapes; voiceNotes: what plays a voice', () => {
    expect(envelopeNotes(r, 'env').sort()).toEqual(['bass', 'tune']);
    expect(voiceNotes(r, 'lead').sort()).toEqual(['bass', 'tune']);
    expect(voiceNotes(r, 'pad')).toEqual(['tune']);
  });
  it('latestNoteAt: the note begun last among them; none: null', () => {
    const s = codeShifts(r);
    const t = 1.8; // (tune 0.3 s into its step, bass 0.8 s into its)
    const each = ['tune', 'bass'].map((n) => lastNoteAt(r, s, n, t)!);
    expect(latestNoteAt(r, s, ['tune', 'bass'], t)).toEqual(each.reduce((a, b) => (b.since < a.since ? b : a)));
    expect(latestNoteAt(r, s, ['tune', 'bass'], t)!.since).toBeLessThan(Math.max(...each.map((n) => n.since)));
    expect(latestNoteAt(r, s, [], t)).toBeNull();
  });
});

describe('an envelope as its wheel draws it (CellGlyph, show=adsr)', () => {
  // (Transpose's voice's envelope: attack 20 ms, decay 300 ms, sustain 50 %, release 300 ms, on a 128 px wheel)
  const t = compileSource(PRESETS.transpose.source);
  // (its envelope is unnamed, &(map=adsr …): found by what it is, not by its line)
  const adsr = [...t.cells.keys()].find((n) => cellView(t, n, codeShifts(t), false)?.mode === 'curve')!;
  const e = cellView(t, adsr, codeShifts(t), false)!.curve!;
  const g = wheelGeometry(128);
  const curve = envelopeCurve(e, g.c, g.rOuter);
  it('a curve across the ring: up to its peak, down to the sustain, held, released', () => {
    expect(e).toEqual({ attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.3 });
    expect(curvePoints(curve)).toBe('21.3,89.7 23.2,38.4 52.8,64.0 77.2,64.0 106.8,89.7');
  });
  it('its values named on their stretches', () => {
    expect(envelopeLabels(curve, e, 7.68).map((l) => [l.text, l.anchor])).toEqual([
      ['A 20 ms', 'start'],
      ['D 300 ms', 'start'],
      ['S 50 %', 'middle'],
      ['R 300 ms', 'end'],
    ]);
  });
  it('where a note is on it now: the lines cross there; rung out, none', () => {
    const at = envelopeCrossing(curve, e, { since: 0.1, length: 0.5 })!;
    expect(at).toMatchObject({ x0: 21.25, x1: 106.75, top: 38.35, bottom: 89.65 });
    expect(at.x).toBeCloseTo(31.1, 1);
    expect(at.y).toBeCloseTo(45.19, 2);
    expect(envelopeCrossing(curve, e, { since: 5, length: 0.5 })).toBeNull();
  });
});
