import { describe, expect, it } from 'vitest';
import { parse } from '../engine/parser';
import { ForceLayout, DEFAULT_LAYOUT, FORCES_ALONE, columns, crossingPairs, flowRanks, orderLayers, tapeFaces } from './physics';
import { fitTurn, headAngle, tapeHeads } from './tape';
import { isGround } from './meters';
import { splinePoint } from './geometry';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';

const graphOf = (src: string) => buildGraph(compileSource(src));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('ForceLayout', () => {
  it('settles a preset with finite positions, flowing from the meter up to the sound card', () => {
    const g = graphOf(PRESETS.royal.source);
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(g);
    l.tick(400);
    for (const n of g.nodes.filter((x) => !x.petalOf)) {
      const p = l.position(n.id)!;
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
    const y = (id: string) => l.position(id)!.y; // screen y grows downward
    // royal's &mix is its sound card too (map=sample): the top
    expect(y('cell:mix')).toBeLessThan(y('cell:lead'));
    expect(y('cell:lead')).toBeLessThan(y('cell:bar'));
  });

  it('keeps nodes from overlapping', () => {
    const g = graphOf(PRESETS.sailor.source);
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(g);
    l.tick(400);
    const ids = g.nodes.filter((n) => !n.petalOf).map((n) => n.id); // petals hang from their parent
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) expect(dist(l.position(ids[i])!, l.position(ids[j])!)).toBeGreaterThan(70);
  });

  it('preserves positions of surviving nodes across edits', () => {
    const l = new ForceLayout(undefined, { live: false });
    const d1 = l.setGraph(graphOf('&m step=1\n&A step=&m &B\n&B 0\n&v s=saw\n&mix_ [&A * &v]\n&out_ loop=44k map=sample &mix_'));
    expect(d1).toMatchObject({ added: 6, removed: 0, total: 6 });
    l.tick(300);
    const before = l.position('cell:A')!;
    const d2 = l.setGraph(graphOf('&m step=1\n&A step=&m &B &C\n&B 0\n&C 1\n&v s=saw\n&mix_ [&A * &v]\n&out_ loop=44k map=sample &mix_'));
    expect(d2).toMatchObject({ added: 1, removed: 0, total: 7 });
    expect(l.position('cell:A')).toEqual(before);
    // the newcomer spawns near its parent, not at the origin
    expect(dist(l.position('cell:C')!, before)).toBeLessThan(250);
    const d3 = l.setGraph(graphOf('&m step=1\n&A step=&m 0\n&v s=saw\n&mix_ [&A * &v]\n&out_ loop=44k map=sample &mix_'));
    expect(d3).toMatchObject({ added: 0, removed: 2, total: 5 });
    expect(l.position('cell:B')).toBeUndefined();
  });

  it('a dragged node follows the pointer and drags its neighbours along', () => {
    const l = new ForceLayout(undefined, { ...FORCES_ALONE, live: false });
    l.setGraph(graphOf('&m step=1\n&A step=&m &B\n&B 0\n&v s=saw\n&mix_ [&A * &v]\n&out_ loop=44k map=sample &mix_'));
    l.tick(300);
    const b0 = l.position('cell:B')!;
    l.dragStart('cell:A', 0, 0);
    l.drag('cell:A', 600, 600);
    l.tick(150);
    expect(l.position('cell:A')).toEqual({ x: 600, y: 600 });
    expect(dist(l.position('cell:B')!, { x: 600, y: 600 })).toBeLessThan(dist(b0, { x: 600, y: 600 }) - 150);
    l.dragEnd('cell:A');
    expect(l.isPinned('cell:A')).toBe(false);
    l.dragStart('cell:A', 600, 600);
    l.dragEnd('cell:A', true);
    expect(l.isPinned('cell:A')).toBe(true);
  });
});

