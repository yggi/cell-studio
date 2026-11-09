/**
 * The fragments mock-up's data (`node tools/gallery.mjs fragments`): read from `@yggi/cells` at the app's pin, never
 * written here. Each seed file is one node (a template's sets of arguments its satellites), its facet its folder's,
 * its points its association's; each example a leaf, its references its `from` lines as the parser reads them. What
 * cells doesn't give yet (a catalogue, a piece's style, references) is derived here for the mock-up only: the epic
 * moves each into cells.
 */
import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
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
/** The defaults, by measure: taken by at least a tenth of the pieces (decision 1 of the epic's discussion). */
export const DEFAULT_SHARE = 0.1;
export const DEFAULTS = FRAGS.filter((f) => TAKEN.get(f.id)! >= DEFAULT_SHARE * PIECES.length).map((f) => f.id);

export const FACETS = [...new Set(FRAGS.map((f) => f.facet))];
export const facetColour = (facet: string) => noteColour((FACETS.indexOf(facet) / FACETS.length) * 360);
export const AXIS_LIST = AXES;

export interface Placed {
  readonly kind: 'frag' | 'piece';
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly r: number;
}
export interface MapLayout {
  readonly nodes: readonly Placed[];
  readonly satellites: readonly { id: string; x: number; y: number }[];
  readonly links: readonly { piece: string; frag: string }[];
  /** Pieces that take only defaults, or nothing: no style to place them by yet (yggi/cells#543). */
  readonly shelf: readonly string[];
}

/**
 * The map: every fragment at the weighted mean of its points on the two axes chosen, every piece at the mean of the
 * fragments it takes that aren't defaults, then d3-force's x/y pull and a collision, as the library's own layout grows
 * (`src/layout/library.ts`). Any two axes of `AXES`; a point without an axis sits at that axis's centre.
 */
export function mapLayout(xAxis: string, yAxis: string, w: number, h: number, pad = 40): MapLayout {
  const range = (name: string) => AXES.find((a) => a.name === name)!.range;
  const at = (p: Readonly<Record<string, number>>, name: string, size: number) => {
    const [lo, hi] = range(name);
    const v = p[name] ?? (lo + hi) / 2;
    return pad + ((v - lo) / (hi - lo)) * (size - 2 * pad);
  };
  const place = (pts: readonly Point[]) => {
    const total = pts.reduce((s, p) => s + p.weight, 0) || 1;
    return {
      x: pts.reduce((s, p) => s + p.weight * at(p.point, xAxis, w), 0) / total,
      y: h - pts.reduce((s, p) => s + p.weight * at(p.point, yAxis, h), 0) / total,
    };
  };
  type N = SimulationNodeDatum & { kind: 'frag' | 'piece'; id: string; tx: number; ty: number; r: number };
  const nodes: N[] = [];
  const satellites: { id: string; x: number; y: number }[] = [];
  for (const f of FRAGS) {
    if (DEFAULTS.includes(f.id)) continue;
    const t = place(f.points);
    nodes.push({ kind: 'frag', id: f.id, tx: t.x, ty: t.y, x: t.x, y: t.y, r: 5 + 2.2 * Math.sqrt(TAKEN.get(f.id)!) });
    if (f.points.length > 1) for (const p of f.points) satellites.push({ id: f.id, x: at(p.point, xAxis, w), y: h - at(p.point, yAxis, h) });
  }
  const shelf: string[] = [];
  const links: { piece: string; frag: string }[] = [];
  for (const p of PIECES) {
    const own = p.takes.filter((t) => !DEFAULTS.includes(t));
    if (!own.length) {
      shelf.push(p.key);
      continue;
    }
    const ts = own.map((t) => nodes.find((n) => n.id === t)!);
    const tx = ts.reduce((s, n) => s + n.tx, 0) / ts.length;
    const ty = ts.reduce((s, n) => s + n.ty, 0) / ts.length;
    nodes.push({ kind: 'piece', id: p.key, tx, ty, x: tx, y: ty, r: 4 });
    for (const t of own) links.push({ piece: p.key, frag: t });
  }
  forceSimulation(nodes)
    .force('x', forceX<N>((n) => n.tx).strength(0.35))
    .force('y', forceY<N>((n) => n.ty).strength(0.35))
    .force(
      'collide',
      forceCollide<N>((n) => n.r + 2.5),
    )
    .stop()
    .tick(300);
  return {
    nodes: nodes.map((n) => ({ kind: n.kind, id: n.id, r: n.r, x: Math.max(8, Math.min(w - 8, n.x!)), y: Math.max(8, Math.min(h - 8, n.y!)) })),
    satellites,
    links,
    shelf,
  };
}

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
