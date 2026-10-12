import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { lastNoteAt } from '../engine/values';
import { envelopeAt, envelopeAxis, envelopeNotes, envelopeOf, latestNoteAt, voiceNotes } from './envelope';

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
&tune step=&bar 0 2 4 5
&bass step=&bar/2 0 3
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
