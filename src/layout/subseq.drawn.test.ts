import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { liveAt } from '@yggi/cells/engine/live';
import { buildGraph } from './drawn';
import { cellView } from './cellview';

// Brackets read as Strudel's mini-notation does (decision 027): `[a b]` a subsequence, `[a, b]` a chord, `[a b, c]` a stack.

type R = ReturnType<typeof compileSource>;
const clean = (src: string): R => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r;
};

describe('cells inside a subsequence', () => {
  it('a splice inside is a splice: drawn and lit (checked by cells: its compiler/compile.test.ts, #500)', () => {
    const r = clean('&a 0 2\n&t step=1 [&a^1 7] 9\n&v s=sine loop=C4\n&out map=sample [&t * &v]');
    expect(r.cells.get('t')!.children.get('a')).toBe(1);
    const g = buildGraph(r, { bulbs: false });
    expect(g.edges.find((e) => e.source === 'cell:t' && e.target === 'cell:a')).toBeDefined();
    // (at a quarter of the first second &a's second note plays: lit, through &a)
    const live = liveAt(r, codeShifts(r), new Set(), 0.3);
    expect(live.nodes.has('cell:a')).toBe(true);
  });
});

describe('subsequences drawn', () => {
  it("the wheel splits a subsequence's step among its notes", () => {
    const r = clean('&t [0 2] 4');
    const v = cellView(r, 't', codeShifts(r), false)!;
    expect(v.segments.map((s) => [s.t0, s.t1, s.index])).toEqual([
      [0, 0.25, 0],
      [0.25, 0.5, 0],
      [0.5, 1, 1],
    ]);
    expect(v.detents).toBe(2);
  });
  it('a splice inside one is a bulb in its slot', () => {
    const r = clean('&a 0 2\n&t step=1 [&a 7] 9\n&v s=sine loop=C4\n&out map=sample [&t * &v]');
    const v = cellView(r, 't', codeShifts(r), false)!;
    expect(v.bulbs?.map((b) => [b.name, b.t0, b.t1])).toEqual([['a', 0, 0.25]]);
  });
});
