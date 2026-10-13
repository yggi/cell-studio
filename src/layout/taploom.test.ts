import { describe, expect, it } from 'vitest';
import { tapLoom } from './taploom';
import { drawnCrossings } from './quality';

describe("a selector's loom", () => {
  const table = { x: 0, y: 0, r: 50 };
  const taps = [
    { bulb: 'a', from: { x: -20, y: -30 }, to: [{ id: 'c1', x: 200, y: -300, r: 40 }] },
    {
      bulb: 'b',
      from: { x: 20, y: -30 },
      to: [
        { id: 'c2', x: -200, y: -300, r: 40 },
        { id: 'c3', x: 100, y: 200, r: 40 },
      ],
    },
  ];

  it('runs each tap up to a lane of its own over the table, along it, and straight to each cell it steps', () => {
    const strands = tapLoom(table, taps);
    expect(strands.map((s) => [s.bulb, s.tap, s.to])).toEqual([
      ['a', 0, 'c1'],
      ['b', 1, 'c2'],
      ['b', 1, 'c3'],
    ]);
    const lane = (s: (typeof strands)[number]) => s.pieces[1][1];
    // (the first tap's lane lowest, each next over it, all over the table's top)
    expect(lane(strands[0])).toBeLessThan(-50);
    expect(lane(strands[1])).toBeLessThan(lane(strands[0]));
    // (straight up to a cell over it, to its bottom; down to one under it, to its top)
    expect(strands[0].pieces[2]).toEqual([200, lane(strands[0]), 200, -260]);
    expect(strands[2].pieces[2]).toEqual([100, lane(strands[2]), 100, 160]);
  });

  it("doesn't count its strands crossing each other, but does count them crossing another edge", () => {
    const strands = tapLoom(table, taps);
    const nodes = [
      { id: 't', x: 0, y: 0, r: 10 },
      { id: 'c1', x: 200, y: -300, r: 10 },
      { id: 'c2', x: -200, y: -300, r: 10 },
      { id: 'c3', x: 100, y: 200, r: 10 },
      { id: 'p', x: -300, y: -150, r: 10 },
      { id: 'q', x: 300, y: -150, r: 10 },
    ];
    const edges = (loom: string | undefined) => strands.map((s) => ({ a: `t@${s.bulb}`, b: s.to, path: s.pieces, ...(loom ? { loom } : {}) }));
    // (a's strand to the right and b's to the left cross over the table: one crossing, but not in a loom)
    expect(drawnCrossings(nodes, edges(undefined))).toBeGreaterThan(0);
    expect(drawnCrossings(nodes, edges('t'))).toBe(0);
    // (an edge across the loom's verticals counts)
    expect(drawnCrossings(nodes, [...edges('t'), { a: 'p', b: 'q' }])).toBeGreaterThan(0);
  });

  it("runs its source's lane lowest, out to each reader over it, the reader's riser left to the bus's own edge", () => {
    const strands = tapLoom(table, taps, [{ id: 'r', x: 300, y: -400, r: 40 }]);
    const [src] = strands;
    expect(src).toMatchObject({ bulb: '', tap: -1, to: 'r' });
    // (the source's lane under the taps')
    expect(src.pieces[1][1]).toBeGreaterThan(strands[1].pieces[1][1]);
    // (drawn to the lane; counted on up to the reader)
    expect(src.d.endsWith(`L300.0,${src.pieces[1][1].toFixed(1)}`)).toBe(true);
    expect(src.pieces[2]).toEqual([300, src.pieces[1][1], 300, -360]);
  });
});
