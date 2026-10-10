import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { tapped } from './taps';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';

describe('sections as taps of the meter bus (a probe)', () => {
  it('a table of clock taps: the bus in once, each tap a meter riding the table, its own net out', () => {
    const { model, riders } = tapped(buildGraph(compileSource(readFileSync('tools/probe/pieces/arrangement-input.cells', 'utf8'))));
    expect([...riders.keys()].sort()).toEqual(['cell:drumBar', 'cell:keysBar', 'cell:tuneBar']);
    expect([...riders.values()].every((r) => r.host === 'cell:parts')).toBe(true);
    // the meter into the taps: one edge, into the table
    expect(model.edges.filter((e) => e.from === 'cell:bar' && e.port === 'step' && riders.has(e.to))).toEqual([]);
    expect(model.edges.filter((e) => e.from === 'cell:bar' && e.to === 'cell:parts').length).toBe(1);
    // the taps aren't spliced into the table any more (they are its sub-wheels), and each is a meter with its net
    expect(model.edges.some((e) => riders.has(e.from) && e.to === 'cell:parts')).toBe(false);
    const drum = model.nets.find((n) => n.port === 'step' && n.taps.some((id) => model.edges.find((e) => e.id === id)?.from === 'cell:drumBar'));
    expect(drum?.taps.length).toBe(2); // &kick and &click
  });

  it('a piece without such a table is left as it is', () => {
    const m = buildGraph(compileSource(PRESETS.pop.source));
    expect(tapped(m).model).toBe(m);
  });
});
