import { describe, expect, it } from 'vitest';
import { drawnCrossings, layoutQuality, type PlacedNode } from './quality';

const node = (id: string, x: number, y: number, r = 10, tags?: string[]): PlacedNode => ({ id, x, y, r, tags });

describe('drawnCrossings', () => {
  // an X: a–b and c–d cross near the origin (off the pieces' ends: a crossing exactly at one isn't seen)
  const x = [node('a', -100, -100), node('b', 100, 100), node('c', -100, 100), node('d', 100, -60)];
  const edges = [
    { a: 'a', b: 'b' },
    { a: 'c', b: 'd' },
  ];

  it('counts edges that cross, not edges that share a node', () => {
    expect(drawnCrossings(x, edges)).toBe(1);
    expect(drawnCrossings(x, [...edges, { a: 'a', b: 'c' }])).toBe(1);
  });

  it('ignores a crossing hidden under a node (edges are drawn beneath the wheels)', () => {
    expect(drawnCrossings([...x, { ...node('n', 0, 0, 30), label: true }], edges)).toBe(0);
  });

  it('follows the curve: a bend can take an edge round the other', () => {
    expect(drawnCrossings(x, [edges[0], { a: 'c', b: 'd', mid: { x: 150, y: 150 } }])).toBe(0);
  });
});

describe('layoutQuality', () => {
  it('measures the room the cells take and their edges (a tag name is not a cell)', () => {
    const q = layoutQuality([node('a', 0, 0), node('b', 100, 0), { ...node('t', 500, 500, 40), label: true }], [{ a: 'a', b: 'b' }]);
    expect(q).toMatchObject({ cells: 2, crossings: 0, width: 120, height: 20, edge: 100, overlap: 0, clusters: 0, intruders: 0 });
  });

  it('says how deep the worst overlap is', () => {
    expect(layoutQuality([node('a', 0, 0), node('b', 15, 0)], []).overlap).toBe(5);
  });

  it('counts clusters that overlap and cells inside a cluster they are not part of', () => {
    const apart = [node('a', 0, 0, 10, ['x']), node('b', 40, 0, 10, ['x']), node('c', 1000, 0, 10, ['y']), node('d', 1040, 0, 10, ['y'])];
    expect(layoutQuality(apart, [])).toMatchObject({ clusters: 0, intruders: 0 });
    const mixed = [node('a', 0, 0, 10, ['x']), node('b', 40, 0, 10, ['x']), node('c', 20, 30, 10, ['y']), node('d', 60, 30, 10, ['y'])];
    expect(layoutQuality(mixed, [])).toMatchObject({ clusters: 1, intruders: 4 });
  });

  it('two tags on the same cells are one cluster, not two that overlap', () => {
    expect(layoutQuality([node('a', 0, 0, 10, ['x', 'y']), node('b', 40, 0, 10, ['x', 'y'])], []).clusters).toBe(0);
  });
});

describe('aim', () => {
  it('says how far, on average, a node is turned from where it should sit', () => {
    const ns = [node('tape', 0, 0), node('top', 0, -100), node('right', 100, 0)];
    // (screen angles: y down, so the top is -90°)
    const up = -Math.PI / 2;
    expect(layoutQuality(ns, [], [{ from: 'tape', to: 'top', angle: up }]).aim).toBe(0);
    expect(layoutQuality(ns, [], [{ from: 'tape', to: 'right', angle: up }]).aim).toBe(90);
    expect(layoutQuality(ns, [], [{ from: 'tape', to: 'top', angle: up }, { from: 'tape', to: 'right', angle: Math.PI }]).aim).toBe(90); // (0° and 180°)
    expect(layoutQuality(ns, []).aim).toBe(0);
  });
});
