import { describe, expect, it } from 'vitest';
import { compileSource } from '../engine/compile';
import { PRESETS } from '../engine/presets';
import { flows, type Flow } from '../engine/flows';
import { cellId } from '../engine/ids';
import type { CompileResult } from '../engine/program';
import { wiring } from './wiring';
import { eventsBetween, outputSounds, plan as planOf, returnGains } from '../engine/realize';
import { codeShifts } from '../engine/program';

const OUT = '&out loop=SAMPLE_RATE map=sample';
const src = (...lines: string[]) => compileSource(lines.join('\n'));
const show = (fs: Iterable<Flow>) => [...new Set([...fs].map((f) => `${f.kind} ${f.id}`))].sort();
const isHead = (r: CompileResult, name: string) => typeof r.cells.get(name)?.params.play === 'string';
/**
 * The cells on the way of what sounds (its voice, its entry, the mixes it goes through to the sound card, the send it
 * feeds): of every output that sounds, and every resonator ringing alone in a mix.
 */
const onTheWay = (r: CompileResult) =>
  [
    ...r.outputs
      .filter((o) => outputSounds(r, o, r.off))
      .map((o) => [o.voice, o.cell, ...o.through, ...o.parts.map((p) => p.mix), ...o.select.map((x) => x.part), ...(o.silent ? o.via : [])]),
    ...r.resonances.filter((x) => returnGains(x, r.off).some((g) => g > 0)).map((x) => [x.cell, ...x.through, ...x.parts.map((p) => p.mix)]),
  ].map((cells) => new Set(cells));
/**
 * The flows sync carries as connections: all but those compile sums into levels — a sound card's channels, a
 * selector's parts, and a read head into a mix that only takes it to the sound card (its return). A head into a mix
 * that drives a resonator is wired, as a send. Every other entry of a mix is wired when sound goes through it (#77):
 * it is on the way of something that sounds, and the mix's wheel hears it.
 */
