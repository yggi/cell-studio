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

describe('a key held keeps the tap open (#252)', () => {
  it('open from the press until the key has rung out, shut after', () => {
    const p = param();
    const g = new Gate(p);
    g.hold(1, 2, 1);
    expect([1.5, 2.5, 100].map((t) => p.at(t))).toEqual([0, 1, 1]);
    g.letGo(1, 5, 4);
    expect([2.5, 4.9, 5.1].map((t) => p.at(t))).toEqual([1, 1, 0]);
    expect(g.held()).toEqual([]);
  });

  it("a plan's note meanwhile can't close it under the key, and a note after the key is open too", () => {
    const p = param();
    const g = new Gate(p);
    g.hold(1, 2, 1);
    g.open(3, 4, 2.5);
    expect([3.5, 4.5, 50].map((t) => p.at(t))).toEqual([1, 1, 1]);
    g.letGo(1, 6, 5);
    // (the plan's span is inside the key's: shut when the key has rung out)
    expect([5.5, 6.5].map((t) => p.at(t))).toEqual([1, 0]);
    g.open(8, 9, 7);
    expect([7.5, 8.5, 9.5].map((t) => p.at(t))).toEqual([0, 1, 0]);
  });

  it('two keys: shut only after the last has rung out; one let go twice, or never held, is ignored', () => {
    const p = param();
    const g = new Gate(p);
    g.hold(1, 2, 1);
    g.hold(2, 3, 2.5);
    g.letGo(1, 4, 3.5);
    expect([3.9, 4.5].map((t) => p.at(t))).toEqual([1, 1]);
    g.letGo(1, 4, 3.5);
    g.letGo(9, 4, 3.5);
    g.letGo(2, 7, 6);
    expect([6.9, 7.1].map((t) => p.at(t))).toEqual([1, 0]);
  });

  it('a key let go before it started is open for no time; the keys held carry onto a new gate', () => {
    const p = param();
    const g = new Gate(p);
    g.hold(1, 5, 1);
    g.hold(2, 6, 1);
    expect(g.held()).toEqual([
      { id: 1, a: 5 },
      { id: 2, a: 6 },
    ]);
    g.letGo(1, 4, 2);
    expect([5.5].map((t) => p.at(t))).toEqual([0]);
    const next = new Gate(param());
    for (const k of g.held()) next.hold(k.id, k.a, 2);
    expect(next.held()).toEqual([{ id: 2, a: 6 }]);
  });
});
