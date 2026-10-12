// Probe (not part of the gate): the folder over the MIDI library (midi/wtc: Bach's Well-Tempered Clavier, #333), the
// files as they come, not through an example. Each folded (`cellsFromMidi`, `shorten`) and scored: whether the fold
// was taken (it plays the file's notes), the score's characters (fold/score.ts `bare`: notes and time, no voices)
// flat and folded, how many cells hold its phrases (a figure, a table and its run count as theirs), how many of
// those are copies (`base=`), and the seconds it took. Writes the table to PROBE.
// Run: PROBE=out.txt [ONLY=wtc1-02-fugue,…] npx vitest run tools/probe/wtc.test.ts
import { describe, it } from 'vitest';
import { appendFileSync, readFileSync } from 'node:fs';
import { MIDI_FILES } from '../../src/corpus';
import { readMidi } from '../../src/engine/midifile';
import { cellsFromMidi } from '../../src/engine/midiimport';
import { bare } from '../../src/engine/fold/score';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
describe.runIf(process.env.PROBE)('the folder over the MIDI library', () => {
  it('scores each file', () => {
    const only = process.env.ONLY?.split(',');
    log(`# the folder over midi/wtc (${new Date().toISOString().slice(0, 10)})`);
    log('file               notes  taken   flat   fold   fold/flat  cells copies  seconds');
    const t = { notes: 0, taken: 0, flat: 0, fold: 0, cells: 0, copies: 0, seconds: 0, n: 0 };
    for (const m of MIDI_FILES) {
      if (only && !only.includes(m.key)) continue;
      const smf = readMidi(new Uint8Array(readFileSync(`midi/wtc/${m.key}.mid`)));
      const flat = cellsFromMidi(smf, m.title);
      const t0 = performance.now();
      const made = cellsFromMidi(smf, m.title, { shorten: true });
      const seconds = (performance.now() - t0) / 1000;
      const defs = made.source.split('\n').filter((l) => /^&(m|figure|chords|run)\d+ /.test(l));
      const copies = defs.filter((l) => / base=&/.test(l)).length;
      const [bf, bm] = [bare(flat.source), bare(made.source)];
      log(
        `${m.key.padEnd(17)} ${String(made.notes).padStart(6)}  ${made.folded ? 'yes' : 'NO '}  ${String(bf).padStart(6)} ${String(bm).padStart(6)}   ${((100 * bm) / bf).toFixed(0).padStart(5)} %  ${String(defs.length).padStart(5)} ${String(copies).padStart(6)}  ${seconds.toFixed(2).padStart(7)}`,
      );
      Object.assign(t, {
        notes: t.notes + made.notes,
        taken: t.taken + +made.folded,
        flat: t.flat + bf,
        fold: t.fold + bm,
        cells: t.cells + defs.length,
        copies: t.copies + copies,
        seconds: t.seconds + seconds,
        n: t.n + 1,
      });
    }
    log(
      `\n${t.n} files, ${t.notes} notes: folded ${t.taken}; score ${t.flat} flat, ${t.fold} folded (${((100 * t.fold) / t.flat).toFixed(1)} %); ${t.cells} cells, ${t.copies} of them copies; ${t.seconds.toFixed(1)} s`,
    );
  }, 3_600_000);
});
