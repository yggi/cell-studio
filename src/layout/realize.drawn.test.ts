import { describe, expect, it } from 'vitest';
import { SAILOR_WITH_KIT } from '@yggi/cells/engine/fixtures';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { liveAt } from '@yggi/cells/engine/live';
import { routing } from '@yggi/cells/engine/routing';
import { structureKey, type GraphModel } from '@yggi/cells/engine/graph';
import { buildGraph } from './drawn';
import { edgeLabel } from '@yggi/cells/engine/transform';
import { PRESETS } from '@yggi/cells/engine/presets';

type R = ReturnType<typeof compileSource>;
const events = (r: R, from: number, to: number, muted: string[] = []) => eventsBetween(plan(r, codeShifts(r), new Set(muted)), from, to);

/** The wire from a cell into a product whose voice is `voice` (a junction: graph.ts). */
const intoProduct = (g: GraphModel, from: string, voice: string) =>
  g.edges.find((e) => e.source === `cell:${from}` && g.nodes.some((n) => n.id === e.target && n.kind === 'junction' && n.voice === voice));

describe('graph', () => {
  it('shows exactly the code: no implicit grid, voices as voices, written links only', () => {
    const g = buildGraph(compileSource(PRESETS.royal.source));
    // the vibrato and the envelopes are unnamed cells written on the voices' lines: part of their wheels, no nodes
    expect(g.nodes.some((n) => n.cell?.lambda)).toBe(false);
    // named cells
    expect(
      g.nodes
        .filter((n) => !n.petalOf && !n.cell?.note)
        .map((n) => `${n.kind}:${n.id}`)
        .sort(),
    ).toEqual(
      [
        'cell:cell:bar',
        'cell:cell:key',
        'cell:cell:mix',
        'cell:cell:pedal',
        'cell:cell:scale',
        'cell:cell:theme',
        'voice:cell:bass',
        'voice:cell:lead',
        // (each product in the mix: a junction)
        'junction:junction:mix:0',
        'junction:junction:mix:1',
      ].sort(),
    );
    // … the lead's own (pitch=): a chip on the lead's wheel (layout/voice.ts), without edges of its own
    expect(g.edges.some((e) => e.source.startsWith('cell:λ') || e.target.startsWith('cell:λ'))).toBe(false);
    const ids = g.edges.map((e) => e.id);
    expect(ids).toContain('cell:theme->cell:scale');
    // (the theme into the product it plays, its notes to the lead, the lead's sound into the mix: no edge from the theme
    // to the lead)
    expect(ids).toContain('cell:theme->junction:mix:0');
    expect(ids).toContain('junction:mix:0->cell:lead');
    expect(ids).toContain('cell:lead->cell:mix');
    expect(ids).not.toContain('cell:theme->cell:lead');
    expect(ids).toContain('cell:theme~>cell:bar');
    expect(ids).toContain('cell:scale->cell:key');
    expect(ids).toContain('cell:scale~>cell:key');
    expect(edgeLabel(g.edges.find((e) => e.id === 'cell:key~>cell:theme')!)).toBe('⟳');
    expect(ids.some((i) => i.includes('fifths12TET'))).toBe(false);
  });

  it('labels shifted references; containers sit outside their parts; voices outermost', () => {
    const g = buildGraph(compileSource(SAILOR_WITH_KIT));
    // (&B, spliced once into &tune, is a bulb on its track: its over= is drawn from &tune, #221)
    expect(g.bulbs.get('B')).toBe('tune');
    expect(g.edges.some((e) => e.id === 'cell:tune->cell:lead')).toBe(true);
    const g2 = buildGraph(compileSource('&m step=1\n&x step=&m 0 1 2\n&v loop=440\n&mix_ [&x[1:] * &v]\n&out_ loop=44k map=sample &mix_'));
    expect(edgeLabel(intoProduct(g2, 'x', 'v')!)).toBe('[1:]');
    const d = Object.fromEntries(g.nodes.map((n) => [n.id, n.depth]));
    // (&A is a bulb on &tune's track, &m3 on &C's on it, #221: no nodes of their own; &m1, in &A and &B, has one)
    expect([g.bulbs.get('A'), g.bulbs.get('m3'), g.bulbs.get('m1')]).toEqual(['tune', 'C', undefined]);
    expect(d['cell:tune']).toBeGreaterThan(d['cell:m1']);
    expect(d['cell:fiddle']).toBeGreaterThan(d['cell:tune']);
  });

  it('structureKey ignores content edits', () => {
    const k = (s: string) => structureKey(buildGraph(compileSource(s)));
    expect(k('&a 0 &b\n&b 1')).toBe(k('&a 5 5 &b\n&b 9 9'));
    expect(k('&a 0 &b\n&b 1')).not.toBe(k('&a 0\n&b 1'));
  });
});

