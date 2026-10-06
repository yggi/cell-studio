// Which pieces the smoke test (tools/smoke.mjs) plays in full: the fewest that, between them, build every
// kind of audio node the library uses. Every piece is still opened and started; these are the ones that
// also play for a while. Worked out from what each example compiles to, so a new example that brings a
// new kind of sound joins the list by itself.
//
//   npx vite-node tools/smoke-pick.ts   (or: npm run smoke -- --list)
import { readFileSync } from 'node:fs';
import { compileSource } from '../src/engine/compile';
import type { CompileResult } from '../src/engine/program';
import { ORDER } from '../src/engine/order';
import { pieceMeta } from '../src/engine/parser';

/**
 * What a piece asks of the audio graph (src/audio: voices.ts, voice/*.ts): each voice's source (a braid,
 * a named oscillator or noise, a resonator's body), every sound parameter it sets or moves, its exciters'
 * bodies, mixes, the sound card's level, each part of a sound tape it threads, and how its notes are
 * played (kits, gates, bends, level streams, envelopes, sends, off a tape).
 */
export function audioFeatures(r: CompileResult): Set<string> {
  const f = new Set<string>();
  for (const c of r.cells.values()) {
    if (c.mix) f.add('mix');
    if (c.sink && c.params.level !== undefined) f.add('sound card level');
    if (!c.voice) continue;
    f.add(c.params.body !== undefined ? `body=${c.params.body}` : c.params.s !== undefined ? `s=${c.params.s}` : 'braid wave');
    for (const k of Object.keys(c.params)) if (k !== 's' && k !== 'body') f.add(`${k}=`);
    for (const k of Object.keys(c.paramCells)) f.add(`${k}= moving`);
    for (const e of c.exciters ?? []) if (e.params.body !== undefined) f.add(`exciter body=${e.params.body}`);
  }
  // and how notes are played on them (src/audio/voice/voice.ts playNote)
  for (const o of r.outputs) {
    if (o.kit) f.add('kit');
    if (o.gate) f.add('gate');
    if (o.mods.length) f.add('pitch bend');
    if (o.levels.length) f.add('level stream');
    if (o.envelope) f.add('adsr envelope');
    if (o.silent) f.add('send');
    if (o.tape) f.add('off a tape');
  }
  for (const t of r.tapes) {
    f.add('tape');
    if (t.length > 0) f.add('tape length=');
    if (t.hiss > 0) f.add('tape hiss=');
    if (t.print > 0) f.add('tape print=');
    if (t.dropout > 0) f.add('tape dropout=');
    if (t.heads.some((h) => h.wander > 0)) f.add('tape wander=');
  }
  if (r.returns.length) f.add('tape head in a mix');
  if (r.resonances.length) f.add('resonator in a mix');
  return f;
}

export interface SmokePick {
  readonly key: string;
  readonly title: string;
  /** The features it is the first of the picks to bring. */
  readonly brings: readonly string[];
}

/** A greedy cover: again and again, the piece that brings the most features not yet covered (the earlier in the library on a tie). */
export function smokePicks(dir = 'examples'): SmokePick[] {
  const pieces = ORDER.map((key) => {
    const source = readFileSync(`${dir}/${key}.cells`, 'utf8').replace(/\n$/, '');
    return { key: key as string, title: pieceMeta(source)?.title ?? key, features: audioFeatures(compileSource(source)) };
  });
  const covered = new Set<string>();
  const picks: SmokePick[] = [];
  for (;;) {
    let best: (typeof pieces)[number] | null = null;
    let most = 0;
    for (const p of pieces) {
      const n = [...p.features].filter((x) => !covered.has(x)).length;
      if (n > most) [best, most] = [p, n];
    }
    if (!best) return picks;
    const brings = [...best.features].filter((x) => !covered.has(x)).sort();
    brings.forEach((x) => covered.add(x));
    picks.push({ key: best.key, title: best.title, brings });
  }
}
