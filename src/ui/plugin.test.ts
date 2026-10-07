import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setAttr } from '../engine/edit';
import { PRESETS } from '../engine/presets';
import { drawPlugin, loadPlugin } from './plugin';
import { allowedAttribute, attributesOf, h, rootsOf, TAGS, type PNode } from './pluginTree';
import { viewOf } from './pluginView';

const day = compileSource(PRESETS.fiveto12.source);
const sun = day.plugins.get('sun')!;

/** Every element of a drawing. */
const elements = (n: PNode | readonly PNode[]): { t: string; a: Record<string, string | number> }[] =>
  rootsOf(n).flatMap((x) => (typeof x === 'object' ? [x, ...elements(x.c)] : []));

describe('the sun, a plugin of 5 to 12', () => {
  it('is read from the piece, and the piece still compiles clean', () => {
    expect(day.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(sun).toMatchObject({ fits: ['meter'], size: 220, rim: false, dial: { turn: 86400, key: 3600 } });
    expect(day.cells.get('day')!.show).toBe('sun');
  });

  it('draws at any time of the day, only from the allowed elements and attributes', () => {
    const code = loadPlugin(sun.code);
    if (code instanceof Error) throw code;
    for (const seconds of [0, 3600, 43200, 43500, 70000, 86399, -5000, 400000]) {
      const view = viewOf(day, sun, 'day', 'u1', seconds, true);
      const drawn = drawPlugin(code, view);
      if (drawn instanceof Error) throw drawn;
      const all = elements(drawn.roots);
      expect(all.length).toBeGreaterThan(60); // 12 blocks, 24 ticks, the sky, the sun, the words
      for (const e of all) {
        expect(TAGS.has(e.t), e.t).toBe(true);
        expect(Object.keys(attributesOf(e as never)).length, `${e.t} keeps its attributes`).toBe(Object.keys(e.a).length);
      }
    }
  });

  it('stands where the day does: anchor=11.55 and 0 s is 11:55, a minute on 11:56', () => {
    const code = loadPlugin(sun.code);
    if (code instanceof Error || !code.describe) throw new Error('no describe');
    const at = (s: number) => code.describe!(viewOf(day, sun, 'day', 'u1', s, false));
    expect(at(0)).toMatchObject({ text: '11:55, Ionian, key of C', now: 11 * 60 + 55, min: 0, max: 1439 });
    expect(at(60).text).toMatch(/^11:56/);
    // 5 minutes later it is noon, and the first block (Ionian, "the false zenith") is still on
    expect(at(300).text).toMatch(/^12:00, Ionian/);
    // two hours on, the second block: Mixolydian
    expect(at(7200).text).toMatch(/^13:55, Mixolydian/);
  });

  it('has the law only when a law reads the day', () => {
    expect(viewOf(day, sun, 'day', 'u', 0, false).law?.blocks).toHaveLength(12);
    expect(viewOf(day, sun, 'cycle', 'u', 0, false).law).toBeNull();
  });
});

describe('running a plugin', () => {
  it('says why code does not load, or draw', () => {
    expect(loadPlugin('const x = ;')).toBeInstanceOf(Error);
    expect((loadPlugin('const x = 1;') as Error).message).toMatch(/no function draw/);
    const bad = loadPlugin('function draw() { throw new Error("no sky"); }');
    if (bad instanceof Error) throw bad;
    expect(drawPlugin(bad, viewOf(day, sun, 'day', 'u', 0, false))).toEqual(new Error('no sky'));
  });

  it('draws trees: h builds elements, lists flatten, nothing falsy stays', () => {
    expect(h('g', null, [h('circle', { r: 1 }), false, null], 'hi')).toEqual({ t: 'g', a: {}, c: [{ t: 'circle', a: { r: 1 }, c: [] }, 'hi'] });
  });

  it('draws only drawing: no events, links, or fetches', () => {
    expect(allowedAttribute('cx', 3)).toBe(true);
    expect(allowedAttribute('fill', 'url(#sky1)')).toBe(true);
    expect(allowedAttribute('style', 'filter:drop-shadow(0 0 8px gold)')).toBe(true);
    expect(allowedAttribute('onclick', 'x()')).toBe(false);
    expect(allowedAttribute('href', '#a')).toBe(false);
    expect(allowedAttribute('fill', 'url(https://example.com/x)')).toBe(false);
    expect(allowedAttribute('style', 'background:url(//example.com)')).toBe(false);
    expect(allowedAttribute('style', 'a:b" onload="x')).toBe(true); // (a value is set as an attribute: it cannot close one)
  });
});

describe('a plugin in the text', () => {
  it('stays when a graph edit rewrites a cell’s line', () => {
    const edited = setAttr(PRESETS.fiveto12.source, 'glass', 'lpf', '2400');
    expect(edited).toContain(sun.code);
    expect(compileSource(edited).plugins.get('sun')?.code).toBe(sun.code);
  });
});
