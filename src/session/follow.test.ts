import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { NOTHING_FOLLOWED, barSeconds, heardAt, nextTextAt, placeAt, pruned, reaches, textOf, withBar, withText, type Followed } from './follow';
import type { SectionText } from './protocol';

const frame = { meter: { cycle: 8, heights: [0, 2, 4, 6] }, swing: { level: '16n', share: 0.5 }, bpm: 120, key: { tonic: 9, mode: 'aeolian' } };
const section = (bar: number, bars: number, text: string): SectionText => ({
  bar,
  step: bar * 16,
  text,
  unstated: null,
  frame,
  foreseen: Array.from({ length: bars }, (_, i) => `b${bar + i}`),
  cut: [],
});
const sent = (bar: number, start: number | null) => ({ bar: { bar }, start });

/** A song of 2-second bars from 10 s on the host's clock, its first sixteen bars sent, two sections of eight told. */
const song = (): Followed => {
  let f = NOTHING_FOLLOWED;
  for (let b = 0; b < 16; b++) f = withBar(f, sent(b, 10 + 2 * b));
  return withText(withText(f, section(0, 8, 'A')), section(8, 8, 'B'));
};

describe('following a host’s song', () => {
  it('finds the bar heard and how far into it, from the bars’ starts', () => {
    const f = song();
    expect(placeAt(f.starts, 9)).toEqual({ bar: 0, into: 0, before: true });
    expect(placeAt(f.starts, 10)).toEqual({ bar: 0, into: 0, before: false });
    expect(placeAt(f.starts, 13.5)).toEqual({ bar: 1, into: 0.75, before: false });
    // (the last bar sent: its length as the one before it took)
    expect(placeAt(f.starts, 41)).toEqual({ bar: 15, into: 0.5, before: false });
    expect(placeAt(new Map(), 3)).toBeNull();
  });

  it('keeps no start for a bar the host passed without laying', () => {
    expect(withBar(song(), sent(16, null)).starts.has(16)).toBe(false);
  });

  it('shows the text that states the bar heard, and where in its own bars', () => {
    const f = song();
    expect(heardAt(f, 9)).toMatchObject({ text: { text: 'A' }, bars: 0, place: { before: true } });
    expect(heardAt(f, 15)).toMatchObject({ text: { text: 'A' }, bars: 2.5 });
    expect(heardAt(f, 27)).toMatchObject({ text: { text: 'B' }, bars: 0.5 });
  });

  it('takes a text told again from a bar composed otherwise than foreseen from that bar on, and the one before it up to it', () => {
    const f = withText(song(), section(11, 5, 'B again'));
    expect(textOf(f.texts, 10)?.text).toBe('B');
    expect(textOf(f.texts, 11)?.text).toBe('B again');
    expect(heardAt(f, 33)).toMatchObject({ text: { text: 'B again' }, bars: 0.5 });
    // (and a text told again for the same bars as one before: the later)
    expect(textOf(withText(f, section(8, 8, 'B, third')).texts, 9)?.text).toBe('B, third');
  });

  it('shows nothing for a bar no text states', () => {
    expect(textOf(song().texts, 16)).toBeNull();
    expect(heardAt(withBar(song(), sent(16, 42)), 43)).toBeNull();
  });

  it('keeps sixteen bars behind the one heard, and drops what is older', () => {
    let f = song();
    for (let b = 16; b < 40; b++) f = withBar(f, sent(b, 10 + 2 * b));
    f = withText(f, section(16, 8, 'C'));
    const p = pruned(f, 30);
    expect(Math.min(...p.starts.keys())).toBe(14);
    expect(p.texts.map((t) => t.text)).toEqual(['B', 'C']);
    expect(pruned(p, 30)).toBe(p);
  });
});

describe('a bar of a text’s own time', () => {
  const bar = (text: string) => barSeconds(compileSource(text));
  it('is its main meter’s bar at its tempo', () => {
    expect(bar('&bar meter("4/4") step=120bpm\n&kick step=16n &bd ~ ~ ~\n&bd s=white')).toBeCloseTo(2, 9);
    expect(bar('&bar meter("4/4") step=108bpm swing=16n:.6\n&kick step=16n &bd ~ ~ ~\n&bd s=white')).toBeCloseTo(240 / 108, 9);
    // (a 6/8 bar is two beats; 7/8 three, 3+2+2)
    expect(bar('&bar meter("6/8") step=90bpm\n&kick step=16n &bd ~ ~ ~\n&bd s=white')).toBeCloseTo(4 / 3, 9);
    expect(bar('&bar meter("7/8") step=120bpm\n&kick step=8n &bd ~ ~\n&bd s=white')).toBeCloseTo(1.5, 9);
  });
  it('is none for a text with no meter, or one that doesn’t compile', () => {
    expect(bar('&a loop=A4')).toBeNull();
    expect(bar('')).toBeNull();
  });
});

describe('when the text turns', () => {
  it('is the start of the first bar after the one heard that another text states', () => {
    const f = song();
    expect(nextTextAt(f, 15)).toBe(26);
    expect(nextTextAt(f, 27)).toBeNull();
    // (a text told again from bar 11: it turns there)
    expect(nextTextAt(withText(f, section(11, 5, 'B again')), 27)).toBe(32);
    expect(nextTextAt(NOTHING_FOLLOWED, 3)).toBeNull();
  });
});

describe('a rejoin’s welcome (#482)', () => {
  it('is reached where the start of the bar before its first is known, and not across a gap', () => {
    const f = song();
    expect(reaches(f, [sent(16, 42), sent(17, 44)])).toBe(true);
    expect(reaches(f, [sent(17, 44), sent(18, 46)])).toBe(false);
    expect(reaches(NOTHING_FOLLOWED, [sent(1, 12)])).toBe(false);
    expect(reaches(f, [])).toBe(false);
  });
});
