// Probe (not part of the gate): the frequency tower (docs/notes/mera.md). Every cell of every example placed by its time
// constant — a clocked cell by its steps per second and its turn (steps per second ÷ steps), a voice by its pitch — and
// the graph's row (its depth in the signal path) beside it, to see whether rows by time would turn anything upside down.
// Run: PROBE=out.txt npx vitest run tools/probe/tower.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '../../src/engine/compile';
import { PRESETS } from '../../src/engine/presets';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
const fmt = (hz: number) => (hz >= 1 ? `${hz.toPrecision(3)} Hz` : `1/${(1 / hz).toPrecision(3)} s`);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

describe.runIf(process.env.PROBE)('the frequency tower', () => {
  it('places every cell by its time constant', () => {
    const byRole = new Map<string, { turn: number[]; step: number[]; depth: number[]; who: string[] }>();
    const add = (role: string, turn: number, step: number, depth: number, who: string) => {
      const r = byRole.get(role) ?? { turn: [], step: [], depth: [], who: [] };
      r.turn.push(turn);
      r.step.push(step);
      r.depth.push(depth);
      r.who.push(who);
      byRole.set(role, r);
    };
    let inverted = 0;
    let selectors = 0;
    const lines: string[] = [];
    for (const [key, p] of Object.entries(PRESETS)) {
      const program = compileSource(p.source);
      const model = buildGraph(program);
      const sinks = new Set(program.outputs?.flatMap((o) => o.parts.map((x) => x.sink)) ?? []);
      const mixes = new Set(model.edges.filter((e) => e.port === 'mix').map((e) => e.to.replace(/^cell:/, '')));
      // (a selector: a stepped cell reading, through over=, a table whose entries are mixes)
      const partsTables = new Set(
        [...program.cells.values()].filter((c) => c.units.length && c.units.every((u) => u.atom.kind === 'ref' && mixes.has(u.atom.name))).map((c) => c.name),
      );
      for (const n of model.nodes) {
        if (n.kind === 'junction' || n.petalOf) continue;
        const c = n.cell;
        // (steps per second: its clock's, times its own rate when it is driven by another: values.ts)
        const info = c.clock ? program.clocks.get(c.clock) : undefined;
        const clock = info ? { perSecond: info.perSecond * (c.clock === c.name ? 1 : c.rate) } : undefined;
        const steps = Math.max(1, c.steps);
        const name = `${key}:&${c.name}`;
        if (n.kind === 'voice') add('voice', c.freq || NaN, c.freq || NaN, n.depth, name);
        else if (sinks.has(c.name)) add('sound card', NaN, NaN, n.depth, name);
        else if (mixes.has(c.name)) add('mix', NaN, NaN, n.depth, name);
        else if (!clock) add('table (undriven)', 0, 0, n.depth, name);
        else {
          const sel = model.edges.some((e) => e.port === 'over' && e.to === n.id && partsTables.has(e.from.replace(/^cell:/, '')));
          const role = sel ? 'selector' : n.isMeter ? 'meter' : 'clocked';
          add(role, clock.perSecond / steps, clock.perSecond, n.depth, name);
          if (sel) {
            selectors++;
            // (what it selects: its sound passes through it, so in the flow it comes after every voice it picks)
            const voices = model.nodes.filter((v) => v.kind === 'voice').length;
            if (voices) inverted++;
            lines.push(
              `  ${name.padEnd(30)} turn ${fmt(clock.perSecond / steps).padStart(10)}  section ${fmt(clock.perSecond).padStart(10)}  downstream of the sound of ${voices} voices`,
            );
          }
        }
      }
    }
    // (the implicit-&out idea: what reads nothing on — a sink of the flow — besides the sound card and notes)
    const loose = new Map<string, string[]>();
    for (const [key, p] of Object.entries(PRESETS)) {
      const program = compileSource(p.source);
      const model = buildGraph(program);
      const read = new Set(model.edges.filter((e) => e.port !== 'about').map((e) => e.from));
      const notes = new Set(model.edges.filter((e) => e.port === 'about').map((e) => e.from));
      for (const n of model.nodes) {
        if (n.kind === 'junction' || n.petalOf || read.has(n.id)) continue;
        const c = n.cell;
        if (c.sink || notes.has(n.id) || (n.kind === 'cell' && n.isMeter)) continue;
        const kind = n.kind === 'voice' ? 'voice' : c.mix ? 'mix' : program.clocks.get(c.clock ?? '') ? 'stepped' : 'table';
        loose.set(kind, [...(loose.get(kind) ?? []), `${key}:&${c.name}`]);
      }
    }
    log('read by nothing (would turn hot under an implicit &out):');
    for (const [k, v] of loose) log(`  ${k.padEnd(8)} ${String(v.length).padStart(4)}  e.g. ${v.slice(0, 6).join(' ')}`);
    log(`# The tower (${Object.keys(PRESETS).length} examples)\n`);
    log('role               cells   median turn    median step');
    for (const [role, r] of [...byRole].sort((a, b) => median(a[1].depth) - median(b[1].depth)))
      log(
        `${role.padEnd(18)} ${String(r.who.length).padStart(5)}   ${r.turn.some((x) => x > 0) ? fmt(median(r.turn.filter((x) => x > 0))).padStart(12) : '—'.padStart(12)}   ${r.step.some((x) => x > 0) ? fmt(median(r.step.filter((x) => x > 0))).padStart(12) : '—'.padStart(12)}`,
      );
    log(`\nselectors: ${selectors}; downstream of the voices they pick (their sound goes through them): ${inverted}`);
    lines.forEach(log);
    const m = byRole.get('meter');
    if (m) log(`\nmeters' turns: ${fmt(Math.min(...m.turn))} … ${fmt(Math.max(...m.turn))}; steps ${fmt(Math.min(...m.step))} … ${fmt(Math.max(...m.step))}`);
    const cl = byRole.get('clocked');
    if (cl) {
      const span = cl.turn.filter((x) => x > 0);
      log(
        `clocked cells' turns: ${fmt(Math.min(...span))} … ${fmt(Math.max(...span))}; below 1/60 s (a minute or longer): ${span.filter((x) => x < 1 / 60).length} of ${span.length}`,
      );
    }
  });
});
