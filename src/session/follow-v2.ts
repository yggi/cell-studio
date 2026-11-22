/**
 * A version 2 song as `follow.ts` follows it (#525, rung 2): what a client kept of it (`scored.ts`: the conducts, the
 * scores told, the fragments they carried) made a `Followed`, so `sound.ts` plays it bar by bar as it plays version 1's.
 *
 * - **Each bar's start** is its conduct's (session contract, version 2): a bar plays only once its conduct is told
 *   (`told`), never on a start guessed from the bars before it; one the host passed without laying (`start` null) is
 *   passed.
 * - **Each bar's text** is the score told last that states it (`textOf`), a section's eight bars or a looped window's
 *   one to four (yggi/music-commons#73): the bars its `foreseen` counts.
 * - **A score compiles alone**: it states its meter, tempo and key, and ends in `* from band`, cells' default band at
 *   this app's pin, which never travels. Its `from` lines read each locked fragment by its id and hash from the
 *   fragments the session sent (the welcome's and every score's, kept by hash), else by its id from cells' seed library
 *   (`resolveSeed`; one the seed holds at another hash plays the seed's, as a lockfile's older hash does in cells). A
 *   locked id neither holds: the score's bars are lacked, and said so.
 * - **The digest check**: a bar plays from its score only where its conduct's `foreseen` is the score's at the bar's
 *   place; else it is lacked, and said so.
 * - **The feel's frame** (cells' `FeelFrame`), per the contract: `seed`, `bar` and `style.entropy` from the conduct;
 *   `groups` and `swing` from the score's `&bar` (its meter's beats in eighths, its 8n or 16n lean, else straight
 *   sixteenths, as Jambot's `STRAIGHT`); `section` and `energy` from the score's fields at the bar's place;
 *   `style.artic` (style space's `bite`) and `style.sync` from the score's `&style` at the bar's first moment (cells'
 *   `styleAt`), so a range moves bar by bar.
 *
 * Each score is read once (compiled, its frame's parts worked out), kept by the score it was told as.
 */
import { compileSource } from '@yggi/cells/engine/compile';
import { mainMeter } from '@yggi/cells/engine/midiclock';
import type { FeelFrame } from '@yggi/cells/engine/perform/feel';
import type { CompileOptions, CompileResult, Resolve } from '@yggi/cells/engine/program';
import { styleAt } from '@yggi/cells/engine/styleat';
import { AXIS_NAMES } from '@yggi/cells/engine/style';
import { resolveSeed } from '@yggi/cells/repository/library';
import { barSeconds, textOf, type Followed } from './follow';
import type { Fragment, Score } from './protocol-v2';
import type { Scored } from './scored';

/** The swing a meter with no lean on 8n or 16n is read as: straight sixteenths, as Jambot's `STRAIGHT` (`packages/engine/src/swing.ts`). */
const STRAIGHT = { level: '16n', share: 0.5 } as const;

/** What of a bar's frame a score gives: its meter's groups and swing, and its style's bite and sync at each bar it states. */
interface Framing {
  readonly groups: readonly number[];
  readonly swing: FeelFrame['swing'];
  readonly styles: readonly { readonly artic: number; readonly sync: number }[];
}

/** A score as read: compiled with the fragments it locks, or why its bars can't play from it. */
export interface ReadScore extends Score {
  /** What it compiled to: null where it states nothing, or locks a fragment none holds. */
  readonly result: CompileResult | null;
  /** Why its bars don't play, where it locks a fragment neither the session nor the seed holds; else null. */
  readonly missing: string | null;
  /** Its frame's parts, where it compiled to a meter. */
  readonly framing: Framing | null;
}

/** Whether a text followed is a version 2 score as read. */
export const isReadScore = (t: object): t is ReadScore => 'result' in t && 'framing' in t;

/** How a score's `from` lines are read: a fragment the session sent by its id and hash, else the seed's by its id, else the latest the session sent by that id. */
function resolverOf(fragments: readonly Fragment[]): Resolve {
  const byHash = new Map(fragments.map((f) => [`${f.id}\n${f.hash}`, f.text]));
  const byId = new Map(fragments.map((f) => [f.id, f.text]));
  return (id, hash) => (hash === undefined ? undefined : byHash.get(`${id}\n${hash}`)) ?? resolveSeed(id) ?? byId.get(id) ?? null;
}

