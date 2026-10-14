/**
 * The tower layout's strip as a minimap of the graph (docs/notes/tower-sky.md): a lane each out (each socket into the
 * sound card), in the order of their sections (then as `order` says), and every node in the lanes of the outs it feeds
 * — a voice and the melody that plays it in its out's lane, a clock several outs share across theirs — so the way a
 * rhythm at its rate becomes a tone at its pitch is a straight line up its lane. Pure: the graph in, lanes and spans out.
 */
import type { GraphModel } from '../engine/graph';
import { isSocket } from './towerlayout';

/** An out: the edge into its socket (its id: what it carries), and the node whose sound it is. */
interface Lane {
  readonly edge: string;
  readonly socket: string;
  readonly source: string;
}

export interface Minimap {
  readonly lanes: readonly Lane[];
  /** Each node feeding an out: the lanes it reaches, first and last (an index into `lanes`). */
  readonly span: ReadonlyMap<string, readonly [number, number]>;
}

/**
 * The minimap of a graph drawn with its sockets (`withSockets`): `rank(source)` orders the lanes (a section's place,
 * then where the source stands); what feeds a lane is everything upstream of its socket, along any edge but an `about`
 * (a groove upstream of the kit it plays).
 */
export function minimap(drawn: GraphModel, rank: (source: string) => number): Minimap {
  const lanes = drawn.edges.flatMap((e) => (isSocket(e.to) ? [{ edge: e.id, socket: e.to, source: e.from }] : [])).sort((a, b) => rank(a.source) - rank(b.source));
  const into = new Map<string, string[]>();
  // (a groove reads its kit, `over=`, but plays it: it feeds the kit's out)
  const kits = new Set(drawn.nodes.flatMap((n) => (n.cell?.kit ? [n.id] : [])));
  const add = (to: string, from: string) => (into.get(to) ?? into.set(to, []).get(to)!).push(from);
  for (const e of drawn.edges) {
    if (e.port === 'about' || e.from === e.to) continue;
    if (e.port === 'over' && kits.has(e.from)) add(e.from, e.to);
    else add(e.to, e.from);
  }
  const reach = new Map<string, number[]>();
  lanes.forEach((l, k) => {
    const seen = new Set([l.socket]);
    for (let ring = [l.socket]; ring.length;) {
      const next: string[] = [];
      for (const id of ring)
        for (const from of into.get(id) ?? []) {
          if (seen.has(from)) continue;
          seen.add(from);
          next.push(from);
          (reach.get(from) ?? reach.set(from, []).get(from)!).push(k);
        }
      ring = next;
    }
  });
  return { lanes, span: new Map([...reach].map(([id, ks]) => [id, [Math.min(...ks), Math.max(...ks)] as const])) };
}
