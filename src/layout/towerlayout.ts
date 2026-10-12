/**
 * The tower layout (docs/notes/tower-strip.md): a graph layout of its own beside the signal path's, where a cell's
 * height is its place on the frequency tower (`towerOf`, by its step), on one even log scale (`TOWER_PX` a decade, up
 * high), and only its x is left to the forces. A voice's top (where its sound leaves) sits at its base frequency; a
 * stepped cell's centre at its step; a cell with no height (a table nothing steps) is left free. The sound card has no
 * node: what goes into it goes into the tower's strips, a left one and a right one (`towerOuts`).
 */
import type { CompileResult } from '../engine/program';
import type { GraphModel } from '../engine/graph';
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

/** The edges into the sound card, as wires into the strips: a card of two channels sends its first left, its second right. */
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
 * at its height; where a cell is in the way (`obstacles`, its source's own left out) it hops over it, or under it when
 * its row is nearer the cell's bottom, and comes back to its height after. Cells close together are one hop.
 */
export function routeWire(x: number, y: number, to: number, obstacles: readonly TowerObstacle[], from: string): { d: string; hops: number } {
  const dir = to >= x ? 1 : -1;
  const hop = 28;
  const start = x + dir * hop * 1.6;
  // what is in the way along the row, nearest first, overlapping spans merged
  const along = obstacles
    .filter((o) => o.of !== from && o.top < y && o.bottom > y && (dir > 0 ? o.x1 > start && o.x0 < to : o.x0 < start && o.x1 > to))
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
