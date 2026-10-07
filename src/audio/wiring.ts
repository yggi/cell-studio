/**
 * The wiring plan (#132): which connections `voices.sync` makes, worked out from where sound goes
 * (engine/flows.ts, the flows the graph draws) without Tone, so a test can hold the two equal. `sync` only
 * carries the plan out: it builds the nodes and connects what the plan lists, in its order.
 *
 * Off is applied here, once, by one rule: a connection is made only while its ends, and every cell on the
 * flows it carries, are on. What reaches a sound card does so at compile's levels (an output's gains, a read head's return, a
 * resonator alone in a mix), under the same rules the scheduler uses (`outputSounds`, `liveGains`).
 */
import { BODIES, type CompileResult } from '../engine/program';
import { flows, type Flow } from '../engine/flows';
import { liveGains, outputSounds, returnGains } from '../engine/realize';
import { cellId } from '../engine/ids';

/**
 * A connection, from what sounds into what hears it:
 *  - `tap`: a voice into its mix's wheel, at its gain (to watch: the sound goes out through the sound card);
 *  - `couple`: two resonators into each other, at `gain` (coupling=), both ways;
 *  - `excite`: a voice, or a sound tape's read head, into a resonator, at its gain in the mix that drives it;
 *  - `thread`: a sound tape threaded, its heads its taps (from: the tape, to: itself);
 *  - `record`: a voice onto a sound tape, at its gain in the mix the tape records;
 *  - `return`: a read head back to the sound card, left and right at `gains`.
 */
interface Connection {
  readonly kind: 'tap' | 'couple' | 'excite' | 'thread' | 'record' | 'return';
  readonly from: string;
  readonly to: string;
  readonly gain: number;
  readonly gains?: readonly [number, number];
  /** An excite's source is a read head (its tape's net), not a voice. */
  readonly head?: boolean;
  /** The flows it carries (engine/flows.ts): its cells, and its ends, must all be on. */
  readonly flows: readonly Flow[];
}

export interface Wiring {
  /** In the order they're made. */
  readonly connections: readonly Connection[];
  /** Voices heard from themselves (into the sound card); the rest sound only through sends (a resonator, a tape). */
  readonly heard: ReadonlySet<string>;
  /** Each resonator's level per channel: of every mix it's in (struck there, or ringing alone). */
  readonly levels: ReadonlyMap<string, readonly [number, number]>;
}

