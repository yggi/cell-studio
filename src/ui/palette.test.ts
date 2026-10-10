import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';
import { heardGrid } from '../layout/show';
import { tickLevel } from '../layout/meters';
import { palette, paletteHsl } from './palette';
import { noteColour } from './theme';

const TWELVE = { cycle: 12 };
const hsl = (c: string) =>
  c
    .match(/hsl\(([-\d.]+) ([\d.]+)% ([\d.]+)%\)/)!
    .slice(1)
    .map(Number);

describe('palette: one function from (band, value, grid) to colour', () => {
  it('pitch: the pitch-class colour on its grid, muted by octave', () => {
    expect(palette('pitch', 0, TWELVE)).toBe(noteColour(0));
    expect(palette('pitch', 7, TWELVE)).toBe(noteColour(210));
    // (12 is still the natural range: C5 closes it; 13 an octave up, -1 one down)
    expect(palette('pitch', 12, TWELVE)).toBe(noteColour(0));
    expect(palette('pitch', 19, TWELVE)).toBe(noteColour(210, false, 1));
    expect(palette('pitch', -5, TWELVE)).toBe(noteColour(210, false, -1));
    // on 19 to the octave, a rainbow per period: position 1 is 360/19°
    expect(hsl(palette('pitch', 1, { cycle: 19 }))[0]).toBeCloseTo(360 / 19, 1);
    expect(palette('pitch', 19, { cycle: 19 })).toBe(noteColour(0));
  });
  it('several grids (no grid): neutral, the same hue as a level', () => {
    expect(hsl(palette('pitch', 3, null))[0]).toBe(hsl(palette('level', 0.5))[0]);
    expect(hsl(palette('audio', { position: 3, loud: 1 }, null))[1]).toBe(hsl(palette('level', 1))[1]);
  });
  it('a value that is not a number is the resting neutral, not hsl(NaN …)', () => {
    expect(palette('level', NaN)).toBe(palette('level', 0));
    expect(palette('pitch', NaN, { cycle: 12 })).toBe(palette('level', 0));
    expect(palette('sync', NaN)).toBe('var(--meter-0)');
  });
  it('level: lightness on one neutral hue, brighter as it rises', () => {
    const [h0, s0, l0] = hsl(palette('level', 0));
    const [h1, s1, l1] = hsl(palette('level', 1));
    expect([h0, s0]).toEqual([h1, s1]);
    expect(l1).toBeGreaterThan(l0);
    expect(palette('level', 2)).toBe(palette('level', 1));
  });
  it("sync: the meter's level tokens, the bar's first --meter-0 … the finest --meter-3", () => {
    expect([0, 1, 2, 3, 7].map((v) => palette('sync', v))).toEqual(['var(--meter-0)', 'var(--meter-1)', 'var(--meter-2)', 'var(--meter-3)', 'var(--meter-3)']);
  });
  it("audio: its fundamental's hue, as bright as it is loud; the octave mutes it", () => {
    const [h, , quiet] = paletteHsl('audio', { position: 4, loud: 0.1 }, TWELVE);
    const [, s, loud] = paletteHsl('audio', { position: 4, loud: 1 }, TWELVE);
    expect(h).toBe(120);
    expect(loud).toBeGreaterThan(quiet);
    expect(paletteHsl('audio', { position: -20, loud: 1 }, TWELVE)[1]).toBeLessThan(s);
    // (no fundamental: neutral)
    expect(paletteHsl('audio', { position: null, loud: 1 }, TWELVE)[0]).toBe(paletteHsl('level', 0)[0]);
  });
  it('the neutral reads on the dark surfaces: 3:1 at least against --bg and the wheel disc, at every level', () => {
    const css = readFileSync('src/app.css', 'utf8');
    const token = (name: string) => css.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))![1];
    const lum = ([r, g, b]: number[]) => {
      const c = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
      return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
    };
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const rgb = ([h, s, l]: number[]) => {
      const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
      const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return 255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
      };
      return [f(0), f(8), f(4)];
    };
    const contrast = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    for (const bg of ['bg', 'wheel-disc', 'code-bg'])
      for (const level of [0, 0.25, 0.5, 1]) expect(contrast(rgb(paletteHsl('level', level)), hex(token(bg)))).toBeGreaterThanOrEqual(3);
  });
});

describe("the owner's rule: colour follows the grid; a mix hearing several shows none, unless its own show= names one", () => {
  const r = compileSource(`&edo19 cycle=19 map=edo
&bar scan(1 1 1 1) step=1
&a step=&bar 0 2 4
&b over=&edo19 step=&bar 0 3 6
&c step=&bar 7 9
&v1 s=sine loop=C4
&v2 s=saw loop=C4
&v3 s=tri loop=C3
&both [&a * &v1, &b * &v2]
&twelve [&a * &v1, &c * &v3]
&tuned show=mix:&edo19 [&a * &v1, &b * &v2]
&out map=sample [&both * .3, &twelve * .3, &tuned * .3]`);
  it('compiles without a word', () => expect(r.diagnostics).toEqual([]));
  it("a voice: its notes' grid", () => {
    expect(heardGrid(r, 'v1')).toBe('fifths12TET');
    expect(heardGrid(r, 'v2')).toBe('edo19');
  });
  it('a mix whose voices are all on one grid takes it', () => expect(heardGrid(r, 'twelve')).toBe('fifths12TET'));
  it('a mix of a 12-tone and a 19-tone voice: no colour (null); the sound card too', () => {
    expect(heardGrid(r, 'both')).toBeNull();
    expect(heardGrid(r, 'out')).toBeNull();
  });
  it('a mix that says show=mix:&edo19 follows that grid, whatever its voices', () => expect(heardGrid(r, 'tuned')).toBe('edo19'));
  it('show=mix: names a grid: anything else is a warning, and ignored', () => {
    const bad = compileSource('&t step=1 0 2\n&v s=sine\n&m show=mix:&t map=sample [&t * &v]');
    expect(bad.diagnostics.map((d) => d.message)).toEqual([expect.stringContaining("show=mix:&t: a mix's colours follow a grid")]);
    expect(heardGrid(bad, 'm')).toBe('fifths12TET');
  });
  it('a kit or a drum has no say: a mix of drums and 19-tone voices follows the 19', () => {
    const k = compileSource(`&edo19 cycle=19 map=edo
&bar scan(1 1 1 1) step=1
&b over=&edo19 step=&bar 0 3 6
&v2 s=saw loop=C4
&noise s=white env=&(map=adsr .001 .05 0 .05)
&hits map=amp step=&bar 1 0 1 0
&out map=sample [&b * &v2 * .3, &hits * &noise * .2]`);
    expect(k.diagnostics).toEqual([]);
    expect(heardGrid(k, 'out')).toBe('edo19');
  });
});

describe("tickLevel: the level of a meter's tick", () => {
  it("a meter written as levels says each step's; any other clock: its first 0, the rest 1", () => {
    // (the metronome's bar in eighths, * . + . + . + .: levels 0 3 1 3 …; a finer one, 4, is the finest token too)
    const r = compileSource(PRESETS.metronome.source.replace('free(0, 0..3, "1 2 3 4")', 'free(1, 0..3, "1 2 3 4")'));
    const bar = r.cells.get('bar')!;
    expect(bar.leveled).toBe(true);
    expect([0, 1, 2, 3, 8].map((b) => tickLevel(bar, b + 0.3))).toEqual([0, 3, 1, 3, 0]);
    expect([0, 1.5, 2].map((b) => tickLevel(compileSource('&plain scan(1 1 1) step=1').cells.get('plain'), b))).toEqual([0, 1, 1]);
  });
});
