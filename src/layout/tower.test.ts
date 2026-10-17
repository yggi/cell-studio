import { describe, expect, it } from 'vitest';
import { towerOf, towerRanks, towerSpans, towerStructure, zoneRanks } from './tower';
import { flowRanks } from './ranks';
import { buildGraph } from './drawn';
import { compileSource } from '@yggi/cells/engine/compile';

const SONG = `
&bar scan(1 1 1 1) step=100bpm
&major scale(major)
&lead s=saw loop=C4
&bass s=saw loop=C2
&parts step=4n &tuneBar &bassBar
&tune over=&major step=&tuneBar 0 2 4 5
&roots step=&bassBar 0
&tunePart [&tune * &lead * .3]
&bassPart [&roots * &bass * .5]
&song over=&parts step=1m laps=1 [1] [0,1] [0,1]
&out loop=SAMPLE_RATE map=sample [&tunePart, &bassPart]
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

  it("a table of taps at its selector's rate, which switches what is on in it; a scale it reads stays constant", () => {
    const { at } = tower(SONG);
    expect(at('parts')).toBeCloseTo(at('song'), 6);
    expect(at('major')).toBe(-Infinity);
  });

  it("the strip's structure: what times something, not a lane's voice or mix, nor a note or a scope (side.ts)", () => {
    const src = `${SONG}\n&eq scope=spectrum &tunePart &bassPart\n&songNote label="the form" about=&song\n`;
    const program = compileSource(src);
    const rows = new Map(towerStructure(program, buildGraph(program)).map((r) => [r.name, r.at]));
    expect([...rows.keys()].sort()).toEqual(['bar', 'major', 'parts', 'roots', 'song', 'tune']);
    expect(rows.get('parts')).toBeCloseTo(rows.get('song')!, 6);
    expect(rows.get('major')).toBe(-Infinity);
  });

  it('by turn: a cell at how often it comes round', () => {
    const { at } = tower(SONG, 'turn');
    expect(10 ** at('tune')).toBeCloseTo(100 / 60 / 4, 3); // four steps
  });

  it('emit: what carries sound (a mix) sits by the sound it carries; a selector switches time, not sound, and stays low (decision 016)', () => {
    expect(tower(SONG, 'emit').at('bassPart')).toBeGreaterThan(tower(SONG, 'emit').at('bass'));
    expect(tower(SONG, 'emit').at('song')).toBeLessThan(0);
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
