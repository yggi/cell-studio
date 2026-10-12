// Probe (not part of the gate): the Shorten ratchet's baseline (#307 step 3, #234). Every example saved as MIDI and
// opened again (`pieceMidi` → `writeMidi` → `readMidi` → `cellsFromMidi`: the path a MIDI file takes into the app), then
// folded by today's Shorten (`shortenAll`), and scored three ways against the example as written:
//   notes      the flat piece and the folded one play the example's notes (key, start within 10 ms)
//   size       the score's characters (the cells that hold notes and time; voices, mixes, labels, comments left
//              out: a flat piece has stock voices): written, flat, folded
//   structure  of the example's phrases (cells of five or more notes written out, `candidates`), how many come back as
//              a cell of the folded piece: the same rhythm and the same contour of its top line (up, down, same), so
//              a phrase written in degrees and the same in semitones, or transposed, still match
// The same for the folder (engine/fold, step 4): the file folded by its tools. A number that may not get worse as they
// learn (step 5). Writes the table to PROBE.
// Run: PROBE=out.txt [ONLY=bwv847,pop] [LONGEST=40000] npx vitest run tools/probe/ratchet.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { plan } from '../../src/engine/realize';
import { PRESETS } from '../../src/engine/presets';
import { pieceMidi } from '../../src/engine/midiexport';
import { readMidi, writeMidi } from '../../src/engine/midifile';
import { cellsFromMidi } from '../../src/engine/midiimport';
import { shortenAll } from '../../src/engine/shorten';
import { bare, differ, heard, phrases, same } from '../../src/engine/fold/score';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** A flat piece longer than this (characters) isn't folded: today's Shorten is quadratic in it. */
const LONGEST = Number(process.env.LONGEST ?? 40000);
describe.runIf(process.env.PROBE)('the Shorten ratchet: every example through MIDI, folded again', () => {
  it('scores notes, size and structure', () => {
    const only = process.env.ONLY?.split(',');
    log(`# the ratchet's baseline (${new Date().toISOString().slice(0, 10)}): through MIDI, folded by shortenAll`);
    log('piece                     notes: flat/shortenAll/fold   score: written   flat shortenAll  fold   phrases back: shortenAll fold /of   seconds: shortenAll fold');
    const totals = { pieces: 0, flatSame: 0, foldSame: 0, toolSame: 0, written: 0, flat: 0, folded: 0, tooled: 0, back: 0, toolBack: 0, of: 0, seconds: 0, toolSeconds: 0 };
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      const r = compileSource(p.source);
      if (!r.ok) continue;
      if ([...r.cells.values()].some((c) => c.params.law !== undefined)) {
        log(`${key.padEnd(24)}  (a law: its notes computed, not written; left out)`);
        continue;
      }
      const midi = readMidi(writeMidi(pieceMidi(r, codeShifts(r)).smf));
      const flat = cellsFromMidi(midi, key);
      if (!flat.notes) {
        log(`${key.padEnd(24)}  (no notes in MIDI)`);
        continue;
      }
      const fr = compileSource(flat.source);
      const fp = plan(fr, codeShifts(fr), fr.off);
      const seconds = fp.end;
      const written = heard(p.source, seconds);
      const flatHeard = heard(flat.source, seconds);
      const flatSame = same(written, flatHeard);
      let folded = flat.source;
      let took = NaN;
      if (flat.source.length <= LONGEST) {
        const t0 = performance.now();
        folded = shortenAll(flat.source).source;
        took = (performance.now() - t0) / 1000;
      }
      const foldSame = same(written, heard(folded, seconds));
      // the folder (engine/fold): the same file, folded by its tools, taken where it plays the same
      const t1 = performance.now();
      const tooled = cellsFromMidi(midi, key, { shorten: true });
      const toolTook = (performance.now() - t1) / 1000;
      const toolSame = same(written, heard(tooled.source, seconds));
      const mine = phrases(p.source);
      const backIn = (src: string) => {
        const theirs = new Set(phrases(src).values());
        return [...mine.values()].filter((s) => theirs.has(s)).length;
      };
      const [back, toolBack] = [backIn(folded), backIn(tooled.source)];
      const [bw, bf, bs, bt] = [bare(p.source), bare(flat.source), bare(folded), bare(tooled.source)];
      log(
        `${key.padEnd(24)}  ${flatSame ? 'same' : 'DIFF'}/${foldSame ? 'same' : 'DIFF'}/${toolSame ? 'same' : 'DIFF'}  ${String(bw).padStart(7)} ${String(bf).padStart(6)} ${String(bs).padStart(7)} ${String(bt).padStart(6)}   ${String(back).padStart(3)} ${String(toolBack).padStart(3)} /${String(mine.size).padEnd(4)}  ${Number.isNaN(took) ? '(too long)' : took.toFixed(1).padStart(5)} ${toolTook.toFixed(2).padStart(6)}`,
      );
      totals.toolSame += +toolSame;
      totals.tooled += bt;
      totals.toolBack += toolBack;
      totals.toolSeconds += toolTook;
      if (!flatSame) log(`${''.padEnd(26)}why: ${differ(written, flatHeard)}; ${flat.moved} starts moved onto a grid of ${flat.perQuarter} a quarter`);
      totals.pieces++;
      totals.flatSame += +flatSame;
      totals.foldSame += +foldSame;
      totals.written += bw;
      totals.flat += bf;
      totals.folded += bs;
      totals.back += back;
      totals.of += mine.size;
      totals.seconds += Number.isNaN(took) ? 0 : took;
    }
    const pct = (a: number, b: number) => `${Math.round((100 * a) / Math.max(1, b))} %`;
    log(
      `\n${totals.pieces} pieces: notes kept ${totals.flatSame} flat, ${totals.foldSame} by shortenAll, ${totals.toolSame} by the folder; score characters ${totals.written} written, ${totals.flat} flat, ${totals.folded} by shortenAll (${pct(totals.folded, totals.written)} of written), ${totals.tooled} by the folder (${pct(totals.tooled, totals.written)}); phrases back ${totals.back} by shortenAll (${pct(totals.back, totals.of)}), ${totals.toolBack} by the folder (${pct(totals.toolBack, totals.of)}) of ${totals.of}; ${totals.seconds.toFixed(0)} s shortenAll, ${totals.toolSeconds.toFixed(1)} s the folder`,
    );
  }, 3_600_000);
});
