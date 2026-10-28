import { describe, expect, it } from 'vitest';
import { channelTable, midiNote, routesOf, router } from '@yggi/cells/engine/midi';
import { codeShifts } from '@yggi/cells/engine/program';
import { eventsBetween, plan, type Played } from '@yggi/cells/engine/realize';
import { compilePiece } from '../compile';
import { played, readerOf, readingOf, type FeelFrame } from './feel';
import { barSeconds } from './follow';
import { perform } from './perform';

/** A host's text in its own forms (Jambot's `sectionAsCells`): a swung bar, the core kit's grooves mixed by `&drums`, the bass on its voice, the MIDI card. */
const TEXT = `&bar meter("4/4") step=120bpm swing=16n:.6
&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&hat step=16n &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh &hh
&drums [&kick, &hat]
use * from "core kit"
&bass step=16n legato=.5 0 ~ ~ ~ 0 ~ 7 ~ 0 ~ ~ ~ 5 ~ 7 ~
&bassOut play=&bass level=.7 &bassV
&bassV loop=C2
&shaker step=4n 0 0 0 0
&shakerV loop=C5
&out map=midi ~ &bassOut ~ [&shaker * &shakerV] ~!5 &drums`;

const frame: FeelFrame = {
  seed: 7,
  bar: 12,
  groups: [2, 2, 2, 2],
  section: 'groove',
  style: { entropy: 0.6, artic: 0.4, sync: 0.5 },
  swing: { level: '16n', share: 0.6 },
  energy: 0.8,
};
const r = compilePiece(TEXT);
const p = plan(r, codeShifts(r), r.off);
const [r0, p0] = [r, p];
const route = router(r, channelTable(r));
const seconds = barSeconds(r)!;
/** The text's second bar, as the song's bar 12. */
const at = { bar: 12, frame, start: seconds, seconds };
const events = eventsBetween(p, seconds, 2 * seconds, true);
const sent = (e: Played) =>
  midiNote(
    e,
    routesOf(route(e)).find((x) => x.channel !== 16)!,
  )!;

describe('a host’s text played as its performers play it', () => {
  it('compiles, a bar of 2 s, the drums, the bass and a line the feel doesn’t read', () => {
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(seconds).toBe(2);
    expect(new Set(events.map((e) => e.output!.split(':').slice(0, 2).join(':')))).toEqual(new Set(['bassV:bass', 'kit:voices', 'shakerV:shaker']));
  });

  it('reads each event as Jambot’s host does: its part and role, its step through the swing undone, its note and velocity as MIDI sends them', () => {
    const done = events.map((e) => perform(e, route, at).performance).filter((x) => x !== null);
    expect(done.filter((x) => x.part === 'drums' && x.role === 'hat').map((x) => x.step)).toEqual([...Array(16).keys()]);
    expect(done.filter((x) => x.role === 'kick').map((x) => x.step)).toEqual([0, 4, 8, 12]);
    expect(done.filter((x) => x.part === 'bass').map((x) => x.step)).toEqual([0, 4, 6, 8, 12, 14]);
    expect(done.every((x) => x.bar === 12)).toBe(true);
    // (a hat rings its whole 16th, swung long or short: one step written, the feel's velocity and length of that)
    for (const e of events.filter((e) => e.output!.startsWith('kit:voices:hat'))) {
      const { performance } = perform(e, route, at);
      const hit = { part: 'drums', role: 'hat', step: performance!.step, note: sent(e).note, velocity: sent(e).velocity, length: 1 } as const;
      expect(performance!.length).toBeCloseTo(played(frame, hit).length, 12);
      expect(performance!.velocity).toBe(played(frame, hit).velocity);
    }
    // (a bass note held half its 16th: half a step written, wherever the swing lays it)
    const bass = events.filter((e) => e.output!.startsWith('bassV'));
    for (const e of bass) {
      const { performance } = perform(e, route, at);
      const step = performance!.step;
      expect(performance).toEqual({
        bar: 12,
        part: 'bass',
        step,
        note: sent(e).note,
        velocity: played(frame, { part: 'bass', step, note: sent(e).note, velocity: 106, length: 0.5 }).velocity,
        length: expect.closeTo(played(frame, { part: 'bass', step, note: sent(e).note, velocity: 106, length: 0.5 }).length, 12),
      });
    }
  });

  it('plays it with the feel: MIDI sends the feel’s velocity, the note ends at its step and the feel’s length through the swing, its onset never moved', () => {
    let moved = 0;
    for (const e of events) {
      const { event, performance } = perform(e, route, at);
      if (!performance) continue;
      expect(event.at).toBe(e.at);
      expect(sent(event).velocity).toBe(performance.velocity);
      if (sent(event).velocity !== sent(e).velocity) moved++;
      expect(event.dur).toBeLessThanOrEqual(e.dur + 1e-12);
      // (the 16ths lean 0.6: a step's first half 1.2 of a straight step, its second 0.8)
      const end = performance.step + performance.length;
      const swung = Math.floor(end / 2) * 2 + (end % 2 < 1 ? (end % 2) * 1.2 : 1.2 + ((end % 2) - 1) * 0.8);
      expect(event.at + event.dur).toBeCloseTo(seconds + (swung / 16) * seconds, 9);
    }
    // (the feel loosens most velocities by a step or more at this feel)
    expect(moved).toBeGreaterThan(10);
  });

  it('plays an event the feel doesn’t read as cells gives it, and one in a bar with no frame is the caller’s to leave', () => {
    const shaker = events.filter((e) => e.output!.startsWith('shakerV'));
    expect(shaker).toHaveLength(4);
    for (const e of shaker) expect(perform(e, route, at)).toEqual({ event: e, performance: null });
  });
});

