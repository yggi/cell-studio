import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from '../layout/drawn';
import { ForceLayout } from '../layout/physics';
import { TOWER_LAYOUT } from '../layout/options';
import { towerLayers, withSockets } from '../layout/towerlayout';
import { nodeSections } from './sections';

/** The 8-bit example (korobeiniki) in the tower layout, as the graph lays it out. */
function laidOut() {
  const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/korobeiniki.cells', 'utf8'));
  const model = buildGraph(program);
  const drawn = withSockets(model);
  const sections = new Map([...nodeSections(program, drawn)].map(([id, s]) => [id, s.k]));
  const layered = towerLayers(program, model, drawn, { sections });
  const layout = new ForceLayout(() => {}, {
    ...TOWER_LAYOUT,
    heights: layered.targets,
    held: layered.held,
    strata: layered.strata,
    between: layered.between,
    lineUp: layered.lineUp,
    rainbow: layered.rainbow,
    aside: layered.aside,
    columns: layered.columns,
    live: false,
  });
  layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
  layout.tick(300);
  return { layout, layered, sections };
}

describe('the sections in the tower layout', () => {
  it('stand left to right in their order, from the selector up to the sockets', () => {
    const { layout, layered, sections } = laidOut();
    const at = [...layered.rainbow].flatMap(([id, k]) => (layout.position(id) ? [{ id, k, x: layout.position(id)!.x }] : []));
    expect(at.length).toBeGreaterThan(8);
    expect(new Set(at.map((n) => n.k)).size).toBeGreaterThan(3);
    // (no node stands left of one of an earlier section)
    for (const a of at) for (const b of at) if (a.k < b.k) expect(a.x, `${a.id} (section ${a.k}) left of ${b.id} (section ${b.k})`).toBeLessThanOrEqual(b.x + 0.5);
    // (the sockets: the strip's lanes, in the sections' order)
    const sockets = at.filter((n) => n.id.startsWith('socket:')).sort((a, b) => a.x - b.x);
    expect(sockets.map((n) => sections.get(n.id))).toEqual([...sockets.map((n) => sections.get(n.id)!)].sort((a, b) => a - b));
    layout.destroy();
  });
});
