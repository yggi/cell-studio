/**
 * The fragments mock-up's data (`node tools/gallery.mjs fragments`): read from `@yggi/cells` at the app's pin, never
 * written here. Each seed file is one node, its facet its association's, its points its association's; each example a
 * leaf, its references its `from` lines as the parser reads them. What
 * cells doesn't give yet (a catalogue, a piece's style, references) is derived here for the mock-up only: the epic
 * moves each into cells.
 */
import { forceCollide, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { AXES } from '@yggi/cells/engine/style';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { readFrom } from '@yggi/cells/engine/parser/use';
import { splitComment } from '@yggi/cells/engine/edit';
import { readPiece } from '@yggi/cells/engine/piecefile';
import { SEED, fragmentsOf } from '@yggi/cells/repository/seed';
import { noteColour } from '../../../src/ui/theme';

export interface Point {
  readonly point: Readonly<Record<string, number>>;
  readonly weight: number;
}
export interface Frag {
  readonly id: string;
  readonly facet: string;
  readonly text: string;
  readonly prose: string;
  readonly points: readonly Point[];
  /** The sets of arguments a template is found with (its satellites): 1 for a plain fragment. */
  readonly variants: number;
  readonly signature: string | null;
  readonly takes: readonly string[];
}
export interface Piece {
  readonly key: string;
  readonly title: string;
  readonly takes: readonly string[];
}

/** A text's `from` references (the parser's own reading of each line): the ids it takes, once each. */
export const references = (text: string): string[] => [
  ...new Set(
    text.split('\n').flatMap((l) => {
      const f = readFrom(splitComment(l)[0].trim());
      return f && f.kind === 'use' ? [f.id] : [];
    }),
  ),
];
const signatureOf = (text: string) => text.split('\n').find((l) => readFrom(splitComment(l)[0].trim())?.kind === 'signature') ?? null;

export const FRAGS: readonly Frag[] = SEED.map((f) => {
  const variants = fragmentsOf(f);
  const points = variants.flatMap((v) => v.association.map((a) => ({ point: a.point, weight: a.weight })));
  return {
    id: f.fragment.id,
    facet: f.fragment.association[0]?.facet ?? f.path.split('/')[0]!,
    text: f.fragment.text,
    prose: f.prose,
    points,
    variants: variants.length,
    signature: signatureOf(f.fragment.text),
    takes: references(f.fragment.text).filter((r) => r !== f.fragment.id),
  };
});
export const BY_ID = new Map(FRAGS.map((f) => [f.id, f]));

export const PIECES: readonly Piece[] = Object.entries(EXAMPLES).map(([key, ex]) => {
  const file = readPiece(ex.file);
  const title = 'problems' in file ? key : String(file.frontmatter.title ?? key);
  return { key, title, takes: references(ex.source).filter((r) => BY_ID.has(r)) };
});

/** How many pieces take each fragment. */
export const TAKEN = new Map(FRAGS.map((f) => [f.id, PIECES.filter((p) => p.takes.includes(f.id)).length]));

export const FACETS = [...new Set(FRAGS.map((f) => f.facet))];
export const facetColour = (facet: string) => noteColour((FACETS.indexOf(facet) / FACETS.length) * 360);
export const AXIS_LIST = AXES;

/**
 * The graph the map draws, three kinds of node:
 * - a fragment (`f:id`), each seed file once;
 * - a piece (`p:key`), each example;
 * - a meeting point (`c:key:i`): a piece's `from` line whose arguments bring two or more cells the piece took together
 *   (`&haenschenSong from rounded_binary(answer=&hinein, …) &haenschen`), so what it combines meets there and not only
 *   in the piece.
 * Edges: a line to what each of its arguments came through (`&hinein from kinderlied &key`: kinderlied to diatonic), from its
 * fragment or its meeting point; a meeting point to its fragment; a piece to what none of its lines passes on; a
 * fragment to those it takes. No edge is weighted by hand, and no node is set apart as a default.
 */
export interface GraphNode {
  readonly key: string;
  readonly kind: 'frag' | 'piece' | 'cell';
  readonly label: string;
  readonly facet?: string;
}
export interface Graph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly (readonly [string, string])[];
}