/**
 * A host's text whose pitched parts play through cells' seed performers (yggi/jambot#514): each gate's output id is its
 * part's (`bassV:bassline^$-12:…`), and its part is the role of the performer playing it (feel v1.2, #511). A stack of
 * gates on the card (`[&padOut, &stabOut]`) is read the same; a drum hit keeps its line's role.
 */
const PERFORMED = `&bar meter("4/4") step=120bpm swing=16n:.6
use * from "drums performer"
use * from "bass performer"
use * from "pad performer"
use * from "stab performer"
use * from "lead performer"
&kick step=16n &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~ &bd ~ ~ ~
&hat step=16n &hh!16
&drumlines [&kick, &hat]
&bassline step=16n legato=.5 0 ~ ~ ~ 0 ~ 7 ~ 0 ~ ~ ~ 5 ~ 7 ~
&bassLevel map=amp .7
&padline step=2n 0 2
&padLevel map=amp .5
&stabline step=4n ~ 4 ~ 4
&stabLevel map=amp .5
&leadline step=8n 0 1 2 3 4 3 2 1
&leadLevel map=amp .5
&shaker step=4n 0 0 0 0
&shakerV loop=C5
&out map=midi &leadOut &bassOut [&padOut, &stabOut] [&shaker * &shakerV] ~!5 &drumsOut`;

describe('a host’s text whose parts play through performers (feel v1.2)', () => {
  const r = compilePiece(PERFORMED);
  const p = plan(r, codeShifts(r), r.off);
  const route = router(r, channelTable(r));
  const read = readerOf(r);
  const events = eventsBetween(p, seconds, 2 * seconds, true);
  const parts = (read: (o: string | undefined) => ReturnType<typeof readingOf>) =>
    events.map((e) => perform(e, route, at, read).performance).map((x) => x && (x.role ? `${x.part}:${x.role}` : x.part));

  it('compiles, its outputs named by their parts, which the id alone reads as none of the feel’s', () => {
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(barSeconds(r)).toBe(seconds);
    const ids = new Set(events.map((e) => e.output!.split(':').slice(0, 2).join(':')));
    expect(ids).toEqual(new Set(['bassV:bassline^$-12', 'padV:padline', 'keysV:stabline', 'leadV:leadline', 'shakerV:shaker', 'kit:voices']));
    expect(new Set(parts(readingOf))).toEqual(new Set([null, 'drums:kick', 'drums:hat']));
  });

  it('reads each pitched event as its performer’s role, each drum hit as its line, and the rest as none', () => {
    const count = (xs: readonly (string | null)[]) => Object.fromEntries([...new Set(xs)].map((x) => [String(x), xs.filter((y) => y === x).length]));
    expect(count(parts(read))).toEqual({ bass: 6, pad: 2, stab: 2, lead: 8, null: 4, 'drums:kick': 4, 'drums:hat': 16 });
  });

  it('plays each as the old spelling plays the same part: the bass as `bassV:bass`', () => {
    const bass = events.filter((e) => read(e.output)?.part === 'bass');
    for (const e of bass) {
      const { performance } = perform(e, route, at, read);
      expect(performance).toEqual(perform({ ...e, output: 'bassV:bass:6:15' }, route, at).performance);
    }
  });

  it('keeps the output’s id as the reading where no performer’s role names it', () => {
    expect(read('bassV:bass:6:15')).toEqual({ part: 'bass' });
    expect(read('kit:voices:kick:8:13')).toEqual({ part: 'drums', role: 'kick' });
    expect(read(undefined)).toBeNull();
    // (Jambot main's spelling, no performers: every output read by its id)
    const old = readerOf(r0);
    for (const e of eventsBetween(p0, seconds, 2 * seconds, true)) expect(old(e.output), e.output).toEqual(readingOf(e.output));
  });
});
