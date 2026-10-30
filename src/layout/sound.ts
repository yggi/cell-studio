/**
 * Sound in the graph, one set of rules for the tower layout (docs/notes/tower-sky.md, *One rule for sound*), read from
 * the language (cells decision 064):
 *
 * - **What goes into a card**: every sound a card hears, written or not, a sound card's or a MIDI card's (cells' `outs`).
 *   `&out` (a card written) is the explicit form, its edges as written; without one, the built-in card (decision 028)
 *   hears every sound nothing else reads. The drawn graph leaves the built-in card out (an implicit cell, never drawn),
 *   so `withCard` adds its node and its edges as cells gives them (`writtenGraph(…, { card: true })`), under the ids the
 *   engine's live state gives them: every view of a card (a socket each, its spire, the strip's marker, lane and column)
 *   then sees both cards alike.
 * - **What makes, gates or mixes sound** (`soundRole`, cells' from the mix algebra's sorts): the voices' strata,
 *   between the structure and the audible — a maker (a voice, a kit, a tape, a resonator, a braid at an audio rate), a
 *   gate (what plays voices: a gate, a groove read through a kit) a row under the makers, a mixer a row over them.
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import { writtenGraph, type GraphModel, type GraphNode, type WrittenGraph } from '@yggi/cells/engine/graph';
import { soundRole as roleOf } from '@yggi/cells/engine/outs';
import { cellId } from '@yggi/cells/engine/ids';

/** The written graph with the built-in card in it, once a program. */
const withBuiltin = new WeakMap<CompileResult, WrittenGraph>();

/**
 * The model with the sound card in it: as it is when a card is written; with the built-in card's node and its edges
 * added when the piece writes none (an edge from a sound drawn as no node of its own, a petal, is left out).
 */
export function withCard(program: CompileResult, model: GraphModel): GraphModel {
  const name = program.builtinCard;
  const to = name ? cellId(name) : '';
  if (!name || model.nodes.some((n) => n.id === to)) return model;
  let full = withBuiltin.get(program);
  if (!full) withBuiltin.set(program, (full = writtenGraph(program, { card: true })));
  const drawn = new Map(model.nodes.map((n) => [n.id, n] as const));
  const edges = full.edges.filter((e) => {
    const n = e.to === to && e.port !== 'about' ? drawn.get(e.from) : undefined;
    return !!n && !(n.kind === 'cell' && n.petalOf);
  });
  const card = full.nodes.find((n) => n.id === to);
  if (!edges.length || !card) return model;
  const depth = Math.max(0, ...model.nodes.map((n) => n.depth)) + 1;
  return { ...model, nodes: [...model.nodes, { ...card, depth }], edges: [...model.edges, ...edges] };
}

/** A node's part in making sound: it makes it, gates it (plays a maker), or mixes it; null for the structure. */
export type SoundRole = 'maker' | 'gate' | 'mixer';

/**
 * What a node does with sound (cells' `soundRole`). `mixers: false` counts a mix as a maker (the probes' comparison). A
 * card is none here: it is everywhere, its sockets in the audible.
 */
export function soundRole(program: CompileResult, n: GraphNode, { mixers = true }: { readonly mixers?: boolean } = {}): SoundRole | null {
  if (n.kind === 'junction') return null;
  const role = roleOf(program, n.cell);
  if (role === 'card') return null;
  if (role === 'mixer' && !mixers) return 'maker';
  return role ?? (n.kind === 'voice' ? 'maker' : null);
}
