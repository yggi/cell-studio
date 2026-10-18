/**
 * Sound in the graph, one set of rules for the tower layout (docs/notes/tower-sky.md, *One rule for sound*):
 *
 * - **What goes into the sound card**: every sound the card hears, written or not. `&out` (a card written) is the
 *   explicit form, its edges as written; without one, the built-in card (decision 028, in @yggi/cells) hears every
 *   sound nothing else reads, an uncapped output. The written graph leaves the built-in card out (an implicit cell, never
 *   drawn), so `withCard` adds its node and an edge from each sound it hears, with the ids the engine's live state gives
 *   them (`edgeId`): every view of the card (a socket each, its spire, the strip's marker, lane and column) then sees
 *   both cards alike.
 * - **What makes, gates or mixes sound** (`soundRole`): the voices' strata, between the structure and the audible — a
 *   maker (a voice, a kit, a tape, a resonator, a braid at an audio rate), a gate (what plays voices: a gate, a groove
 *   read through a kit) a row under the makers, a mixer a row over them.
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import type { GraphEdge, GraphModel, GraphNode } from '@yggi/cells/engine/graph';
import { cellId, edgeId } from '@yggi/cells/engine/ids';

type Cell = NonNullable<Extract<GraphNode, { kind: 'cell' }>['cell']>;

/** The cells a mix's expression names (a ref, a sum's terms): the built-in card's are refs. */
type Expr = { readonly k: string; readonly ref?: { readonly name: string }; readonly items?: readonly { readonly e: Expr }[] };
const refsOf = (e: Expr): string[] => (e.k === 'ref' && e.ref ? [e.ref.name] : e.k === 'sum' ? (e.items ?? []).flatMap((x) => refsOf(x.e)) : []);

/** The sounds a card hears, by name: the terms of its mix. */
function heardBy(card: Cell): string[] {
  return card.units.flatMap((u) => (u.atom.kind === 'mix' ? (u.atom.exprs as readonly Expr[]).flatMap(refsOf) : u.atom.kind === 'ref' ? [u.atom.name] : []));
}

/**
 * The model with the sound card in it: as it is when the card is written; with the built-in card's node and an edge
 * from each sound it hears added when the piece writes none (a sound drawn as no node of its own, a petal, is left out).
 */
export function withCard(program: CompileResult, model: GraphModel): GraphModel {
  const name = program.builtinCard;
  const card = name ? program.cells.get(name) : undefined;
  if (!name || !card || model.nodes.some((n) => n.id === cellId(name))) return model;
  const to = cellId(name);
  const drawn = new Map(model.nodes.map((n) => [n.id, n] as const));
  const edges: GraphEdge[] = heardBy(card).flatMap((sound) => {
    const from = cellId(sound);
    const n = drawn.get(from);
    if (!n || (n.kind === 'cell' && n.petalOf)) return [];
    const id = edgeId(from, to);
    return [{ id, source: from, target: to, from, to, count: 1, transforms: [[]], sound, routes: [[id]], port: 'mix', band: 'audio', pointer: false, width: 1 }];
  });
  if (!edges.length) return model;
  const depth = Math.max(0, ...model.nodes.map((n) => n.depth)) + 1;
  const node: GraphNode = { id: to, kind: 'cell', depth, cell: card, isMeter: false };
  return { ...model, nodes: [...model.nodes, node], edges: [...model.edges, ...edges] };
}

/** A node's part in making sound: it makes it, gates it (plays a maker), or mixes it; null for the structure. */
export type SoundRole = 'maker' | 'gate' | 'mixer';

/**
 * What a node does with sound (`stepDecades`: where its step sits on the tower, decades: a braid stepped at 20 Hz or
 * faster is a wave, sound). `mixers: false` counts a mix as a maker (the probes' comparison). A card is none: it is
 * everywhere, its sockets in the audible.
 */
export function soundRole(program: CompileResult, n: GraphNode, stepDecades?: number, { mixers = true }: { readonly mixers?: boolean } = {}): SoundRole | null {
  if (n.kind === 'junction') return null;
  const c = n.cell;
  if (c.note || c.sink) return null;
  // (a gate, and what plays a kit, a groove)
  if (c.gate || (c.step && c.over && program.cells.get(c.over)?.kit)) return 'gate';
  // (a mix: over what it mixes)
  if (mixers && c.mix && !c.kit && !c.step && n.kind !== 'voice') return 'mixer';
  // (what sounds of itself: a voice, a mix, a kit, a tape, a resonator)
  const sounds = c.voice || !!c.mix || c.kit || typeof c.params.write === 'string' || typeof c.params.body === 'string' || typeof c.params.play === 'string';
  if (n.kind === 'voice' || (sounds && !c.step)) return 'maker';
  // (a braid stepped at an audio rate: a wave)
  if (stepDecades !== undefined && Number.isFinite(stepDecades) && stepDecades >= Math.log10(20)) return 'maker';
  return null;
}