describe('crossing-free layout', () => {
  it('orders layers by their neighbours: two families stay apart', () => {
    const x = orderLayers(
      [
        { id: 'A', depth: 1 },
        { id: 'B', depth: 1 },
        { id: 'a1', depth: 2 },
        { id: 'b1', depth: 2 },
        { id: 'a2', depth: 2 },
        { id: 'b2', depth: 2 },
      ],
      [
        { source: 'a1', target: 'A' },
        { source: 'a2', target: 'A' },
        { source: 'b1', target: 'B' },
        { source: 'b2', target: 'B' },
      ],
    );
    // each family on its parent's side
    const side = (id: string) => Math.sign(x.get(id)!);
    expect(side('a1')).toBe(side('A'));
    expect(side('a2')).toBe(side('A'));
    expect(side('b1')).toBe(side('B'));
    expect(side('A')).not.toBe(side('B'));
  });

  it('counts crossings', () => {
    const segs = [
      { a: { id: 'p', x: 0, y: 0 }, b: { id: 'q', x: 10, y: 10 } },
      { a: { id: 'r', x: 0, y: 10 }, b: { id: 's', x: 10, y: 0 } },
      { a: { id: 'p', x: 0, y: 0 }, b: { id: 's', x: 10, y: 0 } }, // shares ends: not a crossing
    ];
    expect(crossingPairs(segs)).toHaveLength(1);
  });

  // (and on every example: physics.library.test.ts)
});

describe('spline edges', () => {
  // three nodes in a row, held in place: the edge a–b runs straight through c
  const model = {
    nodes: [
      { id: 'a', depth: 1, kind: 'cell' },
      { id: 'b', depth: 1, kind: 'cell' },
      { id: 'c', depth: 1, kind: 'cell' },
    ],
    edges: [{ id: 'a->b', source: 'a', target: 'b', kind: 'ref', count: 1, pick: '' }],
  } as unknown as Parameters<ForceLayout['setGraph']>[0];
  const hold = (l: ForceLayout, id: string, x: number, y: number) => {
    l.dragStart(id, x, y);
    l.drag(id, x, y);
  };

  it('pass through their bend point halfway', () => {
    const p = splinePoint(0, 0, 50, 40, 100, 0, 0.5);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(40);
  });

  it('stay straight when nothing is in the way', () => {
    const l = new ForceLayout(undefined, { ...FORCES_ALONE, live: false });
    l.setGraph(model);
    hold(l, 'a', -300, 0);
    hold(l, 'b', 300, 0);
    hold(l, 'c', 0, 400); // well off the line
    l.tick(80);
    const m = l.bend('a->b')!;
    expect(Math.hypot(m.x, m.y)).toBeLessThan(5);
    l.destroy();
  });

  it('slip freely over a node, keeping only off its centre (a small bend)', () => {
    const l = new ForceLayout(undefined, { ...FORCES_ALONE, live: false });
    l.setGraph(model);
    hold(l, 'a', -300, 0);
    hold(l, 'b', 300, 0);
    hold(l, 'c', 0, 0); // dead on the line
    l.tick(80);
    const m = l.bend('a->b')!;
    const r = DEFAULT_LAYOUT.radius({ id: 'c', depth: 1, kind: 'cell' } as never);
    // off c's centre, but still over c: a small bend, not an arc around it
    expect(Math.hypot(m.x, m.y)).toBeGreaterThan(r * FORCES_ALONE.avoid! * 0.5); // (the avoid in force here)
    expect(Math.hypot(m.x, m.y)).toBeLessThan(r);
    // and a node just off the line pushes it to the far side
    hold(l, 'c', 0, 5);
    l.tick(80);
    expect(l.bend('a->b')!.y).toBeLessThan(0);
    l.destroy();
  });
});

describe('dragging', () => {
  it('a released node is free (it relaxes back towards its ring); a pinned one stays where it was put', () => {
    const model = buildGraph(compileSource(PRESETS.transpose.source));
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    l.tick(300);
    const id = 'cell:theme';
    const before = l.position(id)!;
    const drop = { x: before.x + 300, y: before.y + 300 };
    l.dragStart(id, drop.x, drop.y);
    l.drag(id, drop.x, drop.y);
    l.tick(30);
    l.dragEnd(id);
    l.tick(200);
    const p = l.position(id)!;
    expect(Math.hypot(p.x - drop.x, p.y - drop.y)).toBeGreaterThan(20);
    l.dragStart(id, drop.x, drop.y);
    l.dragEnd(id, true);
    l.tick(200);
    expect(l.position(id)).toEqual(drop);
    l.destroy();
  });
});

// (no overlaps, on every example settled: physics.library.test.ts)

