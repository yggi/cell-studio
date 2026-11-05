/**
 * A module drawn as one wheel ([decision 069](../../docs/decisions/069-module-wheels.md), #560): a cell a `from` line
 * takes from a module (a fragment of the seed's `module` facet, yggi/cells decision 067 §3: `osc`, `lowpass`,
 * `highpass`, `amp`, `lfo`, `sh`). Its private cells (what its use gave that the piece didn't write: `&vcf_in`,
 * `&vca_eg`, `&vca_level`, `&saw_pitch`), and the product inside an instrument module (`amp`'s `[&eg * &level * &in]`),
 * have no node: they are folded into the head's wheel. A wire into a private cell (the input's mix) is drawn into the
 * head, and every wire into the head ends at the jack it fills (`GraphEdge.jack`). A wire out of a private cell (a knob
 * the module holds) has no wire: the jack draws its knob.
 *
 * The jacks are cells' own (`jacksOf`, `@yggi/cells/engine/patch`), read off the module's `from` line as its use
 * records it (`Used.args`). Pure: no DOM.
 */
import { cellId, edgeId } from '@yggi/cells/engine/ids';
import { isCellNode, netsOf, type GraphEdge, type GraphModel, type GraphNode } from '@yggi/cells/engine/graph';
import type { CompileResult, Used } from '@yggi/cells/engine/program';
import { jacksOf, type Jack } from '@yggi/cells/engine/patch';
import { LIBRARY, resolveSeed } from '@yggi/cells/repository/library';
import { signatureOf } from '@yggi/cells/engine/use';

/** A module's head: what it is and its jacks, in its signature's order (its input last). */
export interface Module {
  /** The fragment's id (`lowpass`). */
  readonly id: string;
  readonly jacks: readonly Jack[];
  /** The private cells folded into it (bare names), and the product nodes inside it. */
  readonly folded: readonly string[];
}

/** The seed's modules, by id: the fragments of the facet `module`. */
const MODULES = new Set(LIBRARY.filter((f) => f.association.some((wp) => wp.facet === 'module')).map((f) => f.id));

const bare = (n: string) => n.replace(/^&/, '');

/** A module's `from` line, written again from its use (decision 065: the head, the id, its named arguments, its main one). */
function lineOf(u: Used, head: string, main: string | null): string {
  const named = Object.entries(u.args ?? {}).filter(([k]) => k !== main);
  const list = named.length ? `(${named.map(([k, v]) => `${k}=${v}`).join(', ')})` : '';
  const given = main ? u.args?.[main] : undefined;
  return `&${head} from ${u.id}${list}${given ? ` ${given}` : ''}`;
}

/** The modules that are instruments (a mix with its parameters): drawn as a wheel of their own, their face the module's (ui/ModuleNode.svelte). */
export const INSTRUMENT_MODULES: ReadonlySet<string> = new Set(['lowpass', 'highpass', 'amp']);

/** A use of a module, as one head: what decision 069 draws as one wheel (a meter's or a mode's template stays a cell). */
export const isModuleUse = (u: Used): boolean => MODULES.has(u.id) && u.names?.length === 1;

/** The modules a program takes, by head (bare name). */
function modulesOf(result: CompileResult): ReadonlyMap<string, Module> {
  const out = new Map<string, Module>();
  for (const u of result.uses ?? []) {
    if (!isModuleUse(u)) continue;
    const head = bare(u.names![0]!);
    const text = resolveSeed(u.id);
    if (!text) continue;
    // (its main parameter, from its signature: `args` holds it under its name, and the rebuilt line writes it last)
    const main = signatureOf(text)?.main?.slice(1) ?? null;
    const jacks = jacksOf(lineOf(u, head, main), head, resolveSeed);
    out.set(head, { id: u.id, jacks, folded: u.gave.map(bare).filter((n) => n !== head) });
  }
  return out;
}

/**
 * The graph with each module drawn as one wheel (see the module's comment): its private cells and inner products gone,
 * the wires into them drawn into the head, each wire into the head marked with the jack it fills, the head carrying
 * its `Module`.
 */
