// Probe (not part of the gate): the rhythm scalogram (#286, docs/notes/multiscale.md lead 7). Every example's notes
// (`eventsBetween`, code seconds) over one length of the piece (`mainLength`: the whole piece if it ends, one cycle if
// it loops; 5 to 12 a day), turned into a signal four ways, a continuous Morlet wavelet transform of each, and the
// cells' spans on the tower (`towerSpans`) and the piece's sections (`sections`) beside it, to see which written levels
// are heard and what is heard that nobody wrote. Then the cones (a change of section, seen from every period) against
// the written boundaries: is a written boundary a cone, and is a cone a written boundary? The arithmetic is in
// scalogram.ts. Writes the tables to PROBE and, with SHEETS=dir, one JSON per piece for scalogram-sheets.mjs.
// Run: PROBE=out.txt SHEETS=dir [ONLY=pop,fiveto12] [TAG=arrangement] [LENGTH=600] [RATE=3] npx vitest run tools/probe/scalogram.test.ts
import { describe, it } from 'vitest';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildGraph } from '../../src/engine/graph';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { mainLength, pieceTime, sections } from '../../src/engine/duration';
import { KEY, SECONDS_PER_STEP } from '../../src/engine/fiveto12';
import { eventsBetween, plan } from '../../src/engine/realize';
import { PRESETS } from '../../src/engine/presets';
import { towerSpans } from '../../src/layout/tower';
import { MOST_RATE, PER_OCTAVE, SIGNALS, W0, around, cones, grid, reach, score, signals, type Cone } from './scalogram';

const log = (t: string) => appendFileSync(process.env.PROBE!, t + '\n');
/** A piece shorter than this (s) is left out: a third of it is a bar or two. */
const SHORTEST = Number(process.env.SHORTEST ?? 16);
/** Points in time kept for the pictures (COLUMNS=240 for a contact sheet of the whole library: smaller files). */
const COLUMNS = Number(process.env.COLUMNS ?? 960);

/** A row thinned to COLUMNS points. */
const thin = (r: Float32Array) =>
  Array.from({ length: Math.min(COLUMNS, r.length) }, (_, c) => +r[Math.floor(((c + 0.5) / Math.min(COLUMNS, r.length)) * r.length)].toPrecision(3));

/** The global spectrum (mean over time, clear of the window's edges) and its peaks above 5 % of the highest. */
function profile(rows: Float32Array[], window: number, periods: readonly number[]) {
  const mean = rows.map((r, i) => {
    const edge = Math.min(0.45, reach(periods[i], window));
    const from = Math.floor(edge * r.length);
    const to = Math.ceil((1 - edge) * r.length);
    let acc = 0;
    for (let c = from; c < to; c++) acc += r[c];
    return to > from ? acc / (to - from) : 0;
  });
  const top = Math.max(...mean);
  const peaks = mean.flatMap((v, i) => (i > 0 && i < mean.length - 1 && v > mean[i - 1] && v >= mean[i + 1] && v > 0.05 * top ? [i] : []));
  return { mean, peaks };
}

