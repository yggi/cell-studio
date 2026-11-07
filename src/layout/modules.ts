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
import { jacksOf, MOVING, type Jack } from '@yggi/cells/engine/patch';
import { envelopeBox, VOICE_SIZE } from './voice';
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
function withModules(result: CompileResult, model: GraphModel): GraphModel {
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
  // (a wire into the module's inner product, its junction, is the cable it carries: found by its source, as one into
  // the head is; #555 met it, `amp(level=&sweep)`)
  const jackOf = (head: string, from: string, via: string | null): string | undefined => {
    const m = modules.get(head)!;
    if (via?.startsWith('cell:')) {
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

/** An unnamed cell (`&( … )`, resolved as `λ…`): a value written on the line, not a cable. */
const unnamed = (cell: string) => cell.startsWith('λ');

/**
 * A voice's or an instrument's own jacks (decision 069 §2), from its resolved cell: its moving sound parameters, and a
 * voice's `pitch=`, `env=` and `fm=` (and `index=` where it has `fm=`), each with the named cells patched into it and
 * its value with no cable; what it takes from an instrument it plays through is that instrument's (decision 067), not
 * its own. Null for a cell that is neither (a melody, a kit, a petal, a module's head: its module's jacks).
 */
function ownJacks(n: GraphNode): Jack[] | null {
  if (!isCellNode(n) || n.petalOf || moduleOf(n)) return null;
  const c = n.cell;
  const instrument = !!c.mix && !c.sink && MOVING.some((k) => k in c.params || k in c.paramCells);
  if ((n.kind !== 'voice' && !instrument) || c.kit) return null;
  const jack = (port: string, band: Jack['band'], patched: readonly string[], knob: string | null): Jack => ({ port, kind: 'attribute', band, patched, knob });
  const attribute = (k: string, band: Jack['band']): Jack => {
    if (c.inherited?.[k]) return jack(k, band, [], null);
    const pc = c.paramCells[k];
    if (pc)
      return jack(
        k,
        band,
        pc.factors.filter((f) => !unnamed(f)),
        pc.range ? `${pc.range[0]}..${pc.range[1]}` : pc.factors.some(unnamed) ? '&(…)' : null,
      );
    const v = c.params[k];
    return jack(k, band, [], v === undefined ? null : String(v));
  };
  // (env=, pitch=, fm= as one cell: a cable, or a value written in place)
  const one = (port: string, cell: string | null | undefined, band: Jack['band']): Jack =>
    !cell ? jack(port, band, [], null) : unnamed(cell) ? jack(port, band, [], '&(…)') : jack(port, band, [cell], null);
  const jacks = MOVING.map((k) => attribute(k, 'cv'));
  if (instrument) return jacks;
  const pitch = c.paramCells.pitch ? attribute('pitch', 'cv') : one('pitch', c.pitch, 'cv');
  const fm = typeof c.params.fm === 'string' ? c.params.fm : null;
  return [...jacks, pitch, one('env', c.env, 'cv'), one('fm', fm, 'audio'), ...(fm ? [attribute('index', 'cv')] : [])];
}

/**
 * The graph with each module folded into one wheel (`withModules`), and every other voice and instrument carrying its own
 * jacks, each wire into one marked with the jack it fills (decision 069).
 */
export function withJacks(result: CompileResult, model: GraphModel): GraphModel {
  const folded = withModules(result, model);
  const own = new Map(
    folded.nodes.flatMap((n) => {
      const jacks = ownJacks(n);
      return jacks ? [[n.id, jacks] as const] : [];
    }),
  );
  if (!own.size) return folded;
  const nodes = folded.nodes.map((n) => (own.has(n.id) ? Object.assign({}, n, { jacks: own.get(n.id)! }) : n));
  const edges = folded.edges.map((e) => {
    const jacks = own.get(e.to);
    const j = jacks?.find((x) => x.port === e.port && x.patched.includes(e.from.slice('cell:'.length)));
    return j ? ({ ...e, jack: j.port } as GraphEdge) : e;
  });
  return { ...folded, nodes, edges, nets: netsOf(nodes, edges) };
}

/** A node's jacks: its module's, or its own (a voice's, an instrument's); none for anything else. */
export const jacksOfNode = (n: GraphNode): readonly Jack[] | undefined => moduleOf(n)?.jacks ?? (n as { jacks?: readonly Jack[] }).jacks;

/** A node's module, if it is a module's head. */
export const moduleOf = (n: GraphNode): Module | undefined => (n as { module?: Module }).module;
/** The jack a wire fills, if it ends at one. */
export const jackOfEdge = (e: GraphEdge): string | undefined => (e as { jack?: string }).jack;

/**
 * The jacks a wheel shows at rest (decision 069 §3): those holding a cable, a value set on the line, or a knob's default.
 * A jack with no value written is hidden (#555 shows it while a cable is dragged).
 */
export const jacksShown = (jacks: readonly Jack[]): Jack[] => jacks.filter((j) => j.patched.length > 0 || j.knob !== null);

/**
 * The jacks a wheel draws: at rest those in use (`jacksShown`); while a cable of a band is dragged (#555, decision 069 §4),
 * every jack of that band, used or not, so a hidden one can be aimed at (a drop it can't take says why).
 */
export const jacksDrawn = (jacks: readonly Jack[], band: Jack['band'] | null): Jack[] => (band ? jacks.filter((j) => j.band === band) : jacksShown(jacks));

/** How far apart a jack's targets are kept on a phone, at 1:1 (px): a finger (decision 069 §6). */
export const FINGER = 44;
/** The share of a wheel's lower half its jacks spread over: 0.05 π to 0.95 π. */
const SPREAD = 0.9;
/**
 * A voice's jacks go round its envelope band's three straight sides (layout/voice.ts): down its left, along its flat
 * bottom, up its right, in that order, spaced evenly. The way round is (0.88 + 2 × 0.42) of its size: 275 px on a 160 px
 * voice, six jacks a finger apart.
 */
const bandPath = (size: number) => {
  const b = envelopeBox(size);
  const side = b.bottom - b.top;
  return { ...b, side, length: 2 * side + b.width };
};

/**
 * Where a wheel's jacks go: `ring`, on its rim over its lower half (a module's, an instrument's, a cell's wheel); `band`,
 * in a row along a voice's envelope band's flat bottom, its outline the rim (a voice's wheel is a disc with its band
 * hanging under it: layout/voice.ts).
 */
export type JackShape = 'ring' | 'band';

/**
 * A wheel's size (px across) grown to keep `n` jacks a finger apart over its lower half, never below `size` (decision 069 §6):
 * neighbours `FINGER` apart in a straight line (the chord, not the arc), an angle of 0.9 π / (n − 1) between them, so a
 * radius of at least (FINGER / 2) / sin(angle / 2).
 */
export const grownSize = (size: number, n: number, shape: JackShape = 'ring'): number =>
  n <= 1 ? size : shape === 'band' ? Math.max(size, (FINGER * n * size) / bandPath(size).length) : Math.max(size, FINGER / Math.sin((SPREAD * Math.PI) / (n - 1) / 2));

/**
 * Where the `i`-th of `n` jacks sits on a wheel `size` across, from its centre (px): over its lower half, left to right
 * in the signature's order, on the rim; one alone at the bottom.
 */
export function jackAt(i: number, n: number, size: number, shape: JackShape = 'ring'): { x: number; y: number } {
  if (shape === 'band') {
    // (evenly round the band's way, each in the middle of its share: one alone at the middle of its bottom)
    const p = bandPath(size);
    const t = ((i + 0.5) * p.length) / n;
    if (t < p.side) return { x: -p.width / 2, y: p.top + t };
    if (t < p.side + p.width) return { x: -p.width / 2 + (t - p.side), y: p.bottom };
    return { x: p.width / 2, y: p.bottom - (t - p.side - p.width) };
  }
  const from = (Math.PI * (1 - SPREAD)) / 2;
  const a = n === 1 ? Math.PI / 2 : from + (SPREAD * Math.PI * i) / (n - 1);
  const r = size / 2;
  return { x: -Math.cos(a) * r, y: Math.sin(a) * r };
}

/** A jack's handle id on its wheel (`jack-cutoff`), and the jack's port it names. */
export const jackHandle = (port: string): string => `jack-${port}`;
export const portOfHandle = (handle: string): string | null => (handle.startsWith('jack-') ? handle.slice('jack-'.length) : null);

/**
 * The size a cell's wheel is drawn at (px across), grown to its jacks shown (decision 069 §6): what the flow node draws,
 * the layout's room for it and how far under it a junction hangs all read this. `base`: its size with no jacks.
 */
export function drawnSize(n: GraphNode, base: number): number {
  const jacks = jacksOfNode(n);
  return jacks ? grownSize(base, jacksShown(jacks).length, n.kind === 'voice' ? 'band' : 'ring') : base;
}

/** How far below an instrument module's rim its name reaches (px): its jacks' dots, the gap and its name (ui/ModuleNode.svelte). */
export const MODULE_NAME = 7 + 14 + 18;

/** A voice's drawn size: its wheel (VOICE_SIZE, size= scaling it), grown to its jacks. */
export const voiceSize = (n: GraphNode): number => drawnSize(n, VOICE_SIZE * (isCellNode(n) ? n.cell.size : 1));
