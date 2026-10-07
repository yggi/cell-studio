import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';
import { flows, type Flow } from '../engine/flows';
import { cellId } from '../engine/ids';
import type { CompileResult } from '../engine/program';
import { wiring } from './wiring';
import { returnGains } from '../engine/realize';

const OUT = '&out loop=SAMPLE_RATE map=sample';
const src = (...lines: string[]) => compileSource(lines.join('\n'));
const show = (fs: Iterable<Flow>) => [...new Set([...fs].map((f) => `${f.kind} ${f.id}`))].sort();
const isHead = (r: CompileResult, name: string) => typeof r.cells.get(name)?.params.play === 'string';
/**
 * The flows sync carries as connections: all but those compile sums into levels — a sound card's channels, a
 * selector's parts, a mix (or a kit's stream) into a mix, and a read head into a mix that only takes it to the
 * sound card (its return). A head into a mix that drives a resonator is wired, as a send.
 */
const wired = (r: CompileResult, f: Flow) => {
  if (f.kind === 'channel' || f.kind === 'part') return false;
  if (f.kind !== 'mix' || r.cells.get(f.from)?.voice) return true;
  return (
    isHead(r, f.from) &&
    !!flows(r)
      .from.get(f.to)
      ?.some((g) => g.kind === 'excite')
  );
};

describe('voices.sync wires from the flows the graph draws (#132)', () => {
  for (const [key, p] of Object.entries(PRESETS))
    it(`${key}: the connections carry exactly the flows listed`, () => {
      const r = compileSource(p.source);
      const listed = flows(r).all;
      const carried = wiring(r, r.off).connections.flatMap((c) => c.flows);
      // (nothing is wired that the graph doesn't draw: the very flows, not copies)
      for (const f of carried) expect(listed).toContain(f);
      expect(show(carried)).toEqual(show(listed.filter((f) => wired(r, f))));
      // the rest reach a sound card at compile's levels: a head's return, an output's mixes, parts and channels
      for (const f of listed.filter((f) => !wired(r, f))) if (f.kind === 'mix' && isHead(r, f.from)) expect(r.returns.map((x) => x.head)).toContain(f.from);
    });

  it('off, once: no connection touches a cell that is off (every example, every cell)', () => {
    for (const p of Object.values(PRESETS)) {
      const r = compileSource(p.source);
      for (const name of r.cells.keys()) {
        const w = wiring(r, new Set([cellId(name)]));
        for (const c of w.connections) expect([c.from, c.to, ...c.flows.flatMap((f) => [f.from, f.to])]).not.toContain(name);
        // (a kit's member stays heard, as it was: it plays no notes while it is off)
        const member = [...r.cells.values()].some((k) => k.kit && k.children.has(name));
        if (!member) expect(w.heard.has(name) && !!r.cells.get(name)?.voice).toBe(false);
      }
    }
  });

  it('a mix into a tape, the heads back to the sound card and into a resonator, coupled resonators', () => {
    const r = src(
      '&bar scan(1 1 1 1) step=60bpm',
      '&n step=&bar 0 4',
      '&v s=saw',
      '&send [&n * &v * .5]',
      '&tape write=&send length=4',
      '&h play=&tape at=1',
      '&drive [&h * .3]',
      '&a body=plate loop=D3 excite=&drive couple=&b coupling=.05',
      '&b body=plate loop=A3',
      `${OUT} [&h * .2, &a * .5, &b * .5]`,
    );
    const plan = (muted: string[] = []) => wiring(r, new Set(muted.map(cellId))).connections.map((c) => `${c.kind} ${c.from} ${c.to} ${c.gain}`);
    expect(plan()).toEqual(['tap v send 0.5', 'tap a out 0.5', 'tap b out 0.5', 'couple a b 0.05', 'thread tape tape 1', 'record v tape 0.5', 'return h tape 1', 'excite h a 0.3']);
    // a mix off: what only goes through it is unwired; the tape keeps what's on it
    expect(plan(['send'])).toEqual(['tap a out 0.5', 'tap b out 0.5', 'couple a b 0.05', 'thread tape tape 1', 'return h tape 1', 'excite h a 0.3']);
    expect(plan(['tape'])).toEqual(['tap v send 0.5', 'tap a out 0.5', 'tap b out 0.5', 'couple a b 0.05']);
    expect(plan(['b'])).toEqual(['tap v send 0.5', 'tap a out 0.5', 'thread tape tape 1', 'record v tape 0.5', 'return h tape 1', 'excite h a 0.3']);
    expect(wiring(r).heard).toEqual(new Set(['a', 'b']));
  });

  it('with nothing off, returns and lone resonators reach the sound card at the levels compile gives them (#165)', () => {
    for (const { source } of Object.values(PRESETS)) {
      const r = compileSource(source);
      for (const x of [...r.returns, ...r.resonances]) expect(returnGains(x, new Set())).toEqual([x.gains[0], x.gains[1]]);
    }
  });

  it('muting a mix or the sound card silences what returns through it: tape heads, a resonator ringing alone (#165)', () => {
    const muted = (...names: string[]) => new Set(names.map(cellId));
    const tape = src(
      '&bar step=96bpm 0 0 0 0',
      '&tune step=&bar 0 4 7 ~',
      '&v s=tri loop=C4',
      '&dry [&tune * &v]',
      '&tape write=&dry length=4',
      '&h1 play=&tape at=.5',
      '&wet [&h1 * .4]',
      `${OUT} [&dry, &wet] [&dry, &wet]`,
    );
    const returns = (m: ReadonlySet<string>) => wiring(tape, m).connections.filter((c) => c.kind === 'return');
    expect(returns(new Set()).map((c) => c.gains)).toEqual([[0.4, 0.4]]);
    for (const off of ['out', 'wet', 'h1', 'tape']) expect(returns(muted(off))).toEqual([]);
    // (the dry voice's own mix off: the head still returns)
    expect(returns(muted('dry')).length).toBe(1);

    const ring = src('&f body=fork loop=440', '&hit step=1 0', '&m [&hit * &f]', '&ring [&f]', `${OUT} [&ring, &m] [&ring, &m]`);
    const plan = (m: ReadonlySet<string>) => wiring(ring, m);
    expect(plan(new Set()).levels.get('f')).toEqual([2, 2]);
    // the mix it rings alone in off: only its struck share is left
    expect(plan(muted('ring')).levels.get('f')).toEqual([1, 1]);
    // the sound card off: nothing, and not heard
    expect(plan(muted('out')).levels.get('f')).toEqual([0, 0]);
    expect(plan(muted('out')).heard.has('f')).toBe(false);
  });
});
