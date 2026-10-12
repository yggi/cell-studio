// Probe (not part of the gate): the Shorten ratchet's baseline (#307 step 3, #234). Every example saved as MIDI and
// opened again (`pieceMidi` → `writeMidi` → `readMidi` → `cellsFromMidi`: the path a MIDI file takes into the app), then
// folded by today's Shorten (`shortenAll`), and scored three ways against the example as written:
//   notes      the flat piece and the folded one play the example's notes (key, start within 10 ms)
//   size       the score's characters (the cells that hold notes and time; voices, mixes, labels, comments left
//              out: a flat piece has stock voices): written, flat, folded
//   structure  of the example's phrases (cells of five or more notes written out, `candidates`), how many come back as
//              a cell of the folded piece: the same rhythm and the same contour of its top line (up, down, same), so
//              a phrase written in degrees and the same in semitones, or transposed, still match
// A number that may not get worse as Shorten learns (steps 4–5). Writes the table to PROBE.
// Run: PROBE=out.txt [ONLY=bwv847,pop] [LONGEST=40000] npx vitest run tools/probe/ratchet.test.ts
import { describe, it } from 'vitest';
import { appendFileSync } from 'node:fs';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { eventsBetween, plan } from '../../src/engine/realize';
import { noteOf } from '../../src/engine/midi';
import { flatten } from '../../src/engine/flatten';
import { PRESETS } from '../../src/engine/presets';
import { pieceMidi } from '../../src/engine/midiexport';
import { readMidi, writeMidi } from '../../src/engine/midifile';
import { cellsFromMidi } from '../../src/engine/midiimport';
import { shortenAll } from '../../src/engine/shorten';
import { candidates } from '../../src/engine/shorten/harness';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** A flat piece longer than this (characters) isn't folded: today's Shorten is quadratic in it. */
const LONGEST = Number(process.env.LONGEST ?? 40000);
/** A phrase: at least this many notes. */
const PHRASE = 5;

/**
 * The score's size: the characters of the cells that hold notes and time (braids, tables, meters, kits), without
 * labels, comments, tags, spaces in runs or blank lines; voices, mixes, effects and notes about the piece left out
 * (a flat piece has stock voices, so they don't compare).
 */
function bare(source: string): number {
  const r = compileSource(source);
  const sound = new Set([...r.cells.values()].filter((c) => c.voice || c.mix || c.sink || c.map || c.note || c.name === 'piece').map((c) => c.name));
  return source
    .split('\n')
    .map((l) =>
      l
        .replace(/(^|\s)#.*$/, '')
        .replace(/\s(label|tags|title|show|tier|level)=("[^"]*"|\S+)/g, '')
        .replace(/\sabout=(\([^)]*\)|&\w+)/g, '')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter((l) => l && !sound.has(/^&(\w+)/.exec(l)?.[1] ?? ''))
    .join('\n').length;
}

/** What a piece plays over [0, seconds): key and start, in order. */
function heard(source: string, seconds: number) {
  const r = compileSource(source);
  const p = plan(r, codeShifts(r), r.off);
  return eventsBetween(p, 0, seconds)
    .filter((e) => e.freq > 0)
    .map((e) => ({ key: noteOf(e.freq).note, at: e.at }))
    .sort((a, b) => a.at - b.at || a.key - b.key);
}
/** Do two pieces play the same notes (the same keys, each start within 10 ms)? If not, how they differ. */
function same(a: { key: number; at: number }[], b: { key: number; at: number }[]): boolean {
  return differ(a, b) === '';
}
function differ(a: { key: number; at: number }[], b: { key: number; at: number }[]): string {
  if (a.length !== b.length) return `${b.length} notes for ${a.length}`;
  const keys = a.filter((n, i) => n.key !== b[i].key).length;
  const late = a.reduce((m, n, i) => Math.max(m, Math.abs(n.at - b[i].at)), 0);
  return keys ? `${keys} keys` : late >= 0.01 ? `off by ${Math.round(late * 1000)} ms` : '';
}

/** Each phrase cell's signature: its onsets and lengths (steps from its first), and its top line's contour. */
function phrases(source: string): Map<string, string> {
  const { result, cells } = candidates(source);
  const shifts = codeShifts(result);
  const out = new Map<string, string>();
  for (const c of cells) {
    let events;
    try {
      events = flatten(result, c.name, shifts);
    } catch {
      continue;
    }
    // (the top line: the highest number at each onset)
    const top = new Map<number, { step: number; duration: number; value: number }>();
    for (const e of events) {
      const v = e.value + e.alter;
      const t = top.get(e.step);
      if (!t || v > t.value) top.set(e.step, { step: e.step, duration: e.duration, value: v });
    }
    const line = [...top.values()].sort((a, b) => a.step - b.step);
    if (line.length < PHRASE) continue;
    const s0 = line[0].step;
    const rhythm = line.map((n) => `${+(n.step - s0).toFixed(4)}:${+n.duration.toFixed(4)}`).join(' ');
    const contour = line
      .slice(1)
      .map((n, i) => Math.sign(n.value - line[i].value))
      .join('');
    out.set(c.name, `${rhythm}|${contour}`);
  }
  return out;
}

describe.runIf(process.env.PROBE)('the Shorten ratchet: every example through MIDI, folded again', () => {
  it('scores notes, size and structure', () => {
    const only = process.env.ONLY?.split(',');
    log(`# the ratchet's baseline (${new Date().toISOString().slice(0, 10)}): through MIDI, folded by shortenAll`);
    log('piece                     notes   score: written   flat  folded   phrases: back/of   shorten (s)');
    const totals = { pieces: 0, flatSame: 0, foldSame: 0, written: 0, flat: 0, folded: 0, back: 0, of: 0, seconds: 0 };
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      const r = compileSource(p.source);
      if (!r.ok) continue;
      if ([...r.cells.values()].some((c) => c.params.law !== undefined)) {
        log(`${key.padEnd(24)}  (a law: its notes computed, not written; left out)`);
        continue;
      }
      const flat = cellsFromMidi(readMidi(writeMidi(pieceMidi(r, codeShifts(r)).smf)), key);
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
      const mine = phrases(p.source);
      const theirs = new Set(phrases(folded).values());
      const back = [...mine.values()].filter((s) => theirs.has(s)).length;
      const [bw, bf, bs] = [bare(p.source), bare(flat.source), bare(folded)];
      log(
        `${key.padEnd(24)}  ${flatSame ? 'same' : 'DIFF'}/${foldSame ? 'same' : 'DIFF'}  ${String(bw).padStart(10)} ${String(bf).padStart(6)} ${String(bs).padStart(7)}   ${String(back).padStart(8)}/${String(mine.size).padEnd(4)}   ${Number.isNaN(took) ? '(too long)' : took.toFixed(1)}`,
      );
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
    log(
      `\n${totals.pieces} pieces: notes kept ${totals.flatSame} flat, ${totals.foldSame} folded; score characters ${totals.written} written, ${totals.flat} flat, ${totals.folded} folded (${Math.round((100 * totals.folded) / totals.written)} % of written); phrases back ${totals.back} of ${totals.of} (${Math.round((100 * totals.back) / Math.max(1, totals.of))} %); Shorten ${totals.seconds.toFixed(0)} s in all`,
    );
  }, 3_600_000);
});
