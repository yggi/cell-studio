/**
 * The tower layout (docs/notes/tower-strip.md): a graph layout of its own beside the signal path's, where a cell's
 * height is its place on the frequency tower (`towerOf`, by its step), on one even log scale (`TOWER_PX` a decade, up
 * high), and only its x is left to the forces. A voice's top (where its sound leaves) sits at its base frequency; a
 * stepped cell's centre at its step; a cell with no height (a table nothing steps) is left free. The sound card has no
 * node: what goes into it goes into the tower's strip at the graph's right, its left channel the strip's left half and
 * its right channel the right half (`towerOuts`), one net a base frequency (`towerNets`).
 */
import type { CompileResult } from '../engine/program';
import type { GraphModel, GraphNode } from '../engine/graph';
import { towerOf } from './tower';
import { socketOf, VOICE_SIZE } from './voice';

/** Pixels to a decade on the tower, the same in the graph and on its strips (even: the rainbow keeps its width). */
const TOWER_PX = 360;

/** The graph's y (down positive) for a height on the tower, in decades (log10 Hz). */
export const towerY = (decades: number) => -decades * TOWER_PX;

/** The height on the tower (decades) for the graph's y: towerY's inverse. */
export const towerAt = (y: number) => -y / TOWER_PX;

/** The sound card's nodes (a sink, a mix written as one): drawn as the strips, not as a node. */
const cards = (model: GraphModel) => new Set(model.nodes.flatMap((n) => (n.cell?.sink ? [n.id] : [])));

/** What goes into the sound card: each edge's source, and the channels it reaches (a two-channel card: one each). */
export interface TowerOut {
  /** The edge into the card (its id: live with it). */
  readonly id: string;
  /** The node whose sound it is: its wire leaves its top. */
  readonly from: string;
  readonly left: boolean;
  readonly right: boolean;
}

/** The edges into the sound card, as wires into the strip: a card of two channels sends its first left, its second right. */
export function towerOuts(program: CompileResult, model: GraphModel): TowerOut[] {
  const card = cards(model);
  return model.edges.flatMap((e) => {
    // (an `about=` link into it is no sound)
    if (!card.has(e.to) || card.has(e.from) || e.port === 'about') return [];
    const c = program.cells.get(e.to.slice('cell:'.length));
    const units = c?.units ?? [];
    const k = units.length === 2 ? units.findIndex((u) => u.atom.kind === 'ref' && `cell:${u.atom.name}` === e.from) : -1;
    return [{ id: e.id, from: e.from, left: k !== 1, right: k !== 0 }];
  });
}

/** The graph without the sound card: its nodes, the edges at them and those edges in their nets gone. */
export function withoutCard(model: GraphModel): GraphModel {
  const card = cards(model);
  if (!card.size) return model;
  const edges = model.edges.filter((e) => !card.has(e.from) && !card.has(e.to) && !card.has(e.source) && !card.has(e.target));
  const kept = new Set(edges.map((e) => e.id));
  const nets = model.nets.map((n) => ({ ...n, taps: n.taps.filter((id) => kept.has(id)) })).filter((n) => n.taps.length && !card.has(n.owner));
  return { ...model, nodes: model.nodes.filter((n) => !card.has(n.id)), edges, nets };
}

/**
 * Each node's fixed y (its centre, as the flow places it): a voice's top at its base frequency, any other cell with a
 * height at it. Those with none (the constant, a cell no clock reaches) aren't in it: the forces place them.
 */
export function towerHeights(program: CompileResult, model: GraphModel): Map<string, number> {
  const at = towerOf(program, model, 'step');
  const out = new Map<string, number>();
  for (const n of model.nodes) {
    // (a product's junction rides its voice; a petal hangs by its parent)
    if (n.kind === 'junction' || n.petalOf) continue;
    const d = at.get(n.id);
    if (d === undefined || !Number.isFinite(d)) continue;
    const c = n.cell;
    out.set(n.id, towerY(d) + (c.voice && !c.lambda ? socketOf(VOICE_SIZE * c.size) : 0));
  }
  return out;
}

