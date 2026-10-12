/**
 * The graph as drawn, made from the graph of what is written (engine/graph.ts `writtenGraph`): a cell with show=off
 * left out, unnamed cells and show=petal hung from the cell that uses them as petals, a cell spliced once a bulb on its
 * host (decision 014, every sub-wheel: decision 021), the room a host's bulbs take and where their edges leave from.
 */
import { cellId, edgeId } from '../engine/ids';
import { VOICE_KIT } from '../engine/compiler/declare';
import type { CompileResult } from '../engine/program';
import { feeds, netsOf, writtenGraph, type GraphEdge, type GraphModel, type GraphNode, type WrittenGraph } from '../engine/graph';
import { effectiveShow } from './show';
import { bulbAt, leavesFromBulb, reachOf, subWheels } from './subwheels';

/**
 * A program's graph as drawn. `bulbs: false`: every cell its own node, splices used once too (the layout's tests of
 * parts beside their players).
 */
export function buildGraph(result: CompileResult, opts: { readonly bulbs?: boolean } = {}): GraphModel {
  return petals(result, writtenGraph(result), opts.bulbs ?? true);
}

/**
 * Unnamed cells (&( … )) are drawn as petals of the named cell on their line:
 * small, hung from it, without edges of their own. An edge that went through a
 * petal is drawn to its parent instead — unless that would loop back to the
 * parent or repeat an edge already there. `through`: the written pairs drawn through a product's junction (not drawn
 * themselves: their wires at the junction stand for them).
 */
