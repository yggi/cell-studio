import { describe, expect, it } from 'vitest';
import { gated } from './gates';
import { ForceLayout } from './physics';
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

describe('junctions as nodes (a probe)', () => {
  it('each junction rides its voice on a short rod, in the arc above it', () => {
    const model = gated(buildGraph(compileSource(PRESETS.pop.source)));
    const l = new ForceLayout(undefined, { live: false, junctionBodies: 1 });
    l.setGraph(model);
    l.tick(300);
    const junctions = model.nodes.filter((n) => n.kind === 'junction');
    expect(junctions.length).toBeGreaterThan(0);
    for (const j of junctions) {
      const p = l.position(j.id)!;
      const v = l.position(`cell:${j.voice}`)!;
      const angle = (Math.atan2(p.y - v.y, p.x - v.x) * 180) / Math.PI; // (−90: straight up)
      expect(Math.abs(angle + 90), j.id).toBeLessThanOrEqual(60.5);
      expect(Math.hypot(p.x - v.x, p.y - v.y), j.id).toBeLessThan(200);
    }
    l.destroy();
  });
});
