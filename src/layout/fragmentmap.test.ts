// The fragment map's layout (#625): its graph read from cells, each fragment's anchor by certainty, a layout that is the
// same every run, stays in its square and glides from where it was; and no axis named in Cell studio.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AXES } from '@yggi/cells/engine/style';
import { catalogue } from '@yggi/cells/repository/catalogue';
import { anchorOf, mapGraph, mapLayout } from './fragmentmap';
import { EMPTY_LAYER } from '@yggi/cells/repository/fragments';

const graph = mapGraph();
const [X, Y] = [AXES[0]!.name, AXES[1]!.name];

describe('the fragment map', () => {
  it('has a node per catalogue entry and example, and edges between nodes it has', () => {
    const keys = new Set(graph.nodes.map((n) => n.key));
    expect(graph.nodes.filter((n) => n.kind === 'fragment').length).toBe(catalogue().length);
    expect(graph.edges.every(([a, b]) => keys.has(a) && keys.has(b) && a !== b)).toBe(true);
    // (Kinderlieder's songs meet their tunes: a line whose arguments bring two or more taken cells together)
    expect(graph.nodes.some((n) => n.kind === 'meeting' && n.key.startsWith('c:kinderlied:'))).toBe(true);
  });

  it('marks a fragment the person filed as their own, and only that one (#626)', () => {
    const fragment = {
      id: 'my_groove',
      text: '&groove from\n&groove step=8n &bd ~ &sd ~\n&bd, &sd from gm_kit',
      association: [{ point: { [X]: 0.5 }, weight: 0.1, facet: 'rhythm' }],
    };
    const g = mapGraph(catalogue({ ...EMPTY_LAYER, filed: [{ fragment, meta: { source: 'me', created: '2026-11-15T00:00:00Z' }, prose: '' }] }));
    expect(g.nodes.filter((n) => n.own).map((n) => n.label)).toEqual(['my_groove']);
    // (it takes gm_kit: an edge to it)
    expect(g.edges).toContainEqual(['f:my_groove', 'f:gm_kit']);
  });

  it('holds a fragment where its points agree, as surely as they agree and their reach allows; an axis no point names, not at all', () => {
    for (const e of catalogue())
      for (const a of AXES) {
        const anchor = anchorOf(e, a.name);
        if (!e.association.some((p) => typeof p.point[a.name] === 'number')) expect(anchor, `${e.id} ${a.name}`).toBeNull();
        else expect(anchor!.at >= 0 && anchor!.at <= 1 && anchor!.certainty >= 0 && anchor!.certainty <= 1, `${e.id} ${a.name}`).toBe(true);
      }
    // (one point: held at it, surely; points that disagree: held less surely)
    expect(anchorOf({ association: [{ point: { [X]: 0.2 }, weight: 1 }] }, X)).toEqual({ at: 0.2, certainty: 1 });
    const spread = anchorOf(
      {
        association: [
          { point: { [X]: 0 }, weight: 1 },
          { point: { [X]: 1 }, weight: 1 },
        ],
      },
      X,
    )!;
    expect([spread.at, spread.certainty]).toEqual([0.5, 0]);
    // (a point's reach, `± .25` on a half range of .5, halves how surely it holds; with its spread, √(spread² + reach²))
    expect(anchorOf({ association: [{ point: { [X]: 0.2 }, weight: 1, reach: { [X]: 0.25 } }] }, X)).toEqual({ at: 0.2, certainty: 0.5 });
    const both = anchorOf(
      {
        association: [
          { point: { [X]: 0.35 }, weight: 1, reach: { [X]: 0.2 } },
          { point: { [X]: 0.65 }, weight: 1, reach: { [X]: 0.2 } },
        ],
      },
      X,
    )!;
    expect(both.certainty).toBeCloseTo(1 - Math.hypot(0.15, 0.2) / 0.5);
    // (a reach on another axis says nothing here)
    expect(anchorOf({ association: [{ point: { [X]: 0.2 }, weight: 1, reach: { [Y]: 0.25 } }] }, X)!.certainty).toBe(1);
  });

  it('lays out the same every run, within its square', () => {
    const a = mapLayout(graph, X, Y, { ticks: 60 });
    const b = mapLayout(graph, X, Y, { ticks: 60 });
    expect(a.map((p) => [p.x, p.y])).toEqual(b.map((p) => [p.x, p.y]));
    expect(a.every((p) => p.x >= p.r - 1e-9 && p.x <= 1 - p.r + 1e-9 && p.y >= p.r - 1e-9 && p.y <= 1 - p.r + 1e-9)).toBe(true);
  });

  it('glides: started from where the nodes were, a change of axis moves them from there', () => {
    const before = mapLayout(graph, X, Y, { ticks: 60 });
    const from = new Map(before.map((p) => [p.node.key, { x: p.x, y: p.y }]));
    const still = mapLayout(graph, X, Y, { ticks: 0, from });
    expect(still.map((p) => [p.x, p.y])).toEqual(before.map((p) => [p.x, p.y]));
  });

  it('names no axis: the map’s files read them from cells’ AXES', () => {
    const files = [
      'src/layout/fragmentmap.ts',
      ...readdirSync('src/ui')
        .filter((f) => /map/i.test(f))
        .map((f) => `src/ui/${f}`),
    ];
    const named = new RegExp(`['"\`](${AXES.map((a) => a.name).join('|')})['"\`]`);
    for (const f of files) expect(named.exec(readFileSync(f, 'utf8'))?.[0] ?? null, f).toBeNull();
  });
});
