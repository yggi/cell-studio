import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { createHost, planOf } from '../engine/host';
import { windowAt } from '../engine/schedule';
import { renderLength } from './render';
import { LocalEngine } from './engine';

describe('a drone (decision 028) offline and in the engines', () => {
  it('a piece that is only a drone renders a minute, as any piece that never comes round', () => {
    expect(renderLength(compileSource('&a loop=A4'))).toBe(60);
    // (beside a melody, the melody's cycle)
    expect(renderLength(compileSource('&a loop=A4\n&t step=2 0 4 7\n&v s=tri loop=C4\n&m [&t * &v]'))).toBe(1.5);
  });
  it('both engines start it where the run began', () => {
    const src = '&a loop=A4';
    const p = planOf(src);
    const e = new LocalEngine();
    e.load(p);
    expect(e.window(3, 0.25, 3)).toEqual(windowAt(p, 3, 0.25, { begins: 3 }));
    expect(e.window(3, 0.25, 3).events).toHaveLength(1);
    const host = createHost();
    host({ type: 'load', code: src });
    expect(host({ type: 'window', id: 1, from: 3, length: 0.25, begins: 3 })).toMatchObject({ window: windowAt(p, 3, 0.25, { begins: 3 }) });
  });
});
