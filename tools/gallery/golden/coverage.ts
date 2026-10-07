/** What the golden graph still lacks: the kinds of wheel and edge the examples draw that it doesn't. */
import { edgeFixtures } from '../edges/fixtures';
import { pieceOf, pieces } from '../pieces';
import { fixtures } from '../wheels/fixtures';
import { golden } from './golden';

export function coverage(seconds = 3) {
  const mine = pieceOf('golden', golden.source, seconds);
  if (!mine) throw new Error('the golden graph does not compile');
  const have = { wheels: new Set(fixtures([mine]).map((f) => f.key)), edges: new Set(edgeFixtures([mine]).map((f) => f.key)) };
  const all = pieces(seconds, []);
  return {
    wheels: fixtures(all)
      .filter((f) => !have.wheels.has(f.key))
      .map((f) => f.key),
    edges: edgeFixtures(all)
      .filter((f) => !have.edges.has(f.key))
      .map((f) => f.key),
    extra: [...have.wheels].filter((k) => !fixtures(all).some((f) => f.key === k)),
  };
}
