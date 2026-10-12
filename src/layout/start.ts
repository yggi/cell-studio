/**
 * Where a graph starts: the layered start (layered.ts, from ranks.ts), a fresh graph's nodes put there and an edit's new ones beside their parents (startNodes), and the rows'
 * order chosen for a graph by its shape (rowsKey; the trial itself is physics.ts: bestRowOrder).
 */
import { structureKey, type GraphModel } from '../engine/graph';
import { flowRanks } from './ranks';
import { fitTurns, tapeFaces } from './aims';
import { layered } from './layered';
import { massOf } from './weights';
import type { LayoutState, PhysLink, PhysNode } from './state';
import { loomReach } from './looms';

/** Small deterministic hash so new nodes always spawn in the same place. */
function jitter(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) / 0xffffffff - 0.5) * 40;
}

/**
 * Where a graph's nodes want to be and where a fresh graph starts: laid out in layers (`home`, layered.ts), each node's
 * place there kept as the pulls back to it (`s.rankY` and `s.colX`). `rowOrder`: the rows' order for the layered start.
 */
export function startPlaces(s: LayoutState, model: GraphModel, fresh: boolean, rowOrder: () => number): { home: Map<string, { x: number; y: number }> } {
  // layers by rank in the signal path, from the meter (bottom) up to the sound card (top); a fresh graph starts there,
  // an edit keeps what's on screen (rows given: the frequency tower's, a probe; what it doesn't name keeps its rank in
  // the flow). Each node's place is its home: where a fresh graph starts, and what it springs to
  s.faces = tapeFaces(model);
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const lay = layered(model, {
    gapX: s.opts.collidePad * 1.6,
    gapY: s.opts.layerGap,
    radius: (id) => s.opts.radius(byId.get(id)!),
    flat: !s.opts.clusters,
    rowOrder: rowOrder(),
    // (rows given: what they don't name keeps its rank in the flow)
    ...(s.opts.ranks ? { ranks: new Map([...flowRanks(model)].map(([id, r]) => [id, s.opts.ranks!.get(id) ?? r])) } : {}),
  });
  const ys = [...lay.values()].map((p) => p.y);
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const home = new Map([...lay].map(([id, p]) => [id, { x: p.x, y: p.y - midY }]));
  // each tape turned to face where the layers put what its heads connect to; then each read head's
  // cell starts in its head's direction, just clear of the tape (a write source stays: it's a source of more)
  // (only to place them: the tapes' turns are fitted to where everything is once it's placed, below)
  const homeTurns = fitTurns(s, (id) => home.get(id));
  for (const f of s.faces) {
    const t = home.get(f.tape);
    if (f.write || !t || !home.has(f.to)) continue;
    const angle = (homeTurns.get(f.tape) ?? 0) + f.offset;
    const d = s.opts.radius(byId.get(f.tape)!) + s.opts.radius(byId.get(f.to)!) + s.opts.collidePad;
    home.set(f.to, { x: t.x + Math.cos(angle) * d, y: t.y + Math.sin(angle) * d });
  }
  s.colX = new Map([...home].map(([id, p]) => [id, p.x]));
  s.rankY = new Map([...home].map(([id, p]) => [id, p.y]));
  return { home };
}

/**
 * The physics' nodes for a graph: one kept for each node already laid out (an edit keeps what's on screen), and a new
 * one for each other — at its place in the start, else beside its parent — with what it is (role, cluster, mass); the
 * ends (the sound card, the meters) drawn to their places; and a node for each tag, with its springs to its cells.
 */
