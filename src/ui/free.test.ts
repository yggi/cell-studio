import { describe, expect, it } from 'vitest';
import type { FreeSpec } from '../engine/ast';
import { freeAmount, freeKey, freeLabel, freeStep, freeValue } from './free';

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
