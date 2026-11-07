import { describe, expect, it, vi } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { PRESETS } from '@yggi/cells/engine/presets';

// (every build of the graph starts from cells' writtenGraph: counted)
const built = vi.hoisted(() => ({ n: 0 }));
vi.mock('@yggi/cells/engine/graph', async (original) => {
  const m = await original<typeof import('@yggi/cells/engine/graph')>();
  return {
    ...m,
    writtenGraph: (...a: Parameters<typeof m.writtenGraph>) => {
      built.n++;
      return m.writtenGraph(...a);
    },
  };
});

const { buildGraph, bulbHosts, usesOf } = await import('./drawn');
const { cellView } = await import('./cellview');

describe('the graph as drawn is built once per compile (#229)', () => {
  it('the piece, its wheels’ bulbs and its uses read one build', () => {
    // (Pop: bulbs on its braids, cells from fragments)
    const r = compilePiece(PRESETS.pop.source);
    built.n = 0;
    const model = buildGraph(r);
    expect(model.bulbs.size).toBeGreaterThan(0);
    expect(usesOf(r).length).toBeGreaterThan(0);
    expect(bulbHosts(r)).toBe(model.bulbs);
    for (const name of r.cells.keys()) cellView(r, name, codeShifts(r), false);
    expect(buildGraph(r)).toBe(model);
    expect(built.n).toBe(1);
  });

  it('a graph with options is its own drawing, from the same written graph, and leaves the drawn one as it is', () => {
    const r = compilePiece(PRESETS.pop.source);
    const model = buildGraph(r);
    built.n = 0;
    const parts = buildGraph(r, { bulbs: false });
    expect(parts).not.toBe(model);
    expect(parts.bulbs.size).toBe(0);
    expect(buildGraph(r, { uses: false })).not.toBe(model);
    expect(buildGraph(r)).toBe(model);
    expect(bulbHosts(r)).toBe(model.bulbs);
    expect(built.n).toBe(0);
  });

  it('a new compile is a new build', () => {
    const a = compilePiece(PRESETS.pop.source);
    const b = compilePiece(PRESETS.pop.source);
    built.n = 0;
    expect(buildGraph(a)).not.toBe(buildGraph(b));
    expect(built.n).toBe(2);
  });
});
