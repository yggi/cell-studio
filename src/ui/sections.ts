/**
 * The sections a selector's taps make (decision 016), as the colours they wear: a tap k of n is `partColour(k, n)`
 * through the white clock (`tapTint`), on its pill's strands, on the tags it steps and, in the tower layout, on what
 * its sounds send into the sky (docs/notes/tower-sky.md).
 */
import type { CompileResult } from '../engine/program';
import type { GraphModel } from '../engine/graph';

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
 * Each node's section (by id): a tag's that it carries; else the nearest tap upstream of it, along what it is played,
 * stepped or fed by — a voice takes the section of the melody that plays it, a mix of what it mixes.
 */
export function nodeSections(program: CompileResult, model: GraphModel): Map<string, Section> {
  const sections = tapSections(program);
  const tags = tagSections(program, model);
  const out = new Map<string, Section>();
  for (const n of model.nodes) {
    const t = n.cell?.tags.find((x) => tags.has(x));
    if (t) out.set(n.id, tags.get(t)!);
  }
  // (from the taps down the edges, a ring at a time: the nearest tap wins)
  let ring = model.edges.flatMap((e) => (e.bulb && sections.has(e.bulb) && !out.has(e.to) ? [[e.to, sections.get(e.bulb)!] as const] : []));
  while (ring.length) {
    for (const [id, s] of ring) if (!out.has(id)) out.set(id, s);
    ring = model.edges.flatMap((e) => (out.has(e.from) && !out.has(e.to) && e.port !== 'about' ? [[e.to, out.get(e.from)!] as const] : []));
  }
  return out;
}
