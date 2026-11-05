// A module drawn as one wheel (decision 069, #560): its private cells folded in, every wire into it at the jack it fills.
import { describe, expect, it } from 'vitest';
import { PRESETS } from '@yggi/cells/engine/presets';
import { compilePiece } from '../compile';
import { buildGraph, usesOf } from './drawn';
import { FINGER, grownSize, jackAt, jackOfEdge, jacksShown, moduleOf } from './modules';
import { flowNodeOf } from '../ui/flownode';
import { flowEdgeOf } from '../ui/flowedges';

const patchbay = compilePiece(PRESETS.patchbay.source);
const graph = buildGraph(patchbay);
const node = (name: string) => graph.nodes.find((n) => n.id === `cell:${name}`);

describe('a module is one wheel (decision 069)', () => {
  it('its private cells and the product inside an instrument module have no node', () => {
    for (const n of ['vcf_in', 'vca_eg', 'vca_level', 'saw_pitch']) expect(node(n), n).toBeUndefined();
    expect(graph.nodes.some((n) => n.id === 'junction:vca:0')).toBe(false);
    // (the piece's own cells, and every module's head, are drawn)
    for (const n of ['vcf', 'vca', 'saw', 'sub', 'sweep', 'jitter', 'contour', 'drift']) expect(node(n), n).toBeDefined();
    expect(graph.nodes).toHaveLength(23);
  });

  it('its head carries its module and its jacks, cells’ jacksOf', () => {
    const vcf = moduleOf(node('vcf')!)!;
    expect(vcf.id).toBe('lowpass');
    expect(vcf.jacks.map((j) => [j.port, j.band, j.patched])).toEqual([
      ['cutoff', 'cv', ['sweep']],
      ['res', 'cv', ['jitter']],
      ['eg', 'cv', ['contour']],
      ['in', 'audio', ['saw', 'sub']],
    ]);
    expect(moduleOf(node('vca')!)!.jacks.map((j) => [j.port, j.patched.join(), j.knob])).toEqual([
      ['eg', '', 'map=adsr .002 .3 .5 .06'],
      ['level', '', 'map=amp 1'],
      ['in', 'vcf', null],
    ]);
    expect(moduleOf(node('sub')!)!.jacks.map((j) => [j.port, j.patched])).toEqual([['pitch', ['drift']]]);
    // (a meter's template or a collection is no module: a cell, and a cluster as before)
    expect(moduleOf(node('bar')!)).toBeUndefined();
  });

  it('every wire into a module ends at the jack it fills; a wire into its input’s mix is drawn into it', () => {
    const into = (head: string) => graph.edges.filter((e) => e.to === `cell:${head}` && e.port !== 'about' && e.band !== 'sync').map((e) => [e.from, jackOfEdge(e)]);
    expect(into('vcf').sort()).toEqual(
      [
        ['cell:contour', 'eg'],
        ['cell:jitter', 'res'],
        ['cell:saw', 'in'],
        ['cell:sub', 'in'],
        ['cell:sweep', 'cutoff'],
      ].sort(),
    );
    expect(into('vca')).toContainEqual(['cell:vcf', 'in']);
    expect(into('sub')).toEqual([['cell:drift', 'pitch']]);
    // (nothing leaves a private cell: its knob is the jack's)
    expect(graph.edges.some((e) => /vcf_in|vca_eg|vca_level|saw_pitch|junction:vca/.test(`${e.source} ${e.target}`))).toBe(false);
    // (an edge moved or gone says where: the alias, as the graph's other folds do)
    expect(graph.alias.get('cell:saw->cell:vcf_in')).toBe('cell:saw->cell:vcf');
  });

  it('a module is no use cluster; a collection’s and a meter’s use stay ones', () => {
    const ids = usesOf(patchbay).map((g) => g.id);
    expect(ids).not.toContain('lowpass');
    expect(ids).not.toContain('amp');
    expect(ids).toContain('envelopes');
    expect(ids).toContain('meter_4_4');
  });

  it('is drawn as a module wheel (an instrument) or its own wheel with the rim, its wires at their jack handles', () => {
    const at = { x: 0, y: 0 };
    expect(flowNodeOf(node('vcf')!, at, false, undefined, undefined, patchbay).type).toBe('module');
    expect(flowNodeOf(node('vca')!, at, false, undefined, undefined, patchbay).type).toBe('module');
    const saw = flowNodeOf(node('saw')!, at, false, undefined, undefined, patchbay);
    expect(saw.type).toBe('voice');
    expect((saw.data as { module?: unknown }).module).toBeDefined();
    const cutoff = graph.edges.find((e) => e.from === 'cell:sweep' && e.to === 'cell:vcf')!;
    expect(flowEdgeOf(cutoff, 'on', patchbay).targetHandle).toBe('jack-cutoff');
  });
});

describe('the jacks on the rim (decision 069 §3, §6)', () => {
  it('at rest only those in use: a cable, a value, a knob', () => {
    const shown = (jacks: Parameters<typeof jacksShown>[0]) => jacksShown(jacks).map((j) => j.port);
    expect(
      shown([
        { port: 'lpf', kind: 'attribute', band: 'cv', patched: [], knob: null },
        { port: 'env', kind: 'attribute', band: 'cv', patched: ['eg'], knob: null },
      ]),
    ).toEqual(['env']);
  });

  it('a wheel grows to keep its jacks a finger apart over its lower half, never below its size', () => {
    expect(grownSize(128, 4)).toBe(128);
    expect(grownSize(80, 6)).toBeCloseTo(FINGER / Math.sin((0.9 * Math.PI) / 5 / 2), 6);
    for (const n of [2, 4, 6]) {
      const size = grownSize(40, n);
      const a = jackAt(0, n, size);
      const b = jackAt(1, n, size);
      // (neighbours a finger apart in a straight line, which is what a fingertip measures)
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeCloseTo(FINGER, 6);
    }
    // (one alone at the bottom)
    expect(jackAt(0, 1, 100)).toEqual({ x: expect.closeTo(0, 9), y: 50 });
  });
});
