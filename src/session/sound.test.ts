import { describe, expect, it } from 'vitest';
import { compilePiece } from '../compile';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan } from '@yggi/cells/engine/realize';
import { NOTHING_FOLLOWED, barSeconds, withBar, withText, type Followed } from './follow';
import type { SectionText } from './protocol';
import { sounding, type Place, type Slice } from './sound';

const frame = { meter: { cycle: 8, heights: [0, 2, 4, 6] }, swing: { level: '16n', share: 0.5 }, bpm: 120, key: { tonic: 9, mode: 'aeolian' } };
const section = (bar: number, bars: number, text: string, unstated: string | null = null): SectionText => ({
  bar,
  step: bar * 16,
  text,
  unstated,
  frame,
  foreseen: Array.from({ length: bars }, (_, i) => `b${bar + i}`),
  cut: [],
});
const sent = (bar: number, start: number | null) => ({ bar: { bar }, start });

/** Two sections' texts at 120 bpm (a bar of 2 s): A's eighths, B's sixteenths an octave up. */
const A = `&bar meter("4/4") step=120bpm
&line step=&bar:8n 0 2 4 7
&v s=sine loop=A3
&out [&line * &v * .5]`;
const B = `&bar meter("4/4") step=120bpm
&line step=&bar:16n 0 3 5 7 12 7 5 3
&v s=sine loop=A4
&out [&line * &v * .5]`;
const compiled = new Map([A, B].map((t) => [t, compilePiece(t)] as const));
const length = (t: SectionText) => (t.text ? barSeconds(compiled.get(t.text) ?? compilePiece(t.text)) : null);

/** The bars' starts from 10 s on the host's clock, each bar as long as `lengths` says (a glide). */
const startsOf = (lengths: readonly number[]) => lengths.reduce<number[]>((s, l, i) => [...s, i ? s[i - 1]! + lengths[i - 1]! : 10], []);
/** A song of those bars, all sent, and sections of four bars, A then B by turns. */
const song = (lengths: readonly number[]): Followed => {
  let f = NOTHING_FOLLOWED;
  startsOf(lengths).forEach((s, b) => (f = withBar(f, sent(b, s))));
  for (let s = 0; s * 4 < lengths.length; s++) f = withText(f, section(s * 4, 4, s % 2 ? B : A));
  return f;
};

/** Every onset the slices play, on the host's clock: a slice's notes, each at `at + (x − from) × scale`. */
const onsets = (slices: readonly Slice[]) =>
  slices.flatMap((s) => {
    const r = compiled.get(s.text.text)!;
    return eventsBetween(plan(r, codeShifts(r)), s.from, s.to).map((e) => ({ at: s.at + (e.at - s.from) * s.scale, freq: e.freq, bar: s.bar }));
  });

/** What the bars' notes are, on the host's clock: each bar's text's bar, read whole, on the bar as laid. */
const truth = (lengths: readonly number[]) => {
  const starts = startsOf(lengths);
  return lengths.flatMap((l, n) => {
    const r = compiled.get(n % 8 < 4 ? A : B)!;
    const k = (n % 4) * 2;
    return eventsBetween(plan(r, codeShifts(r)), k, k + 2).map((e) => ({ at: starts[n]! + (e.at - k) * (l / 2), freq: e.freq }));
  });
};