describe('modulation: &mix_ [(&theme + &vibrato) * &voice]\n&out_ loop=44k map=sample &mix_', () => {
  const src = '&m step=1\n&t step=&m 0 7\n&vib loop=4 0 .5 0 -.5\n&v loop=440\n&mix_ [(&t + &vib) * &v]\n&out_ loop=44k map=sample &mix_';
  const r = compileSource(src);
  it('draws the modulator into the voice', () => {
    const g = buildGraph(r);
    const vib = intoProduct(g, 'vib', 'v')!;
    expect([vib.port, edgeLabel(vib)]).toEqual(['pitch', '+']);
  });
});

describe('stereo from two mixes', () => {
  it('draws voices into their mix (each product a junction), and the mix into the sound card', () => {
    // (Canon: Frère Jacques: four voices in two mixes, one a channel; Canon per tonos places its voices with pan= since cells v0.2.0)
    const g = buildGraph(compileSource(PRESETS.canon.source));
    const ids = g.edges.map((e) => e.id);
    expect(ids).toContain('junction:left:0->cell:v1');
    expect(ids).toContain('cell:v1->cell:left');
    expect(ids).toContain('junction:right:3->cell:v4');
    expect(ids).toContain('cell:v4->cell:right');
    expect(ids).toContain('cell:out->cell:left');
  });
});

describe('volume streams (map=amp)', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&v s=tri loop=C4\n';
  const out = (mix: string) => `${mix}\n&out loop=SAMPLE_RATE map=sample &mix`;
  it('draws the volume into the voice with ×', () => {
    const g = buildGraph(compileSource(base + '&vol map=amp step=&m 1\n' + out('&mix [&t * &vol * &v]')));
    const vol = intoProduct(g, 'vol', 'v')!;
    expect([vol.port, edgeLabel(vol)]).toEqual(['level', '×']);
  });
});

describe('switching off', () => {
  it('anything switched off cuts its edges: nothing below it stays lit through it (every example, every cell)', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      const g = buildGraph(r);
      for (const n of g.nodes) {
        const routed = routing(r, new Set([n.id])).nodes;
        expect(routed.has(n.id), `${key}: ${n.id} switched off but routed`).toBe(false);
      }
    }
  });
});

describe('map=adsr: an envelope per note', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&v s=tri loop=C4\n';
  it('shapes each note it multiplies, in seconds', () => {
    const r = compileSource(base + '&mix loop=SAMPLE_RATE map=sample [&t * &(map=adsr .01 .2 .5 .8) * &v]');
    expect(r.diagnostics).toEqual([]);
    expect(events(r, 0, 1.9).map((e) => e.env)).toEqual([
      { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 },
      { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.8 },
    ]);
    // written inside the mix: a petal of it
    const g = buildGraph(r);
    expect(g.nodes.find((n) => n.cell?.lambda)!.petalOf).toBe('cell:mix');
  });
});