describe('initial layout', () => {
  it('draws the sound card up-centre — a slight pull, not a pin', () => {
    const model = buildGraph(compileSource(PRESETS.royal.source));
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    l.tick(400);
    // royal's &mix is the sound card (map=sample)
    expect(l.isPinned('cell:mix') || l.isPinned('cell:bar')).toBe(false);
    const out = l.position('cell:mix')!;
    expect(Math.abs(out.x)).toBeLessThan(DEFAULT_LAYOUT.layerGap * 1.5);
    // a drag moves it freely; released, it drifts back only slowly
    l.dragStart('cell:mix', out.x + 300, out.y);
    l.tick(1);
    l.dragEnd('cell:mix');
    l.tick(20);
    expect(l.position('cell:mix')!.x).toBeGreaterThan(out.x + 150);
    l.destroy();
  });

  it('meters that only keep time start side by side at the bottom (one that is also played sits with its players)', () => {
    const model = buildGraph(compileSource(PRESETS.rhythm.source));
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    const r = compileSource(PRESETS.rhythm.source);
    const meters = model.nodes.filter((n) => n.kind === 'cell' && n.isMeter && !r.outputs.some((o) => o.cell === n.cell.name)).map((n) => n.id);
    expect(meters.length).toBeGreaterThan(0);
    const lowest = Math.max(...model.nodes.filter((n) => !n.petalOf).map((n) => l.position(n.id)!.y));
    expect(meters.every((id) => Math.abs(l.position(id)!.y - lowest) < DEFAULT_LAYOUT.layerGap / 2)).toBe(true); // (a little jitter keeps edges off nodes)
    expect(new Set(meters.map((id) => l.position(id)!.x)).size).toBe(meters.length);
    l.destroy();
  });

  it('repulsion is near field: nodes far apart do not push each other', () => {
    const model = {
      nodes: [
        { id: 'a', depth: 2, kind: 'cell' },
        { id: 'b', depth: 2, kind: 'cell' },
      ],
      edges: [],
    } as unknown as Parameters<ForceLayout['setGraph']>[0];
    const l = new ForceLayout(undefined, { ...FORCES_ALONE, live: false, centre: 0 }); // repulsion alone
    l.setGraph(model);
    const r = 2 * DEFAULT_LAYOUT.layerGap; // 480 px apart: beyond the near field
    for (const [id, x] of [
      ['a', -r],
      ['b', r],
    ] as const)
      l.dragStart(id, x, 0);
    l.tick(1); // a drag takes effect on the next tick
    for (const id of ['a', 'b']) l.dragEnd(id);
    l.tick(100);
    expect(l.position('a')!.x).toBeCloseTo(-r, 0);
    expect(l.position('b')!.x).toBeCloseTo(r, 0);
    l.destroy();
  });
});

describe('the natural order (waltz)', () => {
  const model = buildGraph(compileSource(PRESETS.waltz.source));
  const id = (n: string) => `cell:${n}`;

  it('ranks the signal path from time up to sound; parts beside what uses them', () => {
    const r = flowRanks(model);
    const at = (n: string) => r.get(id(n))!;
    expect([at('tune'), at('oom'), at('pah')]).toEqual([1, 1, 1]);
    expect([at('flute'), at('tuba'), at('strings')]).toEqual([2, 2, 2]);
    expect(at('mix')).toBe(3); // the mix is the sound card: the top
    // the motifs hang half a row under their players, not down with the meter
    expect([at('I'), at('V')]).toEqual([at('oom') - 0.5, at('oom') - 0.5]);
    expect([at('i'), at('v')]).toEqual([at('pah') - 0.5, at('pah') - 0.5]);
  });

  it('settles like that: a vertical flow, motifs beside their players, no crossings', () => {
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    l.tick(500);
    const y = (n: string) => l.position(id(n))!.y;
    const x = (n: string) => l.position(id(n))!.x;
    expect(y('mix')).toBeLessThan(y('flute'));
    expect(y('flute')).toBeLessThan(y('tune'));
    expect(y('tune')).toBeLessThan(y('bar'));
    for (const [m, p] of [
      ['I', 'oom'],
      ['V', 'oom'],
      ['i', 'pah'],
      ['v', 'pah'],
    ]) {
      // beside: around the player's height (collisions spread them a little, as in the screenshot)
      expect(Math.abs(y(m) - y(p)), m).toBeLessThan(DEFAULT_LAYOUT.layerGap * 2);
    }
    // and on the outer side of their player: oom's motifs on its side of the tune, pah's on the other
    expect(Math.sign(x('I') - x('tune'))).toBe(Math.sign(x('oom') - x('tune')));
    expect(Math.sign(x('i') - x('tune'))).toBe(Math.sign(x('pah') - x('tune')));
    expect(l.drawnCrossings()).toBe(0);
    l.destroy();
  });
});