describe('sounding a followed song, bar by bar from the texts that state them', () => {
  it('plays each bar from its own text, its time stretched onto the bar', () => {
    const f = song([2, 2, 2, 2, 2, 2.5, 2, 2]);
    const s = sounding(f, null, 13, 10, length);
    expect(s.lacked).toEqual([]);
    expect(s.done).toEqual({ bar: 1, into: 0.5 });
    expect(s.slices.map(({ bar, from, to, at, scale }) => ({ bar, from, to, at, scale }))).toEqual([
      { bar: 0, from: 0, to: 2, at: 10, scale: 1 },
      { bar: 1, from: 2, to: 3, at: 12, scale: 1 },
    ]);
    // (bar 5 is B's second bar: its own time from 2 s, and a bar of 2.5 s on the host's clock stretches it)
    expect(sounding(f, { bar: 5, into: 0 }, 22.5, 20, length).slices.map(({ bar, from, to, scale }) => ({ bar, from, to, scale }))).toEqual([
      { bar: 5, from: 2, to: 4, scale: 1.25 },
    ]);
  });

  it('plays every note once, none doubled or lost at a switch, however the asks fall', () => {
    const lengths = Array.from({ length: 16 }, () => 2);
    const f = { ...song(lengths), finale: 15 };
    const whole = truth(lengths);
    // (A's eighths, 8 a bar, and B's sixteenths, 16 a bar, over 4 bars each, twice)
    expect(whole.length).toBe(2 * (4 * 8 + 4 * 16));
    for (const [step, lead] of [
      [0.125, 0.6],
      [0.04, 0.3],
      [0.37, 0.5],
    ] as const) {
      const slices: Slice[] = [];
      let done: Place | null = null;
      for (let now = 9; now < 44; now += step) {
        const s = sounding(f, done, now + lead, now, length);
        slices.push(...s.slices);
        done = s.done;
        expect(s.lacked).toEqual([]);
      }
      const got = onsets(slices);
      expect(got.length).toBe(whole.length);
      got.forEach((e, i) => {
        expect(e.at).toBeCloseTo(whole[i]!.at, 9);
        expect(e.freq).toBe(whole[i]!.freq);
      });
    }
    // (at the switch to B, bar 4: its first note on the bar's first moment, at B's octave)
    const first = onsets(sounding(f, { bar: 4, into: 0 }, 18.1, 18, length).slices)[0]!;
    expect(first.at).toBe(18);
    expect(first.freq).toBeCloseTo(440, 6);
  });

  it('plays a host that tells each bar’s start a beat before it, through a glide: every note once, each where the bars before it say', () => {
    // (bars from 2 s down to 1.6 s and back, 150 bpm at the quickest, each start told a beat, a quarter of the bar before,
    // ahead: so a bar's end is told only on its last beat, and most of it is laid before that, as the bars before it went)
    const lengths = Array.from({ length: 16 }, (_, n) => 2 - 0.4 * Math.sin((Math.PI * n) / 15));
    const starts = startsOf(lengths);
    const texts = [0, 4, 8, 12].map((b) => section(b, 4, (b / 4) % 2 ? B : A));
    const whole = truth(lengths);
    const slices: Slice[] = [];
    let done: Place | null = null;
    for (let now = 9; now < 44; now += 0.125) {
      let f: Followed = { ...NOTHING_FOLLOWED, finale: 15 };
      starts.forEach((s, n) => {
        if (s - (n ? lengths[n - 1]! / 4 : 3) <= now) f = withBar(f, sent(n, s));
      });
      for (const t of texts) f = withText(f, t);
      const s = sounding(f, done, now + 0.35, now, length);
      slices.push(...s.slices);
      done = s.done;
      expect(s.lacked).toEqual([]);
    }
    const got = onsets(slices);
    expect(got.length).toBe(whole.length);
    got.forEach((e, i) => expect(e.freq).toBe(whole[i]!.freq));
    // (bar 1, the glide's first, is laid as long as bar 0, off by as much as it is shorter; from bar 2 on, the glide is
    // carried on, off by how much it bends: 17 ms at most here, where a bar is up to 84 ms shorter than the one before)
    const off = (from: number, to: number) => Math.max(...got.map((e, i) => (e.bar >= from && e.bar < to ? Math.abs(e.at - whole[i]!.at) : 0)));
    const bend = Math.max(...lengths.slice(2).map((l, n) => Math.abs(l - 2 * lengths[n + 1]! + lengths[n]!)));
    expect(off(0, 1)).toBeLessThan(1e-9);
    expect(off(1, 2)).toBeLessThan(lengths[0]! - lengths[1]!);
    expect(off(2, 16)).toBeLessThan(bend);
  });

  it('lays a switch on through the bars the host has told, and no further: every note once, each where the bars before it say (#513)', () => {
    // (as above, each start told a beat ahead; at each section's switch the page is held, and the switch is laid 2 s ahead)
    const lengths = Array.from({ length: 16 }, (_, n) => 2 - 0.4 * Math.sin((Math.PI * n) / 15));
    const starts = startsOf(lengths);
    const texts = [0, 4, 8, 12].map((b) => section(b, 4, (b / 4) % 2 ? B : A));
    const told = (now: number) => {
      let f: Followed = { ...NOTHING_FOLLOWED, finale: 15 };
      starts.forEach((s, n) => {
        if (s - (n ? lengths[n - 1]! / 4 : 3) <= now) f = withBar(f, sent(n, s));
      });
      for (const t of texts) f = withText(f, t);
      return f;
    };
    // (at bar 4's first moment: all of bar 4, which is told, and nothing of bar 5, which isn't yet)
    const at = starts[4]!;
    const switched = sounding(told(at), { bar: 4, into: 0 }, at + 0.35, at, length, at + 2);
    expect(switched.slices.map((s) => s.bar)).toEqual([4]);
    expect(switched.done).toEqual({ bar: 5, into: 0 });
    expect(switched.slices[0]).toMatchObject({ from: 0, to: 2 });
    // (without it, as before: the lead alone, into bar 4)
    expect(sounding(told(at), { bar: 4, into: 0 }, at + 0.35, at, length).done).toMatchObject({ bar: 4 });
    const whole = truth(lengths);
    const slices: Slice[] = [];
    let done: Place | null = null;
    for (let now = 9; now < 44; now += 0.125) {
      const switching = [4, 8, 12].some((b) => now <= starts[b]! && starts[b]! < now + 0.125);
      const s = sounding(told(now), done, now + 0.35, now, length, switching ? now + 2 : now + 0.35);
      slices.push(...s.slices);
      done = s.done;
      expect(s.lacked).toEqual([]);
    }
    const got = onsets(slices);
    expect(got.length).toBe(whole.length);
    got.forEach((e, i) => expect(e.freq).toBe(whole[i]!.freq));
    const bend = Math.max(...lengths.slice(2).map((l, n) => Math.abs(l - 2 * lengths[n + 1]! + lengths[n]!)));
    got.forEach((e, i) => e.bar >= 2 && expect(Math.abs(e.at - whole[i]!.at)).toBeLessThan(bend));
  });

  it('says what it can’t play: an unstated section, a text that doesn’t compile, a bar passed, a bar no text states, a stretch come to late', () => {
    let f = NOTHING_FOLLOWED;
    for (const b of [0, 1, 2, 4, 5]) f = withBar(f, sent(b, 10 + 2 * b));
    f = withText(f, section(0, 1, A));
    f = withText(f, section(1, 1, '', 'the section’s key moves between its bars'));
    f = withText(f, section(2, 1, 'not cells'));
    f = withText(f, section(4, 1, A));
    // (bar 3 the host passed without laying; bar 5 has no text yet, and waits for one until it begins)
    const s = sounding(f, null, 21, 10, length);
    expect(s.lacked).toEqual([
      { bar: 1, why: 'the section’s key moves between its bars' },
      { bar: 2, why: 'its text has no bar to play (it does not compile, or has no meter)' },
      { bar: 3, why: 'the host passed it without laying it' },
    ]);
    expect(s.done).toEqual({ bar: 5, into: 0 });
    // (begun with none: said, and passed)
    expect(sounding(f, s.done, 20.5, 20, length)).toMatchObject({ lacked: [{ bar: 5, why: 'no text stated it' }], slices: [] });
    // (an ask that comes late says so, of each bar it passed, and plays on from now)
    const late = sounding(song([2, 2, 2]), { bar: 0, into: 0.5 }, 13, 12.3, length);
    expect(late.lacked).toEqual([
      { bar: 0, why: 'late by 1300 ms' },
      { bar: 1, why: 'late by 1300 ms' },
    ]);
    expect(late.slices[0]).toMatchObject({ bar: 1, at: 12.3 });
  });

  it('plays nothing before the song’s first bar, and nothing after its last', () => {
    const f = { ...song([2, 2]), finale: 1 };
    expect(sounding(f, null, 10.5, 8, length).slices).toMatchObject([{ bar: 0, from: 0, to: 0.5, at: 10 }]);
    expect(sounding(f, null, 9, 8, length)).toEqual({ slices: [], done: { bar: 0, into: 0 }, lacked: [] });
    expect(sounding(NOTHING_FOLLOWED, null, 9, 8.5, length)).toEqual({ slices: [], done: null, lacked: [] });
    // (the last bar ends as long as the one before it; then nothing, and nothing said late)
    const end = sounding(f, { bar: 1, into: 0.5 }, 20, 13, length);
    expect(end.slices).toMatchObject([{ bar: 1, from: 3, to: 4 }]);
    expect(sounding(f, end.done, 30, 25, length)).toEqual({ slices: [], done: { bar: 2, into: 0 }, lacked: [] });
  });
});
