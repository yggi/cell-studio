import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from './drawn';
import { crossingCost, massOf, SAME_KIND, strengthOf } from './weights';

// The layout's weights (docs/notes/nets.md): a node's mass by what it is, an edge's strength by what it carries.
describe('weights', () => {
  const g = buildGraph(compileSource(readFileSync('tools/gallery/golden/golden.cells', 'utf8')));
  const owners = new Set(g.nets.map((n) => n.owner));
  const mass = (name: string) =>
    massOf(
      g.nodes.find((n) => n.id === `cell:${name}`)!,
      owners.has(`cell:${name}`),
    );
  // (into a product: the wire into its junction)
  const into = (id: string, to: string) => id === `cell:${to}` || g.nodes.some((n) => n.id === id && n.kind === 'junction' && n.voice === to);
  const strength = (from: string, to: string) => strengthOf(g.edges.find((e) => e.from === `cell:${from}` && into(e.to, to))!);

  it('a turntable heaviest, then a meter, a net’s owner, a sound, a cell', () => {
    expect([mass('capstan'), mass('bar'), mass('mode'), mass('flute'), mass('tune')]).toEqual([3, 2.5, 2, 1.5, 1]);
    // (a product's junction weighs nothing: it isn't in the forces, junctions.ts)
    expect(
      massOf(
        g.nodes.find((n) => n.kind === 'junction')!,
        false,
      ),
    ).toBe(0);
  });

  it('a belt strongest, a bus by its width, a wire 1, a note’s link weak', () => {
    expect(strength('capstan', 'hats')).toBe(3);
    expect(strength('mode', 'theme')).toBeGreaterThan(1);
    expect(strength('walk', 'lead')).toBe(1);
    expect(strength('piece', 'out')).toBeLessThan(1);
  });

  it('a crossing costs the two strengths, more for two of one kind', () => {
    expect(crossingCost({ w: 1, kind: 'cv' }, { w: 1, kind: 'audio' })).toBe(1);
    expect(crossingCost({ w: 1, kind: 'audio' }, { w: 1, kind: 'audio' })).toBe(SAME_KIND);
    expect(crossingCost({ w: 2, kind: 'sync' }, { w: 2, kind: 'sync' })).toBe(4 * SAME_KIND);
    // (a label's link: weak, whatever it crosses; no kind given, no kind shared)
    expect(crossingCost({ w: 0.3, kind: 'none' }, { w: 1, kind: 'cv' })).toBeCloseTo(0.3);
    expect(crossingCost({ w: 1 }, { w: 1 })).toBe(1);
  });
});
