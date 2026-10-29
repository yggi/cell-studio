// A MIDI card (#208, decision 019): map=midi, its entries channels — parsed, compiled, planned, routed, drawn.
import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { buildGraph } from './drawn';
import { cellId } from '@yggi/cells/engine/ids';

const BAND = `&bar scan(1 1 1 1) step=2
&theme step=4n 0 2 4 5
&reed s=square loop=220
&bass step=2n 0 5
&sub loop=55
&groove step=8n &bd ~ &hh ~
&bd s=sine loop=A1
&hh s=white hpf=8000`;
const OUT = `&out map=sample [&theme * &reed, &groove]`;

describe('a MIDI card in the flows, the routing and the graph', () => {
  const src = `${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`;

  it('the graph draws the card as a node, its products as junctions into it, every wire a note bus', () => {
    const model = buildGraph(compilePiece(src));
    expect(model.nodes.find((n) => n.id === cellId('synth'))?.kind).toBe('cell');
    const into = model.edges.filter((e) => e.to === cellId('synth'));
    // (a product's notes go to its voice, which goes out on the card: #234)
    expect(into.map((e) => [e.port, e.band, e.from]).sort()).toEqual([
      ['midi', 'cv', 'cell:groove'],
      ['midi', 'cv', 'cell:reed'],
      ['midi', 'cv', 'cell:sub'],
    ]);
    // (the melody into the product, its voice the product's definition, as in a mix)
    expect(model.edges.some((e) => e.from === cellId('bass') && e.to === 'junction:synth:1' && e.port === 'voice')).toBe(true);
  });
});
