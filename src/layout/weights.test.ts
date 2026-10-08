import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileSource } from '../engine/compile';
import { buildGraph } from '../engine/graph';
import { massOf, strengthOf } from './weights';

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
});
