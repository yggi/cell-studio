import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { buildGraph } from './drawn';
import { pieceStats } from '@yggi/cells/engine/stats';

const statsOf = (text: string) => {
  const r = compilePiece(text);
  return pieceStats(r, buildGraph(r), text);
};

describe('a piece’s numbers', () => {
  const text = [
    '# a comment',
    '&bar scan(1 1 1 1) step=90bpm',
    '&key scale(minor, C)',
    '&m 0 1 2',
    '&tune over=&key step=1m &m &m^1 4 ~',
    '',
    '&lead s=tri loop=C4 env=&(map=adsr .01 .2 .6 .1)',
    '&mix map=sample [&tune * &lead * .5]',
  ].join('\n');
  const s = statsOf(text);

  it('counts the cells written by kind, not the implicit grid nor a built-in card', () => {
    expect(s.cells).toBe(7);
    expect(s.unnamed).toBe(1);
    expect(s.kinds).toMatchObject({ meter: 1, table: 1, line: 2, voice: 1, envelope: 1, card: 1 });
  });

  it('counts the splices and braid steps each cell writes', () => {
    expect(s.splices).toBe(2);
    expect(s.spliced).toBe(1);
    // &m 3, &tune 4, the envelope 4 (a scan, a blank braid and a mix's entries aren't written steps)
    // (and the envelope's 4)
    expect(s.steps).toBe(11);
    expect(s.perCell).toEqual({ min: 3, max: 4, mean: 11 / 3, median: 4 });
  });

  it('counts the lines that say something', () => {
    expect(s.lines).toBe(6);
    expect(s.chars).toBe(text.length);
  });

  it('counts wires and nets from the graph', () => {
    expect(s.wires).toBeGreaterThan(3);
    expect(s.nets).toBeGreaterThanOrEqual(0);
  });
});
