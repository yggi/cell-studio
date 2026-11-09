// Patch cables dragged in the graph (#555): each drop writes what cells' patch/unpatch write (their texts reused from
// yggi/cells src/engine/patch.test.ts), and a refused one writes nothing and says why.
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { compilePiece } from '../compile';
import { buildGraph } from './drawn';
import { jackOfEdge, jacksOfNode } from './modules';
import { bandOf, move, plug, pull, takes } from './cables';

const PATCHBAY = EXAMPLES.patchbay.source;
const patchbay = compilePiece(PATCHBAY);
const lineOf = (text: string, cell: string) => text.split('\n').find((l) => l.startsWith(`&${cell} `));
const written = (d: ReturnType<typeof plug>) => (d.ok ? d.text : `refused: ${d.message}`);

describe('what a cable carries', () => {
  it('sound from a cell that makes, mixes or gates it; a level from any other; nothing from a card', () => {
    for (const n of ['saw', 'sub', 'vcf', 'vca', 'kick', 'beat']) expect(bandOf(patchbay, n), n).toBe('audio');
    for (const n of ['sweep', 'jitter', 'contour', 'drift', 'accent']) expect(bandOf(patchbay, n), n).toBe('cv');
    expect(bandOf(patchbay, 'out')).toBeNull();
    expect(bandOf(patchbay, 'nosuch')).toBeNull();
  });

  it('while dragged, the jacks of its band are the ones shown (decision 069 §4): a module’s input takes sound, its cutoff a level', () => {
    const vcf = jacksOfNode(buildGraph(patchbay).nodes.find((n) => n.id === 'cell:vcf')!)!;
    expect(vcf.filter((j) => takes(j, 'audio')).map((j) => j.port)).toEqual(['in']);
    expect(vcf.filter((j) => takes(j, 'cv')).map((j) => j.port)).toEqual(['cutoff', 'res', 'eg']);
  });
});

describe('a drop writes what cells’ patch writes; a pull, what unpatch writes', () => {
  it('into a module’s jack, its argument; pulled off, its knob again', () => {
    const d = plug(PATCHBAY, 'vca', 'level', 'sweep');
    expect(d.ok && lineOf(d.text, 'vca')).toBe('&vca from amp(eg=&(map=adsr .002 .3 .5 .06), level=&sweep) &vcf');
    expect(written(pull(written(d), 'vca', 'level', 'sweep'))).toBe(PATCHBAY);
  });

  it('a cable dropped is drawn into the jack it fills, one into a module’s inner product too (amp’s level)', () => {
    const d = plug(PATCHBAY, 'vca', 'level', 'sweep');
    const g = buildGraph(compilePiece(written(d)));
    const e = g.edges.find((x) => x.from === 'cell:sweep' && x.to === 'cell:vca')!;
    expect(jackOfEdge(e)).toBe('level');
  });

  it('into a module’s input, a reference in its mix; pulled off, the mix without it', () => {
    const d = plug(PATCHBAY, 'vcf', 'in', 'hat');
    expect(d.ok && lineOf(d.text, 'vcf')).toContain('[&saw, &sub * .5, &hat]');
    expect(written(pull(written(d), 'vcf', 'in', 'hat'))).toBe(PATCHBAY);
  });

  it('into a fixed parameter at zero depth, so the sound doesn’t jump (decision 067 §4)', () => {
    expect(lineOf(written(plug(PATCHBAY, 'hat', 'hpf', 'sweep')), 'hat')).toContain('hpf=7500..7500 * &sweep');
  });

  it('a cable moved from one jack to another: pulled, then plugged', () => {
    const on = written(plug(PATCHBAY, 'vca', 'level', 'sweep'));
    const moved = written(move(on, 'sweep', { cell: 'vca', port: 'level' }, { cell: 'hat', port: 'hpf' }));
    expect(lineOf(moved, 'vca')).toBe(lineOf(PATCHBAY, 'vca'));
    expect(lineOf(moved, 'hat')).toContain('hpf=7500..7500 * &sweep');
  });
});

describe('a refused drop writes nothing and says why (cells’ PatchError)', () => {
  it('a jack that holds a cable, a value set on the line, the cell itself, a cell the text doesn’t define, a module’s last input', () => {
    const refused = (d: ReturnType<typeof plug>) => (d.ok ? null : d.message);
    expect(refused(plug(PATCHBAY, 'vcf', 'res', 'drift'))).toMatch(/holds &jitter: pull it out first/);
    expect(refused(plug(PATCHBAY, 'vca', 'eg', 'contour'))).toMatch(/eg is set on the line/);
    expect(refused(plug(PATCHBAY, 'saw', 'pitch', 'saw'))).toMatch(/into itself/);
    expect(refused(plug(PATCHBAY, 'saw', 'pitch', 'nosuch'))).toMatch(/defined nowhere/);
    const one = written(pull(PATCHBAY, 'vcf', 'in', 'sub'));
    expect(refused(pull(one, 'vcf', 'in', 'saw'))).not.toBeNull();
  });

  it('a move whose new jack refuses the cable writes nothing, not the cable pulled', () => {
    const on = written(plug(PATCHBAY, 'vca', 'level', 'sweep'));
    expect(move(on, 'sweep', { cell: 'vca', port: 'level' }, { cell: 'vcf', port: 'res' }).ok).toBe(false);
  });
});
