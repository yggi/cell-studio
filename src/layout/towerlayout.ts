/**
 * The tower layout (docs/notes/tower-strip.md): a graph layout of its own beside the signal path's, where a cell's
 * height is its place on the frequency tower (`towerOf`, by its step), on one even log scale (`TOWER_PX` a decade, up
 * high), and only its x is left to the forces. A voice's top (where its sound leaves) sits at its base frequency; a
 * stepped cell's centre at its step; a cell with no height (a table nothing steps) is left free. The sound card has no
 * node: what goes into it goes into a socket of its own (`withSockets`), and shows on the tower's strip at the graph's
 * right, its left channel the strip's left half and its right channel the right half (`towerOuts`, `towerNets`).
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import type { GraphModel, GraphNode } from '@yggi/cells/engine/graph';
import { cellId } from '@yggi/cells/engine/ids';
import { towerOf } from './tower';
import { socketOf, VOICE_SIZE } from './voice';
import { HEARING, TOWER_PX } from './towerscale';
import { soundRole, withCard } from './sound';

/**
 * The graph's y (down positive) for a height on the tower, in decades (log10 Hz). `zone`: the neutral zone's height
 * (decades, `towerLayers`): between the structure under 20 Hz and the audible from it, where the voices and the
 * mixers stand, off the scale; the audible is lifted by it. Each part of the scale stays even.
 */
export const towerY = (decades: number, zone = 0) => -(decades >= HEARING ? decades + zone : decades) * TOWER_PX;

/** The height on the tower (decades) for the graph's y, with no neutral zone: towerY's inverse. */
export const towerAt = (y: number) => -y / TOWER_PX;

/** The graph's y for a row in the layers' own frame (decades with the neutral zone in them). */
const rowY = (u: number) => -u * TOWER_PX;

/** The sound card's nodes (a sink, a mix written as one): drawn as the strips, not as a node. */
const cards = (model: GraphModel) => new Set(model.nodes.flatMap((n) => (n.cell?.sink ? [n.id] : [])));

/** The node whose sound an edge into the card carries: a read head drawn as a bulb on its tape is the sound, the tape only holds it. */
export const soundOf = (e: { from: string; bulb?: string }) => (e.bulb ? cellId(e.bulb) : e.from);

/** What goes into the sound card: each edge's source, and the channels it reaches (a two-channel card: one each). */
export interface TowerOut {
  /** The edge into the card (its id: live with it). */
  readonly id: string;
  /** The node whose sound it is: its wire leaves its top. */
  readonly from: string;
  /** What sounds in it (`soundOf`): `from`, or the read head drawn on it. */
  readonly sound: string;
  readonly left: boolean;
  readonly right: boolean;
}

/**
 * The edges into the sound card (written, or the built-in card's: sound.ts `withCard`), as wires into the strip: a card
 * of two channels sends its first left, its second right.
 */
export function towerOuts(program: CompileResult, given: GraphModel): TowerOut[] {
  const model = withCard(program, given);
  const card = cards(model);
  return model.edges.flatMap((e) => {
    // (an `about=` link into it is no sound)
    if (!card.has(e.to) || card.has(e.from) || e.port === 'about') return [];
    const c = program.cells.get(e.to.slice('cell:'.length));
    const units = c?.units ?? [];
    const k = units.length === 2 ? units.findIndex((u) => u.atom.kind === 'ref' && `cell:${u.atom.name}` === e.from) : -1;
    return [{ id: e.id, from: e.from, sound: soundOf(e), left: k !== 1, right: k !== 0 }];
  });
}

/** A wire into the strips, placed: its source's name, and where it leaves (its top, the graph's coordinates). */
export interface TowerIn extends TowerOut {
  readonly name: string;
  readonly x: number;
  readonly top: number;
}

/**
 * Where each wire into the strips comes in, from where things are now (their centres): its socket's centre, the
 * out-node it ends at (`socketId`: the strip marks it level with it); with no socket, its source's top — a voice's
 * envelope's cap (its base frequency), anything else's the top of its box (`height`, px).
 */