export function wiring(result: CompileResult, muted: ReadonlySet<string> = new Set()): Wiring {
  const off = (name: string) => muted.has(cellId(name));
  const fl = flows(result);
  const voice = (name: string) => !!result.cells.get(name)?.voice;
  const body = (name: string) => {
    const c = result.cells.get(name);
    return !!c?.voice && typeof c.params.body === 'string' && !!BODIES[c.params.body];
  };
  const threaded = new Set(result.tapes.filter((t) => !off(t.name)).map((t) => t.name));
  // a sound tape's read head (a cell playing a tape that is threaded)
  const headOf = (name: string) => {
    const play = result.cells.get(name)?.params.play;
    return typeof play === 'string' && threaded.has(play) ? fl.from.get(play)?.find((f) => f.kind === 'play' && f.to === name) : undefined;
  };
  const into = (name: string, kind: Flow['kind']) => (fl.to.get(name) ?? []).filter((f) => f.kind === kind);

  const all: Connection[] = [];
  const add = (c: Connection) => {
    // (the one rule: its ends, and every cell on its flows, are on)
    if (!off(c.from) && !off(c.to) && !c.flows.some((f) => off(f.from) || off(f.to))) all.push(c);
  };
  // a mix's wheel listens to its voices at their gains
  for (const f of fl.all) if (f.kind === 'mix' && voice(f.from)) add({ kind: 'tap', from: f.from, to: f.to, gain: f.gain ?? 1, flows: [f] });
  for (const c of result.cells.values()) {
    if (!body(c.name)) continue;
    // coupled: through the table, both ways, a little of each into the other (once, from the line that says so)
    for (const f of fl.from.get(c.name) ?? [])
      if (f.kind === 'couple' && !f.back && body(f.to)) {
        const k = typeof c.params.coupling === 'number' ? Math.min(0.2, Math.max(0, c.params.coupling)) : 0.02;
        const back = fl.from.get(f.to)!.find((g) => g.kind === 'couple' && g.back && g.to === c.name)!;
        add({ kind: 'couple', from: c.name, to: f.to, gain: k, flows: [f, back] });
      }
    // excited by sound: a mix's voices into it (not itself)
    for (const e of into(c.name, 'excite'))
      for (const m of into(e.from, 'mix')) if (voice(m.from) && m.from !== c.name) add({ kind: 'excite', from: m.from, to: c.name, gain: m.gain ?? 1, flows: [m, e] });
  }
  // sound tapes: threaded (a tape that is off isn't: nothing is recorded, its heads give nothing), and what its mix's voices record onto it
  for (const t of result.tapes) {
    // (what's on it stays while its mix is off: threading needs only the tape)
    add({ kind: 'thread', from: t.name, to: t.name, gain: 1, flows: [] });
    const w = into(t.name, 'write').find((f) => f.from === t.source);
    if (w) for (const m of into(t.source, 'mix')) if (voice(m.from)) add({ kind: 'record', from: m.from, to: t.name, gain: m.gain ?? 1, flows: [m, w] });
  }
  // read heads in mixes: back to the sound card, left and right at their levels (through the mixes and sound cards that are on)
  for (const r of result.returns) {
    const p = headOf(r.head);
    const gains = returnGains(r, muted);
    if (p && p.from === r.tape && (gains[0] > 0 || gains[1] > 0)) add({ kind: 'return', from: r.head, to: r.tape, gain: 1, gains, flows: [p] });
  }
  // resonators excited by a mix with tape heads in it: the heads drive them too
  for (const c of result.cells.values()) {
    if (!body(c.name)) continue;
    for (const e of into(c.name, 'excite'))
      for (const m of into(e.from, 'mix')) {
        const p = headOf(m.from);
        if (p) add({ kind: 'excite', from: m.from, to: c.name, gain: m.gain ?? 1, head: true, flows: [m, e, p] });
      }
  }

  // a voice played only into sends (a resonator's excitation, a tape) isn't heard from itself
  // (a kit's output names the kit: its members are what sound)
  const heard = new Set([
    ...result.outputs
      .filter((o) => !o.silent && outputSounds(result, o, muted))
      .flatMap((o) => (o.kit ? [o.voice, ...(result.cells.get(o.voice)?.children.keys() ?? [])] : [o.voice])),
    ...result.resonances.filter((x) => !off(x.cell) && returnGains(x, muted).some((g) => g > 0)).map((x) => x.cell),
  ]);
  // resonators: heard at the levels of every mix they're in (struck there, or ringing alone)
  const levels = new Map<string, readonly [number, number]>();
  for (const c of result.cells.values()) {
    if (!body(c.name)) continue;
    const name = c.name;
    let l = 0;
    let r = 0;
    for (const o of off(name) ? [] : result.outputs) {
      if (o.silent || !outputSounds(result, o, muted)) continue;
      // (struck directly, or as one of a kit's members)
      const kit = o.kit ? result.cells.get(o.voice) : undefined;
      if (o.voice === name || (kit && kit.children.has(name))) {
        const g = liveGains(o, muted);
        ((l += g[0]), (r += g[1]));
      }
    }
    for (const x of result.resonances)
      if (x.cell === name && !off(name)) {
        const g = returnGains(x, muted);
        ((l += g[0]), (r += g[1]));
      }
    levels.set(name, [l, r]);
  }
  return { connections: all, heard, levels };
}
