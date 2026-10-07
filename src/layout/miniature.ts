/**
 * A piece's graph in miniature, for the library's cards and wheels (#61): where its cells sit (the
 * physics run briefly) and how they connect. Pure, so the examples' miniatures are worked out at build
 * time (tools/examples-index.ts) and the library compiles nothing to draw them; saved pieces and files
 * are worked out in the browser from their text, by the same code.
 *
 * Stored raw and compact: per node [x, y, colour], rounded to whole px; edges as pairs of node indices.
 * The colour is a kind (a negative code) or a note's hue (0 ≤ h < 360, to a tenth), never a CSS value: the theme resolves
 * it when it's drawn (MiniGraph.svelte). Sizes and the frame are derived here, per card or wheel.
 */
import { compileSource } from '../engine/compile';
import { codeShifts, type CompileResult } from '../engine/program';
import { buildGraph } from '../engine/graph';
import { cellView } from './cellview';
import { ForceLayout } from './physics';
import { kindOf } from './show';
import { groundsOf } from './meters';

/** A node's colour: a note's hue (0 ≤ h < 360, to a tenth of a degree) or one of these kinds. */
export const VOICE = -1;
export const MIX = -2;
export const METER = -3;
/** No pitch to show: a quiet dot. */
export const QUIET = -4;

export interface Miniature {
  readonly nodes: readonly (readonly [number, number, number])[];
  readonly edges: readonly (readonly [number, number])[];
}

/** Whole px (never -0: the index is JSON, which writes it 0). */
const whole = (v: number) => Math.round(v) || 0;

/** How many ticks the physics runs for a miniature (a glimpse, not the settled graph). */
const TICKS = 160;

function colourOf(result: CompileResult, shifts: ReturnType<typeof codeShifts>, name: string): number {
  const kind = kindOf(result, name);
  if (kind === 'voice') return VOICE;
  if (kind === 'mix') return MIX;
  if (kind === 'meter') return METER;
  try {
    const band = cellView(result, name, shifts, false)?.segments.find((s) => s.bands[0]?.kind === 'pitch')?.bands[0];
    if (band?.kind === 'pitch') return (((Math.round(band.hue * 10) / 10) % 360) + 360) % 360; // (to a tenth of a degree)
  } catch {
    /* no pitch: a quiet dot */
  }
  return QUIET;
}

/** A piece's miniature from its text (null: no cells to draw). */
export function miniature(source: string, rowOrder?: number): Miniature | null {
  const result = compileSource(source);
  const model = buildGraph(result);
  const nodes = model.nodes.filter((n) => !n.petalOf && !n.cell.note);
  if (nodes.length === 0) return null;
  // (the rows' order, when it is known: chosen already, it needn't be tried again)
  const l = new ForceLayout(undefined, rowOrder === undefined ? { live: false } : { live: false, rowOrder });
  l.setGraph(model);
  l.tick(TICKS);
  l.layNet(); // (the meters' nets, as the graph lays them)
  const net = l.meterNet();
  // (a net's tap that comes on from another reader is drawn from there, as the graph draws it)
  const hops = l.taps();
  const shifts = codeShifts(result);
  const index = new Map<string, number>();
  const out: [number, number, number][] = [];
  for (const n of nodes) {
    const p = l.position(n.id);
    if (!p) continue;
    index.set(n.id, out.length);
    out.push([whole(p.x), whole(p.y), colourOf(result, shifts, n.cell.name)]);
  }
  l.destroy();
  // (as the graph draws them: a meter's edges are ground — meters.ts — and its net is drawn instead)
  const grounds = groundsOf(model);
  const pair = (s: string, t: string) => {
    const a = index.get(s);
    const b = index.get(t);
    return a !== undefined && b !== undefined ? [[a, b] as const] : [];
  };
  const edges = [
    ...model.edges.flatMap((e) => (grounds.has(e.id) ? [] : pair(hops.get(e.id)?.from ?? e.source, hops.get(e.id) ? e.to : e.target))),
    ...net.flatMap((t) => pair(t.a, t.b)),
  ];
  return { nodes: out, edges };
}

/** A miniature as drawn: in its box's units, radii and edge width sized to the frame. */
export interface MiniShape {
  readonly nodes: readonly { x: number; y: number; r: number; colour: number }[];
  readonly edges: readonly { x1: number; y1: number; x2: number; y2: number }[];
  readonly box: readonly [number, number, number, number];
  /** Edge width, in the box's units. */
  readonly edge: number;
}

/** The frame round a miniature: a card's (4:3) or a wheel's (`round`: square, the graph inside the circle). */
export function miniShape(m: Miniature, round: boolean): MiniShape {
  const xs = m.nodes.map((n) => n[0]);
  const ys = m.nodes.map((n) => n[1]);
  // nodes and edges sized to the frame, not to the graph (a small piece and a large one read alike): a radius is
  // this share of the frame's width
  const share = (colour: number) => ((colour === VOICE || colour === MIX ? 5.2 : colour === METER ? 5 : 4.2) / 100) * (round ? 1 : 0.8);
  const biggest = Math.max(...m.nodes.map((n) => share(n[2])));
  // the box: at least a minimum size (a small graph stays small), the graph and a pad round it — the pad and the
  // largest node, whole, on every side (its radius grows with the box: solved for); in a wheel, square, with the
  // graph inside the circle (corners are cut off); else 4:3
  const pad = 40;
  const [spanX, spanY] = [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let w: number;
  let h: number;
  if (round) {
    // the graph's corners within the circle: its diagonal (and a node at each end) is the circle's diameter
    w = h = Math.max(640, (Math.hypot(spanX, spanY) + 3 * pad) / (1 - 2 * biggest));
  } else {
    w = Math.max(640, (spanX + 2 * pad) / (1 - 2 * biggest), (spanY + 2 * pad) / (3 / 4 - 2 * biggest));
    h = (w * 3) / 4;
  }
  const unit = w / 100;
  return {
    nodes: m.nodes.map(([x, y, colour]) => ({ x, y, r: share(colour) * w, colour })),
    edges: m.edges.map(([a, b]) => ({ x1: m.nodes[a][0], y1: m.nodes[a][1], x2: m.nodes[b][0], y2: m.nodes[b][1] })),
    box: [cx - w / 2, cy - h / 2, w, h],
    edge: (round ? 1.35 : 1.1) * unit,
  };
}