export function towerIns(outs: readonly TowerOut[], program: CompileResult, at: (id: string) => { x: number; y: number; height?: number } | undefined): TowerIn[] {
  return outs.flatMap((o) => {
    const p = at(o.from);
    if (!p) return [];
    const name = o.sound.slice('cell:'.length);
    const socket = at(socketId(o.id));
    if (socket) return [{ ...o, name, x: socket.x, top: socket.y }];
    const c = program.cells.get(name);
    const top = c?.voice && !c.lambda ? p.y - socketOf(VOICE_SIZE * c.size) : p.y - (p.height ?? 60) / 2;
    return [{ ...o, name, x: p.x, top }];
  });
}

/**
 * One net a base frequency: the sources whose wires leave at one height (the same base frequency, or the same row), its
 * trunk from the first of them (furthest from the strip) to the strip, the others tapping into it where they stand.
 */
export interface TowerNet {
  readonly id: string;
  readonly top: number;
  /** Its sources, the one furthest from the strip first. */
  readonly readers: readonly TowerIn[];
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
  return [...by].map(([top, readers]) => {
    const sorted = [...readers].sort((a, b) => a.x - b.x);
    return { id: sorted.map((t) => t.id).join('+'), top, readers: sorted, left: sorted.some((t) => t.left), right: sorted.some((t) => t.right) };
  });
}

/** A socket's wheel, px across: where one thing goes into the sound card (towerSockets). */
export const SOCKET_SIZE = 72;

/** A socket's node id, by the edge into the card it ends (the edge keeps its id: what it carries, and its state). */
export const socketId = (edge: string) => `socket:${edge}`;
export const isSocket = (id: string) => id.startsWith('socket:');

/**
 * The sound card everywhere (docs/notes/tower-strip.md): no card's node; each edge into it (written, or the built-in
 * card's: sound.ts `withCard`) ends at a socket of its own,
 * a small wheel beside its source (its id `socketId(edge)`, the card's cell its cell), the edge keeping its id. Edges at
 * the card that bring no sound (an `about=`) go.
 */
export function withSockets(program: CompileResult, given: GraphModel): GraphModel {
  const model = withCard(program, given);
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
  const nets = model.nets.map((n) => ({ ...n, readers: n.readers.filter((t) => kept.has(t)) })).filter((n) => n.readers.length && !card.has(n.owner));
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
    // (a kit itself, the drums' one wire into the card; or a pattern read through one)
    const own = program.cells.get(id.slice('cell:'.length));
    const kit = own?.kit ? own : program.cells.get(own?.over ?? '');
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
    const d = base(soundOf(e)) ?? base(e.from);
    if (d !== undefined) out.set(e.to, towerY(d));
  }
  return out;
}

/** The tower layout's strata, from the bottom (docs/notes/tower-strip.md: the forces): strict, a node can't leave its own. */
export type TowerLayer = 'constant' | 'source' | 'selector' | 'stepped' | 'gate' | 'voice' | 'mixer' | 'audible';

/**
 * A column (`towerLayers`): a voice or a kit (`hi`) and the one cell that plays it (`lo`), alone in playing it, at one x;
 * through a product's junction (`via`), the player under the junction, which sits on the voice's rim.
 */
export interface Column {
  readonly lo: string;
  readonly hi: string;
  readonly via?: string;
}

/** Decades between layers: the voice layer's room above the structure, the tables' below it. */
const LAYER_GAP = 0.6;
/** Decades between the voices and the mixers over them: room for a voice's cap, a gain and a mixer's name. */
const MIX_GAP = 1;

/**
 * Where each node is drawn to, in strata (the owner's: the constant structure, tables nothing steps, at the bottom; the
 * stepped structure, each cell at its rate; the gates, what plays voices or a kit (a groove), a row just under the
 * voices; the voices, between the structure and the audible: voices, kits, tapes, resonators, one row; the mixers
 * over them, each between what it mixes (`between`); the audible, only the sockets into the card, each at its sound's frequency). Each stratum is a band of heights, its
 * edges halfway between the rows (`strata`, the graph's y, top to bottom): no force takes a node out of its own.
 * `held`: drawn exactly to their rows, not by the spring — every stratum but the stepped and the constant.
 */
