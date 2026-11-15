import { describe, expect, it } from 'vitest';
import type { Conduct, Score } from './protocol-v2';
import { CONDUCTS_KEPT, FRAGMENTS_KEPT, NOTHING_SCORED, SCORES_KEPT, welcomed, withConduct, withScore } from './scored';

const conduct = (bar: number, foreseen = 'x'): Conduct => ({ bar, start: 10 + 2 * bar, seed: 42, entropy: 0.3, offer: null, foreseen });
const fragment = (id: string) => ({ id, hash: `e2:${id}`, text: `&${id} 0` });
const score = (bar: number, ...ids: string[]): Score => ({
  bar,
  step: bar * 16,
  section: 'groove',
  text: '* from band',
  unstated: null,
  lock: ids.map((id) => ({ id, hash: `e2:${id}` })),
  fragments: ids.map(fragment),
  energy: [0.5],
  foreseen: ['x'],
  cut: [],
});

describe('what a client keeps of a version 2 song (#525, rung 1)', () => {
  it('keeps a conduct by its bar, a later one for the same bar replacing it, in the order of the bars', () => {
    let s = withConduct(NOTHING_SCORED, conduct(2));
    s = withConduct(s, conduct(0));
    s = withConduct(s, conduct(2, 'y'));
    expect(s.conducts.map((c) => [c.bar, c.foreseen])).toEqual([
      [0, 'x'],
      [2, 'y'],
    ]);
  });

  it('keeps the scores in the order told, and each fragment they carry once', () => {
    let s = withScore(NOTHING_SCORED, score(0, 'a', 'b'));
    s = withScore(s, score(4, 'b', 'c'));
    expect(s.scores.map((x) => x.bar)).toEqual([0, 4]);
    expect(s.fragments.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps the latest only, each bounded', () => {
    let s = NOTHING_SCORED;
    for (let b = 0; b < CONDUCTS_KEPT + 10; b++) s = withConduct(s, conduct(b));
    for (let b = 0; b < SCORES_KEPT + 3; b++) s = withScore(s, score(b * 8, `f${b}`, `g${b}`, `h${b}`, `i${b}`));
    expect([s.conducts.length, s.conducts[0]!.bar]).toEqual([CONDUCTS_KEPT, 10]);
    expect([s.scores.length, s.scores[0]!.bar]).toEqual([SCORES_KEPT, 24]);
    expect(s.fragments.length).toBe(FRAGMENTS_KEPT);
  });

  it('takes a welcome’s conducts, scores, fragments and band', () => {
    const band = { id: 'band', hash: 'e2:0b7a' };
    const s = welcomed({ conducts: [conduct(3), conduct(2)], scores: [score(0, 'a')] }, [fragment('m')], band);
    expect([s.conducts.map((c) => c.bar), s.scores.length, s.fragments.map((f) => f.id), s.band, s.finale]).toEqual([[2, 3], 1, ['m', 'a'], band, null]);
    expect(welcomed(null, [], null)).toEqual(NOTHING_SCORED);
  });
});
