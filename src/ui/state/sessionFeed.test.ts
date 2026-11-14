import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { channelTable, midiNote, routesOf, router } from '@yggi/cells/engine/midi';
import { readerOf } from '@yggi/cells/engine/perform/feel';
import { eventsBetween } from '@yggi/cells/engine/realize';
import { compilePiece } from '../../compile';
import { NOTHING_FOLLOWED, frameOf, withBar, withText, type Followed } from '../../session/follow';
import { readHost, type SectionText, type SentBar } from '../../session/protocol';
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
    sounding: (done: Place | null, lead: number, now: number, length: (t: SectionText) => number | null, reach = lead) => ({
      ...sounding(f, done, now + 5 + lead, now + 5, length, now + 5 + reach),
      shift: 5,
    }),
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

  it('says where each bar starts, and whether its text switched there (#492)', () => {
    let f: Followed = NOTHING_FOLLOWED;
    for (let b = 0; b < 5; b++) f = withBar(f, { bar: { bar: b }, start: 10 + 2 * b });
    f = withText(withText(f, section(0, A)), section(2, A.replace('0 2 4 7', '7 4 2 0')));
    const feed = new SessionFeed({
      sounding: (done, lead, now, length) => ({ ...sounding(f, done, now + 5 + lead, now + 5, length), shift: 5 }),
    });
    const starts: unknown[] = [];
    for (let now = 4.9; now < 13; now += 0.125) for (const x of feed.next(now, now + 0.6)) if (x.starts) starts.push({ ...x.starts, time: x.time });
    expect(starts).toEqual([
      { bar: 0, switched: false, time: 5 },
      { bar: 1, switched: false, time: 7 },
      { bar: 2, switched: true, time: 9 },
      { bar: 3, switched: false, time: 11 },
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
  /** A host's text in its own forms: the bass on its voice and the General MIDI kit's kick, each its part or role, on the MIDI card (`session/hostText.test.ts`). */
  const HOST = `&bar meter("4/4") step=120bpm
&kick role=kick step=4n &bd &bd &bd &bd
&drums [&kick]
&bd, &rim, &sd, &cp, &lt, &hh, &ph, &mt, &oh, &ht, &cr, &rd, &claves from gm_kit
&bass part=bass step=8n 0 ~ 0 ~ 7 ~ 5 ~
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
      sounding: (done: Place | null, lead: number, now: number, length: (t: SectionText) => number | null, reach = lead) => ({
        ...sounding(f, done, now + 5 + lead, now + 5, length, now + 5 + reach),
        shift: 5,
      }),
    };
  };

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

  /**
   * A drum line of the role `ostinato` (session minor 10, feel v3.1, yggi/music-commons#66), followed at a cells pin
   * before yggi/cells#717: cells' `played` gives a velocity of NaN for a drum role it doesn't know (yggi/jambot#668), so
   * the follower's reader, cells' `readerOf`, must read the line as none of the feel's, and its hits play as cells
   * gives them. The bar is the hub's vector of a drum hit an ostinato, sent in each section type in turn; the text is
   * Salsa's tumbao on the General MIDI kit's toms, as the feel contract's reading case has it, beside a kick and a bass
   * the feel reads.
   */
  it('plays an ostinato line as cells gives it, never through the feel, and no velocity or length is NaN (#643)', () => {
    const SALSA = `&bar meter("4/4") step=108bpm
&kick role=kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&o role=ostinato step=8n &mt &ht &mt &mt &ht &mt &ht &mt
&drums [&kick, &o]
&bd, &mt, &ht from gm_kit
&bass part=bass step=16n legato=.5 0 ~ ~ 0 ~ ~ 7 ~ ~ 0 ~ ~ 5 ~ 7 ~
&bassOut play=&bass level=.7 &bassV
&bassV loop=C2
&out map=midi ~ &bassOut ~!7 &drums`;
    const r = compilePiece(SALSA);
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const read = readerOf(r);
    const route = router(r, channelTable(r));
    // (the hub's vector, as the follower reads it: a drum hit `role: "ostinato"` in what the host wrote)
    const contract = JSON.parse(readFileSync(new URL('../../session/vectors.json', import.meta.url), 'utf8')) as { vectors: { name: string; message: unknown }[] };
    const got = readHost(contract.vectors.find((v) => v.name === 'bar, a drum hit an ostinato')!.message);
    if (!('message' in got) || got.message.kind !== 'bar') throw new Error('the hub’s ostinato bar is read');
    const sent: SentBar = got.message.sent;
    const sections = ['intro', 'groove', 'build', 'drop', 'breakdown', 'bridge'];
    const seconds = 240 / 108;
    let f: Followed = NOTHING_FOLLOWED;
    for (const [b, type] of sections.entries()) {
      const bar = { ...sent.bar, bar: b, barInSection: 0, plan: { ...(sent.bar.plan as object), section: { type, index: b } } };
      expect(frameOf({ bar, start: 0 })).not.toBeNull();
      f = withBar(f, { bar, start: 10 + b * seconds });
    }
    f = withText(f, { ...section(0, SALSA), foreseen: sections.map(() => 'a') });
    const feed = new SessionFeed({ sounding: (done, lead, now, length) => ({ ...sounding(f, done, now + 5 + lead, now + 5, length), shift: 5 }) });
    const lines = new Map<string, number>();
    for (let now = 4.9; now < 5 + sections.length * seconds; now += 0.125)
      for (const x of feed.next(now, now + 0.6)) {
        const given = eventsBetween(x.plan, x.window.from, x.window.to, true);
        x.window.events.forEach((e, i) => {
          const line = e.output!.startsWith('kit:voices:') ? e.output!.split(':')[2]! : e.output!.split(':')[1]!;
          lines.set(line, (lines.get(line) ?? 0) + 1);
          // (every level the voices hear, and every velocity MIDI sends, is a number; every length is positive)
          for (const l of e.levels) expect(Number.isFinite(l.level), e.output).toBe(true);
          expect(e.dur, e.output).toBeGreaterThan(0);
          const velocity = midiNote(
            e,
            routesOf(route(e)).find((x) => x.channel !== 16)!,
          )!.velocity;
          expect([e.output, velocity >= 1 && velocity <= 127]).toEqual([e.output, true]);
          // (an ostinato hit is none of the feel's: it plays as cells gives it)
          if (line === 'o') {
            expect(read(e.output)).toBeNull();
            expect(e).toEqual(given[i]);
          }
        });
      }
    // (six bars: a kick on each beat, the tumbao's 8 eighths, the bass's 6 notes)
    expect(Object.fromEntries(lines)).toEqual({ kick: 24, o: 48, bass: 36 });
    expect(feed.unread).toBe(48);
    const log = feed.log.since().events;
    expect(log).toHaveLength(60);
    expect(log.filter((x) => x.role === 'ostinato')).toEqual([]);
    expect(log.filter((x) => !Number.isFinite(x.velocity) || !(x.length > 0) || !(x.duration > 0))).toEqual([]);
  });
});