describe('switching examples', () => {
  it('a mostly new graph is laid out afresh, even when it shares names (&bar, &mix, &out)', () => {
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(buildGraph(compileSource(PRESETS.transpose.source)));
    l.tick(300);
    const waltz = buildGraph(compileSource(PRESETS.waltz.source));
    l.setGraph(waltz);
    l.tick(500);
    expect(l.drawnCrossings()).toBe(0);
    expect(l.position('cell:mix')!.y).toBeLessThan(l.position('cell:bar')!.y);
    l.destroy();
  });
});

describe('the natural order (royal)', () => {
  const model = buildGraph(compileSource(PRESETS.royal.source));
  const id = (n: string) => `cell:${n}`;
  it('stepped tables hang just under their readers; the vibrato beside the melody', () => {
    const r = flowRanks(model);
    const at = (n: string) => r.get(id(n))!;
    expect([at('theme'), at('pedal')]).toEqual([1, 1]);
    // &key steps per cycle of &theme and &scale per cycle of &key — but they're tables &theme reads through:
    // tuning a row under what it tunes (the scale under the theme, the key under the scale)
    expect([at('scale'), at('key')]).toEqual([0, -1]);
    // the vibrato is unnamed, the lead's own (pitch=): a petal of &lead, not ranked
    expect(model.nodes.find((n) => n.cell.lambda && n.cell.map?.kind === 'lin')!.petalOf).toBe('cell:lead');
    expect([at('lead'), at('bass')]).toEqual([2, 2]);
    expect(at('mix')).toBe(3); // the mix is the sound card
  });
  it('is untangled as drawn — already when first shown, and once settled', () => {
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    l.tick(220); // what the app does before the first paint
    expect(l.drawnCrossings()).toBe(0);
    l.tick(300);
    const y = (n: string) => l.position(id(n))!.y;
    expect(y('mix')).toBeLessThan(y('lead'));
    expect(y('lead')).toBeLessThan(y('key'));
    expect(l.drawnCrossings()).toBe(0);
    l.destroy();
  });
});

describe('drawn crossings', () => {
  it('count the curves as drawn, not the straight lines (a curve around a node can cross what the line passes under)', () => {
    // a–b runs straight under c's disc; c has an edge going down. Straight: hidden under c, no crossing drawn.
    const model = {
      nodes: ['a', 'b', 'c', 'd'].map((id) => ({ id, depth: 1, kind: 'cell' })),
      edges: [
        { id: 'a->b', source: 'a', target: 'b', kind: 'ref', count: 1, pick: '' },
        { id: 'c->d', source: 'c', target: 'd', kind: 'ref', count: 1, pick: '' },
      ],
    } as unknown as Parameters<ForceLayout['setGraph']>[0];
    const l = new ForceLayout(undefined, { ...FORCES_ALONE, live: false, avoid: 0 });
    l.setGraph(model);
    for (const [id, x, y] of [
      ['a', -300, 0],
      ['b', 300, 0],
      ['c', 0, 0],
      ['d', 0, 300],
    ] as const)
      l.dragStart(id, x, y);
    l.tick(30);
    expect(l.drawnCrossings()).toBe(0);
    // made to arc around c (old behaviour), the same edge crosses c's
    l.setOptions({ avoid: 2 });
    l.tick(60);
    expect(l.drawnCrossings()).toBe(1);
    l.destroy();
  });
  // (every example: physics.library.test.ts)
});

