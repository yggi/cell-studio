import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { codeShifts, DEFAULT_FREQ } from '../engine/program';
import { declWords } from '../engine/edit';
import { PRESETS } from '../engine/presets';
import { atomOf, braidVoice, freeBraidOf, lap, listed, sheetPicture, sheetWheel, tokenHues, tokenLabels, tokenName } from './braidwheel';
import { noteFrame, tonicOf, voiceBase } from './show';

const piece = (key: keyof typeof PRESETS) => {
  const source = PRESETS[key].source;
  const result = compileSource(source);
  const shifts = codeShifts(result);
  const at = (name: string) => listed(result, name, shifts, declWords(source, name)?.braid ?? []);
  return { result, shifts, at };
};

describe('braidwheel: what the sheet shows of a braid', () => {
  it('reads one token as its atom', () => {
    expect(atomOf('4')).toMatchObject({ kind: 'note', value: 4, alter: 0 });
    expect(atomOf('[0 4 7]')).toMatchObject({ kind: 'chord', notes: [0, 4, 7] });
    expect(atomOf('[2|4|7]')).toMatchObject({ kind: 'choice', values: [2, 4, 7] });
    expect(atomOf('&up')).toMatchObject({ kind: 'ref', name: 'up' });
  });

  it('Twinkle: a melody in solfège (show=do from &tune), its motifs by name', () => {
    const { result, shifts, at } = piece('twinkle');
    const up = at('up');
    expect(up).toEqual({ tokens: ['0', '0', '4', '4', '5', '5', '4@2'], kind: 'list' });
    expect(tokenLabels(result, 'up', shifts, up.tokens)).toEqual(['do', 'do', 'sol', 'sol', 'la', 'la', 'sol']);
    expect(up.tokens.map((t) => tokenHues(result, 'up', shifts, t))).toEqual([[0], [0], [210], [210], [270], [270], [210]]);
    expect(lap(result, 'up')).toBe(7);
    const tune = at('tune');
    expect(tune.tokens).toEqual(['&up', '&down', '&mid!2', '&up', '&down']);
    expect(tokenLabels(result, 'tune', shifts, tune.tokens)).toEqual(['&up', '&down', '&mid', '&up', '&down']);
    expect(tune.tokens.map((t) => tokenHues(result, 'tune', shifts, t))).toEqual([null, null, null, null, null]);
    // a chord takes a hue per note, a choice its first option's; a chord has no name
    expect(tokenHues(result, 'up', shifts, '[0 4 7]')).toEqual([0, 210, 0]);
    expect(tokenHues(result, 'up', shifts, '[2|4|7]')).toEqual([120]);
    expect(tokenName(result, 'up', shifts, '[0 4 7]')).toBeNull();
    expect(tokenName(result, 'up', shifts, '1')).toBe('re');
  });

  it('Korobeiniki: numbers as written (no names shown), on a chromatic table', () => {
    const { result, shifts, at } = piece('korobeiniki');
    const a = at('a');
    expect(a.tokens).toEqual(['7@2', '2', '3', '5@2', '3', '2', '0@2', '0', '3', '7@2', '5', '3']);
    expect(tokenLabels(result, 'a', shifts, a.tokens)).toEqual(a.tokens);
    expect(a.tokens.map((t) => tokenHues(result, 'a', shifts, t))).toEqual([[210], [60], [90], [150], [90], [60], [0], [0], [90], [210], [150], [90]]);
    expect(lap(result, 'a')).toBe(12);
    expect(at('octaves').tokens.map((t) => tokenHues(result, 'octaves', shifts, t))).toEqual(Array(8).fill([0]));
  });

  it('Acid: a braid made by a function lists the entries it stands for', () => {
    const { result, shifts, at } = piece('acid');
    expect(at('minor')).toEqual({ tokens: ['0', '2', '3', '5', '7', '8', '10'], kind: 'function' });
    expect(at('bar')).toEqual({ tokens: ['0', '1', '2', '3'], kind: 'function' });
    expect(lap(result, 'bar')).toBe(4);
    // turned: read from the shifted entry on
    const turned = listed(result, 'minor', (n) => (n === 'minor' ? 2 : shifts(n)), ['scan(2 1 2 2 1 2 2)']);
    expect(turned.tokens).toEqual(['3', '5', '7', '8', '10', '12', '14']);
  });

  it('Play in: a braid left free lists its steps as they play, held when they differ from the written ones', () => {
    const { result, shifts, at } = piece('play-in');
    const riff = at('riff');
    expect(riff).toEqual({ tokens: ['0', '2', '4', '~', '4', '2', '0', '~', '0', '2', '4', '~', '7@2', '~', '~'], kind: 'list', held: false });
    expect(freeBraidOf(result, 'riff')?.key).toBe('braid');
    expect(listed(result, 'riff', shifts, ['free(0 2)']).held).toBe(true);
    expect(tokenHues(result, 'riff', shifts, '~')).toBeNull();
  });

  it('an empty braid: the default grid, a step per entry', () => {
    const { result, shifts } = piece('twinkle');
    const cycle = result.cells.get('scale')!.cycle;
    expect(listed(result, 'scale', shifts, [])).toEqual({ tokens: Array.from({ length: cycle }, (_, i) => String(i)), kind: 'empty' });
  });

  it("what a cell's sheet pictures, and whether it draws the wheel too", () => {
    const { result } = piece('twinkle');
    const of = (name: string) => {
      const c = result.cells.get(name)!;
      return [sheetPicture(c), braidVoice(c), sheetWheel(c)];
    };
    expect(of('up')).toEqual([null, false, true]);
    expect(of('scale')).toEqual([null, false, true]);
    expect(of('mix')).toEqual(['signal', false, false]);
    expect(of('lead')).toEqual(['voice', false, false]);
    expect(of('piece')).toEqual(['note', false, false]);
  });

  it('a name the program does not have: nothing to name or colour, the chromatic lap, the default frame', () => {
    const { result, shifts } = piece('twinkle');
    expect(tokenHues(result, 'nope', shifts, '0')).toBeNull();
    expect(tokenName(result, 'nope', shifts, '0')).toBeNull();
    expect(lap(result, 'nope')).toBe(12);
    expect(noteFrame(result, 'nope')).toEqual({ base: DEFAULT_FREQ, tonic: 0 });
    expect(noteFrame(result, 'up')).toEqual({ base: voiceBase(result, 'up'), tonic: tonicOf(result, 'up') });
  });
});
