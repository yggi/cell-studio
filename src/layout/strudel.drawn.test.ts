import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { flatten } from '@yggi/cells/engine/flatten';
import { cellView } from './cellview';

// Strudel's other step forms (#337, decision 027: a spelling shared with Strudel's mini-notation keeps its meaning):
// <a b c> one per lap, x/n slowed, x(k,n,r) a euclid on a step, [a b|c] a choice of sequences. A lap of the cell is
// Strudel's cycle.

type R = ReturnType<typeof compileSource>;
const clean = (src: string): R => {
  const r = compileSource(src);
  expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return r;
};

describe('one step to everything around it', () => {
  it('the wheel draws it as a subsequence: every alternative in its slot', () => {
    const r = clean('&t <0 2> 4');
    expect(cellView(r, 't', codeShifts(r), false)).not.toBeNull();
    const f = flatten(r, 't', codeShifts(r));
    expect(f.map((e) => [e.step, e.duration, e.value, e.laps])).toEqual([
      [0, 1, 0, { of: 2, is: 0 }],
      [0, 1, 2, { of: 2, is: 1 }],
      [1, 1, 4, undefined],
    ]);
  });
});