function pieceGraph(key: string, source: string, nodes: GraphNode[], edges: [string, string][]) {
  const lines = source.split('\n').flatMap((l) => {
    const f = readFrom(splitComment(l)[0].trim());
    return f && f.kind === 'use' && BY_ID.has(f.id) ? [f] : [];
  });
  // (which fragment each taken name came through)
  const through = new Map<string, number>();
  lines.forEach((f, i) => (f.names ?? []).forEach((n) => through.set(n, i)));
  const reads = lines.map((f) =>
    [...new Set([...(f.args ?? []).map((a) => a.value), f.main ?? ''].join(' ').match(/&\w+/g) ?? [])].map((n) => through.get(n)).filter((i): i is number => i !== undefined),
  );
  // (a meeting point brings two or more taken cells together; a line that passes one is an edge to it)
  const combines = reads.map((r) => r.length > 1);
  const node = (i: number) => (combines[i] ? `c:${key}:${i}` : `f:${lines[i]!.id}`);
  const combined = new Set<number>();
  lines.forEach((f, i) => {
    if (combines[i]) {
      nodes.push({ key: node(i), kind: 'cell', label: (f.names ?? ['?'])[0]! });
      edges.push([node(i), `f:${f.id}`]);
    }
    for (const j of reads[i]!) {
      edges.push([node(i), node(j)]);
      combined.add(j);
    }
  });
  const pk = `p:${key}`;
  for (const t of new Set(
    lines
      .map((_, i) => i)
      .filter((i) => !combined.has(i))
      .map(node),
  ))
    edges.push([pk, t]);
}

export const GRAPH: Graph = (() => {
  const nodes: GraphNode[] = FRAGS.map((f) => ({ key: `f:${f.id}`, kind: 'frag', label: f.id, facet: f.facet }));
  const edges: [string, string][] = FRAGS.flatMap((f) => f.takes.filter((t) => BY_ID.has(t)).map((t): [string, string] => [`f:${f.id}`, `f:${t}`]));
  for (const p of PIECES) {
    nodes.push({ key: `p:${p.key}`, kind: 'piece', label: p.title.split(':')[0]! });
    pieceGraph(p.key, EXAMPLES[p.key as keyof typeof EXAMPLES].source, nodes, edges);
  }
  const seen = new Set<string>();
  return { nodes, edges: edges.filter(([a, b]) => a !== b && !seen.has(`${a}|${b}`) && !!seen.add(`${a}|${b}`)) };
})();
export const DEGREE = new Map(GRAPH.nodes.map((n) => [n.key, GRAPH.edges.filter((e) => e[0] === n.key || e[1] === n.key).length]));

/**
 * A fragment's anchor on one axis: where its points put it, and how sure they are, 0…1. Its place is the weighted
 * mean of the points that name the axis; a point that doesn't name it says nothing there (no centre stand-in).
 * Certainty is the points' weights (each ≤ 1 in the seed, decision 048's cap aside) as a share of the fragment's points,
 * times how tightly they agree: 1 less their weighted spread over the axis's half range. So a fragment found at one
 * place is held there, one found all over (the meter at every preset) is held weakly, and one that names no value on
 * the axis isn't held at all. A per-axis reach on a point (decision 079's ± on an association, proposed) would take
 * the place of the spread.
 */
export function anchor(f: Frag, axisName: string): { at: number; certainty: number } | null {
  const [lo, hi] = AXES.find((a) => a.name === axisName)!.range;
  const named = f.points.filter((p) => typeof p.point[axisName] === 'number');
  if (!named.length) return null;
  const w = named.reduce((s, p) => s + p.weight, 0);
  const at = named.reduce((s, p) => s + p.weight * p.point[axisName]!, 0) / w;
  const sd = Math.sqrt(named.reduce((s, p) => s + p.weight * (p.point[axisName]! - at) ** 2, 0) / w);
  const certainty = Math.min(1, w / f.points.length) * Math.max(0, 1 - sd / ((hi - lo) / 2));
  return { at: (at - lo) / (hi - lo), certainty };
}

export interface Placed {
  readonly node: GraphNode;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Held on each axis of the projection (false: it names no value there, so only its edges place it). */
  readonly held: readonly [boolean, boolean];
}

