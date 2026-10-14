import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { buildGraph } from './drawn';

const voices =
  '&bar scan(1 1 1 1) step=120bpm\n&bd s=sine loop=A1 env=&(map=adsr 0 .3 0 .05)\n&hh s=white hpf=8000 env=&(map=adsr 0 .04 0 .02)\n&sd s=white hpf=1500 env=&(map=adsr 0 .1 0 .04)\n';

describe('a stepped braid of voices plays them (#10 F4)', () => {
  it("draws the drums as one kit: each groove's one wire into it, its one wire out to the mix", () => {
    const r = compileSource(voices + '&groove step=&bar*2 &bd &hh &bd &sd\n&beat step=&bar &bd ~ &sd ~\n&out map=sample [&groove, &beat]');
    const g = buildGraph(r);
    // (the kit the grooves read is drawn, the voices only they play its pieces: no node of their own)
    expect(g.nodes.some((n) => n.id === 'cell:kit:voices')).toBe(true);
    expect(['bd', 'hh', 'sd'].every((v) => g.bulbs.get(v) === 'kit:voices')).toBe(true);
    // (no wire a drum named: each groove reads the kit by one)
    expect(g.edges.filter((e) => e.port === 'braid' && ['cell:groove', 'cell:beat'].includes(e.to))).toEqual([]);
    for (const groove of ['groove', 'beat']) expect(g.edges.filter((e) => e.source === `cell:${groove}` && e.target === 'cell:kit:voices').map((e) => e.port)).toEqual(['over']);
    // (the drums' sound: one wire from the kit, the grooves sending none of their own)
    expect(g.edges.filter((e) => e.to === 'cell:out').map((e) => e.from)).toEqual(['cell:kit:voices']);
    // (each groove's entry in the mix drawn as the kit's one wire)
    for (const groove of ['groove', 'beat']) expect(g.alias.get(`cell:${groove}->cell:out`)).toBe('cell:kit:voices->cell:out');
  });
});
