import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildGraph } from '../engine/graph';
import { compileSource } from '../engine/compile';
import { ForceLayout } from './physics';
import { TOWER_LAYOUT } from './options';
import { netPaths, routeWire, towerAt, towerNets, towerHeights, towerIns, towerOuts, towerY, withoutCard } from './towerlayout';
import { socketOf, VOICE_SIZE } from './voice';

const waltz = () => {
  const program = compileSource(readFileSync('examples/waltz.cells', 'utf8'));
  return { program, model: buildGraph(program) };
};

describe('the tower layout', () => {
  it('holds a voice with its top at its base frequency, a stepped cell at its step', () => {
    const { program, model } = waltz();
    const h = towerHeights(program, model);
    const socket = socketOf(VOICE_SIZE);
    expect(towerAt(h.get('cell:flute')! - socket)).toBeCloseTo(Math.log10(261.63), 3);
    expect(towerAt(h.get('cell:tuba')! - socket)).toBeCloseTo(Math.log10(65.41), 3);
    // the bar at 168 bpm, and the melodies it steps with it, in one row
    expect(10 ** towerAt(h.get('cell:bar')!)).toBeCloseTo(168 / 60, 3);
    for (const c of ['tune', 'oom', 'pah']) expect(h.get(`cell:${c}`)).toBeCloseTo(h.get('cell:bar')!, 6);
    // up high: the voices over the bar, the flute over the tuba
    expect(h.get('cell:flute')!).toBeLessThan(h.get('cell:tuba')!);
    expect(h.get('cell:tuba')!).toBeLessThan(h.get('cell:bar')!);
    // (the card has no height in it: it isn't drawn; a scope nothing steps is free)
    expect(h.has('cell:mix')).toBe(false);
    expect(h.has('cell:oompah')).toBe(false);
  });

  it('draws no node for the sound card: what goes into it goes into both strips', () => {
    const { program, model } = waltz();
    const drawn = withoutCard(model);
    expect(drawn.nodes.some((n) => n.id === 'cell:mix')).toBe(false);
    expect(drawn.edges.some((e) => e.to === 'cell:mix' || e.from === 'cell:mix')).toBe(false);
    const outs = towerOuts(program, model);
    expect(outs.map((o) => o.from).sort()).toEqual(['cell:flute', 'cell:strings', 'cell:tuba']);
    expect(outs.every((o) => o.left && o.right)).toBe(true);
    // a voice's wire leaves its top: its base frequency
    const ins = towerIns(outs, program, (id) => (id === 'cell:tuba' ? { x: 10, y: towerY(Math.log10(65.41)) + socketOf(VOICE_SIZE) } : undefined));
    expect(ins).toHaveLength(1);
    expect(ins[0].top).toBeCloseTo(towerY(Math.log10(65.41)), 6);
  });

  it('sends a two-channel card first left, second right', () => {
    const program = compileSource(`
&lead s=saw loop=C4
&bass s=sine loop=C2
&tune 0 2 4 step=2
&l [&tune * &lead]
&r [&tune * &bass]
&out loop=SAMPLE_RATE map=sample &l &r
`);
    const outs = towerOuts(program, buildGraph(program));
    const of = (id: string) => outs.find((o) => o.from === id)!;
    expect(of('cell:l')).toMatchObject({ left: true, right: false });
    expect(of('cell:r')).toMatchObject({ left: false, right: true });
  });

  it('lays out with the heights held: only x moves', () => {
    const { program, model } = waltz();
    const drawn = withoutCard(model);
    const heights = towerHeights(program, drawn);
    const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights, live: false });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    layout.tick(200);
    layout.layNet();
    for (const [id, y] of heights) expect(layout.position(id)?.y, id).toBeCloseTo(y, 6);
    // dragged, a held node goes sideways only
    layout.dragStart('cell:tuba', 500, 0);
    layout.drag('cell:tuba', 600, -999);
    layout.tick(1);
    expect(layout.position('cell:tuba')).toMatchObject({ x: 600, y: heights.get('cell:tuba') });
    layout.destroy();
  });

  it('routes a wire over a cell in its way, under one it passes low through, and not round its own', () => {
    const box = (of: string, x: number, top: number, bottom: number) => ({ of, x0: x - 40, x1: x + 40, top, bottom });
    // its row through the upper part of a cell: over it
    const over = routeWire(0, 100, 1000, [box('a', 400, 80, 200)], new Set(['src']));
    expect(over.hops).toBe(1);
    expect(over.d).toContain(',70 ');
    // through its lower part: under it
    const under = routeWire(0, 180, 1000, [box('a', 400, 80, 200)], new Set(['src']));
    expect(under.d).toContain(',210 ');
    // two cells close together: one hop; its own cell, a cell off the row and one behind it: none
    expect(routeWire(0, 100, 1000, [box('a', 400, 80, 200), box('b', 470, 60, 160)], new Set(['src'])).hops).toBe(1);
    expect(routeWire(0, 100, 1000, [box('src', 400, 80, 200), box('c', 400, 120, 300), box('d', -400, 80, 200)], new Set(['src'])).hops).toBe(0);
    // leftwards alike
    expect(routeWire(0, 100, -1000, [box('d', -400, 80, 200)], new Set(['src'])).hops).toBe(1);
  });

  it('keeps held cells apart: the flute and the strings, one row, dropped on one place', () => {
    const { program, model } = waltz();
    const drawn = withoutCard(model);
    const heights = towerHeights(program, drawn);
    const layout = new ForceLayout(() => {}, { ...TOWER_LAYOUT, heights, live: false });
    layout.setGraph({ ...drawn, nodes: drawn.nodes.filter((n) => !n.petalOf) });
    // (both at x 0, one on top of the other, then let go)
    layout.dragStart('cell:strings', 0, 0);
    layout.dragStart('cell:flute', 0, 0);
    layout.dragEnd('cell:strings');
    layout.dragEnd('cell:flute');
    layout.tick(300);
    const [f, s] = [layout.position('cell:flute')!, layout.position('cell:strings')!];
    expect(Math.abs(f.x - s.x)).toBeGreaterThan(150);
    expect(layout.quality().overlap).toBeLessThan(1);
    layout.destroy();
  });

  it('gathers the wires into one net a base frequency, the others tapping into its trunk', () => {
    const { program, model } = waltz();
    const at: Record<string, number> = { 'cell:flute': 400, 'cell:strings': 100, 'cell:tuba': 250 };
    const ins = towerIns(towerOuts(program, model), program, (id) => ({
      x: at[id],
      y: towerY(id === 'cell:tuba' ? Math.log10(65.41) : Math.log10(261.63)) + socketOf(VOICE_SIZE),
    }));
    const nets = towerNets(ins);
    expect(nets).toHaveLength(2);
    const c4 = nets.find((n) => n.taps.length === 2)!;
    // (the trunk from the source furthest from the strip: the strings, the flute tapping in)
    expect(c4.taps.map((t) => t.from)).toEqual(['cell:strings', 'cell:flute']);
    const paths = netPaths(c4, 1000, [{ of: 'cell:flute', x0: 360, x1: 440, top: c4.top - 10, bottom: c4.top + 200 }]);
    // (its own sources are no obstacle to it)
    expect(paths.hops).toBe(0);
    expect(paths.risers).toHaveLength(1);
  });
});