/**
 * Every node's total pull, the same for all (1), shared equally among its edges: a node of two edges pulls each
 * neighbour with ½, a fragment that 52 pieces take pulls each with 1/52. So a hub pulls nothing far, and is pulled to
 * the middle of what takes it: a star.
 */
export const PULL = 1;
/** How strongly a spring and an anchor act per tick, against each other: one scale, the anchor's at certainty 1. */
const SPRING = 0.2;
const ANCHOR = 0.2;

/**
 * The map on any two axes of `AXES`: anchors from each fragment's points, springs from the edges, a collision; d3-force
 * runs it, as it runs the library's wheel (`src/layout/library.ts`). A piece has no anchor until it names its style
 * (yggi/cells#543): only what it takes places it.
 */
export function mapLayout(xAxis: string, yAxis: string, w: number, h: number, pad = 36) {
  type N = SimulationNodeDatum & { node: GraphNode; r: number; ax: { at: number; certainty: number } | null; ay: { at: number; certainty: number } | null };
  const byKey = new Map<string, N>();
  const nodes: N[] = GRAPH.nodes.map((node, i) => {
    const f = node.kind === 'frag' ? BY_ID.get(node.label)! : null;
    const ax = f ? anchor(f, xAxis) : null;
    const ay = f ? anchor(f, yAxis) : null;
    // (a fixed spiral start, so a run is repeatable: no Math.random)
    const a = i * 2.39996;
    const n: N = {
      node,
      r: node.kind === 'piece' ? 4 : node.kind === 'cell' ? 3.5 : 4 + 1.6 * Math.sqrt(DEGREE.get(node.key)!),
      ax,
      ay,
      x: ax ? pad + ax.at * (w - 2 * pad) : w / 2 + 40 * Math.cos(a),
      y: ay ? h - pad - ay.at * (h - 2 * pad) : h / 2 + 40 * Math.sin(a),
    };
    byKey.set(node.key, n);
    return n;
  });
  const links = GRAPH.edges.map(([a, b]) => ({ a: byKey.get(a)!, b: byKey.get(b)! }));
  const share = (n: N) => PULL / (DEGREE.get(n.node.key) || 1);
  const springs = (alpha: number) => {
    for (const { a, b } of links) {
      const dx = b.x! - a.x!;
      const dy = b.y! - a.y!;
      a.vx! += dx * SPRING * alpha * share(b);
      a.vy! += dy * SPRING * alpha * share(b);
      b.vx! -= dx * SPRING * alpha * share(a);
      b.vy! -= dy * SPRING * alpha * share(a);
    }
  };
  const anchors = (alpha: number) => {
    for (const n of nodes) {
      if (n.ax) n.vx! += (pad + n.ax.at * (w - 2 * pad) - n.x!) * ANCHOR * alpha * n.ax.certainty;
      if (n.ay) n.vy! += (h - pad - n.ay.at * (h - 2 * pad) - n.y!) * ANCHOR * alpha * n.ay.certainty;
    }
  };
  forceSimulation(nodes)
    .force('springs', springs)
    .force('anchors', anchors)
    .force(
      'collide',
      forceCollide<N>((n) => n.r + 2),
    )
    .stop()
    .tick(400);
  const placed: Placed[] = nodes.map((n) => ({ node: n.node, r: n.r, x: n.x!, y: n.y!, held: [!!n.ax, !!n.ay] }));
  return { placed, at: new Map(placed.map((p) => [p.node.key, p])) };
}
export type MapLayout = ReturnType<typeof mapLayout>;

/** A line's steps for a mini roll or a grid: each `~` a rest, a number a degree, a `&drum:…:level` a hit; `x@n` n long. */
export function stepsOf(line: string): { v: number | null; len: number }[] {
  return line
    .split(/\s+/)
    .filter((t) => /^(~|-?\d+|&\w+:\d+:[.\d]+)(@\d+)?$/.test(t))
    .map((t) => {
      const [head, at] = t.split('@');
      const len = at ? Number(at) : 1;
      if (head === '~') return { v: null, len };
      if (head!.startsWith('&')) return { v: Number(head!.split(':')[2]), len };
      return { v: Number(head), len };
    });
}