describe('options', () => {
  it('apply live: more repulsion range spreads the graph', () => {
    const model = buildGraph(compileSource(PRESETS.rhythm.source));
    const spread = (o: Partial<typeof DEFAULT_LAYOUT>) => {
      const l = new ForceLayout(undefined, { live: false });
      l.setGraph(model);
      l.setOptions(o);
      l.tick(400);
      const ps = model.nodes.filter((n) => !n.petalOf).map((n) => l.position(n.id)!);
      // the area it covers (its width alone is set largely by the columns it starts in)
      const w = (Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x))) * (Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y)));
      l.destroy();
      return w;
    };
    expect(spread({ repelRange: 600, charge: -600 })).toBeGreaterThan(spread({ repelRange: 150, charge: -100 }));
  });
});

describe('balance (per tonos)', () => {
  it('parts cluster under their users: no ten-wide row, about as wide as tall, centred', () => {
    const full = buildGraph(compileSource(PRESETS.pertonos.source));
    const model = { ...full, nodes: full.nodes.filter((n) => !n.petalOf) }; // the motifs are petals of &alto now
    const r = flowRanks(model);
    const rows = new Map<number, number>();
    for (const v of r.values()) rows.set(v, (rows.get(v) ?? 0) + 1);
    expect(Math.max(...rows.values())).toBeLessThanOrEqual(6); // was 10 on one row
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    l.tick(500);
    // (the cells, not the note card beside the top)
    const ps = model.nodes.filter((n) => !n.cell.note).map((n) => l.position(n.id)!);
    const xs = ps.map((p) => p.x);
    const ys = ps.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    expect(w / h).toBeLessThan(1.6); // a little wider since the motifs became petals (shorter, not wider)
    // centred on the line between &bar and &out (it drifted a quarter of its width to one side before)
    expect(Math.abs((Math.max(...xs) + Math.min(...xs)) / 2)).toBeLessThan(w * 0.15);
    expect(l.drawnCrossings()).toBeLessThanOrEqual(3);
    l.destroy();
  });
});

describe('busy nodes push harder', () => {
  it('repulsion scales with a node’s edges: a hub gets more room than a leaf', () => {
    const model = {
      nodes: ['hub', 'a', 'b', 'c', 'd', 'x', 'y'].map((id) => ({ id, depth: 1, kind: 'cell' })),
      edges: ['a', 'b', 'c', 'd']
        .map((n) => ({ id: `hub->${n}`, source: 'hub', target: n, kind: 'ref', count: 1, pick: '' }))
        .concat([{ id: 'x->y', source: 'x', target: 'y', kind: 'ref', count: 1, pick: '' }]),
    } as unknown as Parameters<ForceLayout['setGraph']>[0];
    const gap = (degreeRepel: number) => {
      const l = new ForceLayout(undefined, { ...FORCES_ALONE, live: false, degreeRepel, centre: 0, rankPull: 0 });
      l.setGraph(model);
      l.tick(400);
      const h = l.position('hub')!;
      const near = Math.min(...['a', 'b', 'c', 'd'].map((n) => Math.hypot(l.position(n)!.x - h.x, l.position(n)!.y - h.y)));
      l.destroy();
      return near;
    };
    expect(gap(0.4)).toBeGreaterThan(gap(0));
  });
});

describe('symmetric columns', () => {
  it('the waltz: the first voice in the middle, the others either side — each motif over its player', () => {
    const c = columns(buildGraph(compileSource(PRESETS.waltz.source)));
    const at = (n: string) => c.get(`cell:${n}`)!;
    expect([at('tuba'), at('flute'), at('strings')]).toEqual([-1, 0, 1]);
    expect([at('oom'), at('I'), at('V')]).toEqual([-1, -1, -1]);
    expect([at('pah'), at('i'), at('v')]).toEqual([1, 1, 1]);
    expect([at('tune'), at('bar'), at('mix')]).toEqual([0, 0, 0]);
  });
  it('stereo: what leans left sits left', () => {
    const c = columns(buildGraph(compileSource(PRESETS.stereo.source)));
    expect(c.get('cell:bell')!).toBeLessThan(0);
    expect(c.get('cell:cello')!).toBeGreaterThan(0);
    expect(c.get('cell:high')!).toBeLessThan(0);
    expect(c.get('cell:low')!).toBeGreaterThan(0);
  });
  it('a fresh layout starts symmetric: the waltz’s left and right mirror each other', () => {
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(buildGraph(compileSource(PRESETS.waltz.source)));
    const x = (n: string) => l.position(`cell:${n}`)!.x;
    // mirror images, to within the few pixels of jitter that keep nodes from starting exactly on top of each other
    // (within 40: each node keeps room for its own label, and the two sides' labels differ in length)
    expect(Math.abs(x('oom') + x('pah'))).toBeLessThan(40);
    expect(Math.abs(x('tuba') + x('strings'))).toBeLessThan(40);
    expect(x('oom')).toBeLessThan(-50);
    l.destroy();
  });
});

