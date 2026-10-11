/**
 * Sub-wheels, in one place ([decision 021](../../docs/decisions/021-tape-heads.md): one rule for every sub-wheel). A
 * cell that is only part of another is drawn on it, as a bulb, not as a node of its own. Each rule says, for one kind
 * of host: when a cell is a bulb on it (inlined) or keeps its node (outlined), the room its bulbs take round the host's
 * wheel, where a bulb sits (the host's own coordinate for it, from the code), and whether the bulb's own edges leave
 * from the bulb or from the host. The rules are tried in order; the first that takes a cell decides. graph.ts asks here
 * and nowhere else; the glyphs draw what the layouts here place (track.ts, kit.ts, tape.ts).
 */
import type { GraphEdge, GraphNode } from '../engine/graph';
import { cellId } from '../engine/ids';
import type { CompileResult, ResolvedCell } from '../engine/program';
import { kitOf, kitRoom, memberPlaces } from './kit';
import { effectiveShow, pluginOf } from './show';
import { drawnAsTape, headBulbs, TAPE_SIZE, UNTURNED } from './tape';
import { bulbHub, trackRoom } from './track';

type Reach = { readonly room: number; readonly below: number };
type At = { readonly x: number; readonly y: number; readonly r: number };

/** What a rule sees of the graph while it decides. */
interface Scene {
  readonly result: CompileResult;
  readonly byId: ReadonlyMap<string, GraphNode>;
  readonly edges: readonly GraphEdge[];
  /** What reads each node (its edges by `from`). */
  readonly reads: ReadonlyMap<string, readonly GraphEdge[]>;
}

interface Rule {
  /** What it is, for reading: the bulb, on what. */
  readonly kind: string;
  /** The host a node is a bulb on, or null: not this rule's (inlined when it answers, outlined otherwise). */
  readonly host: (n: GraphNode, s: Scene) => string | null;
  /** A host's bulbs' room round its wheel (px), `size` px across, or null: not this rule's host, or no room. */
  readonly reach: (result: CompileResult, host: GraphNode, hosts: ReadonlyMap<string, string>) => Reach | null;
  /** Whether a bulb, by name, is this rule's on its host (by name). */
  readonly mine: (result: CompileResult, host: string, bulb: string) => boolean;
  /** Where a bulb sits from its host's centre (px, its host unturned), its host `size` px across; host and bulb by name. */
  readonly at: (result: CompileResult, host: string, bulb: string, hosts: ReadonlyMap<string, string>, size: number) => At | null;
  /** Its own edges (what it steps, what it plays into) leave from the bulb; else they are drawn from its host. */
  readonly leaves: boolean;
}

/** The shows that draw a cell as a track of steps in time (where a splice can be a bulb). */
const TRACKS: ReadonlySet<string> = new Set(['braid', 'pattern', 'notes', 'midi', 'do', 'degrees']);

/** A cell's node drawn as a track of steps (CellGlyph's braid): not a meter, a table, a mix, a scope, a plugin's wheel. */
const isTrack = (result: CompileResult, n: GraphNode | undefined): boolean =>
  !!n &&
  n.kind === 'cell' &&
  // (a table of taps: its taps are bulbs on it, decision 016)
  ([...(result.taps?.values() ?? [])].includes(n.cell.name) ||
    (!n.isMeter &&
      !n.cell.root &&
      !n.cell.scan &&
      !n.cell.mix &&
      !n.cell.kit &&
      !n.cell.sink &&
      !n.cell.note &&
      typeof n.cell.params.scope !== 'string' &&
      !pluginOf(result, n.cell.name) &&
      TRACKS.has(effectiveShow(result, n.cell.name).show)));

/** A read head of a tape drawn as a tape's wheel, at its size in the graph, if it is one drawn as a bulb there. */
const headOf = (result: CompileResult, tape: ResolvedCell, head: string) =>
  drawnAsTape(tape) ? headBulbs(tape, result.cells.values(), TAPE_SIZE * tape.size).find((h) => h.name === head) : undefined;

/** The one edge reading a node, plainly (a splice: no pick, no delay), or null. */
const plainRead = (n: GraphNode, s: Scene): GraphEdge | null => {
  const r = s.reads.get(n.id) ?? [];
  return r.length === 1 && r[0].port === 'braid' && !r[0].transforms.some((t) => t.some((x) => x.kind === 'pick' || x.kind === 'delay')) ? r[0] : null;
};

const isHost = (host: GraphNode, hosts: ReadonlyMap<string, string>) => host.kind === 'cell' && !host.petalOf && [...hosts.values()].includes(host.cell.name);

