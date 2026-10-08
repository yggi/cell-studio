/**
 * Where a graph starts: each node's rank in the signal path (flowRanks) and its column (columns), the layered start
 * (layered.ts) or the forces' own (orderLayers), a fresh graph's nodes put there and an edit's new ones beside their
 * parents (startNodes), and the rows' order chosen for a graph by its shape (rowsKey; the trial itself is
 * physics.ts: bestRowOrder). A start by insertion is insertion.ts.
 */
import { feeds, structureKey, type GraphModel, type GraphNode } from '../engine/graph';
import { fitTurns, tapeFaces } from './aims';
import { layered } from './layered';
import { massOf } from './weights';
import type { LayoutState, PhysLink, PhysNode } from './state';
import { loomReach } from './looms';

/**
 * Starting x order for a fresh graph, layer by layer (a layer = a depth): each
 * node goes to the mean position of its neighbours, a few sweeps up and down —
 * the barycentre heuristic, which starts layered drawings with few crossings.
 * Each node sits at its wanted place, pushed apart just enough to keep one slot
 * between neighbours. Returns x in slots.
 */
export function orderLayers(nodes: readonly { id: string; depth: number }[], edges: readonly { source: string; target: string }[], sweeps = 8): Map<string, number> {
  const layers = new Map<number, string[]>();
  for (const n of nodes) layers.set(n.depth, [...(layers.get(n.depth) ?? []), n.id]);
  const x = new Map<string, number>();
  const spread = (ids: string[]) => ids.forEach((id, i) => x.set(id, i - (ids.length - 1) / 2));
  for (const ids of layers.values()) spread(ids);
  const nbrs = new Map<string, string[]>();
  for (const e of edges) {
    if (!x.has(e.source) || !x.has(e.target) || e.source === e.target) continue;
    nbrs.set(e.source, [...(nbrs.get(e.source) ?? []), e.target]);
    nbrs.set(e.target, [...(nbrs.get(e.target) ?? []), e.source]);
  }
  const depths = [...layers.keys()].sort((a, b) => a - b);
  for (let s = 0; s < sweeps; s++)
    for (const d of s % 2 ? [...depths].reverse() : depths) {
      const ids = layers.get(d)!;
      const want = new Map(
        ids.map((id) => [
          id,
          (() => {
            const ns = nbrs.get(id) ?? [];
            return ns.length ? ns.reduce((a, n) => a + x.get(n)!, 0) / ns.length : x.get(id)!;
          })(),
        ]),
      );
      ids.sort((a, b) => want.get(a)! - want.get(b)!);
      // each at its wanted place, pushed apart just enough to keep a slot between neighbours
      const placed = ids.map((id) => want.get(id)!);
      for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + 1);
      // shift back so the layer sits where it wanted to be on average
      const drift = placed.reduce((a, v, k) => a + v - want.get(ids[k])!, 0) / placed.length;
      ids.forEach((id, k) => x.set(id, placed[k] - drift));
    }
  return x;
}

/**
 * Each node's height in the signal path, from time (0, the meter) up to sound
 * (the sound card). Edges that carry the flow go up one rank: a step driver
 * sits under the played cell it drives, a melody under its voice, a voice under
 * its mix, a mix under the sound card (longest path). A modulator sits just
 * under what it feeds. Parts and tables — reached by &refs and over=, stepped
 * or not — sit half a row under whatever uses them (parts of parts half as far
 * again), so they cluster under it instead of widening its row.
 */
