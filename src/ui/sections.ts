/**
 * The sections a selector's taps make (decision 016), as the colours they wear: a tap k of n is `partColour(k, n)`
 * through the white clock (`tapTint`), on its pill's strands, on the tags it steps.
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
