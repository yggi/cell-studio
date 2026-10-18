// Probe (not part of the gate): #416's later rungs, measured before building them. Material: the motifs heard in each
// example's notes (`motifs`, engine/time/motifs.ts) against the cells written (`structure`, engine/time/structure.ts):
// a motif is folded when one cell holds every place it is heard, at the same offset into it, in a line that feeds that
// voice (the figure repeats because the cell does); two places at different offsets in one cell are the cell writing it
// twice. Sound: what a waterfall's band "no note owns" (`owners`) would flag although a cell writes it: the voices with
// no pitch (noise, a kit's drums) and the effects with a tail (room=, delay=). Writes its tables to PROBE.
// Run: PROBE=out.txt [ONLY=pop,hypercell] [LENGTH=600] npx vitest run tools/probe/explained.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { compileSource } from '@yggi/cells/engine/compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { pieceTime } from '@yggi/cells/engine/duration';
import { listening } from '@yggi/cells/engine/time/span';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { PRESETS } from '@yggi/cells/engine/presets';
import { motifs } from '@yggi/cells/engine/time/motifs';
import { structure } from '@yggi/cells/engine/time/structure';
import { clocking } from '@yggi/cells/engine/clocking';
import { lapOf } from '@yggi/cells/engine/readers';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** At most this much of a piece is listened to (s): motifs are looked for over ten minutes in the app too. */
const LENGTH = Number(process.env.LENGTH ?? 600);
/** Two offsets into a cell are one within this (s), or 2 % of the cell's length. */
const TOL = 0.02;
/** (LAPS=1: each output line's laps written too) */
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : '–');

describe.runIf(process.env.PROBE)('#416: material and sound, heard against written', () => {
  it('measures the library', { timeout: 600_000 }, () => {
    const only = process.env.ONLY?.split(',');
    const rows: string[] = [];
    let [allMotifs, allFolded, allPartial, piecesWith, piecesFolded] = [0, 0, 0, 0, 0];
    let [pieces, unpitched, tails] = [0, 0, 0];
    const partialShares: number[] = [];
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (only && !only.some((o) => key.includes(o))) continue;
      const program = compileSource(preset.source);
      if (!program.ok) continue;
      pieces++;
      // sound: what sounds but owns no pitch band, though a cell writes it
      const voices = [...program.cells.values()].filter((c) => c.voice);
      const noPitch = voices.filter((c) => !(c.freq > 0) || /noise|white|pink|brown/.test(String(c.params.s ?? '')));
      const kits = program.outputs.some((o) => o.kit);
      const tail = voices.some((c) => Number(c.params.room ?? 0) > 0 || Number(c.params.delay ?? 0) > 0);
      if (noPitch.length || kits) unpitched++;
      if (tail) tails++;
      // material
      const shifts = codeShifts(program);
      const time = pieceTime(program);
      const heard = listening(time);
      const length = Math.min(LENGTH, Math.max(4, heard?.cycle ?? heard?.seconds ?? 30));
      const p = plan(program, shifts, new Set(program.off));
      const notes = eventsBetween(p, 0, length).filter((e) => e.freq > 0);
      const ms = motifs(notes);
      // (the written side: the splice tree, and with LAPS=1 each output line's laps too — a cell that loops is the
      // commonest way a figure repeats, and the splice tree has none for a line that splices nothing; restarts when a
      // section switches a part on are not followed)
      const spliced = structure(p, length);
      const laps = process.env.LAPS
        ? program.outputs.flatMap((o) => {
            const c = program.cells.get(o.cell);
            const lap = lapOf(program, o.cell);
            if (!c?.clock || !(lap > 0) || !(c.rate > 0)) return [];
            const tm = clocking(program, shifts).map(c.clock);
            const out: { cell: string; at: number; to: number; output: string; base?: string }[] = [];
            for (let k = 0; out.length < 4000; k++) {
              const at = tm.q((k * lap) / c.rate);
              const to = tm.q(((k + 1) * lap) / c.rate);
              if (!(to > at) || at > length) break;
              out.push({ cell: o.cell, at, to, output: o.id });
            }
            return out;
          })
        : [];
      const nodes = [...spliced, ...laps];
      // (the lines that feed a voice: its outputs, by id or by the line's cell)
      const feeds = (voice: string) => new Set(program.outputs.flatMap((o) => (o.voice === voice || o.kit ? [o.id, o.cell] : [])));
      let folded = 0;
      let partial = 0;
      for (const m of ms) {
        // each place heard: the (cell, offset) keys of every written node that holds it, in a line feeding its voice
        const keys = m.heard.map((o) => {
          const lines = feeds(o.voice);
          return new Set(
            nodes
              .filter((n) => lines.has(n.output) && n.at <= o.at + TOL && o.to <= n.to + TOL)
              .map((n) => `${n.base ?? n.cell}@${Math.round((o.at - n.at) / Math.max(TOL, 0.02 * (n.to - n.at)))}`),
          );
        });
        const count = new Map<string, number>();
        for (const ks of keys) for (const k of ks) count.set(k, (count.get(k) ?? 0) + 1);
        const best = Math.max(0, ...count.values());
        if (best === m.heard.length) folded++;
        else if (best >= 2) partial++;
        partialShares.push(best / m.heard.length);
      }
      allMotifs += ms.length;
      allFolded += folded;
      allPartial += partial;
      if (ms.length) piecesWith++;
      if (ms.length && folded === ms.length) piecesFolded++;
      if (ms.length) rows.push(`| ${key} | ${ms.length} | ${folded} | ${partial} | ${ms.length - folded - partial} | ${nodes.length} |`);
    }
    log(`## Material: motifs heard against cells written (${pieces} examples, ${LENGTH} s at most each)\n`);
    log('| piece | motifs | folded | partly | unfolded | written nodes |');
    log('|---|---|---|---|---|---|');
    for (const r of rows) log(r);
    log(
      `\nmotifs ${allMotifs}: folded ${allFolded} (${pct(allFolded, allMotifs)}), partly ${allPartial} (${pct(allPartial, allMotifs)}), unfolded ${allMotifs - allFolded - allPartial} (${pct(allMotifs - allFolded - allPartial, allMotifs)})`,
    );
    log(`pieces with motifs ${piecesWith} of ${pieces}; every motif folded in ${piecesFolded}`);
    const sorted = [...partialShares].sort((a, b) => a - b);
    log(`share of a motif's places one cell explains: median ${sorted.length ? sorted[Math.floor(sorted.length / 2)]!.toFixed(2) : '–'}`);
    log(`\n## Sound: written but owning no pitch band\n`);
    log(`pieces with a voice of no pitch or a kit: ${unpitched} of ${pieces} (${pct(unpitched, pieces)})`);
    log(`pieces with a tail (room=, delay=): ${tails} of ${pieces} (${pct(tails, pieces)})`);
  });
});
