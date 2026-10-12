import { describe, expect, it } from 'vitest';
import { towerOf, towerRanks, towerSpans, zoneRanks } from './tower';
import { flowRanks } from './ranks';
import { buildGraph } from './drawn';
import { compileSource } from '../engine/compile';

const SONG = `
&bar scan(1 1 1 1) step=100bpm
&major scale(major)
&lead s=saw loop=C4
&bass s=saw loop=C2
&tune over=&major step=&bar 0 2 4 5
&roots step=&bar 0
&tunePart [&tune * &lead * .3]
&bassPart [&roots * &bass * .5]
&parts &tunePart &bassPart
&song over=&parts step=&bar/4 laps=1 [1] [0,1] [0,1]
&out loop=SAMPLE_RATE map=sample &song
`;

const tower = (src: string, at?: Parameters<typeof towerOf>[2]) => {
  const program = compileSource(src);
  const model = buildGraph(program);
  return { model, v: towerOf(program, model, at), at: (name: string) => towerOf(program, model, at).get(`cell:${name}`)! };
};

describe('the frequency tower', () => {
  it('places each cell by its time constant: the constant at the bottom, voices at their pitch, the card outside', () => {
    const { at } = tower(SONG);
    expect(at('major')).toBe(-Infinity); // (a table nothing steps: DC)
    expect(at('out')).toBe(Infinity);
    expect(at('lead')).toBeCloseTo(Math.log10(261.63), 2);
    expect(at('bass')).toBeCloseTo(Math.log10(65.41), 2);
    // the bar steps at 100 bpm; a melody it steps, at the same rate; the selector a section every four beats
    expect(10 ** at('bar')).toBeCloseTo(100 / 60, 3);
    expect(at('tune')).toBeCloseTo(at('bar'), 6);
    expect(10 ** at('song')).toBeCloseTo(100 / 60 / 4, 3);
    // a mix just above the sound it carries
    expect(at('tunePart')).toBeGreaterThan(at('lead'));
    expect(at('tunePart')).toBeLessThan(at('lead') + 0.1);
  });

  it('by turn: a cell at how often it comes round', () => {
    const { at } = tower(SONG, 'turn');
    expect(10 ** at('tune')).toBeCloseTo(100 / 60 / 4, 3); // four steps
  });

  it("emit: what carries sound sits by the sound it carries, not its clock (the selector, today's spelling)", () => {
    expect(tower(SONG, 'step').at('song')).toBeLessThan(0);
    expect(tower(SONG, 'emit').at('song')).toBeGreaterThan(tower(SONG, 'emit').at('bass'));
  });

  it('rows: higher on the tower, a higher row; zones first, then the signal path', () => {
    const { model, v } = tower(SONG);
    const rows = towerRanks(v);
    const r = (n: string) => rows.get(`cell:${n}`)!;
    expect(r('major')).toBe(0);
    expect(r('out')).toBeGreaterThan(r('lead'));
    expect(r('lead')).toBeGreaterThan(r('bass'));
    expect(r('bass')).toBeGreaterThan(r('tune'));
    expect(r('tune')).toBeGreaterThan(r('song'));
    const zones = zoneRanks(v, flowRanks(model));
    const z = (n: string) => zones.get(`cell:${n}`)!;
    // (the two voices share the audible zone, and stand in it by the flow, not by pitch; the selector is in the slow zone)
    expect(z('lead')).toBeGreaterThan(z('tune'));
    expect(z('tune')).toBeGreaterThan(z('song'));
    expect(z('song')).toBeGreaterThan(z('major'));
    expect(z('out')).toBeGreaterThan(z('lead'));
  });

  it('draws a clocked cell as a span from its turn up to its step; a voice and a mix as a point', () => {
    const program = compileSource(SONG);
    const model = buildGraph(program);
    const spans = towerSpans(program, model);
    const span = (name: string) => spans.get(`cell:${name}`)!;
    // (&tune: a step a beat, four steps round)
    expect(10 ** span('tune').at).toBeCloseTo(100 / 60, 3);
    expect(10 ** span('tune').lo).toBeCloseTo(100 / 60 / 4, 3);
    expect(span('lead').lo).toBe(span('lead').at);
    expect(span('tunePart').lo).toBe(span('tunePart').at);
    expect(span('major')).toEqual({ at: -Infinity, lo: -Infinity });
    expect(span('out')).toEqual({ at: Infinity, lo: Infinity });
  });
});
