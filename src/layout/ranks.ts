/**
 * Where a node sits in the signal path: its rank, from time up to sound (flowRanks), and its column (columns), for the
 * layered start (layered.ts, start.ts) and the tower.
 */
import { isMidiCard } from '@yggi/cells/engine/program';
import { feeds, type GraphNode } from '@yggi/cells/engine/graph';

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

/** Where a node is drawn to: the sound card (and a MIDI card) up-centre, meters down-centre. */
function endOf(n: GraphNode): 'top' | 'bottom' | null {
  if (n.cell?.sink || isMidiCard(n.cell)) return 'top';
  if (n.kind === 'cell' && n.isMeter) return 'bottom';
  return null;
}