const RULES: readonly Rule[] = [
  {
    // a tap of a meter's bus, on its table (decision 016): fanned over the top in braid order; what it steps leaves
    // from it
    kind: 'a tap, on its table',
    host: (n, s) => {
      const table = n.kind === 'cell' ? s.result.taps?.get(n.cell.name) : undefined;
      return table && s.byId.has(cellId(table)) ? cellId(table) : null;
    },
    // (the table is drawn as a track, its taps its bulbs: the track's room)
    reach: () => null,
    mine: (result, host, bulb) => result.taps?.get(bulb) === host,
    at: (result, host, bulb, hosts, size) => bulbHub(result, host, bulb, hosts, size),
    leaves: true,
  },
  {
    // a tape's read head that takes nothing but the tape, on the tape (decision 021): at= of length=, clockwise from the
    // write head; not one the tape also records (a loop: what it writes is an edge to draw); what it plays into leaves
    // from it
    kind: 'a read head, on its tape',
    host: (n, s) => {
      const tape = n.kind === 'cell' && typeof n.cell.params.play === 'string' ? s.byId.get(cellId(n.cell.params.play)) : undefined;
      return tape?.kind === 'cell' &&
        n.kind === 'cell' &&
        tape.cell.params.write !== n.cell.name &&
        headOf(s.result, tape.cell, n.cell.name) &&
        !s.edges.some((e) => e.to === n.id && e.from !== tape.id && e.port !== 'about')
        ? tape.id
        : null;
    },
    // (their room all round, whichever way the layout turns the tape)
    reach: (result, host, hosts) => {
      if (host.kind !== 'cell' || !drawnAsTape(host.cell) || !isHost(host, hosts)) return null;
      const h = headBulbs(host.cell, result.cells.values(), TAPE_SIZE * host.cell.size)[0];
      const room = h ? h.dist + h.r - (TAPE_SIZE * host.cell.size) / 2 : 0;
      return room ? { room, below: room } : null;
    },
    mine: (result, host, bulb) => {
      const tape = result.cells.get(host);
      return !!tape && !!headOf(result, tape, bulb);
    },
    // (on its tape as it stands unturned: the layout turns it with the tape)
    at: (result, host, bulb) => {
      const tape = result.cells.get(host);
      const h = tape && headOf(result, tape, bulb);
      if (!h) return null;
      const a = ((UNTURNED + h.offset) * Math.PI) / 180;
      return { x: Math.cos(a) * h.dist, y: Math.sin(a) * h.dist, r: h.r };
    },
    leaves: true,
  },
  {
    // a voice only a kit plays, on the kit: just outside its own slice, where the number that picks it points (a gate's
    // voices are not part of it: they keep their nodes, decision 022)
    kind: 'a voice, on its kit',
    host: (n, s) => {
      const r = n.kind === 'voice' ? plainRead(n, s) : null;
      const host = r ? s.byId.get(r.to) : undefined;
      return r && host?.kind === 'cell' && kitOf(s.result, host.cell.name) ? r.to : null;
    },
    reach: (result, host, hosts) => {
      const kit = host.kind === 'cell' && isHost(host, hosts) ? kitOf(result, host.cell.name) : null;
      const room = kit && host.kind === 'cell' ? kitRoom(128 * host.cell.size, kit.length) : 0;
      return room ? { room, below: room } : null;
    },
    mine: (result, host, bulb) => !!kitOf(result, host)?.includes(bulb),
    at: (result, host, bulb, _hosts, size) => {
      const kit = kitOf(result, host);
      const i = kit?.indexOf(bulb) ?? -1;
      return kit && i >= 0 ? memberPlaces(size, kit.length)[i] : null;
    },
    leaves: false,
  },
  {
    // a splice (#221, decision 014): a cell read by one edge only, a ref without a pick or a delay, both it and the
    // braid that splices it drawn as tracks: a bulb on its braid's track, at its time
    kind: 'a splice, on its braid',
    host: (n, s) => {
      const r = plainRead(n, s);
      return r && isTrack(s.result, n) && isTrack(s.result, s.byId.get(r.to)) ? r.to : null;
    },
    reach: (result, host, hosts) => (host.kind === 'cell' && !host.petalOf && isTrack(result, host) ? trackRoom(result, host.cell.name, hosts, 128 * host.cell.size) : null),
    mine: () => true,
    at: (result, host, bulb, hosts, size) => bulbHub(result, host, bulb, hosts, size),
    leaves: false,
  },
];

/** The bulbs (by node id), each to its host's: the first rule that takes a node decides. */
export function subWheels(result: CompileResult, nodes: readonly GraphNode[], edges: readonly GraphEdge[]): Map<string, string> {
  const reads = new Map<string, GraphEdge[]>();
  for (const e of edges) reads.set(e.from, [...(reads.get(e.from) ?? []), e]);
  const s: Scene = { result, byId: new Map(nodes.map((n) => [n.id, n])), edges, reads };
  const out = new Map<string, string>();
  for (const n of nodes)
    for (const rule of RULES) {
      const host = rule.host(n, s);
      if (host) {
        out.set(n.id, host);
        break;
      }
    }
  return out;
}

/** A host's bulbs' room round its wheel (GraphNode.reach), by the first rule whose host it is. `hosts`: bulb → host, by name. */
export function reachOf(result: CompileResult, host: GraphNode, hosts: ReadonlyMap<string, string>): Reach | null {
  for (const rule of RULES) {
    const r = rule.reach(result, host, hosts);
    if (r) return r;
  }
  return null;
}

/** The rule a bulb (by name) on its host (by name) is drawn by: the first that owns it. */
const ruleOf = (result: CompileResult, host: string, bulb: string) => RULES.find((rule) => rule.mine(result, host, bulb));

/** Whether a bulb's own edges leave from it (a tap, a read head), not from its host: host and bulb by name. */
export function leavesFromBulb(result: CompileResult, host: string, bulb: string): boolean {
  return !!ruleOf(result, host, bulb)?.leaves;
}

/** Where a bulb's edges leave from, from its host's centre (GraphEdge.bulbAt), its host `size` px across; by name. */
export function bulbAt(result: CompileResult, host: string, bulb: string, hosts: ReadonlyMap<string, string>, size: number): At | null {
  return ruleOf(result, host, bulb)?.at(result, host, bulb, hosts, size) ?? null;
}
