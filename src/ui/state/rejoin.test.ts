import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionClient } from './session.svelte';
import type { Socket } from '../../session/lobby';
import { LIMITS } from '../../session/protocol';
import { REJOIN } from '../../session/rejoin';

// A session client whose link drops, against a fake lobby and host that keep the contract's terms (#482): a host
// seats a join with a token it gave as the same player for `resumeSeconds` after its link dropped, then forgets it.
// The host plays bars of `BAR` s, a section of 4 bars each with its own text, sending each bar 2 bars ahead and each
// section's text 2 bars before it; its clock is this page's (`Date.now()`, faked), each way 5 ms. The page joins at
// 1000 s, the song well under way; the samples, every 100 ms, fall 50 ms from a bar's edge (one on the edge is the
// clock's to place, within its bound, not the rejoin's).

const BAR = 2;
const START = 10.05;
const WAY = 5;
const NAME = 'Cell studio k7m';

const frame = { meter: { cycle: 8, heights: [0, 2, 4, 6] }, swing: { level: '16n', share: 0.5 }, bpm: 120, key: { tonic: 9, mode: 'aeolian' } };
const muse = (players: Record<string, string>) => ({ offer: null, memory: [], asOf: null, lastPlayed: null, log: [], dropped: [], players });
const sectionOf = (bar: number) => Math.floor(bar / 4);
const textOfSection = (k: number) => `&s${k} loop=A${k % 7}`;
const sectionText = (k: number) => ({ bar: 4 * k, step: 64 * k, text: textOfSection(k), unstated: null, frame, foreseen: ['a', 'b', 'c', 'd'], cut: [] });
const seconds = () => Date.now() / 1000;
/** The bar the host plays at `t`, and the text that states it. */
const barAt = (t: number) => Math.floor((t - START) / BAR);
const truthAt = (t: number) => textOfSection(sectionOf(barAt(t)));

interface Member {
  name: string;
  token: string;
  link: FakeLink | null;
  awaySince: number | null;
}

/** The lobby and its host. */
class World {
  /** Whether the network is up: a socket opened while it is down fails. */
  up = true;
  /** Whether the links that are open pass nothing (a socket dead without closing). */
  stalled = false;
  open = true;
  readonly links: FakeLink[] = [];
  members: Member[] = [];
  minted = 0;
  #timer: ReturnType<typeof setInterval>;
  #lastBar = -99;

  constructor() {
    this.#timer = setInterval(() => this.#tick(), 10);
  }
  stop() {
    clearInterval(this.#timer);
  }

  /** The network goes down: every open link closes under the page, and comes back after `s` seconds. */
  drop(s: number) {
    this.up = false;
    for (const l of this.links) if (l.readyState === 1) l.lost();
    setTimeout(() => (this.up = true), s * 1000);
  }

  /** The members seated now, by name. */
  seated(name: string) {
    return this.members.filter((m) => m.name === name && m.link !== null);
  }

  #tick() {
    const bar = barAt(seconds());
    if (bar === this.#lastBar) return;
    this.#lastBar = bar;
    // (each bar sent two ahead, each section's text two bars before its first)
    this.#all({ kind: 'bar', sent: { bar: { bar: bar + 2 }, start: START + (bar + 2) * BAR } });
    if ((bar + 2) % 4 === 0) this.#all({ kind: 'section', ...sectionText(sectionOf(bar + 2)) });
  }

  #all(message: unknown) {
    for (const m of this.members) if (m.link) m.link.say({ op: 'said', message });
  }

  /** What the pages told the host, in order. */
  readonly told: { kind: string; name?: string; resume?: string }[] = [];

  /** What a page sent the lobby. */
  heard(link: FakeLink, request: { op: string; session?: string; message?: { kind: string; name?: string; resume?: string; sent?: number } }) {
    if (request.op === 'join')
      return link.say(this.open ? { op: 'joined', session: request.session } : { op: 'refused', reason: `No session named “${request.session}” is open.` });
    const m = request.message!;
    this.told.push(m);
    if (m.kind === 'join') return this.#admit(link, m.name!, m.resume);
    if (m.kind === 'ping') return link.say({ op: 'said', message: { kind: 'pong', sent: m.sent, host: seconds(), heard: 0 } });
    if (m.kind === 'leave') this.members = this.members.filter((x) => x.link !== link);
  }

