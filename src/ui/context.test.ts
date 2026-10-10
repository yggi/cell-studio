import { describe, expect, it } from 'vitest';
import { nodeState, type GraphContext } from './context';

// (only what nodeState reads: the routing, and what sounds at the transport's time)
const ctx = (played?: ReadonlySet<string>) =>
  ({
    muted: new Set(['cell:off']),
    routed: { nodes: new Set(['cell:lead', 'cell:tune', 'cell:off']), edges: new Set() },
    lit: { nodes: new Set(['cell:tune']), edges: new Set() },
    played,
  }) as unknown as GraphContext;

describe('nodeState: a cell sounding from the keys is live, as a strike is (#207)', () => {
  it('a routed cell the keys play is live where the plan has it idle', () => {
    expect(nodeState(ctx(), 'cell:lead')).toBe('idle');
    expect(nodeState(ctx(new Set(['cell:lead'])), 'cell:lead')).toBe('live');
  });
  it('the keys never light a cell switched off, nor one that sounds nowhere', () => {
    const keys = new Set(['cell:off', 'cell:stray']);
    expect(nodeState(ctx(keys), 'cell:off')).toBe('off');
    expect(nodeState(ctx(keys), 'cell:stray')).toBe('unrouted');
  });
});
