/** What the golden graph lacks (a value of a dimension the examples have), and what it has more of than it needs. */
import { pieceOf, pieces } from '../pieces';
import { carriers, type Carrier } from './facets';
import { golden } from './golden';

const values = (list: readonly Carrier[]) => new Set(list.flatMap((c) => c.facets));

export function coverage(seconds = 3) {
  const mine = pieceOf('golden', golden.source, seconds);
  if (!mine) throw new Error('the golden graph does not compile');
  const have = carriers(mine);
  const all = pieces(seconds, []).map(carriers);
  const wanted = { wheels: values(all.flatMap((c) => c.wheels)), edges: values(all.flatMap((c) => c.edges)) };
  const count = (list: readonly Carrier[]) => {
    const n = new Map<string, number>();
    for (const c of list) for (const f of c.facets) n.set(f, (n.get(f) ?? 0) + 1);
    return n;
  };
  const [wn, en] = [count(have.wheels), count(have.edges)];
  return {
    missing: { wheels: [...wanted.wheels].filter((f) => !wn.has(f)).sort(), edges: [...wanted.edges].filter((f) => !en.has(f)).sort() },
    // (a wheel or an edge that carries nothing the rest don't: a candidate to drop, if what hangs on it can go too)
    spare: {
      wheels: have.wheels.filter((c) => c.facets.every((f) => wn.get(f)! > 1)).map((c) => c.what),
      edges: have.edges.filter((c) => c.facets.every((f) => en.get(f)! > 1)).map((c) => c.what),
    },
    wheels: have.wheels.length,
    edges: have.edges.length,
  };
}