  #admit(link: FakeLink, name: string, resume: string | undefined) {
    const now = seconds();
    this.members = this.members.filter((m) => m.awaySince === null || now - m.awaySince < LIMITS.resumeSeconds);
    const resumed = this.members.find((m) => m.token === resume);
    if (this.members.some((m) => m !== resumed && m.link !== null && m.link !== link && m.name.toLowerCase() === name.toLowerCase()))
      return link.say({ op: 'said', message: { kind: 'refused', reason: `A player named ${name} is already in this session. Pick another name.` } });
    const member = resumed ?? { name, token: `t${++this.minted}`, link, awaySince: null };
    Object.assign(member, { name, link, awaySince: null });
    if (!resumed) this.members.push(member);
    const bar = barAt(now);
    // (the bars composed and not played, and the texts stating them)
    const bars = [bar + 1, bar + 2].map((b) => ({ bar: { bar: b }, start: START + b * BAR }));
    const texts = [...new Set([sectionOf(bar + 1), sectionOf(bar + 2)])].map(sectionText);
    link.say({
      op: 'said',
      message: {
        kind: 'welcome',
        protocol: 14,
        session: 'jam',
        resume: member.token,
        song: { seed: 7, start: START, track: {}, swing: {}, tempoMeter: {}, bars, texts },
        forecast: { from: 0, count: 0, changed: [] },
        muse: muse(Object.fromEntries(this.members.map((x, i) => [`c${i}`, x.name]))),
      },
    });
  }

  /** A page's link closed, by the page or under it: its member away. */
  closed(link: FakeLink) {
    for (const m of this.members) if (m.link === link) Object.assign(m, { link: null, awaySince: seconds() });
  }
}

