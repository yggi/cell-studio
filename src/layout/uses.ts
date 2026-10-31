/**
 * What each `use` line gives the graph (cells decision 054, its rung 5: #480): a group of the drawn nodes whose cells
 * the used fragment writes, read only. A node is in a use's group when every cell it draws is one that use gave: a
 * cell's own node, a product's junction by its mix; and the kit's wheel when most of its pieces are (a snare the piece
 * writes itself is a piece of its own on the kit, which stays in the group). What the piece overrides is its own, and in
 * no group.
 *
 * The graph draws a group as a cluster (`withUses`): its cells carry the tag `use "id"`, so the layout holds them
 * together and the graph washes them and names them by their line, as it does a `tags=` cluster. A given cell nothing
 * reads (a kit's voice the beat doesn't play: silent, the built-in card doesn't hear a used fragment) is folded into the
 * group's name, not drawn, while the group has a cell that is read; a group of nothing but such cells is drawn whole.
 */
import { VOICE_KIT } from '@yggi/cells/engine/compiler/declare';
import { cellId } from '@yggi/cells/engine/ids';
import { isCellNode, type GraphModel } from '@yggi/cells/engine/graph';
import type { CompileResult } from '@yggi/cells/engine/program';
import { kitOf } from './kit';

export interface UseGroup {
  /** The fragment's id, as its line writes it. */
  readonly id: string;
  /** Its `use` line (1-based). */
  readonly line: number;
  /** The names it gave (bare: `bd`), less those the piece overrides. */
  readonly names: readonly string[];
  /** The names the piece writes itself instead (bare). */
  readonly overrode: readonly string[];
  /** Its drawn nodes, in the graph's order. */
  readonly nodes: readonly string[];
  /** The cells it gave that nothing reads (no edge reaches their node), folded into its name (bare names). */
  readonly folded: readonly string[];
}

/** How wide a cluster's plate (its name under its one cell) runs before it wraps (px). */
export const PLATE_WIDTH = 420;

/**
 * How tall a cluster's plate is (px): its name, then the cells folded into it, filling rows of `PLATE_WIDTH` (ui/Graph.svelte
 * draws the name at 26 px of the code's type and each folded cell a chip at 20 px: about .6 em a letter).
 */
export function plateHeight(name: string, folded: readonly string[] = []): number {
  const [ROW, NAME, CHIP, GAP] = [40, 15.6, 12, 8];
  let rows = 1;
  let x = NAME * name.length + 28;
  for (const f of folded) {
    const w = CHIP * (f.length + 1) + 24;
    if (x + GAP + w > PLATE_WIDTH) ((rows += 1), (x = w));
    else x += GAP + w;
  }
  return rows * ROW;
}

/** A group's tag on its cells: its line, as written. */
export const useTag = (id: string): string => `use "${id}"`;
/**
 * How a group's plate names its line (#505): as cells writes it since decision 065, `from` and the fragment's id,
 * bare where it is a word (`from gm_kit`), quoted where it is not (`from "4/4 swung on 8n"`).
 */
export const fromLabel = (id: string): string => (/^[A-Za-z_][\w]*$/.test(id) ? `from ${id}` : `from "${id}"`);
/** The use a tag names, or null: a `tags=` tag (a tag can't hold a double quote). */
export const tagUse = (tag: string): string | null => /^use "(.*)"$/.exec(tag)?.[1] ?? null;

const bare = (name: string) => name.replace(/^&/, '');

/** The names a node draws: a cell's own, a junction's mix, the kit's pieces. */
function drawsOf(result: CompileResult, node: GraphModel['nodes'][number]): readonly string[] {
  if (node.kind === 'junction') return [node.mix];
  if (node.cell.name === VOICE_KIT) return kitOf(result, VOICE_KIT) ?? [];
  return [node.cell.name];
}

/** Each `use` line's group in a graph, in the order written; none for a piece without one (or a use that gave nothing). */
export function useGroups(result: CompileResult, model: GraphModel): UseGroup[] {
  const touched = new Set(model.edges.flatMap((e) => [e.source, e.target]));
  return (result.uses ?? []).flatMap((u) => {
    const names = u.gave.map(bare);
    if (!names.length) return [];
    const gave = new Set(names);
    const ids = model.nodes
      .filter((n) => {
        const draws = drawsOf(result, n);
        const given = draws.filter((d) => gave.has(d)).length;
        return draws.length > 0 && (n.id === cellId(VOICE_KIT) ? given * 2 > draws.length : given === draws.length);
      })
      .map((n) => n.id);
    const idle = ids.filter((id) => !touched.has(id));
    // (folded while something of it is read: a use nothing reads is drawn whole)
    const fold = idle.length < ids.length ? new Set(idle) : new Set<string>();
    const nodes = ids.filter((id) => !fold.has(id));
    const folded = model.nodes.flatMap((n) => (fold.has(n.id) && isCellNode(n) ? [n.cell.name] : []));
    return [{ id: u.id, line: u.span.line, names, overrode: u.overrode.map(bare), nodes, folded }];
  });
}

/**
 * A graph with its uses drawn: each group's cells tagged with its line (first, before their own `tags=`: the cluster they
 * are laid out in), what it folds left out; and the groups.
 */
export function withUses(result: CompileResult, model: GraphModel): { model: GraphModel; groups: UseGroup[] } {
  const groups = useGroups(result, model);
  if (!groups.length) return { model, groups };
  const groupOf = new Map(groups.flatMap((g) => g.nodes.map((id) => [id, g] as const)));
  const folded = new Set(groups.flatMap((g) => g.folded.map(cellId)));
  const nodes = model.nodes.flatMap((n) => {
    if (folded.has(n.id)) return [];
    const g = groupOf.get(n.id);
    if (!g || !isCellNode(n)) return [n];
    // (a group of one node: its plate's height, the room the layout grows that node by — layout/start.ts)
    const plate = g.nodes.length === 1 ? { plate: plateHeight(useTag(g.id), g.folded) } : {};
    return [{ ...n, ...plate, cell: { ...n.cell, tags: [useTag(g.id), ...n.cell.tags] } }];
  });
  return { model: { ...model, nodes }, groups };
}

/** The group a cell (by name) is given by, or undefined: the piece's own. */
export const givenBy = (groups: readonly UseGroup[], name: string): UseGroup | undefined => groups.find((g) => g.names.includes(name));
