/**
 * A version 2 song played (#525, rung 2): scores as Jambot writes them (`jambot-scores.json`, its `lifted` line naming
 * where they came from), and the hub's version 2 vectors' scores where they fit (`vectors-v2.json`), followed from their
 * conducts and played bar by bar through `sound.ts` and the player's feed.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { channelTable, router } from '@yggi/cells/engine/midi';
import { readerOf, type FeelFrame } from '@yggi/cells/engine/perform/feel';
import { perform } from '@yggi/cells/engine/perform/perform';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { fragmentHash } from '@yggi/cells/engine/use';
import { resolveSeed } from '@yggi/cells/repository/library';
import { SessionFeed } from '../ui/state/sessionFeed';
import { barSeconds, type Followed } from './follow';
import { followedOf, readScore, type ReadScore } from './follow-v2';
import type { Conduct, Fragment, Score } from './protocol-v2';
import { NOTHING_SCORED, welcomed, withConduct, withScore, type Scored } from './scored';
import { soundingOf, type Lack, type Slice } from './sound';

interface Section {
  readonly preset: string;
  readonly conducts: readonly { readonly bar: number; readonly seed: number; readonly entropy: number; readonly foreseen: string }[];
  readonly score: Score;
}
const fixture = JSON.parse(readFileSync(new URL('./jambot-scores.json', import.meta.url), 'utf8')) as { lifted: string; sections: readonly Section[] };

/** A bar of a score's own time, in seconds. */
const secondsOf = (score: Score) => barSeconds(readScore(score, []).result!)!;
/** A section's conducts laid from 10 s on the host's clock, each bar as long as `bar` (seconds), with digests as `foreseen` says. */
const conductsOf = (s: Section, bar: number, foreseen = (c: Section['conducts'][number]) => c.foreseen): Conduct[] =>
  s.conducts.map((c, i) => ({ bar: c.bar, start: 10 + bar * i, seed: c.seed, entropy: c.entropy, offer: null, foreseen: foreseen(c) }));
const scoredOf = (conducts: readonly Conduct[], scores: readonly Score[], fragments: readonly Fragment[] = []): Scored => {
  let s = welcomed(null, fragments, { id: 'band', hash: 'e2:0' });
  for (const c of conducts) s = withConduct(s, c);
  for (const score of scores) s = withScore(s, score);
  return s;
};
/** Everything a song followed plays from before its first bar to its last, as one ask: its slices and what it lacked. */
const played = (f: Followed<ReadScore>) => {
  const length = (t: ReadScore) => (t.result ? barSeconds(t.result) : null);
  const s = soundingOf(f, null, 1000, 9, length);
  return { slices: s.slices as readonly Slice<ReadScore>[], lacked: s.lacked as readonly Lack[] };
};
const lackedOf = (lacked: readonly Lack[]) => lacked.filter((l) => !l.silent);
const silentOf = (lacked: readonly Lack[]) => lacked.filter((l) => l.silent);

/** The style each preset's score states (cells' library of styles, `&funk from styles`): its sync and its bite, the feel's `artic`. */
const STYLE: Readonly<Record<string, { sync: number; artic: number }>> = {
  Funk: { sync: 1, artic: 0.85 },
  'Swing jazz': { sync: 0.35, artic: 0.3 },
  'Bossa nova': { sync: 0.75, artic: 0.45 },
};
/** Each preset's swing as its score's `&bar` states it (`meter(swing=16n:.6)`, `meter(swing=8n:2/3)`, straight). */
const SWING: Readonly<Record<string, FeelFrame['swing']>> = {
  Funk: { level: '16n', share: 0.6 },
  'Swing jazz': { level: '8n', share: 2 / 3 },
  'Bossa nova': { level: '16n', share: 0.5 },
};