describe('size=: how large a cell is drawn, against the others', () => {
  const src = '&bar step=120bpm size=2 0 0 0 0\n&t step=&bar 0 4 7\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]';
  it('is carried by the cell (1 unless set), and the layout gives it room to match', () => {
    const r = compileSource(src);
    expect([r.cells.get('bar')!.size, r.cells.get('t')!.size]).toEqual([2, 1]);
    const model = buildGraph(r);
    const node = (name: string) => model.nodes.find((n) => n.cell.name === name)!;
    expect(DEFAULT_LAYOUT.radius(node('bar'))).toBe(2 * DEFAULT_LAYOUT.radius(buildGraph(compileSource(src.replace(' size=2', ''))).nodes.find((n) => n.cell.name === 'bar')!));
  });
  it('is only how it looks: the sound is the same', () => {
    const a = compileSource(src);
    const b = compileSource(src.replace(' size=2', ''));
    expect(a.outputs.map((o) => o.id)).toEqual(b.outputs.map((o) => o.id));
    expect(a.cells.get('bar')!.rate).toBe(b.cells.get('bar')!.rate);
  });
  it('says what it takes', () => {
    expect(parse('&bar size=9 0').diagnostics[0].message).toMatch(/size= is how large it is drawn, from .25 to 4/);
  });
});

describe('tags inside a piece: a node each, pushing cells and edges off its name', () => {
  for (const key of ['baustelle', 'hypercell']) {
    it(key, () => {
      const model = buildGraph(compileSource((PRESETS as Record<string, { source: string }>)[key].source));
      const l = new ForceLayout(undefined, { live: false });
      l.setGraph(model);
      l.tick(500);
      const tags = [...new Set(model.nodes.flatMap((n) => (n.cell.note || n.petalOf ? [] : n.cell.tags.slice(0, 1))))];
      expect(tags.length).toBeGreaterThan(2);
      const tagAt = tags.map((t) => ({ t, p: l.position(`tag:${t}`)!, r: 40 + 13 * t.length }));
      for (const { p } of tagAt) expect(p).toBeTruthy();
      // no cell on a name
      for (const n of model.nodes.filter((n) => !n.petalOf)) {
        const q = l.position(n.id)!;
        for (const { t, p, r } of tagAt) expect(Math.hypot(q.x - p.x, q.y - p.y), `${n.cell.name} on ${t}`).toBeGreaterThan(r * 0.8);
      }
      // the names apart
      for (let i = 0; i < tagAt.length; i++)
        for (let j = i + 1; j < tagAt.length; j++) expect(Math.hypot(tagAt[i].p.x - tagAt[j].p.x, tagAt[i].p.y - tagAt[j].p.y)).toBeGreaterThan((tagAt[i].r + tagAt[j].r) * 0.8);
      // and no drawn edge across a name (sampled along each curve)
      const bends = l.bends();
      let over = 0;
      for (const e of model.edges) {
        const a = l.position(e.source);
        const b = l.position(e.target);
        const m = bends.get(e.id);
        if (!a || !b || !m) continue;
        for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
          const q = splinePoint(a.x, a.y, m.x, m.y, b.x, b.y, t);
          if (tagAt.some(({ p, r }) => Math.hypot(q.x - p.x, q.y - p.y) < r * 0.5)) over++;
        }
      }
      expect(over).toBeLessThanOrEqual(2);
      l.destroy();
    });
  }
});

