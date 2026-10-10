/**
 * What the flow draws for an edge of the graph: which component, what it carries, how it is labelled. Pure: the graph
 * (`ui/state/graphLayout.svelte.ts`) and the gallery's edge sheet (`tools/gallery/edges/`) both make their edges here.
 */
import type { Edge } from '@xyflow/svelte';
import type { GraphEdge } from '../engine/graph';
import { isJunction } from '../engine/ids';
import { edgeLabel } from '../engine/transform';
import { DEFAULT_FREQ, type CompileResult } from '../engine/program';
import { drawn, edgeStateOf, type State } from '../engine/routing';
import type { LiveState } from '../engine/live';
import { physicsOf } from '../engine/clocking';
import { pulleys } from '../layout/belts';
import { groundsOf, meterIndex } from '../layout/meters';
import { loomBands } from '../layout/looms';
import type { MeterTrace } from '../layout/state';
import type { GraphSnapshot } from './snapshot';

const nameOf = (id: string) => id.slice('cell:'.length);
/** An edge's end as a cell's name: a product's junction reads as the voice it is (its sound). */
const endOf = (e: GraphEdge, id: string) => (isJunction(id) ? (e.sound ?? null) : nameOf(id));

/** A belt between two turntables as it is now (BeltEdge). */
export interface BeltDrawn {
  readonly rDriver: number;
  readonly rDriven: number;
  readonly stretch: number;
  readonly slipping: boolean;
}

/** The sizes (px) of the wheels at an edge's ends, along the flow: where its ends lock to their segments. */
export interface EndSizes {
  readonly from: number;
  readonly to: number;
}

/** An edge's place in a net (GraphModel.nets): which (the layout says where it attaches: ForceLayout.taps). */
export interface NetPlace {
  readonly id: string;
}

/** A note into a resonator with tines picks one (or reads through them): each tine's pitch (semitones from C4), for the strands at its pads. */
function tinesOf(e: GraphEdge, program: CompileResult): number[] | null {
  // (a tune plays the tines — the resonator at the edge's end; or reads through them, over= — at its start)
  const c = e.port === 'voice' ? program.cells.get(e.sound ?? nameOf(e.to)) : e.port === 'over' ? program.cells.get(nameOf(e.from)) : undefined;
  if (!c || typeof c.params.body !== 'string' || (c.exciters?.length ?? 0) < 2) return null;
  const f0 = c.freq > 0 ? c.freq : 440;
  return c.exciters!.map((x) => 12 * Math.log2(f0 / DEFAULT_FREQ) + x.shift);
}

/** What travels along an edge while it is live: whose steps pulse along it (a cell's name), and which voice's note colours it. */
export interface Carried {
  readonly phaseCell: string | null;
  readonly voice: string | null;
}
type Carrier = (e: GraphEdge, program: CompileResult) => Carried;

const NOTHING: Carrier = () => ({ phaseCell: null, voice: null });
/** The cell whose output plays a voice (its steps are the voice's notes). */
const trigger = (program: CompileResult, voice: string) => program.outputs.find((o) => o.voice === voice)?.cell ?? null;

/**
 * By band: ticks pulse with the steps of the cell they drive (a clock's), or a parameter's clock with the clock's own
 * (`delaytime=&bar*3/4`: its reader doesn't step); a note's link carries nothing.
 */
const BY_BAND: Readonly<Partial<Record<GraphEdge['band'], Carrier>>> = {
  sync: (e) => ({ phaseCell: nameOf(e.port === 'step' ? e.to : e.from), voice: null }),
  none: NOTHING,
};
/** By port, for the other bands. */
const BY_PORT: Readonly<Record<string, Carrier>> = {
  // a table read through, a cell spliced in: the reader's own wheel shows it
  over: NOTHING,
  braid: NOTHING,
  // a tape's edges take the colour of what's on them: a read head's notes, as played; what's being written, as its source plays it
  play: (e, p) => ({ phaseCell: null, voice: p.outputs.find((x) => x.tape?.head === nameOf(e.target))?.voice ?? null }),
  write: (e, p) => ({ phaseCell: null, voice: p.outputs.find((x) => x.cell === nameOf(e.source) && !x.tape)?.voice ?? null }),
  // a voice into a mix (or a product's junction, its sound): its notes, pulsing with the steps that play it
  mix: (e, p) => {
    const voice = e.sound ?? nameOf(e.source);
    return { phaseCell: trigger(p, voice), voice };
  },
};
/** Any other port feeds a voice (a melody playing it, its envelope, levels, pitch, parameters, FM, what excites or couples it): its note; the pulse if this is what plays it. */
const INTO_VOICE: Carrier = (e, p) => {
  // (into a product's junction: the voice it is)
  const voice = e.sound ?? nameOf(e.target);
  return { phaseCell: trigger(p, voice) === nameOf(e.source) ? nameOf(e.source) : null, voice };
};

/** What an edge carries: one lookup by (band, port). */
export function carried(e: GraphEdge, program: CompileResult): Carried {
  return (BY_BAND[e.band] ?? BY_PORT[e.port] ?? INTO_VOICE)(e, program);
}

/** What PulseEdge reads of an edge (its `data`). */
function pulseData(e: GraphEdge, program: CompileResult) {
  return {
    band: e.band,
    port: e.port,
    width: e.width,
    from: endOf(e, e.from),
    // (a table read through, over=, or looked up, map=: its strands leave its entries)
    table: e.port === 'over' || e.port === 'map' ? nameOf(e.from) : null,
    tines: tinesOf(e, program),
    // what each place it is written picks (a strand from each tap it reads; $: from the hub)
    picks: e.port === 'braid' ? e.transforms.flatMap((t) => t.flatMap((st) => (st.kind === 'pick' ? [st.pick] : []))) : [],
    ...carried(e, program),
  };
}

