import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from './drawn';

const BASE = `&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&bd s=sine loop=C2
&sd s=white
&hh s=white hpf=6000
&kit &bd &sd &hh
&lead s=tri loop=C5
&bell s=sine loop=C6
&tune over=&major step=8n 0 2 4 2
&accent map=amp step=8n 1 .5 .8 .5
`;

describe('a gate (trigger=): a product with a name', () => {
  it('is a node of its own in the graph, its trigger, levels and receivers wired in', () => {
    const r = compileSource(BASE + '&beat step=8n 0 2 1 2\n&drums trigger=&beat velocity=&accent &kit\n&out map=sample &drums');
    const g = buildGraph(r);
    const into = g.edges.filter((e) => e.to === 'cell:drums').map((e) => `${e.from} ${e.port}`);
    expect(into).toEqual(expect.arrayContaining(['cell:beat trigger', 'cell:accent velocity']));
    // (its notes out to what it plays, whose sound goes on into the card)
    expect(g.edges.filter((e) => e.from === 'cell:drums').map((e) => `${e.to} ${e.port}`)).toEqual(['cell:kit voice']);
    expect(g.edges.some((e) => e.from === 'cell:kit' && e.to === 'cell:out' && e.band === 'audio')).toBe(true);
  });
});

describe('a gate (play=, level=): decision 023', () => {
  it('a gate’s play= is no read head, and its cells are wired into it as written', () => {
    const r = compileSource(BASE + '&duck map=amp step=4n 1 .25\n&leadOut play=&tune level=&accent*&duck*.4 [&lead, &bell]\n&out map=sample &leadOut');
    expect(r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message)).toEqual([]);
    expect(r.cells.get('leadOut')!.gate).toEqual({
      notes: 'tune',
      port: 'play',
      levels: [
        { name: 'accent', port: 'level' },
        { name: 'duck', port: 'level' },
      ],
      gain: 0.4,
      receivers: ['lead', 'bell'],
    });
    expect(r.tapes).toEqual([]);
    const g = buildGraph(r);
    expect(g.edges.filter((e) => e.to === 'cell:leadOut').map((e) => `${e.from} ${e.port}`)).toEqual(['cell:tune play', 'cell:accent level', 'cell:duck level']);
    expect(g.edges.filter((e) => e.from === 'cell:leadOut').map((e) => `${e.to} ${e.port}`)).toEqual(['cell:lead voice', 'cell:bell voice']);
  });

  it('a kit it made of bare voices: the bus to each voice, their sound into the mix', () => {
    const g = buildGraph(compileSource(BASE + '&steps step=8n 0 1\n&g play=&steps &lead &bell\n&out map=sample [&g]'));
    expect(g.edges.filter((e) => e.from === 'cell:g').map((e) => e.to)).toEqual(['cell:lead', 'cell:bell']);
    expect(g.edges.filter((e) => e.to === 'cell:out').map((e) => e.from)).toEqual(['cell:lead', 'cell:bell']);
    expect(g.nodes.some((n) => n.id === 'cell:g:kit')).toBe(false);
  });
});