function petals(result: CompileResult, written: WrittenGraph, withBulbs: boolean): GraphModel {
  const { nodes: allNodes, edges: allEdges, through } = written;
  // show=off: not in the graph at all (nor a product in a mix that isn't)
  const off = (n: GraphNode) => effectiveShow(result, n.kind === 'junction' ? n.mix : n.cell.name).show === 'off';
  const hidden = new Set(allNodes.filter(off).map((n) => n.id));
  const nodes = allNodes.filter((n) => !hidden.has(n.id));
  const edges = allEdges.filter((e) => !hidden.has(e.source) && !hidden.has(e.target));
  const parentOf = new Map<string, string>();
  // a splice used once: a bulb on its host's track (#221)
  const bulbs = withBulbs ? subWheels(result, nodes, edges) : new Map<string, string>();
  for (const [id, host] of bulbs) parentOf.set(id, host);
  for (const n of nodes) {
    if (n.kind === 'junction' || bulbs.has(n.id)) continue;
    if (n.cell.lambda) {
      const line = /^λ(\d+)_/.exec(n.cell.name)?.[1];
      const parent = [...result.cells.values()].find((c) => !c.lambda && !c.implicit && c.span.line === +(line ?? -1));
      if (parent) parentOf.set(n.id, cellId(parent.name));
    } else if (effectiveShow(result, n.cell.name).show === 'petal') {
      // show=petal: hung from the cell that uses it (a voice: the mix it's in, or the mix of a product it is)
      const product = nodes.find((j) => j.kind === 'junction' && edges.some((e) => e.source === j.id && e.target === n.id && e.port === 'is'));
      const user =
        edges.find((e) => e.target === n.id && (e.port === 'braid' || e.port === 'over'))?.source ??
        edges.find((e) => e.source === n.id && (e.port === 'mix' || feeds(e)))?.target ??
        (product?.kind === 'junction' ? cellId(product.mix) : undefined);
      if (user) parentOf.set(n.id, user);
    }
  }
  // (a bulb's host may be a bulb itself: up to the one drawn)
  const up = (id: string) => {
    for (let guard = 0; parentOf.has(id) && guard < 64; guard++) id = parentOf.get(id)!;
    return id;
  };
  // (a bulb its edges out leave from, by its node id: its name — a tap on its table, a read head on its tape)
  const tapBulb = (id: string) => {
    const name = id.slice('cell:'.length);
    const host = bulbs.get(id)?.slice('cell:'.length);
    return host && leavesFromBulb(result, host, name) ? name : undefined;
  };
  const out: GraphEdge[] = [];
  const pairs = new Set<string>();
  const key = (a: string, b: string) => [a, b].sort().join('|');
  for (const e of edges) if (!parentOf.has(e.source) && !parentOf.has(e.target)) pairs.add(key(e.source, e.target));
  // (an edge redrawn, or left out because one is drawn between the same two already: drawn as that one)
  const redrawn: { id: string; pair: string | null }[] = [];
  for (const e of edges) {
    const source = up(e.source);
    const target = up(e.target);
    if (source === e.source && target === e.target) {
      out.push(e);
      continue;
    }
    // (a tap's steps leave from its bulb on its table: each its own wire, the tap's sub-net — decision 016; a read
    // head's edges from its bulb on its tape — decision 021)
    const tap = tapBulb(e.from);
    if (tap && source !== target) {
      // (a head's keeps its own id: what it is drawn as is the same edge, from its bulb)
      const id = result.taps?.get(tap) !== undefined ? `${edgeId(cellId(tap), up(e.to))}~` : e.id;
      redrawn.push({ id: e.id, pair: id });
      out.push({ ...e, id, source, target, from: up(e.from), to: up(e.to), bulb: tap });
      continue;
    }
    redrawn.push({ id: e.id, pair: source === target ? null : key(source, target) });
    if (source === target || pairs.has(key(source, target))) continue;
    pairs.add(key(source, target));
    out.push({ ...e, id: edgeId(source, target) + (e.port === 'step' ? '~' : ''), source, target, from: up(e.from), to: up(e.to) });
  }
  const byPair = new Map<string, string>();
  for (const e of out) if (!byPair.has(key(e.source, e.target))) byPair.set(key(e.source, e.target), e.id);
  const ids = new Set(out.map((e) => e.id));
  const alias = new Map<string, string | undefined>();
  for (const r of redrawn) alias.set(r.id, r.pair === null ? undefined : ids.has(r.pair) ? r.pair : byPair.get(r.pair));
  for (const e of allEdges) if (hidden.has(e.source) || hidden.has(e.target)) alias.set(e.id, undefined);
  // (a groove reads the drums' kit, but its over= isn't written: its wires are the drums it names, from their pieces)
  for (const c of result.cells.values()) if (c.over === VOICE_KIT) alias.set(edgeId(cellId(c.name), cellId(VOICE_KIT)), undefined);
  const drawnIds = new Set(out.map((e) => e.id));
  for (const id of through) if (!drawnIds.has(id) && !alias.has(id)) alias.set(id, undefined);
  // (an unnamed cell written on a voice's line, its envelope and its other modifiers, is drawn as part of the voice's
  // wheel: no node of its own — layout/voice.ts)
  const voices = new Set(nodes.flatMap((n) => (n.kind === 'voice' ? [n.id] : [])));
  const inVoice = (n: GraphNode) => n.kind !== 'junction' && voices.has(parentOf.get(n.id) ?? '');
  const drawn = nodes.filter((n) => !bulbs.has(n.id) && !inVoice(n)).map((n) => (n.kind !== 'junction' && parentOf.has(n.id) ? { ...n, petalOf: up(n.id) } : n));
  const names = (id: string) => id.slice('cell:'.length);
  const byName = new Map([...bulbs].map(([id, host]) => [names(id), names(host)]));
  // (the room a host's bulbs take round its wheel, and where each bulb's edges leave from: subwheels.ts)
  const reached = drawn.map((n) => {
    const reach = n.kind === 'junction' ? null : reachOf(result, n, byName);
    return reach ? { ...n, reach } : n;
  });
  // (a braid's wheel is 128 px across, size= scaling it: ui/flownode.ts)
  const sizes = new Map(reached.map((n) => [n.id, n.kind === 'cell' ? 128 * n.cell.size : 0]));
  const anchored = out.map((e) => {
    const at = e.bulb ? bulbAt(result, names(e.from), e.bulb, byName, sizes.get(e.from) ?? 128) : null;
    return at ? { ...e, bulbAt: at } : e;
  });
  return { nodes: reached, edges: anchored, nets: netsOf(reached, anchored), alias, bulbs: byName };
}

const bulbMemo = new WeakMap<CompileResult, ReadonlyMap<string, string>>();
/** The cells drawn as bulbs, by name, each to the cell that splices it (GraphModel.bulbs), for drawing a wheel. */
export function bulbHosts(result: CompileResult): ReadonlyMap<string, string> {
  let hit = bulbMemo.get(result);
  if (!hit) bulbMemo.set(result, (hit = buildGraph(result).bulbs));
  return hit;
}
