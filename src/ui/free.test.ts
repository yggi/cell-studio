import { describe, expect, it } from 'vitest';
import type { FreeSpec } from '@yggi/cells/engine/ast';
import { freeAmount, freeAt, freeKey, freeLabel, freePosition, freeScale, freeStep, freeSteps, freeValue } from './free';

const span = { line: 1, col: 1, len: 1 };
const free = (o: Partial<FreeSpec>): FreeSpec => ({ key: 'param', value: 0, unit: '', lo: 0, hi: 1, span, ...o });

describe('a free() value in words', () => {
  it('names it by what it sets', () => {
    expect(freeKey(free({ key: 'param', param: 'lpf' }))).toBe('lpf');
    expect(freeKey(free({ key: 'param' }))).toBe('value');
    expect(freeKey(free({ key: 'step', unit: 'bpm' }))).toBe('bpm');
    expect(freeKey(free({ key: 'loop', unit: 'hz' }))).toBe('loop');
    expect(freeKey(free({ key: 'interval' }))).toBe('ratio');
    expect(freeKey(free({ key: 'gain' }))).toBe('level');
    expect(freeKey(free({ key: 'choice' }))).toBe('choice');
    expect(freeKey(free({ key: 'text' }))).toBe('text');
    expect(freeKey(free({ key: 'shift' }))).toBe('shift');
  });
  it('a large control says tempo and choose', () => {
    expect(freeLabel(free({ key: 'step', unit: 'bpm' }))).toBe('tempo');
    expect(freeLabel(free({ key: 'choice' }))).toBe('choose');
    expect(freeLabel(free({ key: 'gain' }))).toBe('level');
  });
  it('steps whole for shifts and wide ranges, by hundredths otherwise', () => {
    expect(freeStep(free({ key: 'shift', lo: 0, hi: 1 }))).toBe(1);
    expect(freeStep(free({ key: 'step', lo: 40, hi: 200 }))).toBe(1);
    expect(freeStep(free({ lo: 0, hi: 2 }))).toBe(0.02);
  });
  it('writes the number with its unit, short beside a key that says bpm', () => {
    const tempo = free({ key: 'step', unit: 'bpm', value: 90.4, lo: 40, hi: 200 });
    expect(freeAmount(tempo)).toBe('90bpm');
    expect(freeAmount(tempo, 40)).toBe('40bpm');
    expect(freeValue(tempo)).toBe('90');
    expect(freeValue(free({ value: 0.256, unit: 'k' }))).toBe('0.26k');
  });
  it('a text or a named choice reads as written', () => {
    expect(freeValue(free({ key: 'text', text: '867 5309' }))).toBe('867 5309');
    expect(freeValue(free({ key: 'choice', value: 2, lo: 0, hi: 3, labels: ['a', 'b', 'c', 'd'] }))).toBe('c');
  });
});

describe('a control from lo to hi (the slider and a knob alike)', () => {
  const tempo = free({ key: 'step', unit: 'bpm', value: 90, lo: 60, hi: 240 });
  const lpf = free({ key: 'param', param: 'lpf', value: 1200, lo: 200, hi: 5000 });
  const level = free({ key: 'gain', value: 0.4, lo: 0, hi: 1 });
  const meter = free({ key: 'choice', value: 2, lo: 0, hi: 3, labels: ['2/4', '3/4', '4/4', '6/8'] });
  const knob = (f: FreeSpec, cc: number) => freeAt(f, cc / 127);

  it('runs frequencies over a log scale, tempo and levels straight, choices by name', () => {
    expect([lpf, tempo, level, meter].map(freeScale)).toEqual(['log', 'linear', 'linear', 'choice']);
    // (a narrow frequency, a tuning, stays straight; a range from 0 can't be a log one)
    expect(freeScale(free({ key: 'loop', unit: 'hz', lo: 434, hi: 446 }))).toBe('linear');
    expect(freeScale(free({ key: 'param', lo: 0, hi: 5000 }))).toBe('linear');
  });
  it('a log scale only for a frequency or a rate: a setting in Hz, a clock not in bpm; a wide drive= or index= stays straight', () => {
    const wide = (o: Partial<FreeSpec>) => freeScale(free({ lo: 0.05, hi: 1, ...o }));
    expect(['hpf', 'tone', 'wanderhz', 'dropout'].map((param) => wide({ key: 'param', param }))).toEqual(['log', 'log', 'log', 'log']);
    expect(['drive', 'index', 'room', 'crush'].map((param) => wide({ key: 'param', param }))).toEqual(['linear', 'linear', 'linear', 'linear']);
    expect(wide({ key: 'param', param: 'swing', unit: 'hz' })).toBe('log');
    expect([wide({ key: 'step' }), wide({ key: 'loop', unit: 'hz' }), wide({ key: 'gain' }), wide({ key: 'chance' })]).toEqual(['log', 'log', 'linear', 'linear']);
  });
  it('maps 0–127 onto a log and a straight range, both ends exact', () => {
    expect([knob(lpf, 0), knob(lpf, 127)]).toEqual([200, 5000]);
    expect([knob(tempo, 0), knob(tempo, 127)]).toEqual([60, 240]);
    expect([knob(level, 0), knob(level, 127)]).toEqual([0, 1]);
    // the middle of a log range is the geometric middle (√(200 × 5000) = 1000), of a straight one the plain middle
    expect(freeAt(lpf, 0.5)).toBe(1000);
    expect(freeAt(tempo, 0.5)).toBe(150);
    // whole bpm, hundredths of a level: the slider's own steps
    expect(Number.isInteger(knob(tempo, 64))).toBe(true);
    expect(knob(level, 64)).toBe(0.5);
    expect(knob(level, 13)).toBe(0.1);
  });
  it('splits a knob turn into equal parts, one a choice', () => {
    expect([0, 31, 32, 63, 64, 95, 96, 127].map((cc) => knob(meter, cc))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it('places a value back where the control has it', () => {
    for (const f of [tempo, lpf, level, meter]) for (const t of [0, 0.25, 0.5, 1]) expect(freeAt(f, freePosition(f, freeAt(f, t)))).toBeCloseTo(freeAt(f, t), 9);
    expect(freePosition(lpf, 1000)).toBeCloseTo(0.5, 9);
  });
  it('gives the slider whole steps: one a bpm, a hundredth, a choice, a thousandth of a log range', () => {
    expect([tempo, level, meter, lpf].map(freeSteps)).toEqual([180, 100, 3, 1000]);
    expect(freeAt(tempo, 31 / 180)).toBe(91);
  });
});
