import { describe, expect, it } from 'vitest';
import { loomContact, loomLane, loomPorts, pillAnchor, pillOf, sectionLoom } from './sectionloom';
import { drawnCrossings } from './quality';

describe("a selector's loom", () => {
  const table = { x: 0, y: 0, r: 50 };
  const sections = [
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

  it('runs each section up to a lane of its own over the table, along it, and straight to each cell it steps', () => {
    const strands = sectionLoom(table, sections);
    // (a section stepping two: one strand, to the lower; the other joins on from it, one net between them)
    expect(strands.map((s) => [s.bulb, s.section, s.to, s.join])).toEqual([
      ['a', 0, 'c1', undefined],
      ['b', 1, 'c3', undefined],
      ['b', 1, 'c2', 'c3'],
    ]);
    expect(strands[2].pieces).toEqual([[100, 200, -200, -300]]);
    const lane = (s: (typeof strands)[number]) => s.pieces[1][1];
    // (the first section's lane lowest, each next over it, all over the table's top)
    expect(lane(strands[0])).toBeLessThan(-50);
    expect(lane(strands[1])).toBeLessThan(lane(strands[0]));
    // (straight up to a cell over it, to its bottom; down to one under it, to its top)
    expect(strands[0].pieces[2]).toEqual([200, lane(strands[0]), 200, -260]);
    expect(strands[1].pieces[2]).toEqual([100, lane(strands[1]), 100, 160]);
  });

  it("doesn't count its strands crossing each other, but does count them crossing another edge", () => {
    const strands = sectionLoom(table, sections);
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
    const strands = sectionLoom(table, sections, [{ id: 'r', x: 300, y: -400, r: 40 }]);
    const [src] = strands;
    expect(src).toMatchObject({ bulb: '', section: -1, to: 'r' });
    // (the source's lane under the sections')
    expect(src.pieces[1][1]).toBeGreaterThan(strands[1].pieces[1][1]);
    // (drawn to the lane; counted on up to the reader)
    expect(src.d.endsWith(`L300.0,${src.pieces[1][1].toFixed(1)}`)).toBe(true);
    expect(src.pieces[2]).toEqual([300, src.pieces[1][1], 300, -360]);
  });

  it('sets the selector at the bottom: a flat fan of contacts over its hub, the bypass under it, its ports on the edge', () => {
    const hub = { x: 0, y: 0 };
    const fan = [0, 1, 2, 3, 4].map((k) => loomContact(hub, k, 5));
    // (in order, left to right, over the hub; the middle highest, flat: within a few px)
    for (let k = 1; k < 5; k++) expect(fan[k].x).toBeGreaterThan(fan[k - 1].x);
    for (const c of fan) expect(c.y).toBeLessThan(0);
    expect(Math.max(...fan.map((c) => c.y)) - Math.min(...fan.map((c) => c.y))).toBeLessThan(10);
    // (the sections' lanes over the fan, the bypass under the hub, the ports under that)
    expect(loomLane(hub, 1)).toBeLessThan(Math.min(...fan.map((c) => c.y)));
    expect(loomLane(hub, 0)).toBeGreaterThan(0);
    const beside = loomPorts(hub);
    expect(beside.meter.y).toBeGreaterThan(loomLane(hub, 0));
    expect(beside.meter.x).toBeLessThan(0);
    expect(beside.select.x).toBeGreaterThan(0);
    // (a port where the wire from its source into the hub crosses the edge)
    const from = { x: -100, y: 200 };
    const { meter } = loomPorts(hub, from);
    expect(meter.x / meter.y).toBeCloseTo(from.x / from.y, 6);
  });

  it('meets a pill at its ports, and anything else on its outline nearest it', () => {
    const l = { pill: { x0: 0, x1: 300, y0: 0, y1: 100 }, ports: { meter: { x: 100, y: 100 }, select: { x: 140, y: 100 } }, feeds: { meter: 'm', select: 's' } };
    expect(pillAnchor(l, 's', { x: 400, y: 500 })).toEqual({ x: 140, y: 100 });
    expect(pillAnchor(l, 'm', { x: -400, y: 500 })).toEqual({ x: 100, y: 100 });
    // (straight above its flat part: its top; beside its end: on the round)
    expect(pillAnchor(l, 'x', { x: 150, y: -200 })).toEqual({ x: 150, y: 0 });
    const end = pillAnchor(l, 'x', { x: 500, y: 50 });
    expect(end.x).toBeCloseTo(300, 6);
    expect(end.y).toBeCloseTo(50, 6);
  });

  it('draws its pill wide enough that every output sits on its flat top, none over a round end', () => {
    const hub = { x: 0, y: 0 };
    const contacts = [0, 1, 2].map((k) => loomContact(hub, k, 3));
    const ports = loomPorts(hub);
    const cells = [[{ id: 'l', x: -200, y: -300, r: 20 }], [{ id: 'm', x: 0, y: -300, r: 20 }], [{ id: 'r', x: 260, y: -300, r: 20 }]];
    const strands = sectionLoom(
      { ...hub, r: 20 },
      cells.map((to, k) => ({ bulb: `t${k}`, from: contacts[k], to })),
      [],
      ports.meter,
    );
    const pill = pillOf(hub, contacts, ports, strands);
    const r = (pill.y1 - pill.y0) / 2;
    expect(pill.x0).toBeLessThanOrEqual(-200 - r + 1e-9);
    expect(pill.x1).toBeGreaterThanOrEqual(260 + r - 1e-9);
  });
});
