// Probe (not part of the gate): foldings and motifs over the library (#286, docs/notes/scalogram.md). For every piece,
// one length of it (`mainLength`, at most 10 minutes):
// - the foldings (src/engine/time/necklace.ts): each voice's rhythm round each clocked cell's cycle (its turn, with
//   its step as the pulse), and each voice's pitch classes round the octave; the same necklace at two levels or kinds
//   is a piece folded the same way at two scales (the bell and the major scale: examples/bell.cells);
// - the motifs (src/engine/time/motifs.ts): a figure of five notes heard more than once, and those heard at more than
//   one time scale (augmented, diminished).
// Run: PROBE=out.txt [ONLY=bell,canon] npx vitest run tools/probe/foldings.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { buildGraph } from '../../src/engine/graph';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { mainLength, pieceTime } from '../../src/engine/duration';
import { eventsBetween, plan } from '../../src/engine/realize';
import { PRESETS } from '../../src/engine/presets';
import { towerSpans } from '../../src/layout/tower';
import { alike, foldings, pulseOf, type Level } from '../../src/engine/time/necklace';
import { motifs, multiscale } from '../../src/engine/time/motifs';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** The longest stretch looked at (s), and the most slots a level's cycle may have. */
const LONGEST = 600;
const MOST_SLOTS = 64;
const short = (s: number) => (s < 1 ? `${+s.toFixed(3)} s` : s < 120 ? `${+s.toFixed(2)} s` : `${+(s / 60).toFixed(1)} min`);

describe.runIf(process.env.PROBE)('foldings and motifs', () => {
  it('finds the same folding at more than one level, and motifs at more than one scale', () => {
    const only = process.env.ONLY?.split(',');
    let pieces = 0;
    let folded = 0;
    let crossKind = 0;
    let multi = 0;
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      const program = compileSource(p.source);
      if (!program.ok) continue;
      const window = Math.min(LONGEST, mainLength(pieceTime(program)) ?? 60);
      const model = buildGraph(program);
      const events = eventsBetween(plan(program, codeShifts(program)), 0, window);
      // (the levels: any clocked cell's turn as the cycle, with any cell's step, or the finest pulse heard, as its pulse,
      // whole slots a cycle: the bell's bar is &beat's turn, its pulse &pulse's step; voices and the card aren't levels)
      const cycles: { name: string; s: number }[] = [];
      const pulses: number[] = [];
      for (const [id, { at, lo }] of towerSpans(program, model)) {
        const node = model.nodes.find((n) => n.id === id);
        if (!node?.cell || node.kind !== 'cell' || !Number.isFinite(at) || !Number.isFinite(lo)) continue;
        pulses.push(Math.pow(10, -at));
        if (Math.pow(10, -lo) <= window) cycles.push({ name: `&${node.cell.name}`, s: Math.pow(10, -lo) });
      }
      // (the finest pulse heard, unless a written one is within 2 % of it)
      const heard = pulseOf(events.map((e) => e.at));
      if (heard && !pulses.some((q) => Math.abs(q / heard - 1) < 0.02)) pulses.push(heard);
      const levels: Level[] = [];
      for (const c of cycles)
        for (const pulse of pulses) {
          const n = Math.round(c.s / pulse);
          if (n < 3 || n > MOST_SLOTS || Math.abs(n * pulse - c.s) > 0.02 * pulse) continue;
          if (!levels.some((l) => Math.abs(l.cycle - c.s) < 1e-6 && Math.abs(l.pulse - pulse) < 1e-6)) levels.push({ name: `${c.name}/${n}`, cycle: c.s, pulse });
        }
      pieces++;
      if (process.env.DEBUG)
        log(
          `${key}: ${window} s; levels ${levels.map((l) => `${l.name} ${l.cycle.toFixed(3)}/${l.pulse.toFixed(3)}`).join(', ')}; ${foldings(events, levels)
            .map((f) => `${f.voice} ${f.level} ${f.name}`)
            .join('; ')}`,
        );
      const groups = alike(foldings(events, levels)).filter((g) => g.name.split(' ').length >= 3);
      const ms = motifs(events);
      const wide = multiscale(ms);
      if (!groups.length && !wide.length) continue;
      log(`${key} (${short(window)}, ${events.length} notes, ${levels.length} levels)`);
      if (groups.length) folded++;
      if (groups.some((g) => new Set(g.where.map((f) => f.kind)).size > 1)) crossKind++;
      if (wide.length) multi++;
      for (const g of groups.slice(0, 4))
        log(
          `  folding ${g.name}${g.even ? ' (maximally even)' : ''}: ${g.where
            .slice(0, 8)
            .map((f) => `${f.voice} ${f.kind === 'pitch' ? 'pitch' : `round ${f.level}`}`)
            .join(', ')}${g.where.length > 8 ? ` … ${g.where.length} in all` : ''}`,
        );
      for (const m of wide.slice(0, 3))
        log(
          `  motif ${m.shape}: heard ${m.heard.length}× at ${m.scales.map(short).join(', ')} (×${(m.scales[m.scales.length - 1] / m.scales[0]).toFixed(2)}) in ${[...new Set(m.heard.map((h) => h.voice))].join(', ')}`,
        );
    }
    log(`\nover ${pieces} pieces: ${folded} have a folding at two levels or more (${crossKind} across rhythm and pitch); ${multi} a motif at two time scales or more`);
  }, 900_000);
});