/**
 * The flow's edge for a graph edge in a state (engine/routing.ts decides it). `belt`: a belted cell's step, drawn as a
 * belt over its pulleys. While playing, an edge that is routed is `idle` here, and PulseEdge makes it live when it is
 * (each edge reads that for itself).
 */
export function flowEdgeOf(e: GraphEdge, state: State, program: CompileResult, belt?: BeltDrawn, sizes?: EndSizes, net?: NetPlace, ring?: number): Edge {
  if (belt) return { id: e.id, source: e.source, target: e.target, type: 'belt', zIndex: 5, selectable: false, data: { ...belt } };
  // a tape's edges meet it at its heads: the write head (what it records), each read head (what it plays)
  const heads = e.port === 'write' ? { targetHandle: 'head-write' } : e.port === 'play' ? { sourceHandle: `head-${nameOf(e.target)}` } : {};
  // drawn along the flow (docs/notes/nets.md): from what is read to the cell that reads it
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    ...heads,
    type: 'pulse',
    // (only a live edge carries a note's colour and pulses: an edge into what doesn't sound now stays still)
    // (a bus round a loom: its run here, its ring as an edge of its own, LOOM)
    data: { ...pulseData(e, program), off: state === 'off' || state === 'unrouted', state, sizes, to: endOf(e, e.to), net, ring, ...(ring === undefined ? {} : { part: 'run' }) },
    label: edgeLabel(e),
    class: `edge-${e.port} band-${e.band}${e.pointer ? ' pointer' : ''}`,
    selectable: false,
  };
}

/**
 * A trace of a meter's net (meters are ground: their edges aren't drawn, this is). `index`: the meter's place among the
 * meters. A tap's sub-net (decision 016) leaves from its bulb on its table, and flashes on the tap's ticks.
 */
export function meterEdgeOf(t: MeterTrace, index: number): Edge {
  return {
    id: t.id,
    source: t.a,
    target: t.b,
    type: 'meter',
    zIndex: -1,
    selectable: false,
    focusable: false,
    data: { meter: index, name: t.bulb ?? nameOf(t.meter), ...(t.at ? { at: t.at } : {}) },
  };
}

/** What the edges are drawn with besides the snapshot: the wheels' sizes, the meters' nets as laid, and whether anything is lit (not stopped), and what, for a belt. */
export interface EdgeScene {
  /** A node's size (px), as the flow draws it; undefined: not drawn. */
  readonly sizeOf: (id: string) => number | undefined;
  readonly net: readonly MeterTrace[];
  /** Not stopped: a routed edge is idle, an unrouted one dimmed (PulseEdge makes an idle one live); stopped, none is dimmed. */
  readonly lit: boolean;
  /** Read only for a belt's stretch, as it is now. */
  readonly live: LiveState | null;
}

const NO_LIVE = { nodes: new Set<string>(), edges: new Set<string>() };

/** Every edge the flow draws for a snapshot: its graph's edges (a meter's are ground: its net is drawn instead), each in its state. */
export function flowEdgesOf(s: GraphSnapshot, scene: EdgeScene): Edge[] {
  const { program, model } = s;
  // Edge styling follows routing (as drawn: petals' edges are their parents'): off, unrouted, on, idle, live — one rule for
  // edges and nodes (engine/routing.ts). Here without the live set: while lit an edge that is routed is idle, and
  // PulseEdge makes it live when it is (each edge reads that for itself)
  const routed = drawn(model, s.routed);
  const live = scene.lit ? NO_LIVE : null;
  // each edge's place in a net (a table read by several: one trunk, a branch to each reader)
  const netPlaces = new Map(model.nets.flatMap((n) => n.taps.map((id) => [id, { id: n.id }] as const)));
  const rings = loomBands(model).inner;
  const grounds = groundsOf(model);
  const index = meterIndex(model);
  const toFlowEdge = (e: GraphEdge): Edge => {
    const state = edgeStateOf(e, s.muted, routed, live);
    // a belted cell's step: a belt, its pulleys by the ratio, its stretch as it is now
    const driven = e.belt ? model.nodes.find((n) => n.id === e.source) : undefined;
    if (driven?.cell) {
      const radius = (id: string) => (scene.sizeOf(id) ?? 140) / 2;
      const rate = program.clocks.get(driven.cell.name)?.belt?.rate ?? 1;
      const [rDriver, rDriven] = pulleys(radius(e.target), radius(e.source), rate);
      const st = scene.live ? physicsOf(program, s.shifts, driven.cell.name)?.state?.(scene.live.seconds) : undefined;
      return flowEdgeOf(e, state, program, { rDriver, rDriven, stretch: st?.stretch ?? 0, slipping: st?.slipping ?? false });
    }
    // (the wheels' sizes at its ends: a braid's edge meets its segment, a table's strands leave their entries)
    return flowEdgeOf(e, state, program, undefined, { from: scene.sizeOf(e.from) ?? 0, to: scene.sizeOf(e.to) ?? 0 }, netPlaces.get(e.id), rings.get(e.id));
  };
  const pulses = model.edges.filter((e) => !grounds.has(e.id)).map(toFlowEdge);
  // a bus's loom round its source, drawn after every edge's run (so over it): a bus passing a wheel runs under its loom
  const looms = pulses.filter((f) => rings.has(f.id)).map((f): Edge => ({ ...f, id: `${f.id}${LOOM}`, label: undefined, data: { ...f.data, part: 'ring' } }));
  return [...pulses, ...looms, ...scene.net.map((t) => meterEdgeOf(t, index.get(t.meter) ?? 0))];
}

/** The id of a bus's loom, drawn as an edge of its own (above every run): the bus's id and this. */
export const LOOM = '#loom';
