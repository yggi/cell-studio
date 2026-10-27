import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { buildGraph, usesOf } from './drawn';
import { plateHeight, tagUse, useGroups, useTag } from './uses';

const KIT = 'use * from "core kit"\n&bar meter("4/4") step=100bpm\n&beat step=8n &bd ~ &hh ~ &sd ~ &hh [&bd,&hh]';
const IDLE = ['rim', 'cp', 'lt', 'ph', 'mt', 'oh', 'ht', 'cr', 'rd', 'claves'];

describe('a use line’s group (#480)', () => {
  it('holds the cells it gave: the kit its beat plays drawn, the ten voices nothing reads folded into its name', () => {
    const r = compilePiece(KIT);
    const g = buildGraph(r);
    const [kit, ...rest] = usesOf(r);
    expect(rest).toEqual([]);
    expect(kit).toMatchObject({ id: 'core kit', line: 1, overrode: [], nodes: ['cell:kit:voices'], folded: IDLE });
    expect(kit!.names).toHaveLength(13);
    // (drawn: the bar, the beat and the kit, its cluster named by its line; the folded have no node)
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['cell:bar', 'cell:beat', 'cell:kit:voices']);
    expect(g.nodes.find((n) => n.id === 'cell:kit:voices')?.cell?.tags).toEqual([useTag('core kit')]);
    expect(g.nodes.find((n) => n.id === 'cell:beat')?.cell?.tags).toEqual([]);
    // (without: every given cell its own, as before)
    expect(buildGraph(r, { uses: false }).nodes).toHaveLength(13);
  });

  it('leaves out what the piece writes itself; a kit with a piece of its own stays in the group', () => {
    const r = compilePiece(`${KIT}\n&sd s=white hpf=900`);
    const [kit] = usesOf(r);
    expect(kit!.overrode).toEqual(['sd']);
    expect(kit!.names).not.toContain('sd');
    expect(kit!.nodes).toEqual(['cell:kit:voices']);
    expect(kit!.folded).toEqual(IDLE);
  });

  it('draws a use nothing reads whole, and one group per use line', () => {
    const r = compilePiece('use * from "core kit"\nuse * from "aeolian"\n&bar meter("4/4") step=100bpm\n&tune over=&key step=&bar 0 2 4');
    const [kit, mode] = usesOf(r);
    expect(kit!.folded).toEqual([]);
    expect(kit!.nodes).toHaveLength(13);
    expect(mode).toMatchObject({ id: 'aeolian', line: 2, nodes: ['cell:key'], folded: [] });
  });

  it('names a group by its line, which no tags= tag can be', () => {
    expect(tagUse(useTag('Synth-pop drums'))).toBe('Synth-pop drums');
    expect(tagUse('drums')).toBeNull();
    expect(useGroups(compilePiece('&a 1 2'), buildGraph(compilePiece('&a 1 2')))).toEqual([]);
  });
});

describe('a cluster of one node’s plate (#480)', () => {
  it('is as tall as its name and the cells folded into it, in rows', () => {
    expect(plateHeight(useTag('aeolian'))).toBe(40);
    expect(plateHeight(useTag('core kit'), IDLE)).toBe(120);
    const r = compilePiece(KIT);
    expect((buildGraph(r).nodes.find((n) => n.id === 'cell:kit:voices') as { plate?: number }).plate).toBe(120);
  });
});
