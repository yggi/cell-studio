// Probe (not part of the gate): the rhythm scalogram (#286, docs/notes/multiscale.md lead 7). Every example's notes
// (`eventsBetween`, code seconds) over a hearing of the piece (`listening`: the whole piece if it ends, three cycles if
// it loops (CYCLES=n); 5 to 12 a day), turned into a signal four ways, a continuous Morlet wavelet transform of each, and the
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
import { pieceTime, sections } from '../../src/engine/duration';
import { listening } from '../../src/engine/time/span';
import { KEY, SECONDS_PER_STEP } from '../../src/engine/fiveto12';
import { eventsBetween, plan } from '../../src/engine/realize';
import { PRESETS } from '../../src/engine/presets';
import { towerSpans } from '../../src/layout/tower';
import { MOST_RATE, PER_OCTAVE, grid, reach, type Scalogram } from '../../src/engine/time/wavelet';
import { SIGNALS, scalograms } from '../../src/engine/time/signals';
import { cones, novelty, score, sectionsOver, swells, type Boundary } from '../../src/engine/time/boundaries';
import { splices } from '../../src/engine/time/splices';

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
    log(
      `each piece heard whole, a loop ${process.env.CYCLES ?? 3} cycles (listening), at most ${MOST_RATE} Hz; periods from 1/16 s to a third of it, ${PER_OCTAVE} an octave; Morlet ω0=6`,
    );
    log(`a peak matches a cell when within 1/6 octave of its step or its turn; * a match, ½ a half (or ⅓) of a peak that matches\n`);
    const tally = Object.fromEntries(SIGNALS.map((s) => [s, { peaks: 0, matched: 0, harmonic: 0, slow: 0 }]));
    const short: string[] = [];
    // (the cones against the boundaries: a row a piece and a set of boundaries)
    const scored: { key: string; set: string; n: number; tolerance: number; chance: number; by: Record<string, { precision: number; recall: number }> }[] = [];
    // (the same boundaries against the novelty and the swells: each signal alone, and the three of the combined chart)
    const NOVEL = [...SIGNALS, 'three'] as const;
    const novel: { key: string; set: string; by: Record<string, { precision: number; recall: number }> }[] = [];
    const swelled: typeof novel = [];
    // (the boundaries nobody wrote: strong swells of the three signals together that land on no section, and whether a
    // cell's turn explains them, a phrase inside a section)
    const unwritten: string[] = [];
    const tallyUnwritten = { strong: 0, off: 0, turn: 0, chance: 0, splice: 0, spliceChance: 0, pieces: 0 };
    for (const [key, p] of Object.entries(PRESETS)) {
      if (only && !only.includes(key)) continue;
      if (tag && !new RegExp(`tags="[^"]*\\b${tag}\\b`).test(p.source)) continue;
      const program = compileSource(p.source);
      if (!program.ok) continue;
      // (one length of the piece, as the transport has it: the whole piece if it ends, its cycle if it loops)
      const time = pieceTime(program);
      // (LENGTH=s: a length of its own instead, from the start: a day's first ten minutes, say)
      const heard = listening(time, Number(process.env.CYCLES ?? 3));
      const window = process.env.LENGTH ? Number(process.env.LENGTH) : (heard?.seconds ?? null);
      if (window === null || window < SHORTEST) {
        short.push(`${key} ${window === null ? '–' : window.toFixed(1)}`);
        continue;
      }
      // (RATE=n: at most n samples a second, to see what the few samples of a long piece do to a short one)
      const g = grid(window, Number(process.env.RATE ?? MOST_RATE));
      const model = buildGraph(program);
      const played = plan(program, codeShifts(program));
      const events = eventsBetween(played, 0, window);
      // (the splices' boundaries heard: where a braid turns from one spliced cell to the next, engine/time/splices.ts)
      const spliced = splices(played, window).map((x) => x.at);
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
      const written = sectionsOver(sections(program) ?? [], window);
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
      const sig = scalograms(events, g) as Record<(typeof SIGNALS)[number], Scalogram>;
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
      const found = new Map<string, Boundary[]>();
      for (const s of SIGNALS) {
        const { mean, peaks } = profile(sig[s].rows as Float32Array[], window, g.periods);
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
        found.set(s, cones(sig[s], { ...opts, fastest: Math.max(1, g.periods[0]), merge: Math.max(1, window / 400) }));
        (out.signals as Record<string, unknown>)[s] = { rows: sig[s].rows.map(thin), mean: mean.map((v) => +v.toPrecision(3)) };
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
        const nby: Record<string, { precision: number; recall: number }> = {};
        const sby: Record<string, { precision: number; recall: number }> = {};
        for (const s of NOVEL) {
          const rows = s === 'three' ? [sig.envelope, sig.change, sig.voices] : [sig[s]];
          nby[s] = score(novelty(rows, gap), boundaries, window, tolerance);
          sby[s] = score(swells(rows, gap), boundaries, window, tolerance);
        }
        novel.push({ key, set, by: nby });
        swelled.push({ key, set, by: sby });
        if (set === 'sections') {
          const peaks = swells([sig.envelope, sig.change, sig.voices], gap);
          // (the best twice as many as there are boundaries: room for as many again that nobody wrote)
          const strong = peaks.slice(0, 2 * boundaries.length);
          const off = strong.filter((x) => !boundaries.some((b) => Math.abs(b - x.at) <= tolerance));
          // (for the combined chart: each of them, by rank, on a section or not)
          out.swells = strong.map((x, rank) => ({ at: +x.at.toFixed(2), rank, hit: !off.includes(x) }));
          // (a cell's turn from a quarter of the gap up to it, and over twice the tolerance: a phrase, not the bar, which
          // would explain any moment; at a multiple of it, explained)
          const turns = cells.filter((c) => c.turn > Math.max(2 * tolerance, gap / 4) && c.turn < gap).map((c) => ({ name: c.name, turn: c.turn }));
          const why = (t: number) => turns.find((c) => Math.abs(t - Math.round(t / c.turn) * c.turn) <= tolerance)?.name;
          let covered = 0;
          for (let k = 0; k < 1000; k++) if (why(((k + 0.5) / 1000) * window)) covered++;
          tallyUnwritten.strong += strong.length;
          tallyUnwritten.off += off.length;
          tallyUnwritten.turn += off.filter((x) => why(x.at)).length;
          tallyUnwritten.chance += (covered / 1000) * off.length;
          // (or on a splice's boundary: a phrase written inside a braid; and how much of the time is that close to one)
          const onSplice = (t: number) => spliced.some((b) => Math.abs(b - t) <= tolerance);
          let near = 0;
          for (let k = 0; k < 1000; k++) if (onSplice(((k + 0.5) / 1000) * window)) near++;
          tallyUnwritten.splice += off.filter((x) => onSplice(x.at)).length;
          tallyUnwritten.spliceChance += (near / 1000) * off.length;
          tallyUnwritten.pieces++;
          if (off.length)
            unwritten.push(
              `${key.padEnd(14)} ${off.length}/${strong.length} of the best swells on no section (a cell's turn covers ${pct(covered / 1000)} % of the time): ${off
                .sort((a, b) => a.at - b.at)
                .map((x) => `${x.at < 120 ? x.at.toFixed(1) + ' s' : (x.at / 60).toFixed(1) + ' min'}${why(x.at) ? ` (&${why(x.at)})` : ''}${onSplice(x.at) ? ' (splice)' : ''}`)
                .join(', ')}`,
            );
        }
      }
      const spans = [...new Set(cells.flatMap((c) => [c.step, c.turn]).map((x) => (x < 1 ? x.toFixed(2) : x.toFixed(1))))].sort((a, b) => +a - +b);
      const how = time.ends !== null ? 'ends' : `${heard?.rounds ?? 1}× its ${heard?.cycle === time.cycle ? 'cycle' : 'longest layer'}`;
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
    for (const [title, rows] of [
      ["the novelty (a change in which periods are loud, at the scale of the boundaries' median gap)", novel],
      ['the swells (loud for a while at periods from an eighth to half the median gap)', swelled],
    ] as const) {
      log(`\nthe same boundaries against ${title}: as many best peaks as boundaries; P and R as above\n`);
      log(`piece          set      | ${NOVEL.map((s) => `${s.padEnd(8)} P   R`).join(' | ')}`);
      for (const x of rows) log(`${x.key.padEnd(14)} ${x.set.padEnd(8)} | ${NOVEL.map((s) => `${''.padEnd(5)}${pct(x.by[s].precision)} ${pct(x.by[s].recall)}`).join(' | ')}`);
      const whole = rows.filter((x) => x.set === 'sections' || x.set === 'keys');
      if (!whole.length) continue;
      const mean = (f: (x: (typeof rows)[number]) => number) => whole.reduce((a, x) => a + f(x), 0) / whole.length;
      log(`${'mean'.padEnd(14)} ${''.padEnd(8)} | ${NOVEL.map((s) => `${''.padEnd(5)}${pct(mean((x) => x.by[s].precision))} ${pct(mean((x) => x.by[s].recall))}`).join(' | ')}`);
    }
    log('\nthe boundaries nobody wrote: the best swells of the three signals together (twice as many as boundaries) that');
    log('land on no section, each with the cell at a multiple of whose turn (a phrase: a quarter of the gap or more) it falls\n');
    for (const l of unwritten) log(l);
    const u = tallyUnwritten;
    if (u.pieces)
      log(
        `\nover ${u.pieces} pieces: ${u.off} of ${u.strong} of the best swells land on no section; ${u.turn} of those on a multiple of a cell's turn (at random: ${u.chance.toFixed(1)}), ${u.splice} on a splice's boundary (at random: ${u.spliceChance.toFixed(1)})`,
      );
  }, 900_000);
});
