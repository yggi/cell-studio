import { describe, expect, it } from 'vitest';
import { Gate } from './gate';

/** A stand-in AudioParam: its events, and its value at a moment (the last event at or before it). */
function param() {
  let events: { v: number; t: number }[] = [];
  return {
    setValueAtTime(v: number, t: number) {
      events.push({ v, t });
      events.sort((a, b) => a.t - b.t);
    },
    cancelScheduledValues(t: number) {
      events = events.filter((e) => e.t < t);
    },
    at(t: number) {
      let v = 0;
      for (const e of events) if (e.t <= t) v = e.v;
      return v;
    },
  };
}

describe('a mix tap opens while notes go through it (#77)', () => {
  it('open from a note to its end, shut between', () => {
    const p = param();
    const g = new Gate(p);
    g.open(1, 2, 0);
    g.open(3, 4, 0);
    expect([0.5, 1, 1.5, 2, 2.5, 3.5, 4.5].map((t) => p.at(t))).toEqual([0, 1, 1, 0, 0, 1, 0]);
  });

  it('overlapping notes, in any order: open over all of them, shut only after the last', () => {
    const p = param();
    const g = new Gate(p);
    g.open(1, 2, 0);
    g.open(3, 5, 0);
    g.open(1.5, 3.5, 0); // (joins the two)
    g.open(0.2, 0.4, 0); // (an earlier one, late)
    expect([0.1, 0.3, 0.5, 1.2, 2.5, 4.9, 5.1].map((t) => p.at(t))).toEqual([0, 1, 0, 1, 1, 1, 0]);
    expect(g.pending(0)).toEqual([
      { a: 0.2, b: 0.4 },
      { a: 1, b: 5 },
    ]);
  });

  it('a note added while one sounds keeps it open; what has rung out is forgotten', () => {
    const p = param();
    const g = new Gate(p);
    g.open(1, 2, 0);
    g.open(1.8, 3, 1.5);
    expect([1.6, 2.5, 3.1].map((t) => p.at(t))).toEqual([1, 1, 0]);
    g.open(10, 11, 5);
    expect(g.pending(5)).toEqual([{ a: 10, b: 11 }]);
    // (nothing past, or empty)
    g.open(2, 3, 5);
    g.open(12, 12, 5);
    expect(g.pending(5)).toEqual([{ a: 10, b: 11 }]);
  });
});