const wired = (r: CompileResult, f: Flow) => {
  if (f.kind === 'channel' || f.kind === 'part') return false;
  if (f.kind !== 'mix') return true;
  if (isHead(r, f.from))
    return !!flows(r)
      .from.get(f.to)
      ?.some((g) => g.kind === 'excite');
  return onTheWay(r).some((w) => w.has(f.from) && w.has(f.to));
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
        expect(w.heard.has(name) && !!r.cells.get(name)?.voice).toBe(false);
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
    expect(plan()).toEqual(['tap v send 1', 'tap a out 1', 'tap b out 1', 'couple a b 0.05', 'thread tape tape 1', 'record v tape 0.5', 'return h tape 1', 'excite h a 0.3']);
    // a mix off: what only goes through it is unwired; the tape keeps what's on it
    expect(plan(['send'])).toEqual(['tap a out 1', 'tap b out 1', 'couple a b 0.05', 'thread tape tape 1', 'return h tape 1', 'excite h a 0.3']);
    expect(plan(['tape'])).toEqual(['tap v send 1', 'tap a out 1', 'tap b out 1', 'couple a b 0.05']);
    expect(plan(['b'])).toEqual(['tap v send 1', 'tap a out 1', 'thread tape tape 1', 'record v tape 0.5', 'return h tape 1', 'excite h a 0.3']);
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

  it("a mix's wheel hears only the notes that go through it: Baustelle's &einsturz only while it is picked (#77)", () => {
    const r = compileSource(PRESETS.baustelle.source);
    const w = wiring(r, r.off);
    const notes = eventsBetween(planOf(r, codeShifts(r), r.off), 0, 600, true);
    const out = new Map(r.outputs.map((o) => [o.id, o]));
    const hears = (m: string) => notes.filter((n) => w.taps.get(n.output!)?.includes(m));
    // every note names its output, and each mix it opens has a tap from its voice
    const tapped = new Set(w.connections.filter((c) => c.kind === 'tap').map((c) => `${c.from} ${c.to}`));
    for (const n of notes) for (const m of w.taps.get(n.output!) ?? []) expect(tapped).toContain(`${n.voice} ${m}`);
    // &einsturz hears only the notes &tag plays it for, at the end; before, its voices play in their own parts
    const crash = hears('einsturz');
    expect(crash.length).toBeGreaterThan(0);
    for (const n of crash) expect(out.get(n.output!)!.select.map((x) => x.part)).toEqual(['einsturzBar']); // (the tap it is stepped through, decision 016)
    const from = Math.min(...crash.map((n) => n.at));
    const before = notes.filter((n) => n.at < from && ['beamv', 'platev', 'sub'].includes(n.voice));
    expect(new Set(before.map((n) => n.voice))).toEqual(new Set(['beamv', 'platev', 'sub']));
    for (const n of before) expect(w.taps.get(n.output!)).not.toContain('einsturz');
    expect(from).toBeGreaterThan(0.9 * Math.max(...notes.map((n) => n.at)));
    // (and the voices' own parts hear them: &beams' notes in &metalPart, and &out, a chord of the parts)
    expect(new Set(before.filter((n) => n.voice === 'beamv').flatMap((n) => w.taps.get(n.output!)!))).toEqual(new Set(['metalPart', 'out']));
  });

  it("a kit's stream in a mix is heard by that mix's wheel: each member, opened by its notes (#166)", () => {
    const r = src('&kick s=sine loop=50', '&hat s=white', '&kit &kick &hat', '&drums over=&kit step=1 0 1', '&beat [&drums * .5]', `${OUT} &beat`);
    const w = wiring(r);
    expect(w.connections.filter((c) => c.kind === 'tap').map((c) => `${c.from} ${c.to} ${c.gate}`)).toEqual(['kick beat true', 'hat beat true']);
    expect([...w.taps.values()]).toEqual([['beat']]);
    // off: no tap
    expect(wiring(r, new Set([cellId('beat')])).connections.filter((c) => c.kind === 'tap')).toEqual([]);
  });

  it('a kit member that is off is not heard from itself, the others are (#166)', () => {
    const r = src('&kick s=sine loop=50', '&hat s=white', '&kit &kick &hat', '&drums over=&kit step=1 0 1', '&beat [&drums * .5]', `${OUT} &beat`);
    expect(wiring(r).heard).toEqual(new Set(['kit', 'kick', 'hat']));
    expect(wiring(r, new Set([cellId('hat')])).heard).toEqual(new Set(['kit', 'kick']));
  });

  it('a voice in two mixes opens each from its own notes; mixes in mixes and instruments hear their notes too', () => {
    const r = src(
      '&a step=1 0',
      '&b step=1 4',
      '&v s=saw',
      '&inst [&(map=adsr 0 .1 .5 .1) * &v]',
      '&one [&a * &v * .5]',
      '&two [&b * &inst]',
      '&both [&one, &two]',
      `${OUT} &both`,
    );
    const w = wiring(r);
    const by = (cell: string) => r.outputs.filter((o) => o.cell === cell).map((o) => [...w.taps.get(o.id)!].sort());
    expect(by('a')).toEqual([['both', 'one']]);
    expect(by('b')).toEqual([['both', 'inst', 'two']]);
  });

  it("a resonator's pan= is kept when a mix it rings in is muted (#165, #171)", () => {
    const muted = (...names: string[]) => new Set(names.map(cellId));
    const ring = src('&f body=fork loop=440 pan=0', '&hit step=1 0', '&m [&hit * &f]', '&ring [&f]', `${OUT} [&ring, &m] [&ring, &m]`);
    const level = (m: ReadonlySet<string>) => wiring(ring, m).levels.get('f');
    expect(level(new Set())).toEqual([2, 0]);
    expect(level(muted('ring'))).toEqual([1, 0]);
    expect(level(muted('out'))).toEqual([0, 0]);
  });
});
