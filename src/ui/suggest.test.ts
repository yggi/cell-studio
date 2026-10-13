import { describe, expect, it } from 'vitest';
import { lastWord, nudge, numberToken, suggest, suggestValue } from './suggest';

const names = ['theme', 'tune', 'bar', 'm1', 'm2'];

describe('suggest', () => {
  it('completes cells by name, prefix matches first', () => {
    expect(suggest('t', names).map((s) => s.text)).toEqual(['&theme', '&tune']);
    // 'm' matches m1, m2 at the start and theme in the middle: prefix matches first
    expect(suggest('&m', names).map((s) => s.text)).toEqual(['&m1', '&m2', '&theme']);
  });
  it('offers brackets once a cell is opened with [', () => {
    expect(suggest('&tune[', names).map((s) => s.text)).toEqual(['&tune[<<]', '&tune[>>]', '&tune[0]', '&tune[-1]', '&tune[1:]', '&tune[:-1]', '&tune[::-1]']);
    expect(suggest('&tune[<', names).map((s) => s.text)).toEqual(['&tune[<<]']);
    expect(suggest('&nope[', names)).toEqual([]);
  });
  it('offers its moves: by degrees (^1) and by grid steps (^$7), once a cell is named in full or given a ^', () => {
    expect(suggest('&tune', names).map((s) => s.text)).toEqual(['&tune', '&tune^1', '&tune^$7']);
    expect(suggest('&tune^', names).map((s) => s.text)).toEqual(['&tune^1', '&tune^-1', '&tune^$7', '&tune^$-12']);
    expect(suggest('&tune^$', names).map((s) => s.text)).toEqual(['&tune^$7', '&tune^$-12']);
    expect(suggest('&nope^', names)).toEqual([]);
  });
  it('offers a rest, and functions only for a whole braid', () => {
    expect(suggest('', names).some((s) => s.kind === 'rest')).toBe(true);
    expect(suggest('sc', names).some((s) => s.kind === 'function')).toBe(false);
    expect(suggest('sc', names, true).map((s) => s.text)).toContain('scan(2 2 1 2 2 2 1)');
    expect(suggest('sca', names, true).map((s) => s.text)).toContain('scan(2 2 1 2 2 2 1)');
  });
  it('finds the word being typed, brackets included', () => {
    expect(lastWord('0 2 &m1[<')).toEqual({ before: '0 2 ', word: '&m1[<' });
    expect(lastWord('[0, 4, 7] &t')).toEqual({ before: '[0, 4, 7] ', word: '&t' });
    expect(lastWord('ev')).toEqual({ before: '', word: 'ev' });
  });
  it('reads and nudges numbers, keeping accidentals and modifiers', () => {
    expect(numberToken('6#@2')).toEqual({ value: 6, acc: '#', mods: '@2' });
    expect(numberToken('&m1')).toBeNull();
    expect(nudge('6#@2', 1)).toBe('7#@2');
    expect(nudge('2', -7)).toBe('-5');
    expect(nudge('~', 1)).toBe('~');
  });
});

describe('suggestValue', () => {
  const sources = ['sine', 'tri', 'saw', 'square', 'white'];
  it('by key: tables for over, drivers and rates for step, maps, sources', () => {
    expect(suggestValue('over', '', names, sources).map((s) => s.text)).toContain('scale(0,5)');
    expect(suggestValue('over', '&th', names, sources).map((s) => s.text)).toEqual(['&theme']);
    expect(suggestValue('step', 'cy', names, sources).map((s) => s.text)).toContain('cycle(&bar)');
    expect(suggestValue('loop', 'C', names, sources).map((s) => s.text)).toEqual(expect.arrayContaining(['C4', 'C2']));
    expect(suggestValue('map', 's', names, sources).map((s) => s.text)).toEqual(['sample']);
    expect(suggestValue('s', 'sa', names, sources).map((s) => s.text)).toEqual(['saw']);
    expect(suggestValue('decay', '', names, sources)).toEqual([]);
  });
  it('over= takes shifts, not picks', () => {
    expect(suggestValue('over', '&theme[', names, sources).map((s) => s.text)).toEqual(['&theme[<<]', '&theme[>>]']);
  });
});
