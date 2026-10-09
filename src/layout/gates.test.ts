import { describe, expect, it } from 'vitest';
import { gated } from './gates';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';

describe('the arrangement as gates (a probe)', () => {
  it("Pop: each part's sound straight out, gated from the selector at its junctions; the table of parts gone", () => {
    const before = buildGraph(compileSource(PRESETS.pop.source));
    const m = gated(before);
    expect(m.nodes.some((n) => n.id === 'cell:parts')).toBe(false);
    expect(m.edges.some((e) => e.to === 'cell:song' && e.port === 'over')).toBe(false);
    for (const part of ['keysPart', 'hookPart', 'bassPart', 'beatPart', 'hatsPart', 'endPart'])
      expect(
        m.edges.some((e) => e.from === `cell:${part}` && e.to === 'cell:out' && e.band === 'audio'),
        part,
      ).toBe(true);
    const gates = m.edges.filter((e) => e.port === 'gate');
    expect(gates.length).toBe(before.nodes.filter((n) => n.kind === 'junction' && n.mix.endsWith('Part')).length);
    expect(gates.every((e) => e.from === 'cell:song' && e.to.startsWith('junction:'))).toBe(true);
    // a meter of the form: its gates are its net, not drawn one by one
    expect(m.nets.some((n) => n.port === 'step' && gates.every((g) => n.taps.includes(g.id)))).toBe(true);
  });

  it('a piece with no selector is left as it is', () => {
    const m = buildGraph(compileSource(PRESETS.twinkle.source));
    expect(gated(m)).toBe(m);
  });
});
