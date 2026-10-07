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

/** What an edge carries: whose steps pulse along it, and which voice's note colours it. */
function pulseData(e: GraphEdge, program: CompileResult) {
  const trigger = (voice: string) => program.outputs.find((o) => o.voice === voice)?.cell ?? null;
  if (e.kind === 'step') return { kind: e.kind, phaseCell: nameOf(e.source), voice: null, reverse: true };
  // a tape's edges take the colour of what's on them: a read head's notes, as played; what's being
  // written, as its source plays it
  if (e.kind === 'out' && (e.pick === 'play' || e.pick === 'write')) {
    const o = e.pick === 'play' ? program.outputs.find((x) => x.tape?.head === nameOf(e.target)) : program.outputs.find((x) => x.cell === nameOf(e.source) && !x.tape);
    return { kind: e.kind, phaseCell: null, voice: o?.voice ?? null, reverse: false };
  }
  if (e.kind === 'out') {
    const voice = nameOf(e.target);
    return { kind: e.kind, phaseCell: trigger(voice) === nameOf(e.source) ? nameOf(e.source) : null, voice, reverse: false };
  }
  if (e.kind === 'mix') {
    const voice = nameOf(e.source);
    return { kind: e.kind, phaseCell: trigger(voice), voice, reverse: false };
  }
  return { kind: e.kind, phaseCell: null, voice: null, reverse: false };
}

/**
 * The flow's edge for a graph edge in a state (engine/routing.ts decides it). `belt`: a belted cell's step, drawn as a
 * belt over its pulleys. While playing, an edge that is routed is `idle` here, and PulseEdge makes it live when it is
 * (each edge reads that for itself).
 */
export function flowEdgeOf(e: GraphEdge, state: State, program: CompileResult, belt?: BeltDrawn): Edge {
  if (belt) return { id: e.id, source: e.source, target: e.target, type: 'belt', zIndex: 5, selectable: false, data: { ...belt } };
  // a tape's edges meet it at its heads: the write head (what it records), each read head (what it plays)
  const heads = e.pick === 'write' ? { targetHandle: 'head-write' } : e.pick === 'play' ? { sourceHandle: `head-${nameOf(e.target)}` } : {};
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    ...heads,
    type: 'pulse',
    // (only a live edge carries a note's colour and pulses: an edge into what doesn't sound now stays still)
    data: { ...pulseData(e, program), off: state === 'off' || state === 'unrouted', state },
    label: [e.count > 1 ? `×${e.count}` : '', e.pick, e.label ?? ''].filter(Boolean).join(' ') || undefined,
    class: `edge-${e.kind}`,
    selectable: false,
  };
}

/** A trace of a meter's net (meters are ground: their edges aren't drawn, this is). `index`: the meter's place among the meters. */
export function meterEdgeOf(t: MeterTrace, index: number): Edge {
  return { id: t.id, source: t.a, target: t.b, type: 'meter', zIndex: -1, selectable: false, focusable: false, data: { meter: index, name: nameOf(t.meter) } };
}
