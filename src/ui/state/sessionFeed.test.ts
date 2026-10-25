import { describe, expect, it } from 'vitest';
import { NOTHING_FOLLOWED, withBar, withText, type Followed } from '../../session/follow';
import type { SectionText } from '../../session/protocol';
import { sounding, type Place } from '../../session/sound';
import { SessionFeed } from './sessionFeed';

const frame = { meter: { cycle: 8, heights: [0, 2, 4, 6] }, swing: { level: '16n', share: 0.5 }, bpm: 120, key: { tonic: 9, mode: 'aeolian' } };
const section = (bar: number, text: string, unstated: string | null = null): SectionText => ({
  bar,
  step: bar * 16,
  text,
  unstated,
  frame,
  foreseen: ['a', 'b'],
  cut: [],
});
const A = `&bar meter("4/4") step=120bpm
&line step=&bar:4n 0 2 4 7
&v s=sine loop=A3
&out [&line * &v * .5]`;

/** A session whose host's clock runs 5 s ahead of the page's: bars of 2 s from 10 s on it, A for bars 0–1, bars 2–3 unstated. */
const session = () => {
  let f: Followed = NOTHING_FOLLOWED;
  for (let b = 0; b < 5; b++) f = withBar(f, { bar: { bar: b }, start: 10 + 2 * b });
  f = withText(withText(f, section(0, A)), section(2, '', 'the section’s key moves between its bars'));
  return {
    sounding: (done: Place | null, lead: number, now: number, length: (t: SectionText) => number | null) => ({ ...sounding(f, done, now + 5 + lead, now + 5, length), shift: 5 }),
  };
};

describe('a followed session as the player’s feed', () => {
  it('gives each stretch as a window of its text’s plan, placed on the page’s clock, every note once', () => {
    const feed = new SessionFeed(session());
    const notes: number[] = [];
    for (let now = 4; now < 9; now += 0.125)
      for (const f of feed.next(now, now + 0.6)) {
        for (const e of f.window.events) notes.push(f.time + (e.at - f.window.from) * f.scale);
        expect(f.window.to).toBeGreaterThan(f.window.from);
      }
    // (A's quarters, 4 a bar, over its two bars, from the page's 5 s: the host's 10 s)
    expect(notes.map((t) => Math.round(t * 1000) / 1000)).toEqual([5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5]);
    expect(feed.played).toBe(8);
    // (bar 2, which the asks reached, is said; bar 3 starts after the last)
    expect(feed.lacked).toEqual([{ bar: 2, why: 'the section’s key moves between its bars' }]);
  });

  it('starts from now again once the session has nothing to sound', () => {
    let on = true;
    const s = session();
    const feed = new SessionFeed({ sounding: (...a) => (on ? s.sounding(...a) : null) });
    expect(feed.next(5, 5.6).length).toBe(1);
    on = false;
    expect(feed.next(5.5, 6.1)).toEqual([]);
    on = true;
    // (asked again from now, not from where it stopped: nothing said late)
    expect(feed.next(6.5, 7.1)[0]!.window.from).toBeCloseTo(1.5, 9);
    expect(feed.lacked).toEqual([]);
  });
});
