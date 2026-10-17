import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from '../layout/drawn';
import { nodeSections, sectionRgb } from './sections';
import { tapTintRgb } from './theme';

describe('sections (decision 016)', () => {
  const program = compileSource(readFileSync('node_modules/@yggi/cells/examples/hypercell.cells', 'utf8'));
  const model = buildGraph(program);
  const sections = nodeSections(program, model);
  const k = (name: string) => sections.get(`cell:${name}`)?.k;

  it('a voice takes the section of the tap that plays it, not its tag: stab, hook and pad apart though all are synths', () => {
    // (&parts: bassBar stabBar hookBar padBar beatBar rollBar riseBar)
    expect([k('bass'), k('stab'), k('sawA'), k('sawB'), k('padv'), k('riser')]).toEqual([0, 1, 2, 2, 3, 6]);
    // (where no tap reaches, the tag's: the riser's sweep, tagged rise)
    expect(k('up')).toBe(6);
  });

  it("a mix's colour is the mean of what it mixes", () => {
    expect(sectionRgb(model, sections, 'cell:hookPart')).toEqual(tapTintRgb(2, 7));
    // (a kit: of what plays it — the beat and the roll)
    const [beat, roll] = [tapTintRgb(4, 7), tapTintRgb(5, 7)];
    expect(sectionRgb(model, sections, 'cell:kit:voices')).toEqual([0, 1, 2].map((i) => Math.round((beat[i]! + roll[i]!) / 2)));
    const two = compileSource(`
&bar scan(1 1 1 1) step=100bpm
&parts step=&bar &aBar &bBar
&a s=saw loop=C4
&b s=sine loop=C5
&ta step=&aBar 0
&tb step=&bBar 0
&both [&ta * &a, &tb * &b]
&song over=&parts step=&bar [0,1]
&out map=sample [&both]
`);
    const m = buildGraph(two);
    const mean = sectionRgb(m, nodeSections(two, m), 'cell:both')!;
    const [a, b] = [tapTintRgb(0, 2), tapTintRgb(1, 2)];
    expect(mean).toEqual([0, 1, 2].map((i) => Math.round((a[i]! + b[i]!) / 2)));
  });
});
