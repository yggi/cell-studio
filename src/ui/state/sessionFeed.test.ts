import { describe, expect, it } from 'vitest';
import { NOTHING_FOLLOWED, withBar, withText, type Followed } from '../../session/follow';
import type { SectionText } from '../../session/protocol';
import { sounding, type Place } from '../../session/sound';
import { SessionFeed, heardAsSent } from './sessionFeed';

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
    // (bars 0 and 1 begun on the page's clock, A both, and bar 2, unstated, not)
    expect(feed.bars).toEqual([
      { bar: 0, at: 5, switched: false },
      { bar: 1, at: 7, switched: false },
    ]);
    // (A's quarters, 4 a bar, over its two bars, from the page's 5 s: the host's 10 s)
    expect(notes.map((t) => Math.round(t * 1000) / 1000)).toEqual([5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5]);
    expect(feed.played).toBe(8);
    // (bar 2, which the asks reached, is said; bar 3 starts after the last)
    expect(feed.lacked).toEqual([{ bar: 2, why: 'the section’s key moves between its bars' }]);
  });

  it('says which bar begins another text than the bar before: a switch', () => {
    const B = A.replace('0 2 4 7', '7 4 2 0');
    let f: Followed = NOTHING_FOLLOWED;
    for (let b = 0; b < 4; b++) f = withBar(f, { bar: { bar: b }, start: 10 + 2 * b });
    f = withText(withText(f, { ...section(0, A), foreseen: ['a', 'b'] }), { ...section(2, B), foreseen: ['c', 'd'] });
    const feed = new SessionFeed({
      sounding: (done: Place | null, lead: number, now: number, length: (t: SectionText) => number | null) => ({ ...sounding(f, done, now + 5 + lead, now + 5, length), shift: 5 }),
    });
    for (let now = 4; now < 13; now += 0.125) feed.next(now, now + 0.6);
    expect(feed.bars.map((b) => [b.bar, b.at, b.switched])).toEqual([
      [0, 5, false],
      [1, 7, false],
      [2, 9, true],
      [3, 11, false],
    ]);
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

describe('a followed session played as its performers play it', () => {
  /** A host's text in its own forms: the bass on its voice and the core kit's kick, on the MIDI card (`session/perform.test.ts`). */
  const HOST = `&bar meter("4/4") step=120bpm
&kick step=4n &bd &bd &bd &bd
&drums [&kick]
use "core kit"
&bass step=8n 0 ~ 0 ~ 7 ~ 5 ~
&bassOut play=&bass level=.7 &bassV
&bassV loop=C2
&out map=midi ~ &bassOut ~ ~!6 &drums`;
  const bar = (b: number) => ({
    bar: b,
    seed: 3,
    barEnergy: 0.7,
    plan: { meter: { cycle: 8, heights: [0, 2, 4, 6] }, section: { type: 'groove' } },
    style: { entropy: 0.5, artic: 0.5, sync: 0.3 },
    swing: { level: '16n', share: 0.5 },
  });
  /** Bars of 2 s from 10 s on the host's clock, 5 s ahead of the page's; bar 1's message lacks what the feel reads. */
  const host = () => {
    let f: Followed = NOTHING_FOLLOWED;
    for (let b = 0; b < 3; b++) f = withBar(f, { bar: b === 1 ? { bar: b } : bar(b), start: 10 + 2 * b });
    f = withText(f, { ...section(0, HOST), foreseen: ['a', 'b', 'c'] });
    return {
      sounding: (done: Place | null, lead: number, now: number, length: (t: SectionText) => number | null) => ({ ...sounding(f, done, now + 5 + lead, now + 5, length), shift: 5 }),
    };
  };

  it('hears what the host’s text only sends on its MIDI card, on its own voices at the card’s gain', () => {
    const feed = new SessionFeed(host());
    const events = [];
    for (let now = 4; now < 11; now += 0.125) for (const f of feed.next(now, now + 0.6)) events.push(...f.window.events);
    expect(events).toHaveLength(24);
    expect(events.filter((e) => e.unheard)).toEqual([]);
    expect(new Set(events.map((e) => `${e.voice} ${e.gains.join(' ')}`))).toEqual(new Set(['bassV 0.7 0.7', 'bd 1 1']));
  });

  it('leaves an event a sound card hears as it is', () => {
    const e = { at: 0, dur: 1, voice: 'v', freq: 220, bends: [], gains: [0.3, 0.5] as const, levels: [] };
    expect(heardAsSent(e)).toBe(e);
    const midi = [{ card: 'out', mix: 'v', channel: 1, port: 1 }];
    expect(heardAsSent({ ...e, midi, gains: [0, 0], unheard: true })).toEqual({ ...e, midi, gains: [1, 1] });
  });

  it('logs each event as played, on the host’s clock, and leaves a bar with no frame as cells gives it', () => {
    const feed = new SessionFeed(host());
    for (let now = 4; now < 11; now += 0.125) feed.next(now, now + 0.6);
    const { events, next } = feed.log.since();
    // (bars 0 and 2: four kicks and four bass notes each; bar 1's eight unread)
    expect(next).toBe(16);
    expect(feed.played).toBe(24);
    expect(feed.unread).toBe(8);
    expect(events.map((e) => e.bar)).toEqual([...Array(8).fill(0), ...Array(8).fill(2)]);
    const bass = events.filter((e) => e.part === 'bass' && e.bar === 2);
    expect(bass.map((e) => [e.step, e.seconds])).toEqual([
      [0, 14],
      [4, 14.5],
      [8, 15],
      [12, 15.5],
    ]);
    expect(events.filter((e) => e.part === 'drums').every((e) => e.role === 'kick' && e.note === 36)).toBe(true);
    // (the feel's lengths: a quarter's eighth held whole, shortened by up to 15 %, on the host's clock)
    for (const e of bass) {
      expect(e.duration).toBeCloseTo((e.length / 16) * 2, 9);
      expect(e.length).toBeLessThanOrEqual(2);
      expect(e.length).toBeGreaterThan(2 * 0.85);
    }
  });
});