const pct = (x: number) => `${Math.round(100 * x)}`.padStart(3);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe.runIf(process.env.PROBE)('the rhythm scalogram', () => {
  it('turns every piece into a scalogram, four ways, and finds its cones', () => {
    const only = process.env.ONLY?.split(',');
    const sheets = process.env.SHEETS;
    if (sheets) mkdirSync(sheets, { recursive: true });
    const tag = process.env.TAG;
    log(`one length of each piece (mainLength), at most ${MOST_RATE} Hz; periods from 1/16 s to a third of it, ${PER_OCTAVE} an octave; Morlet ω0=${W0}`);
    log(`a peak matches a cell when within 1/6 octave of its step or its turn; * a match, ½ a half (or ⅓) of a peak that matches\n`);
    const tally = Object.fromEntries(SIGNALS.map((s) => [s, { peaks: 0, matched: 0, harmonic: 0, slow: 0 }]));
    const short: string[] = [];
    // (the cones against the boundaries: a row a piece and a set of boundaries)
    const scored: { key: string; set: string; n: number; tolerance: number; chance: number; by: Record<string, { precision: number; recall: number }> }[] = [];
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      if (tag && !new RegExp(`tags="[^"]*\\b${tag}\\b`).test(p.source)) continue;
      const program = compileSource(p.source);
      if (!program.ok) continue;
      // (one length of the piece, as the transport has it: the whole piece if it ends, its cycle if it loops)
      const time = pieceTime(program);
      // (LENGTH=s: a length of its own instead, from the start: a day's first ten minutes, say)
      const window = process.env.LENGTH ? Number(process.env.LENGTH) : mainLength(time);
      if (window === null || window < SHORTEST) {
        short.push(`${key} ${window === null ? '–' : window.toFixed(1)}`);
        continue;
      }
      // (RATE=n: at most n samples a second, to see what the few samples of a long piece do to a short one)
      const g = grid(window, Number(process.env.RATE ?? MOST_RATE));
      const model = buildGraph(program);
      const events = eventsBetween(plan(program, codeShifts(program)), 0, window);
      // (the cells' spans in seconds, from the tower: a span from its step to its turn; voices and the card are audible)
      const cells = [...towerSpans(program, model)].flatMap(([id, { at, lo }]) => {
        const node = model.nodes.find((n) => n.id === id);
        if (!node?.cell || node.kind === 'voice' || node.kind === 'junction' || !Number.isFinite(at)) return [];
        const step = Math.pow(10, -at);
        const turn = Number.isFinite(lo) ? Math.pow(10, -lo) : step;
        if (turn < g.periods[0] || step > g.periods[g.periods.length - 1]) return [];
        return [{ name: node.cell.name, step, turn }];
      });
      // (the written boundaries: the sections' starts, and of those apart the ones into something new (a label other than
      // the one before: verse → chorus) and the repeats (drop → drop); 5 to 12's keys too, every ten minutes, apart from
      // its blocks)
      const written = around(sections(program) ?? [], window);
      const inside = written.flatMap((s, i) => (s.at > 0 && s.at < window ? [{ at: s.at, repeat: i > 0 && s.label === written[i - 1].label }] : []));
      const sets: [string, number[]][] = [
        ['sections', inside.map((s) => s.at)],
        ['new', inside.filter((s) => !s.repeat).map((s) => s.at)],
        ['repeats', inside.filter((s) => s.repeat).map((s) => s.at)],
      ];
      if ([...program.cells.values()].some((c) => c.params.law === 'fiveto12')) {
        const key = KEY * SECONDS_PER_STEP;
        const keys = Array.from({ length: Math.floor(window / key) }, (_, k) => k * key).filter((t) => t > 0 && !sets[0][1].some((b) => Math.abs(b - t) < 1));
        sets.push(['keys', keys]);
      }
      const near = (a: number, b: number) => Math.abs(Math.log2(a / b)) < 1 / 6;
      const sig = signals(events, window, g);
      const out: Record<string, unknown> = {
        key,
        window,
        periods: g.periods,
        cells,
        sections: written,
        notes: events.length,
        // (the notes for the picture: every one, or evenly thinned to 40 000)
        events: events
          .filter((_, i) => i % Math.ceil(events.length / 40_000) === 0)
          .map((e) => [+e.at.toFixed(3), +e.dur.toFixed(3), e.voice, Math.round(12 * Math.log2(e.freq / 440)) + 69]),
        signals: {},
      };
      const line: string[] = [];
      const found = new Map<string, Cone[]>();
      for (const s of SIGNALS) {
        const { mean, peaks } = profile(sig[s], window, g.periods);
        const marks = peaks.map((i) => {
          const q = g.periods[i];
          const hit = cells.some((c) => near(q, c.step) || near(q, c.turn));
          const harmonic =
            !hit && peaks.some((j) => j > i && [2, 3].some((k) => near(g.periods[j] / k, q)) && cells.some((c) => near(g.periods[j], c.step) || near(g.periods[j], c.turn)));
          tally[s].peaks++;
          if (hit) tally[s].matched++;
          if (harmonic) tally[s].harmonic++;
          if (q >= 4) tally[s].slow++;
          return `${q < 1 ? q.toFixed(2) : q < 100 ? q.toFixed(1) : q.toFixed(0)}${hit ? '*' : harmonic ? '½' : ''}`;
        });
        line.push(`${s} ${marks.join(' ') || '–'}`);
        // (CONE_LOUD=, CONE_OCTAVES=: how loud a maximum, how long a chain; see `cones`)
        const opts = { loud: Number(process.env.CONE_LOUD ?? 1), octaves: Number(process.env.CONE_OCTAVES ?? 1) };
        found.set(s, cones(sig[s], g.periods, window, { ...opts, fastest: Math.max(1, g.periods[0]), merge: Math.max(1, window / 400) }));
        (out.signals as Record<string, unknown>)[s] = { rows: sig[s].map(thin), mean: mean.map((v) => +v.toPrecision(3)) };
      }
      // (the cones scored against each set of boundaries with two or more in the window: a tolerance of a tenth of their
      // median gap, at least 1 s; the cones that reach up to a tenth of it too)
      for (const [set, boundaries] of sets) {
        if (boundaries.length < 2) continue;
        const gap = median(boundaries.slice(1).map((b, i) => b - boundaries[i]));
        const tolerance = Math.max(1, 0.1 * gap);
        const by: Record<string, { precision: number; recall: number }> = {};
        let chance = 0;
        for (const s of SIGNALS) {
          const r = score(found.get(s)!, boundaries, window, tolerance, 0.1 * gap);
          by[s] = r;
          chance = r.chance;
          // (for the picture: the best cones, twice as many as boundaries, each with whether it lands on one)
          if (set === 'sections')
            (out.signals as Record<string, Record<string, unknown>>)[s].cones = found
              .get(s)!
              .filter((c) => c.top >= 0.1 * gap)
              .slice(0, 2 * boundaries.length)
              .map((c, i) => ({ at: +c.at.toFixed(2), path: c.path.map(([t, q]) => [+t.toFixed(2), +q.toPrecision(4)]), rank: i, hit: r.hits.has(c) }));
        }
        scored.push({ key, set, n: boundaries.length, tolerance, chance, by });
      }
      const spans = [...new Set(cells.flatMap((c) => [c.step, c.turn]).map((x) => (x < 1 ? x.toFixed(2) : x.toFixed(1))))].sort((a, b) => +a - +b);
      const how = time.ends !== null ? 'ends' : window === time.cycle ? 'cycle' : 'longest layer';
      log(`${key.padEnd(14)} ${String(events.length).padStart(6)} notes in ${window.toFixed(0)} s (${how}${time.chance ? ', chance' : ''}) | cells ${spans.join(' ')}`);
      for (const l of line) log(`${''.padEnd(21)}${l}`);
      if (sheets) writeFileSync(join(sheets, `${key}.json`), JSON.stringify(out));
    }
    log(`\nleft out, shorter than ${SHORTEST} s: ${short.join(', ') || 'none'}`);
    log('\nsignal     peaks  on a cell  a harmonic  at ≥ 4 s');
    for (const s of SIGNALS) {
      const t = tally[s];
      log(`${s.padEnd(10)} ${String(t.peaks).padStart(5)}  ${String(t.matched).padStart(9)}  ${String(t.harmonic).padStart(10)}  ${String(t.slow).padStart(8)}`);
    }
    log('\nthe cones against the written boundaries: as many best cones as boundaries; P: % of them on a boundary, R: % of');
    log('boundaries with one, chance: % of the window within the tolerance of a boundary (what P would be at random)\n');
    log(`piece          set        n   tol   chance | ${SIGNALS.map((s) => `${s.padEnd(8)} P   R`).join(' | ')}`);
    for (const x of scored)
      log(
        `${x.key.padEnd(14)} ${x.set.padEnd(8)} ${String(x.n).padStart(3)} ${x.tolerance.toFixed(1).padStart(5)} ${pct(x.chance).padStart(8)} | ${SIGNALS.map((s) => `${''.padEnd(5)}${pct(x.by[s].precision)} ${pct(x.by[s].recall)}`).join(' | ')}`,
      );
    // (the mean over the pieces' sections and 5 to 12's keys: the new and the repeats are parts of the sections)
    const whole = scored.filter((x) => x.set === 'sections' || x.set === 'keys');
    if (whole.length) {
      const mean = (f: (x: (typeof scored)[number]) => number) => whole.reduce((a, x) => a + f(x), 0) / whole.length;
      log(
        `${'mean'.padEnd(14)} ${''.padEnd(8)} ${''.padStart(3)} ${''.padStart(5)} ${pct(mean((x) => x.chance)).padStart(8)} | ${SIGNALS.map((s) => `${''.padEnd(5)}${pct(mean((x) => x.by[s].precision))} ${pct(mean((x) => x.by[s].recall))}`).join(' | ')}`,
      );
    }
  }, 900_000);
});