describe('tapes: the heads keep their spacing, the wheel turns to face them at what they connect to', () => {
  for (const key of ['echotape', 'soundtape', 'testtones', 'resonanz', 'fiveto12'] as const) {
    it(key, () => {
      const model = buildGraph(compileSource(PRESETS[key].source));
      const faces = tapeFaces(model);
      expect(faces.some((f) => f.write)).toBe(true);
      expect(faces.filter((f) => !f.write).length).toBeGreaterThan(1);
      const l = new ForceLayout(undefined, { live: false });
      l.setGraph(model);
      l.tick(500);
      for (const f of faces) {
        const turn = (l.tapeTurn(f.tape)! * Math.PI) / 180;
        const t = l.position(f.tape)!;
        const c = l.position(f.to)!;
        const d = Math.atan2(c.y - t.y, c.x - t.x) - (turn + f.offset);
        expect(Math.abs(Math.atan2(Math.sin(d), Math.cos(d))) * (180 / Math.PI), `${f.to}${f.write ? ' (written)' : ''}`).toBeLessThan(30);
      }
      l.destroy();
    });
  }
  it('an update that moves nothing (pressing Play) leaves the tapes turned as they were', () => {
    const model = buildGraph(compileSource(PRESETS.soundtape.source));
    const l = new ForceLayout(undefined, { live: false });
    l.setGraph(model);
    l.tick(220);
    const before = l.tapeTurn('cell:tape')!;
    const aim = l.quality().aim;
    l.setGraph(model, false);
    expect(l.tapeTurn('cell:tape')).toBeCloseTo(before, 1); // (to a tenth of a degree: the last tick fitted it just before its own step)
    expect(l.quality().aim).toBe(aim);
    l.destroy();
  });
  it('a read head sits by how far along the tape it reads: clockwise from the write head, wherever that is', () => {
    expect(tapeHeads({ name: 't', params: { length: 4 } }, [{ name: 'h', params: { play: 't', at: 1 } }])).toEqual({ heads: [{ name: 'h', at: 1 }], length: 4 });
    expect(headAngle(0, 4)).toBe(-90); // (unturned: the write head on top)
    expect(headAngle(1, 4)).toBe(0);
    expect(headAngle(1, 4, 0)).toBe(90);
  });
  it('the turn that faces the heads best: a weighted circular mean', () => {
    const q = Math.PI / 2;
    // two heads a quarter apart, their cells a quarter apart, half a turn round: turned half a turn
    expect(
      fitTurn([
        { angle: Math.PI, offset: 0, weight: 1 },
        { angle: -q, offset: q, weight: 1 },
      ]),
    ).toBeCloseTo(Math.PI);
    // they disagree: the busier one wins more
    expect(
      fitTurn([
        { angle: 0, offset: 0, weight: 3 },
        { angle: q, offset: 0, weight: 1 },
      ])!,
    ).toBeCloseTo(Math.atan2(1, 3));
    expect(fitTurn([])).toBeNull();
  });
});

describe('meters, joined to their cells by a net', () => {
  for (const key of ['royal', 'bossa', 'cellscape', 'baustelle'] as const) {
    it(key, () => {
      const model = buildGraph(compileSource(PRESETS[key].source));
      const l = new ForceLayout(undefined, { live: false });
      l.setGraph(model);
      l.tick(220);
      l.layNet();
      const net = l.meterNet();
      const byId = new Map(model.nodes.map((n) => [n.id, n]));
      const grounds = model.edges.filter((e) => isGround(e, byId));
      expect(grounds.length).toBeGreaterThan(0);
      for (const m of new Set(grounds.map((e) => e.target))) {
        // a tree over the meter and every cell it steps: each reached, one trace fewer than its ends
        const ends = new Set([m, ...grounds.filter((e) => e.target === m).map((e) => e.source)]);
        const traces = net.filter((t) => t.meter === m);
        expect(traces.length).toBe(ends.size - 1);
        const reached = new Set([m]);
        for (let grew = true; grew;) {
          grew = false;
          for (const t of traces)
            if (reached.has(t.a) !== reached.has(t.b)) {
              reached.add(t.a).add(t.b);
              grew = true;
            }
        }
        expect(
          [...ends].filter((id) => !reached.has(id)),
          'cells off the net',
        ).toEqual([]);
        // and the meter sits clear of every wheel
        const p = l.position(m)!;
        for (const n of model.nodes.filter((n) => !n.petalOf && n.id !== m)) {
          const q = l.position(n.id);
          if (q) expect(Math.hypot(p.x - q.x, p.y - q.y), `${m} on ${n.id}`).toBeGreaterThan(DEFAULT_LAYOUT.radius(byId.get(m)!) + DEFAULT_LAYOUT.radius(n));
        }
      }
      l.destroy();
    });
  }
});
