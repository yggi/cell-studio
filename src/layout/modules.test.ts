// A module drawn as one wheel (decision 069, #560): its private cells folded in, every wire into it at the jack it fills.
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { compilePiece } from '../compile';
import { buildGraph, usesOf } from './drawn';
import { FINGER, grownSize, jackAt, jackOfEdge, jacksOfNode, jacksShown, moduleOf } from './modules';
import { flowNodeOf } from '../ui/flownode';
import { flowEdgeOf } from '../ui/flowedges';

const patchbay = compilePiece(EXAMPLES.patchbay.source);
const graph = buildGraph(patchbay);
const node = (name: string) => graph.nodes.find((n) => n.id === `cell:${name}`);

describe('a module is one wheel (decision 069)', () => {
  it('its private cells and the product inside an instrument module have no node', () => {
    for (const n of ['vcf_in', 'vca_eg', 'vca_level', 'saw_pitch']) expect(node(n), n).toBeUndefined();
    expect(graph.nodes.some((n) => n.id === 'junction:vca:0')).toBe(false);
    // (the piece's own cells, and every module's head, are drawn)
    for (const n of ['vcf', 'vca', 'saw', 'sub', 'sweep', 'jitter', 'contour', 'drift']) expect(node(n), n).toBeDefined();
    // (and the meter template's grouping, `bar_grouping`, since cells v0.19.0's one `meter` fragment)
    expect(graph.nodes).toHaveLength(24);
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
    expect(ids).toContain('meter');
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

describe('a voice’s and an instrument’s own jacks (decision 069 §2, rung B)', () => {
  const acid = compilePiece(EXAMPLES.acid.source);
  const g = buildGraph(acid);
  const tb303 = g.nodes.find((n) => n.id === 'cell:tb303')!;

  it('a voice’s moving sound parameters, pitch=, env= and fm=, each with its cables or its value', () => {
    const jacks = jacksOfNode(tb303)!;
    const at = (port: string) => jacks.find((j) => j.port === port)!;
    expect([at('lpf').patched, at('lpf').knob]).toEqual([['fenv', 'accent', 'knob'], '110..3800']);
    expect([at('lpq').patched, at('lpq').knob]).toEqual([['res'], null]);
    expect(at('env').patched).toEqual(['strike']);
    expect([at('delay').patched, at('delay').knob]).toEqual([[], '0.22']);
    // (at rest only those in use: lpf, lpq, delay, env)
    expect(jacksShown(jacks).map((j) => j.port)).toEqual(['lpf', 'lpq', 'delay', 'env']);
    // (every wire into one ends at its jack)
    const into = g.edges.filter((e) => e.to === 'cell:tb303' && ['lpf', 'lpq', 'env'].includes(e.port));
    expect(into.length).toBe(5);
    for (const e of into) expect(jackOfEdge(e), e.id).toBe(e.port);
  });

  it('what a voice takes from an instrument is the instrument’s; an unnamed cell is a value set on the line', () => {
    // (Patchbay's saw is a module: its module's jacks; a voice playing through an instrument with lpf: not its own)
    const text = '&bar meter("4/4") step=120bpm\n&tune step=8n 0 3\n&saw s=saw loop=C2 env=&(map=adsr .01 .2 .5 .1)\n&vcf lpf=800 [&saw]\n&out map=sample [&tune * &vcf]';
    const r = compilePiece(text);
    const gg = buildGraph(r);
    const saw = jacksOfNode(gg.nodes.find((n) => n.id === 'cell:saw')!)!;
    expect(saw.find((j) => j.port === 'lpf')).toMatchObject({ patched: [], knob: null });
    expect(saw.find((j) => j.port === 'env')).toMatchObject({ patched: [], knob: '&(…)' });
    // (the instrument's own: its linear parameters)
    expect(jacksShown(jacksOfNode(gg.nodes.find((n) => n.id === 'cell:vcf')!)!).map((j) => [j.port, j.knob])).toEqual([['lpf', '800']]);
  });

  it('on a voice its jacks go round its band, six a finger apart on 160 px, so no voice in the library grows', () => {
    for (const n of [2, 4, 6]) {
      expect(grownSize(160, n, 'band')).toBe(160);
      for (let i = 1; i < n; i++) {
        const a = jackAt(i - 1, n, 160, 'band');
        const b = jackAt(i, n, 160, 'band');
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${n} jacks, ${i}`).toBeGreaterThanOrEqual(FINGER * 0.99);
      }
    }
    expect(grownSize(160, 8, 'band')).toBeGreaterThan(160);
  });
});
