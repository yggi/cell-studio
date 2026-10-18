// Probe (not part of the gate): two colour questions over the library (docs/notes/tower-sky.md, decision 036).
// A. Red or white: a cell whose every step is 0. Would another value mean anything different here? Its 0s are
//    written as 7 instead and the piece played again (`eventsBetween`, the first minute of a hearing): if no note
//    changes (when, which voice, its pitch, how long), the value means nothing here, and the 0 is white; else red.
// B. The outs by their notes: if each out (what goes into the sound card) wore its source's note colour, how often
//    would two share one? At rest (each out's base pitch class, and with its octave), and while playing (the share of
//    the sounding time when two outs sound the same pitch class at once, sampled every 50 ms).
// Run: PROBE=out.txt [ONLY=pop,hypercell] npx vitest run tools/probe/colours.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts, type CompileResult } from '@yggi/cells/engine/program';
import { pieceTime } from '@yggi/cells/engine/duration';
import { listening } from '@yggi/cells/engine/time/span';
import { eventsBetween, plan, type Played } from '@yggi/cells/engine/realize';
import { PRESETS } from '@yggi/cells/engine/presets';
import { towerOuts } from '../../src/layout/towerlayout';
import { blank } from '../../src/layout/cellview';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** The longest stretch played (s): the whole hearing, ten minutes at most. */
const WINDOW = 600;
const pc = (hz: number) => (((Math.round(12 * Math.log2(hz / 440)) + 9) % 12) + 12) % 12;
const oct = (hz: number) => Math.floor((Math.round(12 * Math.log2(hz / 440)) + 57) / 12);

function played(program: CompileResult, window: number): string[] {
  return eventsBetween(plan(program, codeShifts(program)), 0, window)
    .map((e) => `${e.at.toFixed(4)} ${e.voice} ${e.freq.toFixed(2)} ${e.dur.toFixed(4)}`)
    .sort();
}

/** The program with a cell's 0s written as `to`. */
function respelled(program: CompileResult, name: string, to: number): CompileResult {
  const c = program.cells.get(name)!;
  const units = c.units.map((u) => (u.atom.kind === 'note' && u.atom.value === 0 ? { ...u, atom: { ...u.atom, value: to } } : u));
  const cells = new Map(program.cells);
  cells.set(name, { ...c, units });
  return { ...program, cells };
}

/** Every step 0 (rests aside). */
const allZero = (program: CompileResult, name: string) => {
  const c = program.cells.get(name)!;
  if (c.voice || c.kit || c.mix) return false;
  const atoms = c.units.map((u) => u.atom).filter((a) => a.kind !== 'rest');
  return atoms.length > 0 && atoms.every((a) => a.kind === 'note' && a.value === 0 && a.alter === 0);
};

