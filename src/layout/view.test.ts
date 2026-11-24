// Lifted from yggi/cells @ 435243f (the tests that read the routing or the live view, moved with them: cells decision 086,
// #650): src/engine/realize.test.ts, smallest.test.ts, grooves.test.ts, midicard.test.ts, graph.test.ts, tape.test.ts and
// compiler/gate.test.ts. Each case as it was there, in a describe that sets up the piece it read.
/**
 * What the graph draws while a piece plays: which cells, tables, voices and wires are lit (`liveAt`), and which take part
 * in the sound at all (`routing`), over the pieces cells tested them on.
 */
import { describe, expect, it } from 'vitest';
import { codeShifts, compileSource, EXAMPLES, resolveSeed } from '@yggi/cells';
import { cellId, edgeId, writtenGraph } from '@yggi/cells/inspect';
import { liveAt } from './live';
import { routing } from './routing';

describe('the live view of the King’s theme (royal)', () => {
  const r = compileSource(EXAMPLES.royal.source, undefined, { resolve: resolveSeed });
  const spb = 60 / 84;
  it('lights the cell under the playhead, every table its note passes through, and the voice', () => {
    const at = liveAt(r, codeShifts(r), new Set(), 8.2 * spb);
    expect(at.cells.get('theme')!.local).toBeCloseTo(8.2, 0);
    expect([...at.cells.get('scale')!.entries]).toContain(6);
    expect([...at.cells.get('key')!.entries]).toContain(11);
    expect(at.cells.has('lead')).toBe(true);
    expect(at.edges.has('cell:theme->cell:scale')).toBe(true);
    expect(at.edges.has('cell:theme~>cell:bar')).toBe(true);
    expect(at.edges.has('cell:theme->cell:lead')).toBe(true);
    expect(at.bars.get('bar')).toBe(2);
  });
  it('routing follows sounding outputs only', () => {
    const on = routing(r, new Set(['cell:lead']));
    expect(['pedal', 'scale', 'bar', 'bass'].every((c) => on.nodes.has(`cell:${c}`))).toBe(true);
    // the theme is silent, but still turns the key the pedal is read through (step=cycle(&theme))
    expect(on.edges.has('cell:theme->cell:lead')).toBe(false);
    expect(on.edges.has('cell:theme->cell:scale')).toBe(false);
    expect(on.edges.has('cell:key~>cell:theme')).toBe(true);
    expect(on.nodes.has('cell:theme')).toBe(true);
  });
});

describe('pulses, parts and selectors', () => {
  it('phases: how far each clocked cell is through its step', () => {
    const r = compileSource('&m step=2\n&a step=&m 0 1\n&b step=&m*2 0\n&c step=&m/2 0\n&v loop=440\n&mix [&a * &v]\n&out loop=SAMPLE_RATE map=sample &mix');
    const at = liveAt(r, codeShifts(r), new Set(), 0.125); // a quarter of a step of &m
    expect(at.phases.get('m')).toBeCloseTo(0.25);
    expect(at.phases.get('a')).toBeCloseTo(0.25);
    expect(at.phases.get('b')).toBeCloseTo(0.5); // two steps per step of &m
    expect(at.phases.get('c')).toBeCloseTo(0.125); // one step per two
    expect(at.phases.has('v')).toBe(false); // voices move at audio rate: no pulse
  });
  it('a part is live only while the selector picks it; nothing after the end', () => {
    const r = compileSource(`&bar step=120bpm 0 0 0 0
  &a step=&aBar 0 2 4 5
  &b step=&bBar 12
  &sections step=&bar &aBar &bBar
  &song over=&sections step=&bar/4 laps=1 0 1
  &v s=tri loop=C4
  &w s=sine loop=C4
  &out loop=SAMPLE_RATE map=sample [&a * &v, &b * &w]`);
    const live = (t: number) => [...liveAt(r, codeShifts(r), new Set(), t).voices].sort();
    expect(live(0.5)).toEqual(['cell:v']);
    expect(live(2.5)).toEqual(['cell:w']);
    expect(live(4.5)).toEqual([]);
    // the selector, its table and the section are on the way: the graph draws them reached
    expect(r.outputs.find((o) => o.voice === 'v')!.via).toEqual(expect.arrayContaining(['song', 'sections', 'aBar']));
  });
});

describe('Korobeiniki in Tetris form: the selector’s playhead', () => {
  const r = compileSource((EXAMPLES as Record<string, { source: string }>).korobeiniki.source, undefined, { resolve: resolveSeed });
  const sec = (32 * 60) / 144;
  it('the selector’s playhead: which section, which parts', () => {
    const live = liveAt(r, codeShifts(r), new Set(), 2.5 * sec).cells.get('tetris')!;
    expect(live.local).toBeCloseTo(2.5, 6); // half way through the third section
    expect([...live.entries].sort()).toEqual([1, 3, 5]);
    // a selector steps through its sections; it doesn't turn like a table
    expect(liveAt(r, codeShifts(r), new Set(), 2.5 * sec).shifts('tetris')).toBe(0);
  });
});