/** A wire into the strips, placed: its source's name, and where it leaves (its top, the graph's coordinates). */
export interface TowerIn extends TowerOut {
  readonly name: string;
  readonly x: number;
  readonly top: number;
}

/**
 * Where each wire into the strips leaves, from where its source is now (its centre) and how big it is: a voice's top
 * is its envelope's cap (its base frequency), anything else's the top of its box (`height`, px).
 */
export function towerIns(outs: readonly TowerOut[], program: CompileResult, at: (id: string) => { x: number; y: number; height?: number } | undefined): TowerIn[] {
  return outs.flatMap((o) => {
    const p = at(o.from);
    if (!p) return [];
    const name = o.from.slice('cell:'.length);
    const c = program.cells.get(name);
    const top = c?.voice && !c.lambda ? p.y - socketOf(VOICE_SIZE * c.size) : p.y - (p.height ?? 60) / 2;
    return [{ ...o, name, x: p.x, top }];
  });
}

/** A cell a sound wire must not pass over: its box (the graph's coordinates), and whose it is (a junction, a petal: its voice's). */
export interface TowerObstacle {
  readonly of: string;
  readonly x0: number;
  readonly x1: number;
  readonly top: number;
  readonly bottom: number;
}

/** How far a wire keeps off a cell it goes round (px), and how long its bend into the hop is. */
const CLEAR = 10;
const BEND = 14;

/**
 * A sound wire's path from its source's top (x, y) to a strip's inner edge at `to`: straight up a little, then level
 * at its height; where a cell is in the way (`obstacles`, its sources' own, `own`, left out) it hops over it, or under it when
 * its row is nearer the cell's bottom, and comes back to its height after. Cells close together are one hop.
 */
export function routeWire(x: number, y: number, to: number, obstacles: readonly TowerObstacle[], own: ReadonlySet<string>): { d: string; hops: number } {
  const dir = to >= x ? 1 : -1;
  const hop = 28;
  const start = x + dir * hop * 1.6;
  // what is in the way along the row, nearest first, overlapping spans merged
  const along = obstacles
    .filter((o) => !own.has(o.of) && o.top < y && o.bottom > y && (dir > 0 ? o.x1 > start && o.x0 < to : o.x0 < start && o.x1 > to))
    .map((o) => ({ a: dir > 0 ? o.x0 - CLEAR : o.x1 + CLEAR, b: dir > 0 ? o.x1 + CLEAR : o.x0 - CLEAR, top: o.top, bottom: o.bottom }))
    .sort((p, q) => dir * (p.a - q.a));
  const spans: { a: number; b: number; top: number; bottom: number }[] = [];
  for (const o of along) {
    const last = spans[spans.length - 1];
    if (last && dir * (o.a - last.b) < BEND * 2) {
      last.b = dir > 0 ? Math.max(last.b, o.b) : Math.min(last.b, o.b);
      last.top = Math.min(last.top, o.top);
      last.bottom = Math.max(last.bottom, o.bottom);
    } else spans.push({ ...o });
  }
  let d = `M${x},${y} C${x},${y - hop} ${x + dir * hop},${y} ${start},${y}`;
  for (const s of spans) {
    const a = dir > 0 ? Math.max(s.a, start + BEND) : Math.min(s.a, start - BEND);
    const h = y - s.top < s.bottom - y ? s.top - CLEAR : s.bottom + CLEAR;
    d += ` L${a - dir * BEND},${y} C${a},${y} ${a},${h} ${a + dir * BEND},${h} L${s.b - dir * BEND},${h} C${s.b},${h} ${s.b},${y} ${s.b + dir * BEND},${y}`;
  }
  return { d: d + ` L${to},${y}`, hops: spans.length };
}

/**
 * One net a base frequency: the sources whose wires leave at one height (the same base frequency, or the same row), its
 * trunk from the first of them (furthest from the strip) to the strip, the others tapping into it where they stand.
 */
export interface TowerNet {
  readonly id: string;
  readonly top: number;
  /** Its sources, the one furthest from the strip first. */
  readonly taps: readonly TowerIn[];
  /** The halves of the strip it reaches: the union of its sources'. */
  readonly left: boolean;
  readonly right: boolean;
}

