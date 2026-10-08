import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { setAttr } from '../engine/edit';
import { PRESETS } from '../engine/presets';
import { drawPlugin, loadPlugin } from './plugin';
import { pluginKey } from '../engine/plugins';
import { attributesOf, boundedTree, h, plainAttribute, TAGS, type PNode } from './pluginTree';
import { viewOf } from './pluginView';

const day = compileSource(PRESETS.fiveto12.source);
const sun = day.plugins.get('sun')!;

/** Every element of a drawing. */
const elements = (n: readonly PNode[]): { t: string; a: Record<string, string | number> }[] => n.flatMap((x) => (typeof x === 'object' ? [x, ...elements(x.c)] : []));

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

  it('is the same plugin wherever an example carries it (until plugins can be shared from a file of their own)', () => {
    const daytime = compileSource(PRESETS.daytime.source).plugins.get('sun');
    expect(daytime && pluginKey(daytime)).toBe(pluginKey(sun));
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

  it('draws only drawing: no events, links, fetches, classes or ids but its own', () => {
    expect(plainAttribute('cx', 3)).toBe('3');
    expect(plainAttribute('fill', 'url(#plugin3sky)')).toBe('url(#plugin3sky)');
    expect(plainAttribute('style', 'filter:drop-shadow(0 0 8px gold);font:800 13px var(--font-ui)')).toBe('filter:drop-shadow(0 0 8px gold);font:800 13px var(--font-ui)');
    for (const [name, value] of [
      ['onclick', 'x()'],
      ['href', '#a'],
      ['class', 'x'],
      ['tabindex', '0'],
      ['id', 'app'],
      ['fill', 'url(#app)'],
      ['fill', 'url(https://example.com/x)'],
      ['cursor', 'image-set("https://evil/x" 1x)'],
    ] as const)
      expect(plainAttribute(name, value), `${name}=${value}`).toBeNull();
    // what a style may say: paint, by an allow-list; the bypasses of url() (image-set, src, escapes) are no functions of ours
    for (const style of [
      'background:url(//example.com)',
      'cursor:image-set("https://evil/x" 1x)',
      'mask-image:image-set(x 1x)',
      'background:src("https://evil/x")',
      'fill:\\75rl(https://evil/x)',
      'fill:u\\72l(https://evil/x)',
      'position:fixed',
    ])
      expect(plainAttribute('style', style), style).toBeNull();
    expect(plainAttribute('style', 'fill:image-set(x 1x);stroke:red;position:fixed')).toBe('stroke:red');
  });

  it('copies what draw returned into a bounded tree of its own', () => {
    // junk is dropped, not thrown at the renderer
    expect(boundedTree([null, undefined, 3, 'a', { t: 'script' }, { t: 'g', c: [null, false, { t: 'circle', a: { r: 2, onclick: 'x' } }] }])).toEqual([
      3,
      'a',
      { t: 'g', a: {}, c: [{ t: 'circle', a: { r: '2' }, c: [] }] },
    ]);
    expect(boundedTree('x'.repeat(5000))).toEqual(['x'.repeat(400)]);
    // a shared subtree is counted each time it appears
    let shared = h('g');
    for (let i = 0; i < 20; i++) shared = h('g', null, shared, shared);
    expect(() => boundedTree(shared)).toThrow(/more than 2000 elements|nested deeper/);
    let deep = h('g');
    for (let i = 0; i < 40; i++) deep = h('g', null, deep);
    expect(() => boundedTree(deep)).toThrow(/nested deeper/);
    // and a drawing that returns junk draws nothing, with no error to render
    const junk = loadPlugin('function draw() { return [null]; }');
    if (junk instanceof Error) throw junk;
    expect(drawPlugin(junk, viewOf(day, sun, 'day', 'u', 0, false))).toEqual({ roots: [] });
  });

  it('gives a drawing a frozen copy of the piece, not the piece', () => {
    const view = viewOf(day, sun, 'day', 'u', 0, false);
    expect(Object.isFrozen(view) && Object.isFrozen(view.params) && Object.isFrozen(view.tokens)).toBe(true);
    expect(view.params).not.toBe(day.cells.get('day')!.params);
    expect(view.tokens).not.toBe(sun.tokens);
  });
});

describe('a manifest', () => {
  const block = (tokens: string) =>
    `&bar scan(1 1) step=60bpm show=ring\n=== plugin ring ===\n{ "fits": ["meter"], "tokens": ${tokens} }\nfunction draw() { return []; }\n=== end ===`;
  const errors = (src: string) =>
    compileSource(src)
      .diagnostics.filter((d) => d.severity === 'error')
      .map((d) => d.message);
  it('has tokens that are colours and nothing else: the drawing puts them into style text', () => {
    expect(errors(block('{ "a": "#ffd84a", "b": "rgb(0 0 0 / 0.6)", "c": "hsl(45 90% 50%)", "d": "gold", "e": "var(--text)" }'))).toEqual([]);
    for (const bad of ['red; font-size:9999px', 'url(https://evil/x)', 'red;background:url(x)', '#12', 'rgb(0 0 0)}'])
      expect(errors(block(JSON.stringify({ a: bad }))).join(), bad).toMatch(/"tokens" maps names to colours/);
  });
  it('is part of what is trusted: the key changes with the manifest as with the code', () => {
    const at = (tokens: string) => pluginKey(compileSource(block(tokens)).plugins.get('ring')!);
    expect(at('{ "a": "red" }')).not.toBe(at('{ "a": "blue" }'));
    expect(at('{ "a": "red" }')).toBe(at('{ "a": "red" }'));
    // (the shipped sun is listed by this key, so a copy of its code with other tokens is not trusted)
    expect(pluginKey(sun)).toContain('function draw(');
  });
  it('says, for show=sun without its block, where the block is', () => {
    expect(errors('&day scan(1!24) loop=1d show=sun')[0]).toMatch(/examples\/fiveto12\.cells/);
  });
});

describe('a plugin in the text', () => {
  it('stays when a graph edit rewrites a cell’s line', () => {
    const edited = setAttr(PRESETS.fiveto12.source, 'glass', 'lpf', '2400');
    expect(edited).toContain(sun.code);
    expect(compileSource(edited).plugins.get('sun')?.code).toBe(sun.code);
  });
});