/** A page's socket to the lobby. */
class FakeLink implements Socket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly #world: World;
  constructor(world: World) {
    this.#world = world;
    world.links.push(this);
    setTimeout(() => {
      if (!world.up) {
        this.readyState = 3;
        this.onerror?.();
        return this.onclose?.();
      }
      this.readyState = 1;
      this.onopen?.();
    }, WAY);
  }
  send(data: string) {
    // (sent before a close goes before it, as a WebSocket's frames do)
    if (this.#world.stalled || this.readyState !== 1) return;
    setTimeout(() => this.#world.heard(this, JSON.parse(data)), WAY);
  }
  say(message: unknown) {
    if (this.#world.stalled) return;
    setTimeout(() => this.readyState === 1 && this.onmessage?.({ data: JSON.stringify(message) }), WAY);
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.#world.closed(this);
  }
  /** Closed under the page: the network went. */
  lost() {
    this.readyState = 3;
    this.#world.closed(this);
    this.onclose?.();
  }
}

describe('SessionClient: rejoining after a dropped link (#482)', () => {
  let world: World;
  let client: SessionClient;
  /** What the page shows at each sample: the text of its heading, kept from the last where it has none (as the editor keeps it). */
  let shown: string | null;
  let samples: { t: number; status: string; shown: string | null; truth: string; before: boolean }[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    world = new World();
    client = new SessionClient({ now: seconds, socket: () => new FakeLink(world) });
    shown = null;
    samples = [];
  });
  afterEach(() => {
    client.leave();
    world.stop();
    vi.useRealTimers();
  });

  /** Run for `s` seconds, sampling what is shown against the host's every 100 ms. */
  async function run(s: number) {
    for (let i = 0; i < s * 10; i++) {
      await vi.advanceTimersByTimeAsync(100);
      const t = seconds();
      const heading = client.heading(t);
      shown = heading?.text.text ?? shown;
      samples.push({ t, status: client.status, shown, truth: truthAt(t), before: !!heading?.before });
    }
  }
  async function joined() {
    void client.join('wss://lobby.test', 'jam', NAME);
    await vi.waitFor(() => expect(client.status).toBe('joined'));
    await run(12);
    expect(client.heading()?.text.text).toBe(truthAt(seconds()));
    // (what is measured starts here, the clock trusted and the host's text shown)
    samples = [];
  }
  /** When the client was joined again after `from`: the first sample joined after one that wasn't. */
  const rejoinedAt = (from: number) => samples.find((x, i) => i > 0 && x.t > from && x.status === 'joined' && samples[i - 1]!.status !== 'joined')?.t ?? null;

  it.each([1, 10, 60])('rejoins under its name after the link drops for %i s, the host’s text shown again within a bar', async (down) => {
    await joined();
    // (dropped 1.2 s into a bar, so the 1 s drop comes back mid-bar, its bar's start not in the welcome)
    while ((seconds() - START) % BAR < 1.2 - 0.05 || (seconds() - START) % BAR > 1.2 + 0.05) await run(0.1);
    const token = world.seated(NAME)[0]!.token;
    const dropped = seconds();
    world.drop(down);
    await run(down + 30);
    const back = rejoinedAt(dropped);
    expect(back).not.toBeNull();
    // (back within the last delay and a round trip of the link's return)
    expect(back! - (dropped + down)).toBeLessThanOrEqual(REJOIN.delays.at(-1)! + 0.1);
    // seated as the same player, under its name, once
    expect(world.seated(NAME).map((m) => m.token)).toEqual([token]);
    expect([client.status, client.name, client.rejoins, client.notice]).toEqual(['joined', NAME, { same: 1, new: 0 }, null]);
    // the text shown is the host's from a bar after it is back, and before the drop
    const differing = samples.filter((x) => x.shown !== x.truth && (x.t < dropped || x.t >= back! + BAR));
    expect(differing).toEqual([]);
    // (on a short drop the bars already sent carry it through: nothing differs at all, and the bar playing as it came
    // back is known, kept beneath the welcome's, so it is never taken for a count-in)
    if (down === 1) expect(samples.filter((x) => x.shown !== x.truth || x.before)).toEqual([]);
  });

  it('comes back with its welcome’s token and its name, and sends nothing but the join, pings and the leave', async () => {
    await joined();
    const token = world.seated(NAME)[0]!.token;
    world.drop(10);
    await run(20);
    client.leave();
    await run(0.1);
    const joins = world.told.filter((m) => m.kind === 'join');
    expect(joins.map(({ name, resume }) => ({ name, resume }))).toEqual([
      { name: NAME, resume: undefined },
      { name: NAME, resume: token },
    ]);
    expect([...new Set(world.told.map((m) => m.kind))].sort()).toEqual(['join', 'leave', 'ping']);
  });

  it('joins as a new player after a drop past resumeSeconds, under its name, and says so', async () => {
    await joined();
    const token = world.seated(NAME)[0]!.token;
    const dropped = seconds();
    world.drop(LIMITS.resumeSeconds + 1);
    await run(LIMITS.resumeSeconds + 30);
    const back = rejoinedAt(dropped)!;
    expect(world.seated(NAME).map((m) => m.token)).not.toEqual([token]);
    expect(world.seated(NAME)).toHaveLength(1);
    expect([client.status, client.name, client.rejoins]).toEqual(['joined', NAME, { same: 0, new: 1 }]);
    expect(client.notice).toMatch(/joined again as a new player/);
    expect(samples.filter((x) => x.shown !== x.truth && x.t >= back + BAR)).toEqual([]);
  });

  it('takes a link that went quiet without closing for dropped, after silentSeconds, and rejoins', async () => {
    await joined();
    const dropped = seconds();
    world.stalled = true;
    await run(LIMITS.silentSeconds - 0.5);
    expect(client.status).toBe('joined');
    await run(1);
    expect(client.status).toBe('rejoining');
    world.stalled = false;
    await run(10);
    expect([client.status, client.rejoins]).toEqual(['joined', { same: 1, new: 0 }]);
    const back = rejoinedAt(dropped)!;
    expect(samples.filter((x) => x.shown !== x.truth && (x.t < dropped || x.t >= back + BAR))).toEqual([]);
  });

  it('keeps following what it has while rejoining, and sends nothing on a link it gave up', async () => {
    await joined();
    world.drop(30);
    await run(1);
    expect(client.status).toBe('rejoining');
    expect(client.live).toBe(true);
    expect(client.heading()).not.toBeNull();
    // (the tries so far: links that failed, one after another, never two at once)
    await run(20);
    expect(world.links.filter((l) => l.readyState === 1)).toHaveLength(0);
    client.leave();
    const links = world.links.length;
    await run(60);
    expect([client.status, client.ended, world.links.length]).toEqual(['idle', null, links]);
  });

  it('ends when the lobby refuses every try for refusedFor (the session ended meanwhile)', async () => {
    await joined();
    world.drop(5);
    world.open = false;
    await run(5 + REJOIN.refusedFor - 2);
    expect(client.status).toBe('rejoining');
    await run(10);
    expect([client.status, client.ended]).toEqual(['idle', 'The session ended while the link was down.']);
  });

  it('stops trying after REJOIN.window', async () => {
    await joined();
    world.drop(REJOIN.window + 60);
    await run(REJOIN.window - 5);
    expect(client.status).toBe('rejoining');
    await run(10);
    expect([client.status, client.ended]).toEqual(['idle', 'The link stayed down for 10 minutes.']);
  });

  it('a join never welcomed ends on a dropped link, as before', async () => {
    world.stalled = true;
    void client.join('wss://lobby.test', 'jam', NAME);
    await run(1);
    world.stalled = false;
    world.drop(1);
    await run(5);
    expect(client.status).toBe('idle');
  });
});