/** The ids a score locks that neither the fragments sent (by id and hash) nor the seed (by id) hold. */
function missingOf(score: Score, fragments: readonly Fragment[]): string[] {
  const held = new Set(fragments.map((f) => `${f.id}\n${f.hash}`));
  return score.lock.filter((l) => !held.has(`${l.id}\n${l.hash}`) && resolveSeed(l.id) === null).map((l) => l.id);
}

/** A score's meter as the feel reads it: its `&bar`'s (else the meter the text plays by) beats in eighths, and its lean. */
function meterOf(result: CompileResult): Pick<Framing, 'groups' | 'swing'> | null {
  if (!result.ok) return null;
  const main = mainMeter(result);
  const meter = result.cells.get('bar')?.meter ?? (main ? result.cells.get(main.cell)?.meter : undefined);
  if (!meter || !meter.beats.length) return null;
  const lean = meter.swing?.find((l) => l.level === '8n' || l.level === '16n');
  return {
    groups: meter.beats.map((b) => (b * 8) / meter.unit),
    swing: lean ? { level: lean.level as '8n' | '16n', share: lean.share } : STRAIGHT,
  };
}

const SYNC = AXIS_NAMES.indexOf('sync');
const BITE = AXIS_NAMES.indexOf('bite');

/** Read a score: compiled with the fragments it locks, its frame's parts at each bar it states. */
function read(score: Score, fragments: readonly Fragment[]): ReadScore {
  const missing = score.text ? missingOf(score, fragments) : [];
  if (!score.text || missing.length)
    return {
      ...score,
      result: null,
      framing: null,
      missing: missing.length ? `its score locks ${missing.map((id) => `“${id}”`).join(', ')}, which neither this pin nor the session holds` : null,
    };
  const options: CompileOptions = { resolve: resolverOf(fragments), locked: score.lock };
  const result = compileSource(score.text, undefined, options);
  const meter = meterOf(result);
  const seconds = barSeconds(result);
  const framing =
    meter && seconds !== null
      ? {
          ...meter,
          styles: score.foreseen.map((_, k) => {
            const point = styleAt(score.text, k * seconds, options);
            return { artic: point?.[BITE] ?? NaN, sync: point?.[SYNC] ?? NaN };
          }),
        }
      : null;
  return { ...score, result, framing, missing: null };
}

/** Each score as read, by the score told, with the fragments it was read with (one read short of a fragment is read again once more come). */
const reads = new WeakMap<Score, { fragments: readonly Fragment[]; read: ReadScore }>();

/** A score as read with the fragments the session sent: once, kept by the score. */
export function readScore(score: Score, fragments: readonly Fragment[]): ReadScore {
  const kept = reads.get(score);
  if (kept && (kept.read.missing === null || kept.fragments === fragments)) return kept.read;
  const r = read(score, fragments);
  reads.set(score, { fragments, read: r });
  return r;
}

/** A bar's frame from its conduct and the score that states it; null where the score gives none at the bar's place. */
function frameOf(conduct: Scored['conducts'][number], score: ReadScore): FeelFrame | null {
  const k = conduct.bar - score.bar;
  const style = score.framing?.styles[k];
  const energy = score.energy[k];
  if (!score.framing || !style || energy === undefined || !Number.isFinite(style.artic) || !Number.isFinite(style.sync)) return null;
  return {
    seed: conduct.seed,
    bar: conduct.bar,
    groups: score.framing.groups,
    // (a cast until a cells tag carries yggi/cells#851, which grows the feel's `SectionType` to the nine: music-commons#76)
    section: score.section as FeelFrame['section'],
    style: { entropy: conduct.entropy, artic: style.artic, sync: style.sync },
    swing: score.framing.swing,
    energy,
  };
}

/** A version 2 song as followed: each bar's start and frame from its conduct, its text the score that states it, the bars that can't play from it said. */
export function followedOf(s: Scored): Followed<ReadScore> {
  const texts = s.scores.map((score) => readScore(score, s.fragments));
  const starts = new Map<number, number>();
  const frames = new Map<number, FeelFrame>();
  const lacks = new Map<number, string>();
  for (const c of s.conducts) {
    if (c.start !== null) starts.set(c.bar, c.start);
    const score = textOf(texts, c.bar);
    if (!score?.text) continue;
    const foreseen = score.foreseen[c.bar - score.bar];
    if (score.missing) lacks.set(c.bar, score.missing);
    else if (c.foreseen !== foreseen) lacks.set(c.bar, `its conduct’s digest (${c.foreseen}) is not the one its score foresaw (${foreseen})`);
    const frame = frameOf(c, score);
    if (frame) frames.set(c.bar, frame);
  }
  return { starts, frames, texts, finale: s.finale, lacks, told: true };
}
