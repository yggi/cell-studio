import { describe, expect, it } from 'vitest';
import { compileSource } from '../../../src/engine/compile';
import { buildGraph } from '../../../src/engine/graph';
import { ForceLayout } from '../../../src/layout/physics';
import { coverage } from './coverage';
import { golden } from './golden';

// The golden graph: one piece with a value of every dimension the examples draw, given to the app as any piece is.
describe('the golden graph', () => {
  const program = compileSource(golden.source);
  const model = buildGraph(program);

  it('compiles, without a warning', () => {
    expect(program.diagnostics.map((d) => `${d.severity}: ${d.message}`)).toEqual([]);
  });

  it('shows every kind of wheel and edge the examples draw (as dimensions: coverage.ts)', () => {
    expect(coverage().missing).toEqual({ wheels: [], edges: [] });
  });

  it('is laid out by the app: the crossings as drawn', () => {
    // (as physics.library.test.ts lays an example out: layered, relaxed, the meters placed last)
    const layout = new ForceLayout(undefined, { live: false });
    layout.setGraph(model);
    layout.tick(500);
    layout.placeMeters();
    const { crossings, overlap } = layout.quality();
    expect(overlap).toBe(0);
    // (the graph is planar: it can be drawn with none. Lower this when the layout gets there.)
    expect(crossings).toBeLessThanOrEqual(4);
    layout.destroy();
  });
});
