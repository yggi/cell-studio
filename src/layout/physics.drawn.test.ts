import { describe, expect, it } from 'vitest';
import { buildGraph } from './drawn';
import { edgeLabel } from '@yggi/cells/engine/transform';
import { compilePiece } from '../compile';

describe('Tape Machine and Automaton', () => {
  it('the automaton: its bells exact, its drummer behind them at first, its woodblock behind for good', async () => {
    const { EXAMPLES } = await import('@yggi/cells/engine/examples');
    const r = compilePiece((EXAMPLES as Record<string, { source: string }>).automaton.source);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const g = buildGraph(r);
    expect(edgeLabel(g.edges.find((e) => e.port === 'step' && e.source === 'cell:wood')!)).toMatch(/belt/);
  });
});
