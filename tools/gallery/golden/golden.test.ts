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
    layout.layNet();
    // each bus a ratsnest, its readers the junctions: one tap takes the trunk from the owner, the others come on from a
    // reader (sound branches from its owner to each: a star)
    const taps = layout.taps();
    for (const net of model.nets.filter((n) => n.port !== 'step' && n.band !== 'audio'))
      expect(net.taps.map((id) => taps.get(id) === null).filter(Boolean), net.id).toHaveLength(1);
    for (const net of model.nets.filter((n) => n.band === 'audio'))
      expect(
        net.taps.every((id) => taps.get(id) === null),
        net.id,
      ).toBe(true);
    const { crossings, overlap } = layout.quality();
    expect(overlap).toBe(0);
    // (the graph is planar: it can be drawn with none. Lower this when the layout gets there. 4 → 6 when the sun got
    // its edge to its law; a belt's runs now count, each over every edge and wheel, and the meter is placed so its belt
    // crosses little: docs/notes/nets.md)
    // 6 → 13 when the tape's step on the capstan became a belt (rigid): the three turntables now sit together as one
    // machine, and the tape's write and play edges reach across to its source and its head
    expect(crossings).toBeLessThanOrEqual(13);
    layout.destroy();
  });
});
