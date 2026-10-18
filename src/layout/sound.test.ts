import { PRESETS } from '@yggi/cells/engine/presets';
import { compileSource } from '@yggi/cells/engine/compile';
import { describe, expect, it } from 'vitest';
import { buildGraph } from './drawn';
import { soundRole, withCard } from './sound';
import { minimap } from './minimap';
import { socketHeights, socketId, towerLayers, towerOuts, withSockets } from './towerlayout';

const of = (source: string) => {
  const program = compileSource(source);
  return { program, model: buildGraph(program) };
};

describe('one rule for the sound card: written or built-in', () => {
  it('a voice alone (An oscillator) goes into the built-in card: a socket, an out, in the audible at its pitch, a lane', () => {
    const { program, model } = of(PRESETS.oscillator.source);
    const outs = towerOuts(program, model);
    expect(outs.map((o) => o.from)).toEqual(['cell:a']);
    // (the edge's id is the one the engine's live state gives it, so it is live as a written one is)
    expect(outs[0]!.id).toBe('cell:a->cell:card:builtin');
    const drawn = withSockets(program, model);
    const socket = socketId(outs[0]!.id);
    expect(drawn.nodes.some((n) => n.id === socket)).toBe(true);
    // (the card has no node of its own: it is everywhere, a socket each sound)
    expect(drawn.nodes.some((n) => n.id === 'cell:card:builtin')).toBe(false);
    const layers = towerLayers(program, model, drawn).layers;
    expect(layers.get(socket)).toBe('audible');
    expect(layers.get('cell:a')).toBe('voice');
    expect(socketHeights(program, model, drawn).has(socket)).toBe(true);
    expect(minimap(drawn, () => 0).lanes.map((l) => l.source)).toEqual(['cell:a']);
  });

  it('hears every sound nothing else reads, not what a mix reads; a written card is as written', () => {
    const { program, model } = of('&a loop=A4\n&b loop=E5\n&m [&b]\n&lfo step=2 0 1');
    expect(
      towerOuts(program, model)
        .map((o) => o.from)
        .sort(),
    ).toEqual(['cell:a', 'cell:m']);
    const written = of(PRESETS.waltz.source);
    expect(withCard(written.program, written.model)).toBe(written.model);
    // (and adding the card twice adds nothing)
    const once = withCard(program, model);
    expect(withCard(program, once)).toBe(once);
  });

  it('makes, gates or mixes: the voices, the gates, the mixers; the structure none', () => {
    const { program, model } = of('&a loop=A4\n&b loop=E5\n&m [&b]\n&lfo step=2 0 1');
    const role = (id: string) =>
      soundRole(
        program,
        model.nodes.find((n) => n.id === id)!,
      );
    expect(role('cell:a')).toBe('maker');
    expect(role('cell:m')).toBe('mixer');
    expect(role('cell:lfo')).toBeNull();
    const hyper = of(PRESETS.hypercell.source);
    const roles = new Set(hyper.model.nodes.map((n) => soundRole(hyper.program, n)));
    expect(roles).toEqual(new Set(['maker', 'gate', 'mixer', null]));
  });
});