describe('petals', () => {
  it('an edge through a petal is drawn to its parent — unless it loops back or repeats', () => {
    // &organ holds an unnamed envelope (env=&( … )): part of the organ's wheel, no node and no edge of its own
    const g = buildGraph(compileSource(PRESETS.ricercar.source));
    expect(g.nodes.some((n) => n.cell?.lambda && n.cell.map?.kind === 'adsr')).toBe(false);
    expect(intoProduct(g, 'theme', 'organ')).toBeDefined();
    // an unnamed melody in a product (&( … ) * &v): drawn as its mix's petal, its wire into the product from the mix
    // (the product's notes go to the voice, whose sound goes into the mix: #234)
    const inPlace = buildGraph(compileSource('&m step=1\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&(step=&m 0 2) * &v]'));
    expect(inPlace.nodes.find((n) => n.petalOf)?.petalOf).toBe('cell:out');
    expect(inPlace.edges.map((e) => e.id).sort()).toEqual(['cell:out->junction:out:0', 'junction:out:0->cell:v', 'cell:v->cell:out', 'cell:out->cell:m~'].sort());
    expect(g.edges.some((e) => e.source === e.target)).toBe(false);
  });
});

describe('a voice’s own env= and pitch=', () => {
  const base = '&m step=1\n&t step=&m 0 7\n&u step=&m 4\n';
  it('env= shapes every note the voice plays — the same as the envelope written in the mix', () => {
    const own = compileSource(base + '&v s=tri loop=C4 env=&(map=adsr .01 .2 .5 .3)\n&mix loop=SAMPLE_RATE map=sample [&t * &v]');
    const mixed = compileSource(base + '&v s=tri loop=C4\n&mix loop=SAMPLE_RATE map=sample [&t * &(map=adsr .01 .2 .5 .3) * &v]');
    expect(own.diagnostics).toEqual([]);
    expect(events(own, 0, 1.9).map((e) => e.env)).toEqual(events(mixed, 0, 1.9).map((e) => e.env));
    // written in place, the envelope is part of the voice's wheel (its cap): no node of its own
    expect(buildGraph(own).nodes.some((n) => n.cell?.lambda)).toBe(false);
  });
});

describe('switched off, live', () => {
  it('while playing, no live edge touches a switched-off cell (every example, every cell)', () => {
    for (const [key, p] of Object.entries(PRESETS)) {
      const r = compileSource(p.source);
      const g = buildGraph(r);
      for (const n of g.nodes) {
        const off = new Set([n.id]);
        for (const t of [0.3, 1.7, 4.1]) {
          const live = liveAt(r, codeShifts(r), off, t);
          const bad = [...live.edges].filter((id) => g.edges.some((e) => e.id === id && (e.source === n.id || e.target === n.id)));
          expect(bad, `${key}: ${n.id} off, at ${t}s`).toEqual([]);
        }
      }
    }
  });
});

describe('sound parameters that move', () => {
  const base = '&bar step=120bpm 0 0 0 0\n&t step=&bar 0 2 4 5\n';
  const mix = '\n&mix loop=SAMPLE_RATE map=sample [&t * &v]';
  it('the graph: parameter cells feed their voice, labelled', () => {
    const g = buildGraph(compileSource(base + '&cut step=&bar 400 800\n&v s=saw lpf=&cut' + mix));
    expect(edgeLabel(g.edges.find((x) => x.source === 'cell:cut' && x.target === 'cell:v')!)).toBe('lpf');
  });
});

describe('FM: fm=&op, ratio=, index=', () => {
  const base = '&bar step=120bpm 0 0 0 0\n&t step=&bar 0 4 7\n';
  const mix = '\n&out loop=SAMPLE_RATE map=sample [&t * &car]';
  it('a carrier names its modulator; the modulator is a voice with a ratio; the graph shows it', () => {
    const r = compileSource(base + '&op s=sine ratio=3.5\n&car s=sine loop=C4 fm=&op index=2' + mix);
    expect(r.diagnostics).toEqual([]);
    expect(r.cells.get('car')!.params).toMatchObject({ fm: 'op', index: 2 });
    expect(r.cells.get('op')!.params).toMatchObject({ ratio: 3.5 });
    const g = buildGraph(r);
    expect(edgeLabel(g.edges.find((e) => e.source === 'cell:op' && e.target === 'cell:car')!)).toBe('fm');
  });
});
