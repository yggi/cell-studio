import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { buildGraph, feeds, type GraphEdge } from '../engine/graph';
import { codeShifts, type CompileResult } from '../engine/program';
import { routing } from '../engine/routing';
import { PRESETS } from '../engine/presets';
import { carried, flowEdgesOf } from './flowedges';
import { snapshotOf } from './snapshot';

const nameOf = (id: string) => id.slice('cell:'.length);

// what an edge carried before it was one lookup (by port, special case after special case): the reference; at a
// product's junction, the voice it is stands where the voice stood
function byPort(e: GraphEdge, program: CompileResult) {
  const trigger = (voice: string) => program.outputs.find((o) => o.voice === voice)?.cell ?? null;
  if (e.port === 'step') return { phaseCell: nameOf(e.to), voice: null };
  // (a parameter's clock, delaytime=&bar*3/4: its reader doesn't step, the clock's own steps pulse — #178)
  if (e.band === 'sync') return { phaseCell: nameOf(e.from), voice: null };
  if (e.port === 'play' || e.port === 'write') {
    const o = e.port === 'play' ? program.outputs.find((x) => x.tape?.head === nameOf(e.target)) : program.outputs.find((x) => x.cell === nameOf(e.source) && !x.tape);
    return { phaseCell: null, voice: o?.voice ?? null };
  }
  if (feeds(e)) {
    const voice = e.sound ?? nameOf(e.target);
    return { phaseCell: trigger(voice) === nameOf(e.source) ? nameOf(e.source) : null, voice };
  }
  if (e.port === 'mix') {
    const voice = e.sound ?? nameOf(e.source);
    return { phaseCell: trigger(voice), voice };
  }
  // (into a MIDI card, #208: the voice its notes are played on — a voice, a product's, or what a cell named plays)
  if (e.port === 'midi') {
    const [from, to] = [nameOf(e.from), nameOf(e.to)];
    const o = program.outputs.find((x) => (x.voice === from || x.cell === from || x.via.includes(from)) && x.midi?.some((m) => m.card === to));
    const voice = e.sound ?? (program.cells.get(from)?.voice ? from : (o?.voice ?? null));
    return { phaseCell: voice && trigger(voice), voice };
  }
  return { phaseCell: null, voice: null };
}

const SRC = `&bar scan(1 1 1 1) step=120bpm
&minor scan(2 1 2 2 1 2 2)
&tune 0 2 4 over=&minor step=&bar/4
&lead s=sine
&mix loop=SAMPLE_RATE map=sample [&tune * &lead]`;

describe('what an edge carries: one lookup by band and port', () => {
  it('is what the special cases said, on every edge of every example', () => {
    let n = 0;
    for (const [key, { source }] of Object.entries(PRESETS)) {
      const program = compileSource(source);
      // (every cell its own node: the edges as the code writes them)
      for (const e of buildGraph(program, { bulbs: false }).edges) {
        expect(carried(e, program), `${key}: ${e.id} (${e.port} ${e.band})`).toEqual(byPort(e, program));
        n++;
      }
    }
    expect(n).toBeGreaterThan(500);
  });

  it('from a read head drawn as a bulb on its tape: what the head’s own edge carries (decision 021)', () => {
    let n = 0;
    for (const key of ['echotape', 'soundtape', 'worn', 'resonanz'] as const) {
      const program = compileSource(PRESETS[key].source);
      const own = new Map(buildGraph(program, { bulbs: false }).edges.map((e) => [e.id, e]));
      for (const e of buildGraph(program).edges.filter((x) => x.bulb && own.has(x.id))) {
        expect(carried(e, program), `${key}: ${e.id}`).toEqual(carried(own.get(e.id)!, program));
        n++;
      }
    }
    expect(n).toBeGreaterThan(5);
  });

  it('pulses a clock’s ticks with the cell they drive, and a melody into its voice with its steps', () => {
    const program = compileSource(SRC);
    const model = buildGraph(program);
    const edge = (port: string) => model.edges.find((e) => e.port === port)!;
    expect(carried(edge('step'), program)).toEqual({ phaseCell: 'tune', voice: null });
    expect(carried(edge('voice'), program)).toEqual({ phaseCell: 'tune', voice: 'lead' });
    expect(carried(edge('over'), program)).toEqual({ phaseCell: null, voice: null });
  });
});

describe('the flow’s edges of a snapshot', () => {
  it('carry no pointer, and read only cells of their own program', () => {
    for (const key of ['baustelle', 'resonanz', 'twinkle'] as const) {
      const program = compileSource(PRESETS[key].source);
      const model = buildGraph(program);
      const s = snapshotOf(program, model, codeShifts(program), program.off, routing(program, program.off));
      const edges = flowEdgesOf(s, { sizeOf: () => 128, net: [], lit: false, live: null });
      expect(edges.length).toBeGreaterThan(0);
      for (const e of edges) {
        if (e.type !== 'pulse') continue;
        const d = e.data as Record<string, unknown>;
        expect(d).not.toHaveProperty('pointer');
        for (const name of [d.from, d.to, d.table, d.phaseCell, d.voice]) if (name !== null) expect(program.cells.has(name as string), `${key}: ${e.id} reads ${name}`).toBe(true);
      }
    }
  });
});