export function flowRanks(model: { nodes: readonly { id: string }[]; edges: readonly { source: string; target: string; port: string; band: string }[] }): Map<string, number> {
  const sinks = new Set(model.nodes.filter((n) => endOf(n as GraphNode) === 'top').map((n) => n.id));
  // played cells: the terms of the mixes (melodies, modulators) and every part they splice
  const played = new Set(model.edges.filter(feeds).map((e) => e.source));
  for (let grew = true; grew;) {
    grew = false;
    for (const e of model.edges)
      if (e.port === 'braid' && played.has(e.source) && !played.has(e.target)) {
        played.add(e.target);
        grew = true;
      }
  }
  // what carries sound: mixes (not the sound card), and tables whose entries are all mixes (a selector's
  // parts) — an edge into one of those is flow (sound goes up it), not a part hanging under its user
  const cellOf = new Map(model.nodes.map((n) => [n.id, (n as { cell?: { mix?: unknown; sink?: boolean } }).cell]));
  const sounding = new Set(model.nodes.filter((n) => cellOf.get(n.id)?.mix && !cellOf.get(n.id)?.sink).map((n) => n.id));
  for (const n of model.nodes) {
    const entries = model.edges.filter((e) => e.source === n.id && e.port === 'braid');
    if (entries.length && entries.every((e) => sounding.has(e.target))) sounding.add(n.id);
  }
  // up: [lower, higher]
  const up: [string, string][] = [];
  for (const e of model.edges) {
    if (e.source === e.target) continue;
    // sound going up: a part mix into its table, the table into its selector, the selector into the sound card
    if ((e.port === 'braid' || e.port === 'over') && sounding.has(e.target)) {
      up.push([e.target, e.source]);
      continue;
    }
    // a step driver sits under what it drives — when that's played; a stepped table hangs beside its readers
    if (e.band === 'sync' && played.has(e.source)) up.push([e.target, e.source]);
    else if (feeds(e) || e.port === 'mix') up.push([e.source, e.target]);
    else if (e.port === 'braid' && sinks.has(e.source)) up.push([e.target, e.source]); // the sound card's channels
  }
  const inFlow = new Set(up.flat());
  const rank = new Map<string, number>();
  for (const id of inFlow) rank.set(id, 0);
  // longest path (bounded: a loop can't run away)
  for (let i = 0; i < model.nodes.length; i++) {
    let changed = false;
    for (const [lo, hi] of up)
      if (rank.get(hi)! < rank.get(lo)! + 1) {
        rank.set(hi, rank.get(lo)! + 1);
        changed = true;
      }
    if (!changed) break;
  }
  // a source that drives nothing (a modulator like &vibrato) sits just under what it feeds, not at the bottom
  const drivers = new Set(model.edges.filter((e) => e.band === 'sync').map((e) => e.target));
  const fed = new Map<string, string[]>();
  for (const [lo, hi] of up) fed.set(lo, [...(fed.get(lo) ?? []), hi]);
  const hasBelow = new Set(up.map(([, hi]) => hi));
  for (const [id, his] of fed) if (!hasBelow.has(id) && !drivers.has(id)) rank.set(id, Math.max(0, Math.min(...his.map((h) => rank.get(h)!)) - 1));
  // parts and tables: just under whatever uses them — half a row, between it and the meter
  // (parts of parts half as far again), so they cluster under their user rather than widen its row
  for (let i = 0; i < model.nodes.length; i++) {
    let changed = false;
    for (const e of model.edges) {
      if ((e.port !== 'braid' && e.port !== 'over') || sinks.has(e.source)) continue;
      if (rank.has(e.source) && !rank.has(e.target)) {
        const r = rank.get(e.source)!;
        rank.set(e.target, inFlow.has(e.source) ? r - 0.5 : r - (r - Math.floor(r - 1e-9)) / 2);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // a part or table sits under every one of its users, not just the first one met: half a row at least
  // (so a table read by a melody and by that melody's motifs goes under the motifs, not beside them)
  for (let i = 0; i < model.nodes.length; i++) {
    let changed = false;
    for (const e of model.edges) {
      if ((e.port !== 'braid' && e.port !== 'over') || sinks.has(e.source) || inFlow.has(e.target) || sounding.has(e.target)) continue;
      const user = rank.get(e.source);
      const part = rank.get(e.target);
      // what it's made of (&refs) half a row under; what it's tuned by (over=) a row under: tuning beneath content
      const gap = e.port === 'over' ? 1 : 0.5;
      if (user === undefined || part === undefined || part <= user - gap + 1e-9) continue;
      rank.set(e.target, user - gap);
      changed = true;
    }
    if (!changed) break;
  }
  // (a meter has no row of its own at the bottom: its edges are ground, springs that aren't drawn)
  // notes (label= alone) sit at the top, by the sound card; anything else left (unused cells) at the bottom
  const top = Math.max(0, ...rank.values());
  for (const n of model.nodes) if (!rank.has(n.id)) rank.set(n.id, (n as { cell?: { note?: boolean } }).cell?.note ? top : 0);
  return rank;
}

/**
 * Columns, for a symmetric first layout. Voices first: by stereo position
 * (left … right); voices at the same place go by the order the mix names them,
 * the first in the middle, then alternately left and right. Every other cell
 * sits at the mean column of the voices it feeds (a motif under its player;
 * the meter, the mix and the sound card in the middle). Centred on 0.
 */
export function columns(model: {
  nodes: readonly { id: string; kind: string; pan?: number; order?: number; petalOf?: string }[];
  edges: readonly { source: string; target: string; port: string; band: string }[];
}): Map<string, number> {
  const nodes = model.nodes.filter((n) => !n.petalOf);
  // what sounds: voices, and instruments (whose voices are petals)
  const voices = nodes.filter((n) => n.pan !== undefined);
  const col = new Map<string, number>();
  if (voices.length === 0) return col;
  // left, middle (alternating by order), right
  const side = (n: (typeof voices)[number]) => ((n.pan ?? 0) < -0.05 ? -1 : (n.pan ?? 0) > 0.05 ? 1 : 0);
  const byPan = (a: (typeof voices)[number], b: (typeof voices)[number]) => (a.pan ?? 0) - (b.pan ?? 0) || (a.order ?? 0) - (b.order ?? 0);
  const left = voices.filter((n) => side(n) < 0).sort(byPan);
  const right = voices.filter((n) => side(n) > 0).sort(byPan);
  const mid = voices.filter((n) => side(n) === 0).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const middle: typeof voices = [];
  mid.forEach((n, i) => (i % 2 === 1 ? middle.unshift(n) : middle.push(n))); // 0 centre, 1 left, 2 right, …
  const row = [...left, ...middle, ...right];
  // centre on the first-named middle voice when there is one, else on the middle of the row
  const anchor = mid.length ? row.indexOf(mid[0]) : (row.length - 1) / 2;
  row.forEach((n, i) => col.set(n.id, i - anchor));
  // who feeds whom: a part feeds what splices it, a table what reads it, a driver what it steps; a melody its voice
  const consumers = new Map<string, string[]>();
  const add = (from: string, to: string) => consumers.set(from, [...(consumers.get(from) ?? []), to]);
  for (const e of model.edges) {
    if (e.port === 'braid' || e.port === 'over' || e.band === 'sync') add(e.target, e.source);
    else if (feeds(e)) add(e.source, e.target);
  }
  const served = (id: string, seen = new Set<string>()): string[] => {
    if (col.has(id) && voices.some((v) => v.id === id)) return [id];
    if (seen.has(id)) return [];
    seen.add(id);
    return [...new Set((consumers.get(id) ?? []).flatMap((c) => served(c, seen)))];
  };
  for (const n of nodes) {
    if (col.has(n.id)) continue;
    const vs = served(n.id);
    // mixes and sound cards (and anything feeding no voice) sit in the middle of what they hear
    const hears = model.edges.filter((e) => e.port === 'mix' && e.target === n.id).map((e) => e.source);
    const from = vs.length ? vs : hears.filter((h) => col.has(h));
    col.set(n.id, from.length ? from.reduce((a, v) => a + col.get(v)!, 0) / from.length : 0);
  }
  return col;
}

/** Where a node is drawn to: the sound card up-centre, meters down-centre. */
function endOf(n: GraphNode): 'top' | 'bottom' | null {
  if (n.cell?.sink) return 'top';
  if (n.kind === 'cell' && n.isMeter) return 'bottom';
  return null;
}

/** Small deterministic hash so new nodes always spawn in the same place. */
export function jitter(id: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) / 0xffffffff - 0.5) * 40;
}

/**
 * Where a graph's nodes want to be: each at the height of its rank in the signal path and in its column (the pulls
 * kept in `s.rankY` and `s.colX`), and where a fresh graph starts — laid out in layers (`home`), or, the forces alone,
 * row by row (`ordered`, in slots). `rowOrder`: the rows' order for the layered start, asked only when it is laid out.
 */
export function startPlaces(
  s: LayoutState,
  model: GraphModel,
  fresh: boolean,
  rowOrder: () => number,
): { half: number; home: Map<string, { x: number; y: number }> | null; ordered: Map<string, number> | null } {
  // layers by rank in the signal path, from the meter (bottom) up to the sound card (top);
  // a fresh graph starts there, each layer in barycentre order; an edit keeps what's on screen
  const ranks = flowRanks(model);
  const maxRank = Math.max(1, ...ranks.values());
  const half = (maxRank * s.opts.layerGap) / 2;
  const layerY = (rank: number) => half - (rank / maxRank) * 2 * half;
  s.rankY = new Map([...ranks].map(([id, r]) => [id, layerY(r)]));
  // columns: voices by stereo place and mix order, everything else over the voices it feeds
  const cols = columns(model);
  const slot = s.opts.layerGap * 1.1;
  s.colX = new Map([...cols].map(([id, c]) => [id, c * slot]));
  // laid out in layers: each node's place is its home — where a fresh graph starts, and what it springs to
  s.faces = tapeFaces(model);
  let home: Map<string, { x: number; y: number }> | null = null;
  if (s.opts.layered) {
    const byId = new Map(model.nodes.map((n) => [n.id, n]));
    const lay = layered(model, {
      gapX: s.opts.collidePad * 1.6,
      gapY: s.opts.layerGap,
      radius: (id) => s.opts.radius(byId.get(id)!),
      flat: !s.opts.clusters,
      rowOrder: rowOrder(),
    });
    const ys = [...lay.values()].map((p) => p.y);
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    home = new Map([...lay].map(([id, p]) => [id, { x: p.x, y: p.y - midY }]));
    // each tape turned to face where the layers put what its heads connect to; then each read head's
    // cell starts in its head's direction, just clear of the tape (a write source stays: it's a source of more)
    // (only to place them: the tapes' turns are fitted to where everything is once it's placed, below)
    const homeTurns = fitTurns(s, (id) => home!.get(id));
    for (const f of s.faces) {
      const t = home.get(f.tape);
      if (f.write || !t || !home.has(f.to)) continue;
      const angle = (homeTurns.get(f.tape) ?? 0) + f.offset;
      const d = s.opts.radius(byId.get(f.tape)!) + s.opts.radius(byId.get(f.to)!) + s.opts.collidePad;
      home.set(f.to, { x: t.x + Math.cos(angle) * d, y: t.y + Math.sin(angle) * d });
    }
    s.colX = new Map([...home].map(([id, p]) => [id, p.x]));
    s.rankY = new Map([...home].map(([id, p]) => [id, p.y]));
  }
  let ordered =
    fresh && !home
      ? orderLayers(
          model.nodes.map((n) => ({ id: n.id, depth: ranks.get(n.id)! })),
          model.edges.filter((e) => e.port !== 'about'),
        )
      : null;
  if (fresh && !home && cols.size) {
    // a symmetric start: each node at its column, pushed apart within its row just enough
    ordered = new Map();
    const rows = new Map<number, string[]>();
    for (const n of model.nodes) rows.set(ranks.get(n.id)!, [...(rows.get(ranks.get(n.id)!) ?? []), n.id]);
    for (const ids of rows.values()) {
      ids.sort((a, b) => (cols.get(a) ?? 0) - (cols.get(b) ?? 0));
      const want = ids.map((id) => cols.get(id) ?? 0);
      const placed = [...want];
      for (let k = 1; k < placed.length; k++) placed[k] = Math.max(placed[k], placed[k - 1] + 1);
      const drift = placed.reduce((a, v, k) => a + v - want[k], 0) / Math.max(1, placed.length);
      ids.forEach((id, k) => ordered!.set(id, placed[k] - drift));
    }
  }
  return { half, home, ordered };
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
  { half, home, ordered }: { half: number; home: Map<string, { x: number; y: number }> | null; ordered: Map<string, number> | null },
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
      if (home?.has(n.id) && (fresh || !parent)) {
        x = home.get(n.id)!.x;
        y = home.get(n.id)!.y;
      } else if (ordered) {
        x = (ordered.get(n.id) ?? 0) * s.opts.layerGap * 1.1;
        y = s.rankY.get(n.id) ?? 0;
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

  // a flow from time to sound: the sound card drawn up-centre, the meters down-centre
  // (a fresh graph starts them there; after that it's only a slight pull)
  const outer = half;
  s.ends = new Map();
  // (laid out in layers, the ends are where the layers put them)
  for (const end of home ? [] : (['top', 'bottom'] as const)) {
    const ids = model.nodes.filter((n) => endOf(n) === end).map((n) => n.id);
    ids.forEach((id, i) => {
      const at = { x: (i - (ids.length - 1) / 2) * s.opts.layerGap * 1.2, y: end === 'top' ? -outer : outer };
      s.ends.set(id, at);
      if (ordered) Object.assign(next.get(id)!, at);
    });
  }

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
