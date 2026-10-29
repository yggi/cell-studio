import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildGraph } from '../layout/drawn';
import { compilePiece } from '../compile';
import { flowNodeOf } from './flownode';

describe('flowNodeOf', () => {
  it('a product’s junction is a dot: nothing to drag, select, delete, connect or tab to', () => {
    const g = buildGraph(compilePiece(readFileSync('tools/gallery/golden/golden.cells', 'utf8')));
    const junctions = g.nodes.filter((n) => n.kind === 'junction');
    expect(junctions.length).toBeGreaterThan(0);
    for (const j of junctions)
      expect(flowNodeOf(j, { x: 0, y: 0 }, false)).toMatchObject({ type: 'junction', draggable: false, selectable: false, deletable: false, connectable: false, focusable: false });
    // (a cell stays draggable)
    expect(
      flowNodeOf(
        g.nodes.find((n) => n.id === 'cell:lead')!,
        { x: 0, y: 0 },
        false,
      ).draggable,
    ).not.toBe(false);
  });
});