export function towerLayers(
  program: CompileResult,
  model: GraphModel,
  drawn: GraphModel,
  // (mixers: false, a mix with the voices; lift: false, every table nothing steps at the bottom — the probe's comparisons)
  // (sections: each node's place among its selector's, `nodeSections`'s k: the lanes' order, `rainbow`)
  { mixers = true, lift = true, sections }: { readonly mixers?: boolean; readonly lift?: boolean; readonly sections?: ReadonlyMap<string, number> } = {},
): {
  /** The neutral zone's height (decades): towerY's `zone`. */
  zone: number;
  /** The neutral zone's rows (the graph's y): the gates', the voices', the mixers'. */
  rows: { readonly gate: number; readonly voice: number; readonly mixer: number };
  targets: Map<string, number>;
  layers: Map<string, TowerLayer>;
  held: Set<string>;
  strata: Map<string, readonly [number, number]>;
  between: Map<string, string[]>;
  lineUp: string[][];
  aside: Map<string, string>;
  columns: Column[];
  /** The sections' lanes (physics `rainbow`): each node standing over the structure's clocks that has a section, by its place. */
  rainbow: Map<string, number>;
} {
  const step = towerOf(program, model, 'step');
  const sockets = socketHeights(program, model, drawn);
  const layers = new Map<string, TowerLayer>();
  const decades = new Map<string, number>();
  for (const n of drawn.nodes) {
    if (n.kind === 'junction' || n.petalOf) continue;
    if (isSocket(n.id)) {
      const y = sockets.get(n.id);
      if (y !== undefined) (layers.set(n.id, 'audible'), decades.set(n.id, towerAt(y)));
      continue;
    }
    const c = n.cell;
    if (c.note) continue;
    // (what makes, gates or mixes sound, in the voices' strata (sound.ts): a gate a row under the makers, not down among
    // the structure; a mixer over the makers it mixes, between them; the rest of the structure at its step)
    const d = step.get(n.id);
    const role = soundRole(program, n, d, { mixers });
    if (role === 'gate') layers.set(n.id, 'gate');
    else if (role === 'mixer') layers.set(n.id, 'mixer');
    else if (role === 'maker') {
      layers.set(n.id, 'voice');
      // (a braid stepped at an audio rate, a wave: with the voices, its step kept)
      if (c.step && n.kind !== 'voice' && d !== undefined && Number.isFinite(d)) decades.set(n.id, d);
    } else if (d !== undefined && Number.isFinite(d)) (layers.set(n.id, 'stepped'), decades.set(n.id, d));
    else if (d === -Infinity) layers.set(n.id, 'constant');
  }
  // (a selector, a table of sections, a stratum of its own under what it feeds: what feeds it — the clock it steps on, a
  // chooser reading it with over= — under it, so nothing stands in its pill)
  const tables = new Set([...(program.sections?.values() ?? [])].map(cellId));
  // (a table is a list, constant, or stepped itself; a chooser's own clock feeds the selector through it, a source too)
  for (const id of tables) if (layers.get(id) === 'stepped' || layers.get(id) === 'constant') layers.set(id, 'selector');
  for (let more = true; more;) {
    more = false;
    for (const e of model.edges) {
      const [to, from] = [layers.get(e.to), layers.get(e.from)];
      const into = (to === 'selector' || to === 'source') && e.port === 'step' ? e.from : from === 'selector' && e.port === 'over' ? e.to : undefined;
      if (into && layers.get(into) === 'stepped') (layers.set(into, 'source'), (more = true));
    }
  }
  // (the frame: a cell the selectors' own meter steps, at their sections' rate or slower, read only by tables — the key
  // a piece turns through — in the sources' row too, under the pills: it drives the frame, not a part)
  const meters = new Set(model.edges.flatMap((e) => (layers.get(e.to) === 'selector' && e.port === 'step' ? [e.from] : [])));
  const choosers = [...layers].flatMap(([id, l]) => (l === 'source' && !meters.has(id) ? [id] : []));
  const slowest = Math.max(...choosers.map((id) => decades.get(id) ?? -Infinity));
  for (const e of model.edges) {
    const d = decades.get(e.to);
    if (!meters.has(e.from) || e.port !== 'step' || layers.get(e.to) !== 'stepped' || d === undefined || d > slowest + 1e-6) continue;
    const reads = model.edges.filter((x) => x.from === e.to && x.to !== e.to);
    if (reads.length && reads.every((x) => layers.get(x.to) === 'constant')) layers.set(e.to, 'source');
  }
  // (the sources' row in order: the frame at its left, under the tables it feeds (they lead their nets from the left);
  // the meter, feeding the meter's bus; the choosers)
  const frame = [...layers].flatMap(([id, l]) => (l === 'source' && !meters.has(id) && !choosers.includes(id) ? [id] : []));
  // (and left of the pills, the frame's bus going up beside them)
  const aside = new Map(
    frame.flatMap((id) =>
      [...tables]
        .filter((t) => layers.get(t) === 'selector')
        .slice(0, 1)
        .map((t) => [id, t] as const),
    ),
  );
  const lineUp = choosers.length ? [[...frame, ...[...meters].filter((id) => layers.get(id) === 'source'), ...choosers]] : [];
  // (a table nothing steps, read only over the selectors: at the lowest stratum it is used in, level with its lowest
  // reader, its bus in from the side — not under a pill it would cross. Read by a selector or what feeds one, it stays down)
  const order: readonly TowerLayer[] = ['constant', 'source', 'selector', 'stepped', 'gate', 'voice', 'mixer', 'audible'];
  for (const [id, l] of [...layers]) {
    if (!lift || l !== 'constant' || tables.has(id)) continue;
    const readers = [...new Set(model.edges.flatMap((e) => (e.from === id && e.to !== id && layers.has(e.to) ? [e.to] : [])))];
    if (!readers.length || readers.some((r) => order.indexOf(layers.get(r)!) < order.indexOf('stepped'))) continue;
    const at = readers.flatMap((r) => (layers.get(r) === 'stepped' && decades.has(r) ? [decades.get(r)!] : []));
    layers.set(id, 'stepped');
    if (at.length) decades.set(id, at.reduce((a, d) => a + d, 0) / at.length);
  }
  const of = (layer: TowerLayer) => [...layers].flatMap(([id, l]) => (l === layer && decades.has(id) ? [decades.get(id)!] : []));
  const stepped = of('stepped');
  const top = stepped.length ? Math.max(...stepped) : 0;
  const bottom = stepped.length ? Math.min(...stepped) : 0;
  const voiceOf = new Map(drawn.nodes.flatMap((n) => (n.kind === 'junction' ? [[n.id, cellId(n.voice)] as const] : [])));
  // (a column: a voice or a kit and the one cell that plays it, alone in playing it — a melody through its product's
  // junction, a groove reading its kit — one x, so the wire between them runs straight up)
  const plays = new Map<string, Set<string>>();
  const players = new Map<string, Set<string>>();
  const via = new Map<string, string>();
  for (const e of model.edges) {
    const [lo, hi] = e.port === 'voice' ? [e.from, voiceOf.get(e.to)] : e.port === 'over' && layers.get(e.to) === 'gate' ? [e.to, e.from] : [];
    if (!lo || !hi || layers.get(hi) !== 'voice' || (layers.get(lo) !== 'stepped' && layers.get(lo) !== 'gate')) continue;
    (plays.get(lo) ?? plays.set(lo, new Set()).get(lo)!).add(hi);
    (players.get(hi) ?? players.set(hi, new Set()).get(hi)!).add(lo);
    if (e.port === 'voice') via.set(lo, e.to);
  }
  const columns = [...plays].flatMap(([lo, his]) => {
    const [hi] = his;
    const j = via.get(lo);
    return his.size === 1 && players.get(hi)?.size === 1 ? [{ lo, hi, ...(j ? { via: j } : {}) }] : [];
  });
  // The neutral zone (the owner's): from 20 Hz, between the structure and the audible, off the scale — the gates' row,
  // the voices', the mixers', from the bottom; the audible over it, every socket at its sound's own frequency. Its rows
  // in the layers' own frame (decades, the zone in them: `rowY`): the structure under 20 Hz as it is, the audible
  // lifted by the zone. (The players' row half a layer under the voices; a whole one when a player stands under its
  // kit: room for the kit's wheel, its name and the player's wheel.)
  const gates = [...layers.values()].includes('gate');
  const gate = HEARING + LAYER_GAP / 2;
  const voice = gates ? gate + (columns.some((c) => !c.via) ? LAYER_GAP : LAYER_GAP / 2) : HEARING + LAYER_GAP / 2;
  // (the mixers a layer's gap over the voices, when there are any)
  const mixer = voice + MIX_GAP;
  const mixes = [...layers.values()].includes('mixer');
  // (the audible a layer's gap over the mixers, or the voices)
  const floor = (mixes ? mixer : voice) + LAYER_GAP;
  const zone = floor - HEARING;
  // (a real height in the layers' frame: the audible lifted by the zone)
  const lifted = (d: number) => (d >= HEARING ? d + zone : d);
  // (under the stepped structure, the selectors, their sources, then the constant)
  const selects = [...layers.values()].includes('selector');
  const fed = [...layers.values()].includes('source');
  const selector = bottom - LAYER_GAP;
  const source = selector - LAYER_GAP;
  const base = (fed ? source : selects ? selector : bottom) - LAYER_GAP;
  const row = (id: string, l: TowerLayer): number =>
    l === 'voice'
      ? decades.has(id)
        ? lifted(decades.get(id)!)
        : voice
      : l === 'mixer'
        ? mixer
        : l === 'gate'
          ? gate
          : l === 'constant'
            ? base
            : l === 'selector'
              ? selector
              : l === 'source'
                ? source
                : l === 'audible'
                  ? lifted(Math.max(HEARING, decades.get(id)!))
                  : (decades.get(id) ?? top);
  // (each stratum's band, in decades, its edges halfway between the rows)
  const edges = {
    audible: floor - LAYER_GAP / 4,
    mixer: voice + MIX_GAP / 2,
    voice: voice - LAYER_GAP / 4,
    // (the zone's floor: nothing in it pushes into the structure, nothing of the structure rises into it)
    gate: HEARING,
    stepped: bottom - LAYER_GAP / 2,
    selector: selector - LAYER_GAP / 2,
    source: source - LAYER_GAP / 2,
  };
  const band: Record<TowerLayer, readonly [number, number]> = {
    audible: [Infinity, edges.audible],
    // (between the voices and the mixers, a layer of air: neither reaches into it)
    mixer: [edges.audible, Math.max(edges.mixer, mixer - LAYER_GAP / 2)],
    voice: [mixes ? Math.min(edges.mixer, voice + LAYER_GAP / 2) : edges.audible, edges.voice],
    gate: [edges.voice, edges.gate],
    stepped: [edges.gate, edges.stepped],
    selector: [edges.stepped, edges.selector],
    source: [edges.selector, edges.source],
    constant: [fed ? edges.source : selects ? edges.selector : edges.stepped, -Infinity],
  };
  const targets = new Map<string, number>();
  const strata = new Map<string, readonly [number, number]>();
  for (const [id, l] of layers) {
    targets.set(id, rowY(row(id, l)));
    // (a wave in the voices: its own height is its band's top)
    const [hi, lo] = band[l];
    strata.set(id, [rowY(Math.max(hi, l === 'voice' ? row(id, l) : hi)), rowY(lo)]);
  }
  // (held at their heights, not drawn there: all but the structure, drawn by the spring — the structure's wires (a
  // bar's steps, a selector's sections) pull it down; the voices held too, or the sockets above draw them into the mixers' air)
  const held = new Set([...layers].flatMap(([id, l]) => (l === 'audible' || l === 'gate' || l === 'mixer' || l === 'selector' || l === 'source' || l === 'voice' ? [id] : [])));
  // (a mixer between what it mixes: its sources, a product's by its voice)
  const owner = new Map(drawn.nodes.flatMap((n) => (n.kind === 'junction' ? [[n.id, cellId(n.voice)] as const] : [])));
  const between = new Map<string, string[]>();
  for (const e of drawn.edges) {
    if (layers.get(e.target) !== 'mixer' || e.band !== 'audio') continue;
    const from = owner.get(e.source) ?? e.source;
    if (from !== e.target) between.set(e.target, [...new Set([...(between.get(e.target) ?? []), from])]);
  }
  // (the lanes: what stands over the clocks — the stepped, gates, voices, mixers, sockets — in its section's place)
  const lane = new Set<TowerLayer>(['stepped', 'gate', 'voice', 'mixer', 'audible']);
  const rainbow = new Map([...(sections ?? [])].filter(([id]) => lane.has(layers.get(id)!)));
  return { zone, rows: { gate: rowY(gate), voice: rowY(voice), mixer: rowY(mixer) }, targets, layers, held, strata, between, lineUp, aside, columns, rainbow };
}