describe('Cellscape: the score both barrels read', () => {
  const r = compileSource((EXAMPLES as Record<string, { source: string }>).cellscape.source, undefined, { resolve: resolveSeed });
  it('the score both barrels read is reached, not dimmed', () => {
    expect(routing(r, new Set()).nodes.has('cell:scenes')).toBe(true);
  });
});

describe('a voice alone, a kit read, a MIDI card and a kit gate', () => {
  it('lights its voice and the way out while it plays', () => {
    const alone = compileSource('&a loop=A4');
    const live = liveAt(alone, codeShifts(alone), new Set(), 12.3);
    expect([...live.voices]).toEqual([cellId('a')]);
    expect([...live.edges]).toEqual([...routing(alone, new Set()).edges]);
    expect(live.nodes.has(cellId('a'))).toBe(true);
  });
  it('the live view lights the member a kit read picks now (decision 029, #29)', () => {
    const band = '&bar scan(1 1 1 1) step=120bpm\n&lead s=saw loop=C4\n&organ s=square loop=C3\n&band &lead &organ\n';
    const src = band + '&orch over=&band step=1m 0 1\n&theme step=4n 0 2 4 5\n&out map=sample [&theme * &orch * .5]';
    const r = compileSource(src);
    const live = (t: number) => [...liveAt(r, codeShifts(r), new Set(), t).voices].filter((v) => v.includes('lead') || v.includes('organ'));
    expect(live(0.7)).toEqual([cellId('lead')]);
    expect(live(2.7)).toEqual([cellId('organ')]);
  });
  const BAND = `&bar scan(1 1 1 1) step=2
&theme step=4n 0 2 4 5
&reed s=square loop=220
&bass step=2n 0 5
&sub loop=55
&groove step=8n &bd ~ &hh ~
&bd note=36 s=sine loop=A1
&hh note=42 s=white hpf=8000`;
  const OUT = `&out map=sample [&theme * &reed, &groove]`;
  const src = `${BAND}\n${OUT}\n&synth map=midi [&theme * &reed] [&bass * &sub] ~!7 &groove`;
  it('what only a MIDI card reaches is routed, through the card; switched off, not', () => {
    const r = compileSource(src);
    const all = routing(r, new Set());
    for (const n of ['synth', 'sub', 'bass']) expect(all.nodes.has(cellId(n)), n).toBe(true);
    expect(all.edges.has(edgeId(cellId('sub'), cellId('synth')))).toBe(true);
    const off = routing(r, new Set([cellId('synth')]));
    for (const n of ['sub', 'bass']) expect(off.nodes.has(cellId(n)), n).toBe(false);
    expect(off.nodes.has(cellId('reed'))).toBe(true);
  });
  const BASE = `&bar scan(1 1 1 1) step=120bpm
&major scale(major)
&bd note=36 s=sine loop=C2
&sd note=38 s=white
&hh note=42 s=white hpf=6000
&kit &bd &sd &hh
&lead s=tri loop=C5
&bell s=sine loop=C6
&tune over=&major step=8n 0 2 4 2
&accent map=amp step=8n 1 .5 .8 .5
`;
  it('routes what a kit gate plays: its trigger, the kit and its members', () => {
    const r = compileSource(BASE + '&beat step=8n 0 2 1 2\n&drums play=&beat &kit\n&out map=sample [&drums]');
    const on = routing(r, new Set()).nodes;
    for (const n of ['beat', 'kit', 'bd', 'sd', 'hh', 'drums']) expect(on.has(`cell:${n}`), n).toBe(true);
  });
});

describe('a stack a gate plays is on the way, as the routing has it (#329)', () => {
  const src = `&bar meter("4/4") step=120bpm
&bd note=36 s=sine loop=A1
&hh note=42 s=white
&kit &bd &hh
&kick note=36 step=8n 0 ~ 0 ~
&hat step=8n ~ 1 ~ 1
&accent map=amp step=4n 1 .5
&lines [&kick * &accent, &hat]
&drumsOut play=&lines &kit
&out map=sample &drumsOut`;
  it('the stack is routed, and each wire into it routed by what the routing takes through it: its lines and their levels', () => {
    const r = compileSource(src);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const all = routing(r, r.off);
    expect(all.nodes.has(cellId('lines'))).toBe(true);
    const model = writtenGraph(r);
    // (a wire is routed when, of each of its groups, the routing has one: engine/graph.ts, `routes`)
    const routed = (from: string, to: string) => {
      const e = model.edges.find((x) => x.from === cellId(from) && x.to === cellId(to));
      return !!e?.routes?.length && e.routes.every((g) => g.some((id) => all.edges.has(id)));
    };
    expect(['kick', 'hat', 'accent'].map((m) => [m, routed(m, 'lines')])).toEqual([
      ['kick', true],
      ['hat', true],
      ['accent', true],
    ]);
    expect(routed('lines', 'drumsOut')).toBe(true);
    // (each pair the routing takes past the stack, into the gate or the voices, is drawn, or drawn through it)
    for (const id of all.edges) {
      const [a, b] = id.split(/->|~>/);
      if (model.nodes.some((n) => n.id === a) && model.nodes.some((n) => n.id === b))
        expect(model.edges.some((e) => e.id === id) || model.through.has(id), `${id} is drawn`).toBe(true);
    }
  });
});

