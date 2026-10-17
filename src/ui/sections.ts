/**
 * The sections a selector's taps make (decision 016), as the colours they wear: a tap k of n is `partColour(k, n)`
 * through the white clock (`tapTint`), on its pill's strands, on the tags it steps, on the accents of the wheels in its
 * section (their ticks, their hand, their name's border) and, on the tower layout's strip, on its table's values.
 */
import type { CompileResult } from '@yggi/cells/engine/program';
import type { GraphModel } from '@yggi/cells/engine/graph';
import { tapTintRgb } from './theme';

export interface Section {
  readonly k: number;
  readonly n: number;
}

/** Each tap's section: its place among its table's taps. */
function tapSections(program: CompileResult): Map<string, Section> {
  const out = new Map<string, Section>();
  for (const table of new Set(program.taps?.values() ?? [])) {
    const taps = [...(program.taps ?? [])].flatMap(([tap, t]) => (t === table ? [tap] : []));
    taps.forEach((tap, k) => out.set(tap, { k, n: taps.length }));
  }
  return out;
}

/** A tag's section: the tap stepping most of its cells. */
export function tagSections(program: CompileResult, model: GraphModel): Map<string, Section> {
  const sections = tapSections(program);
  const votes = new Map<string, Map<string, number>>();
  for (const e of model.edges) {
    if (!e.bulb || !sections.has(e.bulb)) continue;
    for (const tag of model.nodes.find((m) => m.id === e.to)?.cell?.tags ?? []) {
      const v = votes.get(tag) ?? votes.set(tag, new Map()).get(tag)!;
      v.set(e.bulb, (v.get(e.bulb) ?? 0) + 1);
    }
  }
  return new Map([...votes].map(([tag, v]) => [tag, sections.get([...v].sort((a, b) => b[1] - a[1])[0]![0])!]));
}

/**
 * Each node's section (by id): the nearest tap upstream of it, along what it is played, stepped or fed by — a voice
 * takes the section of the melody that plays it, a mix of what it mixes; else, where no tap reaches, its tag's.
 */
export function nodeSections(program: CompileResult, model: GraphModel): Map<string, Section> {
  const sections = tapSections(program);
  const tags = tagSections(program, model);
  const out = new Map<string, Section>();
  // (from the taps down the edges, a ring at a time: the nearest tap wins)
  let ring = model.edges.flatMap((e) => (e.bulb && sections.has(e.bulb) ? [[e.to, sections.get(e.bulb)!] as const] : []));
  while (ring.length) {
    for (const [id, s] of ring) if (!out.has(id)) out.set(id, s);
    ring = model.edges.flatMap((e) => (out.has(e.from) && !out.has(e.to) && e.port !== 'about' ? [[e.to, out.get(e.from)!] as const] : []));
  }
  for (const n of model.nodes) {
    const t = n.cell?.tags.find((x) => tags.has(x));
    if (t && !out.has(n.id)) out.set(n.id, tags.get(t)!);
  }
  return out;
}

/**
 * A node's section colour (rgb), steady, its name's on the tower strip: its section's; a mix's, the mean of what it
 * mixes (each input's own, so a mix of two sections is between them); a kit's, of what plays it, and a drum's on it
 * its kit's. null: no section, or the piece has only one.
 */
export function sectionRgb(model: GraphModel, sections: ReadonlyMap<string, Section>, id: string, seen = new Set<string>()): readonly number[] | null {
  if (seen.has(id)) return null;
  seen.add(id);
  const node = model.nodes.find((n) => n.id === id);
  // (a drum drawn as a piece of its kit has no node: its kit's)
  if (!node) {
    const name = id.slice('cell:'.length);
    const kit = model.nodes.find((n) => n.cell?.kit && n.cell.units.some((u) => u.atom.kind === 'ref' && u.atom.name === name));
    return kit ? sectionRgb(model, sections, kit.id, seen) : null;
  }
  if (node.cell?.mix || node.cell?.kit) {
    const kit = !node.cell.mix;
    const ins = model.edges
      .flatMap((e) => (kit ? (e.from === id && e.port === 'over' ? [e.to] : []) : e.to === id && e.port === 'mix' ? [e.from] : []))
      .map((from) => sectionRgb(model, sections, from, seen))
      .filter((c) => c !== null);
    if (ins.length) return [0, 1, 2].map((i) => Math.round(ins.reduce((a, c) => a + c[i]!, 0) / ins.length));
  }
  const s = sections.get(id);
  return s && s.n > 1 ? tapTintRgb(s.k, s.n) : null;
}
