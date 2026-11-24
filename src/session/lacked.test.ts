import { describe, expect, it } from 'vitest';
import { BACK, Lacked, PER_SECOND } from './lacked';
import type { Lack } from './sound';

const lack = (bar: number, kind: Lack['kind'] = 'silent'): Lack => ({ bar, why: 'no text stated it', kind });
const bars = (l: Lacked, now: number) => l.take(now).map((m) => (m as { bar: number }).bar);

describe('the bars a follower says it lacked (#698)', () => {
  it('says each bar once, with its reason and a text for people', () => {
    const l = new Lacked();
    l.add([lack(3), lack(4, 'late')]);
    expect(l.take(0)).toEqual([
      { kind: 'lacked', bar: 3, why: 'silent', text: 'bar 3: no text stated it' },
      { kind: 'lacked', bar: 4, why: 'late', text: 'bar 4: no text stated it' },
    ]);
    // (a bar lacked again, in another ask or twice in one: not said again)
    l.add([lack(3), lack(4, 'digest'), lack(5), lack(5)]);
    expect(bars(l, 1)).toEqual([5]);
    expect(bars(l, 2)).toEqual([]);
  });

  it(`says at most ${PER_SECOND} a second and the rest as the second lets it`, () => {
    const l = new Lacked();
    l.add(Array.from({ length: 12 }, (_, i) => lack(100 + i)));
    expect(bars(l, 0).length).toBe(PER_SECOND);
    expect(l.waiting).toBe(true);
    expect(bars(l, 0.5)).toEqual([]);
    expect(bars(l, 1.01)).toEqual([108, 109, 110, 111]);
    expect(l.waiting).toBe(false);
  });

  it(`reports no further than ${BACK} bars behind the newest one lacked`, () => {
    const l = new Lacked();
    l.add([lack(1), lack(2), lack(2 + BACK), lack(3 + BACK)]);
    // (bar 1 is more than BACK behind 3 + BACK; bar 2 is exactly BACK + 1 behind; 2 + BACK is within)
    expect(bars(l, 0)).toEqual([2 + BACK, 3 + BACK]);
  });
});
