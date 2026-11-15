/**
 * The fragment map (#625, rung S4 of #621; the model: docs/notes/fragments.md, "The map"): fragments, pieces and
 * meeting points, placed on any two of cells' style axes by two forces and a collision, run by d3-force as the library's
 * wheel is. Every number is read from cells (the catalogue, the examples, `AXES`): no axis is named here, no fragment
 * set apart, no edge weighted by hand. Pure: no DOM.
 *
 * - **The graph.** A node per catalogue entry (`f:id`), per example (`p:key`), and per meeting point (`c:key:i`): a
 *   piece's `from` line whose arguments bring two or more cells together, taken ones or the piece's own parts. Edges: a
 *   line to what each of its arguments came through (or the part it names); a meeting point to its fragment; a piece to
 *   what none of its lines passes on, and to each of its parts nothing reads; a fragment to those it takes.
 * - **Springs.** Every node has the same total pull, shared among its edges: a spring pulls a toward b by b's share,
 *   1 / deg(b). A hub pulls each neighbour a little and is pulled to the middle of what takes it: a star.
 * - **Anchors.** A fragment is held on an axis where its points put it (their weighted mean), as surely as they agree:
 *   its points' weight as a share, times 1 less their weighted spread over the axis's half range. An axis no point names
 *   holds nothing. A piece has none until it names its style (yggi/cells#543).
 * - **The balance** (the style ↔ structure slider): the anchors' strength against the springs', 0 springs alone, 1
 *   anchors alone.
 * - **The square.** Every node stays within the square of the two axes' ranges, its whole disc inside.
 */
