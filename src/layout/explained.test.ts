import { describe, expect, it } from 'vitest';
import { explainLevels, explainMoments, folded, writtenLevels } from './explained';

describe('what is heard against what is written (#416)', () => {
  // (a beat of .375 s, a bar of 1.5 s; a melody stepping on the beat, round in 4 bars; a riser round in 48 s)
  const meter = [
    { period: 0.375, label: 'beat' },
    { period: 1.5, label: 'bar' },
  ];
  const spans = [
    { name: 'hook', step: 0.375, turn: 6 },
    { name: 'lift', step: 48, turn: 48 },
    { name: 'tick', step: 0.01, turn: 0.01 },
  ];

  it('the written levels: the meter and each step and turn, one level within a semitone, named by the meter first', () => {
    const w = writtenLevels(meter, spans);
    expect(w.map((l) => [l.period, l.label])).toEqual([
      [0.01, 'tick step'],
      [0.375, 'beat'],
      [1.5, 'bar'],
      [6, 'hook turn'],
      [48, 'lift step'],
    ]);
    expect(w.find((l) => l.label === 'beat')!.by).toEqual(['beat', 'hook step']);
  });

  it('levels both ways: heard and explained, heard alone, written alone; out of the range neither', () => {
    const heard = [
      { period: 0.38, strength: 1 }, // (the beat, a little off: within a semitone)
      { period: 1.5, strength: 0.6 },
      { period: 0.75, strength: 0.4 }, // (half a bar: nothing writes it)
    ];
    const x = explainLevels(heard, writtenLevels(meter, spans), [0.05, 20]);
    expect(x.both.map((b) => [b.heard.period, b.written.label])).toEqual([
      [0.38, 'beat'],
      [1.5, 'bar'],
    ]);
    expect(x.heardOnly.map((h) => h.period)).toEqual([0.75]);
    // (the hook's turn is in range and not heard: a gap; the tick and the lift are out of range)
    expect(x.writtenOnly.map((w) => w.label)).toEqual(['hook turn']);
    expect(folded(x)).toEqual({ explained: 2, heard: 3, heardOf: 2, written: 3 });
  });

  it('moments both ways: a section explains a boundary before a splice does; a splice not heard is no gap', () => {
    const written = [
      { at: 0, kind: 'section' as const },
      { at: 12, kind: 'splice' as const },
      { at: 12.5, kind: 'section' as const },
      { at: 24, kind: 'section' as const },
      { at: 30, kind: 'splice' as const },
    ];
    const heard = [{ at: 12.2 }, { at: 30.4 }, { at: 40 }];
    const x = explainMoments(heard, written, 1);
    expect(x.both.map((b) => [b.heard.at, b.written.kind, b.written.at])).toEqual([
      [12.2, 'section', 12.5],
      [30.4, 'splice', 30],
    ]);
    expect(x.heardOnly.map((h) => h.at)).toEqual([40]);
    expect(x.writtenOnly.map((w) => w.at)).toEqual([0, 24]);
  });

  it('a folded piece: nothing on either side alone', () => {
    const x = explainLevels([{ period: 1.5, strength: 1 }], writtenLevels([{ period: 1.5, label: 'bar' }], []), [0.05, 20]);
    const f = folded(x);
    expect([f.explained === f.heard, f.heardOf === f.written]).toEqual([true, true]);
  });
});