/** The wires into the strip, gathered into a net per height (within half a pixel), its sources by x. */
export function towerNets(ins: readonly TowerIn[]): TowerNet[] {
  const by = new Map<number, TowerIn[]>();
  for (const w of ins) {
    const k = Math.round(w.top * 2) / 2;
    (by.get(k) ?? by.set(k, []).get(k)!).push(w);
  }
  return [...by].map(([top, taps]) => {
    const sorted = [...taps].sort((a, b) => a.x - b.x);
    return { id: sorted.map((t) => t.id).join('+'), top, taps: sorted, left: sorted.some((t) => t.left), right: sorted.some((t) => t.right) };
  });
}

/**
 * A net's paths to the strip's inner edge at `to` (right of the graph): its trunk from its first source, round the
 * cells in its way, and a riser from each other source into it.
 */
export function netPaths(net: TowerNet, to: number, obstacles: readonly TowerObstacle[]): { trunk: string; risers: string[]; hops: number } {
  const own = new Set(net.taps.map((t) => t.from));
  const [first, ...rest] = net.taps;
  const { d, hops } = routeWire(first.x, net.top, to, obstacles, own);
  const hop = 28;
  return { trunk: d, risers: rest.map((t) => `M${t.x},${net.top} C${t.x},${net.top - hop} ${t.x + hop},${net.top} ${t.x + hop * 1.6},${net.top}`), hops };
}

/** A socket's wheel, px across: where one thing goes into the sound card (towerSockets). */
export const SOCKET_SIZE = 72;

/** A socket's node id, by the edge into the card it ends (the edge keeps its id: what it carries, and its state). */
export const socketId = (edge: string) => `socket:${edge}`;
export const isSocket = (id: string) => id.startsWith('socket:');

/**
 * The sound card everywhere (docs/notes/tower-strip.md): no card's node; each edge into it ends at a socket of its own,
 * a small wheel beside its source (its id `socketId(edge)`, the card's cell its cell), the edge keeping its id. Edges at
 * the card that bring no sound (an `about=`) go.
 */
export function withSockets(model: GraphModel): GraphModel {
  const card = cards(model);
  if (!card.size) return model;
  const sockets: GraphNode[] = [];
  const edges = model.edges.flatMap((e) => {
    if (!card.has(e.to) && !card.has(e.from) && !card.has(e.source) && !card.has(e.target)) return [e];
    if (!card.has(e.to) || card.has(e.from) || e.port === 'about') return [];
    const host = model.nodes.find((n) => n.id === e.to);
    if (!host || host.kind === 'junction') return [];
    const id = socketId(e.id);
    sockets.push({ ...host, id });
    return [{ ...e, to: id, ...(e.target === e.to ? { target: id } : { source: id }) }];
  });
  const kept = new Set(edges.map((e) => e.id));
  const nets = model.nets.map((n) => ({ ...n, taps: n.taps.filter((t) => kept.has(t)) })).filter((n) => n.taps.length && !card.has(n.owner));
  return { ...model, nodes: [...model.nodes.filter((n) => !card.has(n.id)), ...sockets], edges, nets };
}

/** Each socket's height (the graph's y, its centre): where its source's sound sits on the tower, a voice's base frequency. */
export function socketHeights(program: CompileResult, model: GraphModel, drawn: GraphModel): Map<string, number> {
  // (by the sound it carries: a voice at its pitch, a groove or a mix at its sound's, `emit`)
  const at = towerOf(program, model, 'emit');
  const out = new Map<string, number>();
  // (a pattern read through a kit, a groove: its lowest drum's, its base as a voice's pitch is)
  const base = (id: string): number | undefined => {
    const d = at.get(id);
    if (d !== undefined && Number.isFinite(d)) return d;
    const kit = program.cells.get(program.cells.get(id.slice('cell:'.length))?.over ?? '');
    if (!kit?.kit) return undefined;
    // (a drum drawn as a piece of its kit has no node: its own pitch, else its filter, else 1 kHz, as towerOf reads a voice)
    const pitch = (name: string) => {
      const c = program.cells.get(name);
      return c?.voice ? Math.log10(c.freq > 0 ? c.freq : Number(c.params.hpf ?? c.params.lpf) || 1000) : undefined;
    };
    const members = kit.units.flatMap((u) => (u.atom.kind === 'ref' ? [pitch(u.atom.name)] : [])).filter((x): x is number => x !== undefined && Number.isFinite(x));
    return members.length ? Math.min(...members) : undefined;
  };
  for (const e of drawn.edges) {
    if (!isSocket(e.to)) continue;
    const d = base(e.from);
    if (d !== undefined) out.set(e.to, towerY(d));
  }
  return out;
}