describe('a version 2 song played from its scores (#525, rung 2)', () => {
  it('lifts its fixtures from Jambot, and they are what the tests read: three presets, two sections each, 8 bars a section', () => {
    expect(fixture.lifted).toMatch(/^Lifted from yggi\/jambot @ c472cf7/);
    expect(fixture.sections.map((s) => [s.preset, s.score.bar, s.score.section, s.score.foreseen.length])).toEqual([
      ['Funk', 0, 'intro', 8],
      ['Funk', 8, 'groove', 8],
      ['Swing jazz', 0, 'intro', 8],
      ['Swing jazz', 8, 'groove', 8],
      ['Bossa nova', 0, 'intro', 8],
      ['Bossa nova', 8, 'groove', 8],
    ]);
    // (each ends in the band passed the score's lines, as cells' `bandLine` writes it)
    for (const s of fixture.sections) expect(s.score.text.split('\n').at(-1)).toMatch(/^\* from band\(drumlines=&drumlines, /);
  });

  it.each(fixture.sections.map((s) => [`${s.preset} from bar ${s.score.bar}`, s] as const))(
    'plays each bar of %s from its score, none lacked and none silent, where the conducts carry its digests',
    (_, s) => {
      const bar = secondsOf(s.score);
      const { slices, lacked } = played({ ...followedOf(scoredOf(conductsOf(s, bar), [s.score])), finale: s.score.bar + 7 });
      expect([lackedOf(lacked), silentOf(lacked)]).toEqual([[], []]);
      expect(slices.map((x) => x.bar)).toEqual(s.conducts.map((c) => c.bar));
      // (each its score's bar at its place, whole, on the bar as laid)
      for (const x of slices) {
        const k = x.bar - s.score.bar;
        expect(x.from).toBe(k * bar);
        expect(x.to).toBeCloseTo((k + 1) * bar, 9);
        expect(x.at).toBeCloseTo(10 + k * bar, 9);
        expect(x.scale).toBeCloseTo(1, 9);
        expect(x.text.bar).toBe(s.score.bar);
      }
    },
  );

  it('makes each bar’s frame from its conduct and its score, per the contract', () => {
    for (const s of fixture.sections) {
      const f = followedOf(scoredOf(conductsOf(s, 2), [s.score]));
      for (const [k, c] of s.conducts.entries())
        expect(f.frames.get(c.bar)).toEqual({
          seed: c.seed,
          bar: c.bar,
          groups: [2, 2, 2, 2],
          section: s.score.section,
          style: { entropy: c.entropy, ...STYLE[s.preset]! },
          swing: SWING[s.preset]!,
          energy: s.score.energy[k],
        });
    }
  });

  it('lacks exactly the bar whose conduct carries another digest than its score foresaw, and says why', () => {
    const s = fixture.sections[0]!;
    const conducts = conductsOf(s, 2, (c) => (c.bar === 3 ? 'another' : c.foreseen));
    const { slices, lacked } = played({ ...followedOf(scoredOf(conducts, [s.score])), finale: 7 });
    expect(lacked).toEqual([{ bar: 3, why: `its conduct’s digest (another) is not the one its score foresaw (${s.score.foreseen[3]})` }]);
    expect(slices.map((x) => x.bar)).toEqual([0, 1, 2, 4, 5, 6, 7]);
  });

  it('plays a bar no score states silent, and says so', () => {
    const s = fixture.sections[0]!;
    const conducts = [...conductsOf(s, 2), { bar: 8, start: 26, seed: 1, entropy: 0.3, offer: null, foreseen: 'x' }];
    const f = { ...followedOf(scoredOf(conducts, [s.score])), finale: 8 };
    const { slices, lacked } = played(f);
    // (while it hasn't begun, a score may yet come for it: it waits)
    expect([slices.map((x) => x.bar), lacked]).toEqual([[0, 1, 2, 3, 4, 5, 6, 7], []]);
    // (begun with none: silent, said)
    expect(soundingOf(f, { bar: 8, into: 0 }, 27, 26, (t) => barSeconds(t.result!)).lacked).toEqual([{ bar: 8, why: 'no text stated it', silent: true }]);
  });

  it('plays a bar only once its conduct is told: one begun without it is lacked, one not begun waits', () => {
    const s = fixture.sections[0]!;
    // (bar 5's conduct not told: bars 0–4 play, then it waits while bar 5 hasn't begun)
    const conducts = conductsOf(s, 2).filter((c) => c.bar < 5);
    const f = followedOf(scoredOf(conducts, [s.score]));
    const early = soundingOf(f, null, 1000, 9, (t) => barSeconds(t.result!));
    expect([early.slices.map((x) => x.bar), early.lacked, early.done]).toEqual([[0, 1, 2, 3, 4], [], { bar: 5, into: 0 }]);
    // (come to it after it began, guessed from the bars before: lacked)
    expect(soundingOf(f, early.done, 21, 20.5, (t) => barSeconds(t.result!)).lacked).toEqual([{ bar: 5, why: 'the host never told where it starts' }]);
  });

  it('plays the bars a score of fewer bars told later states (a looped window) from it, and the rest from the section’s', () => {
    const [funk, , jazz] = fixture.sections;
    // (a window of two bars, 2 and 3, scored again as a loop of its own: another text, its digests the conducts')
    const window: Score = { ...jazz!.score, bar: 2, step: 32, energy: [0.5, 0.5], foreseen: ['w2', 'w3'] };
    const conducts = conductsOf(funk!, 2, (c) => (c.bar === 2 || c.bar === 3 ? `w${c.bar}` : c.foreseen));
    const { slices, lacked } = played({ ...followedOf(scoredOf(conducts, [funk!.score, window])), finale: 7 });
    expect(lacked).toEqual([]);
    expect(slices.map((x) => [x.bar, x.text.text === window.text ? 'window' : 'section', x.from / secondsOf(x.text)])).toEqual([
      [0, 'section', 0],
      [1, 'section', 1],
      [2, 'window', 0],
      [3, 'window', 1],
      [4, 'section', 4],
      [5, 'section', 5],
      [6, 'section', 6],
      [7, 'section', 7],
    ]);
    // (told before the section's, the section's wins: the score told last)
    expect(played({ ...followedOf(scoredOf(conductsOf(funk!, 2), [window, funk!.score])), finale: 7 }).lacked).toEqual([]);
  });

  /** A score locking a fragment the Muse filed, as the hub's vector's: its lead the motif, over the key. */
  const motif = '&muse_motif_1 from &key\n&muse_motif_1 over=&key step=8n 0 2 4 2';
  const sent: Fragment = { id: 'muse_motif_1', hash: fragmentHash(motif), text: motif };
  const lead = (bar: number, fragments: readonly Fragment[], lock: Score['lock'] = [{ id: 'diatonic', hash: fragmentHash(resolveSeed('diatonic')!) }, sent]): Score => ({
    bar,
    step: bar * 16,
    section: 'groove',
    text: '&bar meter("4/4") step=120bpm\n&key from diatonic(mode=aeolian) A\n&muse_motif_1 from muse_motif_1 &key\n&leadline part=lead step=8n &muse_motif_1\n* from band(leadline=&leadline)',
    unstated: null,
    lock: lock.map(({ id, hash }) => ({ id, hash })),
    fragments,
    energy: [0.5, 0.5],
    foreseen: [`m${bar}`, `m${bar + 1}`],
    cut: [],
  });
  const conducted = (bars: readonly number[]): Conduct[] => bars.map((bar) => ({ bar, start: 10 + 2 * bar, seed: 1, entropy: 0.3, offer: null, foreseen: `m${bar}` }));

  it('reads a fragment the session sent once for every later score that locks it; a locked id none holds lacks its bars', () => {
    // (the first score carries the motif; the second locks it and carries nothing)
    const s = scoredOf(conducted([0, 1, 2, 3]), [lead(0, [sent]), lead(2, [])]);
    expect(s.fragments).toEqual([sent]);
    const { slices, lacked } = played({ ...followedOf(s), finale: 3 });
    expect(lacked).toEqual([]);
    expect(slices.map((x) => x.bar)).toEqual([0, 1, 2, 3]);
    // (the motif plays: four eighths a bar, 0 2 4 2 over A minor from the lead's register)
    const first = slices[0]!.text.result!;
    expect(eventsBetween(plan(first, codeShifts(first)), 0, 2, true).length).toBe(8);
    // (a score that locks it in a session that never sent it: its bars lacked, said)
    const lacking = played({ ...followedOf(scoredOf(conducted([0, 1]), [lead(0, [])])), finale: 1 });
    expect(lacking.lacked).toEqual([0, 1].map((bar) => ({ bar, why: 'its score locks “muse_motif_1”, which neither this pin nor the session holds' })));
  });

  it('plays the hub’s version 2 vectors’ scores where they fit: the score whose band is passed its lines, and the unstated one', () => {
    const vectors = JSON.parse(readFileSync(new URL('./vectors-v2.json', import.meta.url), 'utf8')) as {
      vectors: readonly { reads: boolean; message: { kind: string; song?: { scores?: Score[] } | null; fragments?: Fragment[] } & Partial<Score> }[];
    };
    const scores = vectors.vectors.flatMap((v) => {
      if (!v.reads) return [];
      if (v.message.kind === 'score') return [{ score: v.message as Score, fragments: [] as Fragment[] }];
      if (v.message.kind === 'welcome') return (v.message.song?.scores ?? []).map((score) => ({ score, fragments: v.message.fragments ?? [] }));
      return [];
    });
    const texts = [...new Map(scores.map((x) => [x.score.text, x])).values()];
    const play = ({ score, fragments }: (typeof texts)[number]) => {
      const conducts = score.foreseen.map((foreseen, k) => ({ bar: score.bar + k, start: 10 + 2 * k, seed: 1, entropy: 0.3, offer: null, foreseen }));
      return { conducts, ...played({ ...followedOf(scoredOf(conducts, [score], fragments)), finale: score.bar + 7 }) };
    };
    const all = texts.map((t) => ({ text: t.score.text, unstated: t.score.unstated, ...play(t) }));
    const standIn = all.find((t) => t.text.includes('&muse_motif_1'));
    const passed = all.find((t) => t.text.includes('* from band('));
    const unstated = all.find((t) => t.text === '');
    expect(texts.length).toBe(3);
    // (the band passed its lines: its drums play, its hashes the hub's stand-ins, `e2:51d0`, the seed's diatonic read by its id)
    expect(passed!.text).toMatch(/\* from band\(drumlines=&drumlines, leadline=&leadline\)$/);
    expect([passed!.lacked, passed!.slices.map((x) => x.bar)]).toEqual([[], passed!.conducts.map((c) => c.bar)]);
    // (the unstated score: each bar said, as it says)
    expect(unstated!.lacked).toEqual(unstated!.conducts.map((c) => ({ bar: c.bar, why: unstated!.unstated })));
    // (the stand-in that locks the Muse's motif plays &muse_motif_1 without a line that takes it: it doesn't compile)
    expect(standIn!.text).not.toMatch(/from muse_motif_1/);
    expect(standIn!.lacked.map((l) => l.why)).toEqual(standIn!.conducts.map(() => 'its text has no bar to play (it does not compile, or has no meter)'));
  });

  it.each(fixture.sections.map((s) => [`${s.preset} from bar ${s.score.bar}`, s] as const))(
    'plays for each bar of %s what cells plays of its score’s bar, each event as the default performer plays it in the contract’s frame',
    (_, s) => {
      const bar = secondsOf(s.score);
      const f: Followed<ReadScore> = { ...followedOf(scoredOf(conductsOf(s, bar), [s.score])), finale: s.score.bar + 7 };
      const feed = new SessionFeed({ sounding: (done, lead, now, length, reach = lead) => ({ ...soundingOf(f, done, now + lead, now, length, now + reach), shift: 0 }) });
      const fed = feed.next(9, 1000);
      expect([feed.lacks, feed.silent]).toEqual([0, 0]);
      // (the comparison: cells' own events for the bar, the text compiled alone with the seed library, each performed
      // with the frame the contract makes by hand, set against the feed's, field for field)
      const r = compileSource(s.score.text, undefined, { resolve: resolveSeed });
      const p = plan(r, codeShifts(r), r.off);
      const route = router(r, channelTable(r));
      const read = readerOf(r);
      for (const [k, c] of s.conducts.entries()) {
        const frame: FeelFrame = {
          seed: c.seed,
          bar: c.bar,
          groups: [2, 2, 2, 2],
          section: s.score.section,
          style: { entropy: c.entropy, ...STYLE[s.preset]! },
          swing: SWING[s.preset]!,
          energy: s.score.energy[k]!,
        };
        const expected = eventsBetween(p, k * bar, (k + 1) * bar, true).map((e) => perform(e, route, { bar: c.bar, frame, start: k * bar, seconds: bar }, read).event);
        expect(expected.length).toBeGreaterThan(0);
        expect(fed[k]!.window.events).toEqual(expected);
      }
      const logged = feed.log.since(0).events;
      expect(logged.length).toBeGreaterThan(0);
      expect(new Set(logged.map((e) => e.bar))).toEqual(new Set(s.conducts.map((c) => c.bar)));
      expect(fed.map((x) => x.starts)).toEqual(s.conducts.map((c) => ({ bar: c.bar, switched: false })));
    },
  );
});

describe('what is kept of a version 2 song over a rejoin', () => {
  it('carries what was kept of the same song beneath the welcome’s: the bar playing keeps its conduct and score', () => {
    const s = fixture.sections[0]!;
    const kept = scoredOf(conductsOf(s, 2).slice(0, 3), [s.score]);
    // (the welcome sends the conducts not yet played, and the score again)
    const again = welcomed({ conducts: conductsOf(s, 2).slice(3, 5), scores: [s.score] }, [], { id: 'band', hash: 'e2:0' }, kept);
    expect(again.conducts.map((c) => c.bar)).toEqual([0, 1, 2, 3, 4]);
    expect(again.scores).toEqual([s.score]);
    expect(welcomed({ conducts: [], scores: [s.score] }, [], null).scores).toHaveLength(1);
    expect(withScore(NOTHING_SCORED, s.score).scores).toHaveLength(1);
  });
});
