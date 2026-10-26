import { describe, expect, it } from 'vitest';
import { agrees, compareSession, type PlayedEvent } from './session-compare';

/** Four bars of 2 s, a kick and a bass note in each. */
const host: PlayedEvent[] = [0, 1, 2, 3].flatMap((bar) => [
  { bar, part: 'drums', step: 0, note: 36, velocity: 100, length: 1.9, seconds: 10 + 2 * bar, duration: 0.2 },
  { bar, part: 'bass', step: 8, note: 40, velocity: 88, length: 3.7, seconds: 11 + 2 * bar, duration: 0.45 },
]);
/** Cell studio's, as the host's, 0.4 ms late, and from bar 1 on (joined later). */
const studio = host.filter((e) => e.bar >= 1).map((e) => ({ ...e, seconds: e.seconds + 0.0004 }));

describe('a host’s events set against Cell studio’s', () => {
  it('compares the bars both played whole, every event alike within the bound', () => {
    const c = compareSession(host, studio, 0.001);
    expect(c.bars).toEqual({ from: 2, to: 2 });
    expect([c.events, c.paired]).toEqual([2, 2]);
    expect(c.onset.median).toBeCloseTo(0.0004, 9);
    expect(agrees(c)).toBe(true);
  });

  it('says what differs: a velocity, a length, an onset past the bound', () => {
    const changed = studio.map((e) => (e.bar === 2 && e.part === 'bass' ? { ...e, velocity: 87, length: 3.6, seconds: e.seconds + 0.01 } : e));
    const c = compareSession(host, changed, 0.001);
    expect(c.mismatched).toEqual({ velocity: 1, length: 1, onset: 1, duration: 0 });
    expect(c.differing).toEqual(['2 bass 8 40: velocity 88 → 87, length 3.7 → 3.6, onset 10.400 ms']);
    expect(agrees(c)).toBe(false);
  });

  it('counts what each side lacks, explained where it said why', () => {
    const wide = [...host, ...[4, 5].flatMap((bar) => host.slice(0, 2).map((e) => ({ ...e, bar })))];
    const some = [...studio, ...wide.filter((e) => e.bar >= 4)].filter((e) => !(e.bar === 3 && e.part === 'bass'));
    const extra = [...some, { ...host[0]!, bar: 4, step: 4, seconds: 18.5 }];
    const c = compareSession(wide, extra, 0.001);
    expect(c.bars).toEqual({ from: 2, to: 4 });
    expect(c.lacked).toEqual({ studio: { events: 1, unexplained: 1 }, host: { events: 1, unexplained: 1 } });
    const said = compareSession(wide, extra, 0.001, { lackedBars: [3], late: [{ bar: 4, part: 'drums', step: 4, note: 36 }] });
    expect(said.lacked).toEqual({ studio: { events: 1, unexplained: 0 }, host: { events: 1, unexplained: 0 } });
    expect(agrees(said)).toBe(true);
  });

  it('compares nothing where the two played no whole bar in common', () => {
    expect(agrees(compareSession(host.slice(0, 2), studio.slice(-2), 0.001))).toBe(false);
  });
});
