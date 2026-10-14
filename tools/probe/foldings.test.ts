// Probe (not part of the gate): foldings and motifs over the library (#286, docs/notes/scalogram.md). For every piece,
// a hearing of it (`listening`: whole, or three cycles of a loop; at most ten minutes: a folding is a local pattern, and
// over half an hour 5 to 12's glass varies with its keys):
// - the foldings (src/engine/time/necklace.ts): each voice's rhythm round each clocked cell's cycle (its turn, with
//   its step as the pulse), and each voice's pitch classes round the octave; the same necklace at two levels or kinds
//   is a piece folded the same way at two scales (the bell and the major scale: examples/bell.cells);
// - the motifs (src/engine/time/motifs.ts): a figure of five notes heard more than once, and those heard at more than
//   one time scale (augmented, diminished).
// Run: PROBE=out.txt [ONLY=bell,canon] npx vitest run tools/probe/foldings.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { buildGraph } from '../../src/layout/drawn';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { pieceTime } from '@yggi/cells/engine/duration';
import { listening } from '@yggi/cells/engine/time/span';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { PRESETS } from '@yggi/cells/engine/presets';
import { towerSpans } from '../../src/layout/tower';
import { alike, foldings, levelsOf, pulseOf } from '@yggi/cells/engine/time/necklace';
import { motifs, multiscale } from '@yggi/cells/engine/time/motifs';

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
      const window = Math.min(LONGEST, listening(pieceTime(program))?.seconds ?? 60);
      const model = buildGraph(program);
      const events = eventsBetween(plan(program, codeShifts(program)), 0, window);
      // (the levels: engine/time/necklace.ts levelsOf, from the cells' spans on the tower)
      const spans = [...towerSpans(program, model)].flatMap(([id, { at, lo }]) => {
        const node = model.nodes.find((n) => n.id === id);
        return node?.cell && node.kind === 'cell' && Number.isFinite(at) && Number.isFinite(lo) ? [{ name: node.cell.name, step: Math.pow(10, -at), turn: Math.pow(10, -lo) }] : [];
      });
      const levels = levelsOf(spans, pulseOf(events.map((e) => e.at)), window, MOST_SLOTS);
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