export function withModules(result: CompileResult, model: GraphModel): GraphModel {
  const modules = modulesOf(result);
  if (!modules.size) return model;
  // each private cell's node, to its head's; and a product inside an instrument module (a junction of its mix)
  const into = new Map<string, string>();
  for (const [head, m] of modules) {
    for (const p of m.folded) into.set(cellId(p), cellId(head));
    for (const n of model.nodes) if (n.kind === 'junction' && n.mix === head) into.set(n.id, cellId(head));
  }
  const headOf = new Map([...modules.keys()].map((h) => [cellId(h), h]));
  const nameOf = (id: string) => id.slice('cell:'.length);
  // which jack a wire into a head fills: the one whose cable is the wire's source; a wire from a private cell, the jack
  // that private cell is (the input's mix, `&vcf_in`: the input)
  const jackOf = (head: string, from: string, via: string | null): string | undefined => {
    const m = modules.get(head)!;
    if (via) {
      const param = nameOf(via).slice(head.length + 1);
      return m.jacks.find((j) => j.port === param)?.port;
    }
    return m.jacks.find((j) => j.patched.includes(nameOf(from)))?.port;
  };
  const alias = new Map(model.alias);
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const e of model.edges) {
    const src = e.from;
    const dst = e.to;
    // (inside a module: a knob it holds, its product's wires, the input mix into the head)
    if (into.has(src)) {
      alias.set(e.id, undefined);
      continue;
    }
    const target = into.get(dst) ?? dst;
    const head = headOf.get(target);
    if (!head) {
      edges.push(e);
      continue;
    }
    const jack = jackOf(head, src, into.has(dst) ? dst : null);
    const moved = target !== dst;
    // (along the flow: from what feeds the jack to the head; `source`/`target` keep the written direction)
    const ends = moved ? (e.source === dst ? { source: target } : { target }) : {};
    const id = moved ? edgeId(ends.source ?? e.source, ends.target ?? e.target) : e.id;
    if (seen.has(id)) {
      alias.set(e.id, id);
      continue;
    }
    seen.add(id);
    if (moved) alias.set(e.id, id);
    edges.push({ ...e, id, to: target, ...ends, ...(jack ? { jack } : {}) } as GraphEdge);
  }
  const nodes = model.nodes.flatMap((n): GraphNode[] => {
    if (into.has(n.id)) return [];
    const head = headOf.get(n.id);
    return head && isCellNode(n) ? [Object.assign({}, n, { module: modules.get(head)! })] : [n];
  });
  return { ...model, nodes, edges, nets: netsOf(nodes, edges), alias };
}

/** A node's module, if it is a module's head. */
export const moduleOf = (n: GraphNode): Module | undefined => (n as { module?: Module }).module;
/** The jack a wire fills, if it ends at one. */
export const jackOfEdge = (e: GraphEdge): string | undefined => (e as { jack?: string }).jack;

/**
 * The jacks a wheel shows at rest (decision 069 §3): those holding a cable, a value set on the line, or a knob's default.
 * A jack with no value written is hidden (#555 shows it while a cable is dragged).
 */
export const jacksShown = (jacks: readonly Jack[]): Jack[] => jacks.filter((j) => j.patched.length > 0 || j.knob !== null);

/** How far apart a jack's targets are kept on a phone, at 1:1 (px): a finger (decision 069 §6). */
export const FINGER = 44;
/** The share of a wheel's lower half its jacks spread over: 0.05 π to 0.95 π. */
const SPREAD = 0.9;

/**
 * A wheel's size (px across) grown to keep `n` jacks a finger apart over its lower half, never below `size` (decision 069 §6):
 * neighbours `FINGER` apart in a straight line (the chord, not the arc), an angle of 0.9 π / (n − 1) between them, so a
 * radius of at least (FINGER / 2) / sin(angle / 2).
 */
export const grownSize = (size: number, n: number): number => (n > 1 ? Math.max(size, FINGER / Math.sin((SPREAD * Math.PI) / (n - 1) / 2)) : size);

/**
 * Where the `i`-th of `n` jacks sits on a wheel `size` across, from its centre (px): over its lower half, left to right
 * in the signature's order, on the rim; one alone at the bottom.
 */
export function jackAt(i: number, n: number, size: number): { x: number; y: number } {
  const from = (Math.PI * (1 - SPREAD)) / 2;
  const a = n === 1 ? Math.PI / 2 : from + (SPREAD * Math.PI * i) / (n - 1);
  const r = size / 2;
  return { x: -Math.cos(a) * r, y: Math.sin(a) * r };
}

/** A jack's handle id on its wheel (`jack-cutoff`), and the jack's port it names. */
export const jackHandle = (port: string): string => `jack-${port}`;
export const portOfHandle = (handle: string): string | null => (handle.startsWith('jack-') ? handle.slice('jack-'.length) : null);
