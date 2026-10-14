import { describe, expect, it } from 'vitest';
import type { FreeSpec } from '@yggi/cells/engine/ast';
import { compileSource } from '@yggi/cells/engine/compile';
import { freeAtPlace, freePlace, knobName, knobOf, LOOSE, padValue, readLearned, takeover, type Takeover } from './learn';

const span = { line: 1, col: 1, len: 1 };
const free = (o: Partial<FreeSpec>): FreeSpec => ({ key: 'param', value: 0, unit: '', lo: 0, hi: 1, span, ...o });

describe('a knob, from a message', () => {
  it('reads control changes and note-ons, on their channel', () => {
    expect(knobOf([0xb0, 7, 64])).toEqual({ kind: 'cc', channel: 0, number: 7, value: 64 });
    expect(knobOf([0xb3, 74, 0])).toEqual({ kind: 'cc', channel: 3, number: 74, value: 0 });
    expect(knobOf([0x91, 36, 100])).toEqual({ kind: 'note', channel: 1, number: 36, value: 100 });
  });
  it('ignores note-offs (a note-on at 0 too), clock, bends and short messages', () => {
    for (const m of [[0x80, 36, 0], [0x90, 36, 0], [0xf8], [0xe0, 0, 64], [0xb0, 7]]) expect(knobOf(m)).toBeNull();
  });
  it('names a knob', () => {
    expect(knobName({ kind: 'cc', channel: 0, number: 7 })).toBe('CC 7');
    expect(knobName({ kind: 'note', channel: 9, number: 36 })).toBe('note 36 ch 10');
  });
});

describe("a free()'s place: its cell and what it sets", () => {
  const code = (above: string) =>
    `${above}&bar scan(4 4 4 4) step=free(90bpm, 60..240)\n&fx lpf=free(1200, 200..5000) swing=free(.2, 0..1)\n&mix map=sample [&bar * free(.4, 0..1), &fx * free(.8, 0..1)]\n`;

  it('names each free() by cell and key, a second of a kind by its count', () => {
    const r = compileSource(code(''));
    const places = [...r.cells.values()].flatMap((c) => c.frees.map((f) => freePlace(r.cells, f))).sort();
    expect(places).toEqual(['bar/step', 'fx/param:lpf', 'fx/param:swing', 'mix/gain', 'mix/gain#1']);
  });
  it('finds the same free() after an edit that moves its place in reading order', () => {
    const before = compileSource(code(''));
    const after = compileSource(code('&first scan(4) step=free(2hz, 1..4)\n'));
    expect(freeAtPlace(before.cells, 'fx/param:lpf')?.span.line).toBe(2);
    const moved = freeAtPlace(after.cells, 'fx/param:lpf');
    expect(moved?.span.line).toBe(3);
    expect(moved?.value).toBe(1200);
    expect(freeAtPlace(after.cells, 'gone/step')).toBeUndefined();
  });
});

describe('pads', () => {
  const pad = free({ key: 'choice', lo: 0, hi: 30, labels: '1 2 3 A 4 5 6 B 7 8 9 C * 0 # D'.split(' ') });
  it('the pad learned picks the first choice, the ones above the next', () => {
    expect([36, 37, 39, 51].map((n) => padValue(pad, 36, n))).toEqual([0, 2, 6, 30]);
    expect(padValue(pad, 36, 35)).toBeNull();
    expect(padValue(pad, 36, 52)).toBeNull();
  });
});

describe('soft takeover: nothing jumps', () => {
  const level = free({ key: 'gain', value: 0.5, lo: 0, hi: 1 });
  const turn = (state: Takeover, cc: number, now: number) => takeover(level, state, cc / 127, now);

  it('leaves the value while the knob is elsewhere, and moves it once the knob passes through it', () => {
    let r = turn(LOOSE, 10, 0.5);
    expect(r.value).toBeNull();
    r = turn(r.state, 40, 0.5);
    expect(r.value).toBeNull();
    expect(r.state.knob).toBeCloseTo(40 / 127);
    // 40 → 70 passes 0.5 (63.5): caught
    r = turn(r.state, 70, 0.5);
    expect(r.value).toBe(0.55);
    // and from then on it follows the knob, both ways
    r = turn(r.state, 20, r.value!);
    expect(r.value).toBe(0.16);
  });
  it('takes over from above as from below, and at once when the knob lands on the value', () => {
    const above = turn(turn(LOOSE, 120, 0.5).state, 50, 0.5);
    expect(above.value).toBe(0.39);
    expect(turn(LOOSE, 64, 0.5).value).toBe(0.5);
  });
  it('lets go once something else moves the value (the slider, Stop, Keep)', () => {
    const caught = turn(turn(LOOSE, 60, 0.5).state, 70, 0.5);
    expect(caught.value).toBe(0.55);
    // the slider moved it to 0.9: the knob at 72 no longer holds it
    expect(turn(caught.state, 72, 0.9).value).toBeNull();
  });
});

describe('what this browser keeps', () => {
  it('reads what was kept, and nothing out of junk', () => {
    const kept = { echo: true, pieces: { Song: { 'bar/step': { kind: 'cc', channel: 0, number: 7 }, junk: { kind: 'x' } } } };
    expect(readLearned(JSON.stringify(kept))).toEqual({ echo: true, pieces: { Song: { 'bar/step': { kind: 'cc', channel: 0, number: 7 } } } });
    for (const t of [null, '', 'nope', '3', '[]']) expect(readLearned(t).pieces).toEqual({});
  });
});