describe('a drummer: a gate whose kit holds the drums its lines name (#379, decision 064)', () => {
  const src = [
    '&bar meter("4/4") step=120bpm',
    '&bd note=36 s=sine loop=A1',
    '&sd note=38 s=white',
    '&hh note=42 s=white hpf=8000',
    '&rim note=37 s=white',
    '&kit &bd &sd &hh &rim',
    '&kick note=36 step=8n &bd ~ &bd ~',
    '&hat step=8n &hh &hh',
    '&lines [&kick, &hat]',
    '&drumsOut play=&lines &kit',
    '&drums map=role &drumsOut',
    '&out map=sample [&drumsOut]',
  ].join('\n');
  const r = compileSource(src);
  const g = writtenGraph(r);
  const rt = routing(r, new Set());
  const routed = (e: (typeof g.edges)[number]) => rt.edges.has(e.id) || !!e.routes?.every((any) => any.some((id) => rt.edges.has(id)));

  it('compiles without diagnostics', () => expect(r.diagnostics).toEqual([]));

  it("draws one kit, the gate's own: the grooves' kit isn't drawn again beside it", () => {
    expect(g.nodes.some((n) => n.id === cellId('kit:voices'))).toBe(false);
    expect(g.edges.some((e) => e.source === cellId('kit:voices') || e.target === cellId('kit:voices'))).toBe(false);
  });

  it('lights the kit, its struck drums and its wires while they play; a drum no line strikes stays unrouted', () => {
    expect(rt.nodes.has(cellId('kit'))).toBe(true);
    for (const id of [edgeId(cellId('kit'), cellId('out')), edgeId(cellId('drumsOut'), cellId('kit')), edgeId(cellId('kit'), cellId('bd')), edgeId(cellId('kit'), cellId('hh'))])
      expect(routed(g.edges.find((e) => e.id === id)!), id).toBe(true);
    expect(rt.nodes.has(cellId('rim'))).toBe(false);
    expect(rt.edges.has(edgeId(cellId('kit'), cellId('rim')))).toBe(false);
  });

  it('lights a role cell with the gate it names (decision 061)', () => {
    expect(rt.nodes.has(cellId('drums'))).toBe(true);
    expect(routed(g.edges.find((e) => e.id === edgeId(cellId('drums'), cellId('drumsOut')))!)).toBe(true);
  });
});

describe('a performer that plays its part moved, play=&line^$-12 (decision 058): its wires lit while it plays (#385)', () => {
  const r = compileSource(
    ['&bar meter("4/4") step=120bpm', '&line step=4n 0 2 4 7', '&bassV s=saw loop=C3', '&bassOut play=&line^$-12 &bassV', '&out map=sample [&bassOut]'].join('\n'),
  );
  const g = writtenGraph(r);
  const rt = routing(r, new Set());
  const routed = (from: string, to: string) => {
    const e = g.edges.find((x) => x.from === cellId(from) && x.to === cellId(to))!;
    return rt.edges.has(e.id) || !!e.routes?.every((any) => any.some((id) => rt.edges.has(id)));
  };
  it('compiles', () => expect(r.diagnostics).toEqual([]));
  it('the part into the gate, the gate into its voice, the voice into the card', () => {
    expect([routed('line', 'bassOut'), routed('bassOut', 'bassV'), routed('bassV', 'out')]).toEqual([true, true, true]);
  });
});

describe('tapes in the graph: their heads and reels are on the way to the sound card', () => {
  it('a note tape and a sound tape: head, tape and reel all routed (not dimmed)', async () => {
    for (const [k, cells] of [
      ['echotape', ['near', 'mid', 'far', 'tape', 'reel']],
      ['testtones', ['first', 'second', 'third', 'loop', 'reel', 'bench']],
    ] as const) {
      const r = compileSource((EXAMPLES as Record<string, { source: string }>)[k].source, undefined, { resolve: resolveSeed });
      const routed = routing(r, r.off).nodes;
      for (const c of cells) expect(routed.has(`cell:${c}`), `${k}: &${c}`).toBe(true);
    }
  });
});