/** The tower layout's layers, from the bottom (docs/notes/tower-strip.md: the forces). */
export type TowerLayer = 'table' | 'structure' | 'voice' | 'audible';

/** Decades between layers: the voice layer's room above the structure, the tables' below it. */
const LAYER_GAP = 0.6;

/**
 * Where each node is drawn to, in layers (the owner's: tables nothing steps at the bottom; the structure, each stepped
 * cell at its rate; the voices, between the structure and the audible: voices, mixes, kits, tapes, resonators, one row;
 * the audible, only the sockets into the card, each at its sound's frequency). The graph's y for each, and its layer.
 */
export function towerLayers(program: CompileResult, model: GraphModel, drawn: GraphModel): { targets: Map<string, number>; layers: Map<string, TowerLayer>; held: Set<string> } {
  const step = towerOf(program, model, 'step');
  const sockets = socketHeights(program, model, drawn);
  const layers = new Map<string, TowerLayer>();
  const decades = new Map<string, number>();
  // (what sounds: a voice, a mix, a kit, a tape, a resonator, a gate)
  const sounds = (c: NonNullable<GraphNode['cell']>) =>
    c.voice || (!!c.mix && !c.sink) || c.kit || !!c.gate || typeof c.params.write === 'string' || typeof c.params.body === 'string' || typeof c.params.play === 'string';
  for (const n of drawn.nodes) {
    if (n.kind === 'junction' || n.petalOf) continue;
    if (isSocket(n.id)) {
      const y = sockets.get(n.id);
      if (y !== undefined) (layers.set(n.id, 'audible'), decades.set(n.id, towerAt(y)));
      continue;
    }
    const c = n.cell;
    if (c.note) continue;
    if (n.kind === 'voice' || (sounds(c) && !c.step)) layers.set(n.id, 'voice');
    else {
      const d = step.get(n.id);
      if (d !== undefined && Number.isFinite(d)) (layers.set(n.id, 'structure'), decades.set(n.id, d));
      else if (d === -Infinity) layers.set(n.id, 'table');
    }
  }
  const of = (layer: TowerLayer) => [...layers].flatMap(([id, l]) => (l === layer && decades.has(id) ? [decades.get(id)!] : []));
  // (the voices rest on the structure below hearing: a braid stepped at an audio rate, a wave, keeps its own height)
  const structure = of('structure').filter((d) => d < Math.log10(20));
  const audible = of('audible');
  const top = structure.length ? Math.max(...structure) : 0;
  const bottom = structure.length ? Math.min(...structure) : 0;
  // (the voices: a row between the structure's top and the lowest socket, a layer's gap over the structure at least)
  const voice = Math.max(top + LAYER_GAP, audible.length ? (top + Math.min(...audible)) / 2 : top + LAYER_GAP);
  // (every socket in the audible, a layer's gap over the voices at least: at its sound's frequency, or the audible's
  // floor when that is lower — a groove's lowest drum)
  const floor = voice + LAYER_GAP;
  const targets = new Map<string, number>();
  for (const [id, l] of layers)
    targets.set(id, towerY(l === 'voice' ? voice : l === 'table' ? bottom - LAYER_GAP : l === 'audible' ? Math.max(floor, decades.get(id)!) : decades.get(id)!));
  // (held at their heights, not drawn there: the sockets in the audible, and the kits with the voices — a kit's
  // grooves, in the structure, would pull it down among them)
  const kits = new Set(drawn.nodes.flatMap((n) => (n.cell?.kit && layers.get(n.id) === 'voice' ? [n.id] : [])));
  const held = new Set([...layers].flatMap(([id, l]) => (l === 'audible' || kits.has(id) ? [id] : [])));
  return { targets, layers, held };
}