export function startNodes(
  s: LayoutState,
  model: GraphModel,
  fresh: boolean,
  parentOf: ReadonlyMap<string, string>,
  { home }: { home: Map<string, { x: number; y: number }> },
): { next: Map<string, PhysNode>; added: number; tagLinks: PhysLink[] } {
  const next = new Map<string, PhysNode>();
  let added = 0;
  const owners = new Set((model.nets ?? []).map((net) => net.owner));
  // (a wheel's room takes its loom: the buses round it, and a straight run out of it before the next wheel's)
  const looms = loomReach(model);
  // (and its bulbs: a braid's splices bend out of its ring, layout/track.ts)
  const roomOf = (n: GraphModel['nodes'][number]) => s.opts.radius(n) + Math.max(looms.get(n.id) ?? 0, (n as { reach?: { room: number } }).reach?.room ?? 0);
  model.nodes.forEach((n) => {
    let p = fresh ? undefined : s.byId.get(n.id);
    if (!p) {
      added++;
      const parent = s.byId.get(parentOf.get(n.id) ?? '');
      let x: number, y: number;
      if (home.has(n.id) && (fresh || !parent)) {
        x = home.get(n.id)!.x;
        y = home.get(n.id)!.y;
      } else if (parent?.x !== undefined && parent.y !== undefined) {
        // spawn next to the parent
        x = parent.x + s.opts.layerGap * 0.6;
        y = parent.y - s.opts.layerGap * 0.3;
      } else {
        // a new cell on its own: at the origin, between the top and the bottom
        x = 0;
        y = 0;
      }
      // (a little jitter, even from a home in the layers: exactly in line, an edge would run straight through a node)
      p = { id: n.id, depth: n.depth, radius: roomOf(n), x: x + jitter(n.id, 1 + 2 * s.opts.seed), y: y + jitter(n.id, 2 + 2 * s.opts.seed) };
    }
    p.depth = n.depth;
    p.radius = roomOf(n);
    p.loom = looms.get(n.id) ?? 0;
    const cell = (n as { cell?: { mix?: unknown; sink?: boolean; note?: boolean; tags?: readonly string[] } }).cell;
    p.role = (n as { isMeter?: boolean }).isMeter ? 'clock' : n.kind === 'voice' || cell?.mix || cell?.sink ? 'audio' : 'cell';
    p.group = cell?.note ? undefined : cell?.tags?.[0];
    p.tags = cell?.note ? undefined : cell?.tags;
    const prm = (cell as { params?: Record<string, unknown> } | undefined)?.params;
    p.mass = massOf(n, owners.has(n.id));
    p.heavy = typeof prm?.motor === 'number' || typeof prm?.belt === 'number'; // (a piece's card: its tags are the piece's, not a cluster)
    next.set(n.id, p);
  });

  // tags inside the piece: a node each (its name), among its cells — it pushes cells and edges away,
  // and its springs hold its cells round it
  const members = new Map<string, string[]>();
  for (const p of next.values()) if (p.group) (members.get(p.group) ?? members.set(p.group, []).get(p.group)!).push(p.id);
  const tagLinks: PhysLink[] = [];
  for (const [t, ids] of members) {
    const id = `tag:${t}`;
    let p = s.byId.get(id);
    if (!p || fresh) {
      const xs = ids.map((m) => next.get(m)!.x ?? 0);
      const ys = ids.map((m) => next.get(m)!.y ?? 0);
      p = {
        id,
        depth: 0,
        radius: 40 + 13 * t.length,
        x: xs.reduce((a, v) => a + v, 0) / ids.length + jitter(id, 1 + 2 * s.opts.seed),
        y: ys.reduce((a, v) => a + v, 0) / ids.length + jitter(id, 2 + 2 * s.opts.seed),
      };
    }
    p.role = 'tag';
    p.radius = 40 + 13 * t.length;
    next.set(id, p);
    for (const m of ids) tagLinks.push({ id: `${id}~${m}`, source: m, target: id, count: 1, part: false, tag: true });
  }
  return { next, added, tagLinks };
}

/** A graph's shape, for the rows' order chosen for it (LayoutOptions.rowOrders): its named cells and its edges, hashed. */
export function rowsKey(model: GraphModel): string {
  const named = model.nodes.filter((n) => !n.petalOf);
  const text = structureKey({ ...model, nodes: named });
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return `${named.length}:${(h >>> 0).toString(36)}`;
}