import { forceCollide, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { references, type Reference } from '@yggi/cells/engine/references';
import { AXES } from '@yggi/cells/engine/style';
import { catalogue, type CatalogueEntry } from '@yggi/cells/repository/catalogue';

interface MapNode {
  readonly key: string;
  readonly kind: 'fragment' | 'piece' | 'meeting';
  readonly label: string;
  /** A fragment's first facet. */
  readonly facet?: string;
}
export interface MapGraph {
  readonly nodes: readonly MapNode[];
  readonly edges: readonly (readonly [string, string])[];
}

/**
 * A piece's nodes and edges: its meeting points, and its edges to what it takes. `parts`: the parts this piece gives as a
 * document (cells decision 082), by head (`&twinkle` → `f:kinderlied/twinkle`): an argument that names one reads that
 * part, as an argument that names a taken cell reads the fragment it came through.
 */
function pieceGraph(key: string, source: string, known: ReadonlySet<string>, parts: ReadonlyMap<string, string>, nodes: MapNode[], edges: [string, string][]) {
  const lines: Reference[] = references(source).filter((r) => known.has(r.id));
  // (which line each taken name came through)
  const through = new Map<string, number>();
  lines.forEach((r, i) => (r.names ?? []).forEach((n) => through.set(n, i)));
  const node = (i: number) => (meets[i] ? `c:${key}:${i}` : `f:${lines[i]!.id}`);
  // (what each line's arguments read: a taken cell's line, or one of the document's own parts)
  const reads = lines.map((r) =>
    [...new Set([...(r.args ?? []).map((a) => a.value), r.main ?? ''].join(' ').match(/&\w+/g) ?? [])].flatMap((n): ({ line: number } | { part: string })[] => {
      const i = through.get(n);
      if (i !== undefined) return [{ line: i }];
      const part = parts.get(n);
      return part ? [{ part }] : [];
    }),
  );
  // (a meeting brings two or more taken cells together: one argument is an edge, and a meeting needs two)
  const meets = reads.map((r) => r.length > 1);
  const target = (t: { line: number } | { part: string }) => ('part' in t ? t.part : node(t.line));
  const passed = new Set<number>();
  const partsRead = new Set<string>();
  lines.forEach((r, i) => {
    if (meets[i]) {
      nodes.push({ key: node(i), kind: 'meeting', label: (r.names ?? ['?'])[0]!.replace(/^&/, '') });
      edges.push([node(i), `f:${r.id}`]);
    }
    for (const t of reads[i]!) {
      edges.push([node(i), target(t)]);
      if ('part' in t) partsRead.add(t.part);
      else passed.add(t.line);
    }
  });
  for (const t of new Set(lines.flatMap((_, i) => (passed.has(i) ? [] : [node(i)])))) edges.push([`p:${key}`, t]);
  // (a part nothing of the piece reads hangs off its document)
  for (const part of parts.values()) if (!partsRead.has(part)) edges.push([`p:${key}`, part]);
}

/** The map's graph over a catalogue and the examples. */
export function mapGraph(entries: readonly CatalogueEntry[] = catalogue(), pieces: Readonly<Record<string, { readonly source: string }>> = EXAMPLES): MapGraph {
  const known = new Set(entries.map((e) => e.id));
  const nodes: MapNode[] = entries.map((e) => ({ key: `f:${e.id}`, kind: 'fragment', label: e.id, ...(e.facets[0] ? { facet: e.facets[0] } : {}) }));
  const edges: [string, string][] = entries.flatMap((e) => e.takes.filter((t) => known.has(t)).map((t): [string, string] => [`f:${e.id}`, `f:${t}`]));
  for (const [key, p] of Object.entries(pieces)) {
    nodes.push({ key: `p:${key}`, kind: 'piece', label: key });
    const parts = new Map(entries.flatMap((e) => (e.part?.document === key ? [[`&${e.part.head}`, `f:${e.id}`] as const] : [])));
    pieceGraph(key, p.source, known, parts, nodes, edges);
  }
  const seen = new Set<string>();
  return { nodes, edges: edges.filter(([a, b]) => a !== b && !seen.has(`${a}|${b}`) && !!seen.add(`${a}|${b}`)) };
}

/** Where a fragment's points put it on an axis (0…1 of the axis's range) and how sure they are (0…1); null where none names it. */
export interface Anchor {
  readonly at: number;
  readonly certainty: number;
}

/** A fragment's anchor on one axis (see the module's comment). */
export function anchorOf(entry: Pick<CatalogueEntry, 'association'>, axis: string): Anchor | null {
  const a = AXES.find((x) => x.name === axis);
  if (!a) return null;
  const [lo, hi] = a.range;
  const named = entry.association.filter((p) => typeof p.point[axis] === 'number');
  if (!named.length) return null;
  const w = named.reduce((s, p) => s + p.weight, 0);
  if (!(w > 0)) return null;
  const at = named.reduce((s, p) => s + p.weight * p.point[axis]!, 0) / w;
  const sd = Math.sqrt(named.reduce((s, p) => s + p.weight * (p.point[axis]! - at) ** 2, 0) / w);
  const certainty = Math.min(1, w / entry.association.length) * Math.max(0, 1 - sd / ((hi - lo) / 2));
  return { at: (at - lo) / (hi - lo), certainty };
}

/** A node as laid out: in a unit square (x right, y up), with its radius (as a share of the square) and its anchors. */
export interface Placed {
  readonly node: MapNode;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly anchors: readonly [Anchor | null, Anchor | null];
}

/**
 * The slider's default: the knee of the style error (how far fragments sit from their anchors, weighted by certainty)
 * against the balance, where raising it stops buying style: 0.25–0.30 on all six pairs of axes, median 0.30, over the
 * library, three seeds (`tools/probe/fragmentmap.test.ts`, docs/notes/fragment-map.md). The knee against edge length
 * (#625's wording) is 0.25–0.50, median 0.40.
 */
const BALANCE = 0.3;
/** Ticks a layout runs: 150 reach the style error 300 do, in 70 ms (the probe, this machine). */
const TICKS = 150;

export interface MapOptions {
  /** The style ↔ structure slider: the anchors' share of the two forces' strength, 0…1 (`BALANCE` by default). */
  readonly balance?: number;
  /** Ticks to run (`TICKS` by default). */
  readonly ticks?: number;
  /** Which fixed start (a turn of the spiral the unanchored nodes start on): the same seed, the same layout. */
  readonly seed?: number;
  /** Where to start from (a layout before): nodes found there start where they were, so a change glides. */
  readonly from?: ReadonlyMap<string, { readonly x: number; readonly y: number }>;
}

/** How much of its velocity a node keeps each tick (d3-force's own default, 1 less its velocityDecay of .4). */
const DECAY = 0.6;
/** The two forces' strength together, per tick at certainty 1 (a spring's at balance 0, an anchor's at 1). */
const STRENGTH = 0.4;
/** A node's radius as a share of the square: a fragment grows with the root of its degree, as the mock-up drew it. */
const radius = (n: MapNode, degree: number) => (n.kind === 'piece' ? 0.006 : n.kind === 'meeting' ? 0.005 : 0.006 + 0.0025 * Math.sqrt(degree));

/** The map laid out on two axes of `AXES` (by name). Deterministic: a fixed start, no randomness. */
export function mapLayout(graph: MapGraph, xAxis: string, yAxis: string, options: MapOptions = {}, entries: readonly CatalogueEntry[] = catalogue()): Placed[] {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const degree = new Map<string, number>();
  for (const [a, b] of graph.edges) for (const k of [a, b]) degree.set(k, (degree.get(k) ?? 0) + 1);
  type N = SimulationNodeDatum & { node: MapNode; r: number; ax: Anchor | null; ay: Anchor | null };
  const byKey = new Map<string, N>();
  const nodes: N[] = graph.nodes.map((node, i) => {
    const e = node.kind === 'fragment' ? byId.get(node.label) : undefined;
    const ax = e ? anchorOf(e, xAxis) : null;
    const ay = e ? anchorOf(e, yAxis) : null;
    const was = options.from?.get(node.key);
    // (a fixed spiral round the middle for what nothing anchors: repeatable, no Math.random)
    const a = i * 2.39996 + (options.seed ?? 0) * 1.7;
    const n: N = { node, r: radius(node, degree.get(node.key) ?? 0), ax, ay, x: was?.x ?? ax?.at ?? 0.5 + 0.04 * Math.cos(a), y: was?.y ?? ay?.at ?? 0.5 + 0.04 * Math.sin(a) };
    byKey.set(node.key, n);
    return n;
  });
  const links = graph.edges.flatMap(([a, b]) => {
    const [na, nb] = [byKey.get(a), byKey.get(b)];
    return na && nb ? [{ a: na, b: nb }] : [];
  });
  const balance = Math.min(1, Math.max(0, options.balance ?? BALANCE));
  const [spring, anchor] = [STRENGTH * (1 - balance), STRENGTH * balance];
  const share = (n: N) => 1 / (degree.get(n.node.key) || 1);
  const springs = (alpha: number) => {
    for (const { a, b } of links) {
      const [dx, dy] = [b.x! - a.x!, b.y! - a.y!];
      a.vx! += dx * spring * alpha * share(b);
      a.vy! += dy * spring * alpha * share(b);
      b.vx! -= dx * spring * alpha * share(a);
      b.vy! -= dy * spring * alpha * share(a);
    }
  };
  const anchors = (alpha: number) => {
    for (const n of nodes) {
      if (n.ax) n.vx! += (n.ax.at - n.x!) * anchor * alpha * n.ax.certainty;
      if (n.ay) n.vy! += (n.ay.at - n.y!) * anchor * alpha * n.ay.certainty;
    }
  };
  // (d3-force's own jiggle draws from a fixed-seed generator: the same run every time)
  forceSimulation(nodes)
    .velocityDecay(1 - DECAY)
    .force('springs', springs)
    .force('anchors', anchors)
    .force(
      'collide',
      forceCollide<N>((n) => n.r * 1.3),
    )
    // (the map is the square of the two axes' ranges: a node stays within it, its whole disc inside)
    .force('within', () => {
      // (last: the step this tick takes, x += vx × the decay, is cut where it would leave the square)
      for (const n of nodes) {
        n.x = Math.min(1 - n.r, Math.max(n.r, n.x!));
        n.y = Math.min(1 - n.r, Math.max(n.r, n.y!));
        n.vx = (Math.min(1 - n.r, Math.max(n.r, n.x + n.vx! * DECAY)) - n.x) / DECAY;
        n.vy = (Math.min(1 - n.r, Math.max(n.r, n.y + n.vy! * DECAY)) - n.y) / DECAY;
      }
    })
    .stop()
    .tick(options.ticks ?? TICKS);
  return nodes.map((n) => ({ node: n.node, x: n.x!, y: n.y!, r: n.r, anchors: [n.ax, n.ay] }));
}
