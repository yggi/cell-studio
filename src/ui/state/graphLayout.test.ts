import { isSide } from '../../layout/side';
import { afterEach, describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from '../../layout/drawn';
import { codeShifts } from '@yggi/cells/engine/program';
import { routing } from '@yggi/cells/engine/routing';
import { PRESETS } from '@yggi/cells/engine/presets';
import { cellView } from '../../layout/cellview';
import { snapshotOf, type GraphSnapshot } from '../snapshot';
import { GraphLayout } from './graphLayout.svelte';

const snapshot = (key: keyof typeof PRESETS): GraphSnapshot => {
  const program = compileSource(PRESETS[key].source);
  return snapshotOf(program, buildGraph(program), codeShifts(program), program.off, routing(program, program.off));
};

/** Everything drawn reads its own program: every node's cell, every edge's ends, the table it reads, what it carries. */
function expectConsistent(layout: GraphLayout, what: string) {
  const { program, model } = layout.shown;
  const ids = new Set(layout.nodes.map((n) => n.id));
  // (notes and scopes are in the margin, not the flow: layout/side.ts)
  expect(layout.nodes.map((n) => n.id).sort(), what).toEqual(
    model.nodes
      .filter((n) => !isSide(n))
      .map((n) => n.id)
      .sort(),
  );
  // (a product's junction reads its voice and its mix)
  for (const n of layout.nodes)
    for (const name of n.type === 'junction' ? [n.data.voice, n.data.mix] : [n.data.name]) expect(program.cells.has(name), `${what}: node ${n.id} reads ${name}`).toBe(true);
  for (const e of layout.edges) {
    expect(ids.has(e.source) && ids.has(e.target), `${what}: edge ${e.id}`).toBe(true);
    if (e.type !== 'pulse') continue;
    const d = e.data as { from: string; to: string; table: string | null; phaseCell: string | null; voice: string | null };
    for (const name of [d.from, d.to, d.table, d.phaseCell, d.voice]) if (name !== null) expect(program.cells.has(name), `${what}: ${e.id} reads ${name}`).toBe(true);
    // (what PulseEdge draws a bus from)
    expect(cellView(program, d.table ?? d.from, layout.shown.shifts, false), `${what}: ${e.id}`).not.toBeNull();
  }
}

describe('GraphLayout: one snapshot per piece', () => {
  let layout: GraphLayout | undefined;
  afterEach(() => layout?.destroy());

  it('swaps program, nodes and edges together: Baustelle → Baustelle II → Twinkle', { timeout: 60_000 }, () => {
    let lit = false;
    const first = snapshot('baustelle');
    layout = new GraphLayout(first, () => ({ lit, live: null, moment: null }));
    let opened = 0;
    for (const key of ['baustelle', 'resonanz', 'twinkle'] as const) {
      const next = key === 'baustelle' ? first : snapshot(key);
      layout.sync(next, ++opened);
      expect(layout.shown).toBe(next);
      expectConsistent(layout, key);
      // restyled (lit): the same snapshot, edges made again, still its own
      lit = true;
      layout.restyle();
      expectConsistent(layout, `${key}, lit`);
      lit = false;
      layout.restyle();
    }
  });

  it('drops what another piece’s graph has that the program doesn’t, in one place', () => {
    const a = snapshot('baustelle');
    const b = snapshot('twinkle');
    const mixed = snapshotOf(b.program, a.model, b.shifts, b.muted, b.routed);
    for (const n of mixed.model.nodes) for (const name of n.kind === 'junction' ? [n.voice, n.mix] : [n.cell.name]) expect(b.program.cells.has(name)).toBe(true);
    const junctions = new Set(mixed.model.nodes.flatMap((n) => (n.kind === 'junction' ? [n.id] : [])));
    for (const e of mixed.model.edges) for (const id of [e.from, e.to, e.source, e.target]) expect(junctions.has(id) || b.program.cells.has(id.slice(5))).toBe(true);
    for (const net of mixed.model.nets) expect(net.readers.every((id) => mixed.model.edges.some((e) => e.id === id))).toBe(true);
    // and a name of the other piece is null, not a throw
    const gone = [...a.program.cells.keys()].find((n) => !b.program.cells.has(n))!;
    expect(cellView(b.program, gone, b.shifts, false)).toBeNull();
  });

  it('keeps a snapshot built from one program whole', () => {
    const s = snapshot('resonanz');
    expect(snapshotOf(s.program, s.model, s.shifts, s.muted, s.routed).model).toBe(s.model);
  });
});