describe.runIf(process.env.PROBE)('colours', () => {
  it('splits red from white, and counts the outs sharing a note', () => {
    const only = process.env.ONLY?.split(',');
    const white: string[] = [];
    const red: string[] = [];
    const disagree: string[] = [];
    let pieces = 0;
    const B = { pieces: 0, outs: 0, basePc: 0, basePcOct: 0, live: 0, low: 0, lowOct: 0, sounding: 0, worst: [] as string[] };
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      const program = compileSource(p.source);
      if (!program.ok) continue;
      pieces++;
      const window = Math.min(WINDOW, listening(pieceTime(program))?.seconds ?? WINDOW);
      const base = played(program, window);
      // A
      for (const name of program.cells.keys()) {
        if (!allZero(program, name)) continue;
        const c = program.cells.get(name)!;
        const other = played(respelled(program, name, 7), window);
        const same = other.length === base.length && other.every((x, i) => x === base[i]);
        const model0 = buildGraph(program);
        const ports = [...new Set(model0.edges.flatMap((e) => (e.from === `cell:${name}` ? [`${e.port}${program.sections?.has(name) ? '·tap' : ''}`] : [])))].sort().join(',');
        const kit = c.over ? program.cells.get(c.over) : undefined;
        const why = `${key} &${name}${c.over ? ` over=&${c.over}${kit?.kit ? `(${kit.units.length} drums)` : ''}` : ''}${c.clock ? '' : ' (no clock)'} → ${ports || 'nothing'}`;
        (same ? white : red).push(why);
        if (same !== blank(program, name)) disagree.push(`${why}: ${same ? 'nothing changes' : 'the notes change'}, the rule says ${blank(program, name) ? 'white' : 'red'}`);
      }
      // B: each out's voices (back along what it carries), their notes
      const model = buildGraph(program);
      const outs = towerOuts(program, model);
      if (outs.length < 2) continue;
      B.pieces++;
      B.outs += outs.length;
      const voicesOf = (id: string) => {
        const seen = new Set([id]);
        const voices = new Set<string>();
        for (let ring = [id]; ring.length;) {
          const next: string[] = [];
          for (const at of ring) {
            const c = program.cells.get(at.slice('cell:'.length));
            if (c?.voice) voices.add(c.name);
            for (const e of model.edges)
              if (e.to === at && (e.band === 'audio' || e.port === 'mix' || e.port === 'is' || e.port === 'voice') && !seen.has(e.from)) {
                seen.add(e.from);
                next.push(e.from);
              }
          }
          ring = next;
        }
        return voices;
      };
      const outVoices = outs.map((o) => voicesOf(o.from));
      const events = eventsBetween(plan(program, codeShifts(program)), 0, window);
      const ofOut = (e: Played) => outVoices.findIndex((vs) => vs.has(e.voice) || (e.instrument !== undefined && vs.has(e.instrument)));
      // (at rest: an out's base, its own frequency, else its most played pitch class)
      const bases = outs.map((o, k) => {
        const c = program.cells.get(o.from.slice('cell:'.length));
        if (c?.voice && c.freq > 0) return [pc(c.freq), oct(c.freq)] as const;
        const w = new Map<string, number>();
        for (const e of events) if (ofOut(e) === k && e.freq > 0) w.set(`${pc(e.freq)} ${oct(e.freq)}`, (w.get(`${pc(e.freq)} ${oct(e.freq)}`) ?? 0) + e.dur);
        const top = [...w].sort((a, b) => b[1] - a[1])[0]?.[0];
        return top ? (top.split(' ').map(Number) as unknown as readonly [number, number]) : null;
      });
      const pcs = bases.flatMap((b) => (b ? [b[0]] : []));
      const pcOct = bases.flatMap((b) => (b ? [`${b[0]} ${b[1]}`] : []));
      const clash = (xs: readonly (string | number)[]) => xs.length - new Set(xs).size;
      B.basePc += clash(pcs);
      B.basePcOct += clash(pcOct);
      // (live: every 50 ms, the pitch classes each out sounds; a clash where two outs share one)
      let both = 0;
      let any = 0;
      let low = 0;
      let lowOct = 0;
      for (let t = 0; t < window; t += 0.05) {
        const now = outs.map(() => new Set<number>());
        const lowest = outs.map(() => Infinity);
        for (const e of events)
          if (e.at <= t && t < e.at + e.dur && e.freq > 0) {
            const k = ofOut(e);
            if (k < 0) continue;
            now[k]!.add(pc(e.freq));
            lowest[k] = Math.min(lowest[k]!, e.freq);
          }
        const sounding = now.filter((s) => s.size).length;
        if (sounding < 2) continue;
        any++;
        if (now.some((a, i) => now.some((b, j) => j > i && [...a].some((x) => b.has(x))))) both++;
        // (each out's lowest note now: what its spire's foot would wear)
        const lows = lowest.filter(Number.isFinite);
        if (clash(lows.map(pc))) low++;
        if (clash(lows.map((f) => `${pc(f)} ${oct(f)}`))) lowOct++;
      }
      B.live += both;
      B.low += low;
      B.lowOct += lowOct;
      B.sounding += any;
      if (any && low / any > 0.3) B.worst.push(`${key} ${Math.round((100 * low) / any)} %`);
    }
    log(`# A. Red or white (${pieces} pieces): cells whose every step is 0, written as 7 instead`);
    log(`white (nothing played changes): ${white.length}`);
    for (const w of white) log(`  ${w}`);
    log(`red (the notes change): ${red.length}`);
    for (const r of red) log(`  ${r}`);
    log(`the rule (blank, cellview.ts) disagrees on ${disagree.length}`);
    for (const d of disagree) log(`  ${d}`);
    log(`\n# B. The outs by their notes (${B.pieces} pieces with two outs or more, ${B.outs} outs)`);
    log(`at rest, two outs on one pitch class: ${B.basePc}; on one pitch class and octave: ${B.basePcOct}`);
    log(`playing, of the time two outs or more sound, the share when two sound one pitch class: ${B.sounding ? Math.round((100 * B.live) / B.sounding) : 0} %`);
    const pct = (x: number) => `${B.sounding ? Math.round((100 * x) / B.sounding) : 0} %`;
    log(`playing, each out's lowest note: two on one pitch class ${pct(B.low)} of the time; on one pitch class and octave ${pct(B.lowOct)}`);
    log(`pieces where the lowest notes clash over 30 % of the time: ${B.worst.join(', ')}`);
  });
});
