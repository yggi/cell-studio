/**
 * What the flow draws for an edge of the graph: which component, what it carries, how it is labelled. The graph
 * (`Graph.svelte`) and the gallery's edge sheet (`tools/gallery/edges/`) both make their edges here.
 */
import type { Edge } from '@xyflow/svelte';
import type { GraphEdge } from '../engine/graph';
import type { CompileResult } from '../engine/program';
import type { State } from '../engine/routing';
import type { MeterTrace } from '../layout/physics';

const nameOf = (id: string) => id.slice('cell:'.length);

/** A belt between two turntables as it is now (BeltEdge). */
export interface BeltDrawn {
  readonly rDriver: number;
  readonly rDriven: number;
  readonly stretch: number;
  readonly slipping: boolean;
}

/** A note into a resonator with tines picks one (or reads through them): each tine's pitch (semitones from C4), for the strands at its pads. */
function tinesOf(e: GraphEdge, program: CompileResult): number[] | null {
  // (a tune plays the tines — the resonator at the edge's end; or reads through them, over= — at its start)
  const c = e.port === 'voice' ? program.cells.get(nameOf(e.to)) : e.port === 'over' ? program.cells.get(nameOf(e.from)) : undefined;
  if (!c || typeof c.params.body !== 'string' || (c.exciters?.length ?? 0) < 2) return null;
  const f0 = c.freq > 0 ? c.freq : 440;
  return c.exciters!.map((x) => 12 * Math.log2(f0 / 261.63) + x.shift);
}

/** What an edge carries: whose steps pulse along it (from → to), and which voice's note colours it. */
function pulseData(e: GraphEdge, program: CompileResult) {
  const trigger = (voice: string) => program.outputs.find((o) => o.voice === voice)?.cell ?? null;
  const wire = {
    band: e.band,
    port: e.port,
    width: e.width,
    pointer: e.pointer,
    from: nameOf(e.from),
    table: e.port === 'over' ? nameOf(e.from) : null,
    tines: tinesOf(e, program),
  };
  // (a clock's ticks: the pulse is the steps of the cell it drives)
  if (e.kind === 'step') return { ...wire, kind: e.kind, phaseCell: nameOf(e.to), voice: null };
  // a tape's edges take the colour of what's on them: a read head's notes, as played; what's being
  // written, as its source plays it
  if (e.kind === 'out' && (e.pick === 'play' || e.pick === 'write')) {
    const o = e.pick === 'play' ? program.outputs.find((x) => x.tape?.head === nameOf(e.target)) : program.outputs.find((x) => x.cell === nameOf(e.source) && !x.tape);
    return { ...wire, kind: e.kind, phaseCell: null, voice: o?.voice ?? null };
  }
  if (e.kind === 'out') {
    const voice = nameOf(e.target);
    return { ...wire, kind: e.kind, phaseCell: trigger(voice) === nameOf(e.source) ? nameOf(e.source) : null, voice };
  }
  if (e.kind === 'mix') {
    const voice = nameOf(e.source);
    return { ...wire, kind: e.kind, phaseCell: trigger(voice), voice };
  }
  return { ...wire, kind: e.kind, phaseCell: null, voice: null };
}

/**
 * The flow's edge for a graph edge in a state (engine/routing.ts decides it). `belt`: a belted cell's step, drawn as a
 * belt over its pulleys. While playing, an edge that is routed is `idle` here, and PulseEdge makes it live when it is
 * (each edge reads that for itself).
 */
/** The sizes (px) of the wheels at an edge's ends, along the flow: where its ends lock to their segments. */
export interface EndSizes {
  readonly from: number;
  readonly to: number;
}

/** An edge's place in a net (GraphModel.nets): which (the layout says where it attaches: ForceLayout.taps). */
export interface NetPlace {
  readonly id: string;
}

export function flowEdgeOf(e: GraphEdge, state: State, program: CompileResult, belt?: BeltDrawn, sizes?: EndSizes, net?: NetPlace): Edge {
  if (belt) return { id: e.id, source: e.source, target: e.target, type: 'belt', zIndex: 5, selectable: false, data: { ...belt } };
  // a tape's edges meet it at its heads: the write head (what it records), each read head (what it plays)
  const heads = e.pick === 'write' ? { targetHandle: 'head-write' } : e.pick === 'play' ? { sourceHandle: `head-${nameOf(e.target)}` } : {};
  // drawn along the flow (docs/notes/nets.md): from what is read to the cell that reads it
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    ...heads,
    type: 'pulse',
    // (only a live edge carries a note's colour and pulses: an edge into what doesn't sound now stays still)
    data: { ...pulseData(e, program), off: state === 'off' || state === 'unrouted', state, sizes, to: nameOf(e.to), net },
    label: [e.count > 1 ? `×${e.count}` : '', e.pick, e.label ?? ''].filter(Boolean).join(' ') || undefined,
    class: `edge-${e.kind} band-${e.band}${e.pointer ? ' pointer' : ''}`,
    selectable: false,
  };
}

/** A trace of a meter's net (meters are ground: their edges aren't drawn, this is). `index`: the meter's place among the meters. */
export function meterEdgeOf(t: MeterTrace, index: number): Edge {
  return { id: t.id, source: t.a, target: t.b, type: 'meter', zIndex: -1, selectable: false, focusable: false, data: { meter: index, name: nameOf(t.meter) } };
}
