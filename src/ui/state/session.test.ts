import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionClient } from './session.svelte';
import type { Socket } from '../../session/lobby';
import { PROTOCOL } from '../../session/protocol';
import { JOIN_PROTOCOL } from '../../session/readers';

/** A lobby's socket, faked: it records what the page sends, and says what the test makes it say. */
class FakeSocket implements Socket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly sent: unknown[] = [];
  /** How many of the pings told are answered. */
  answered = 0;
  closed = false;
  send(data: string) {
    this.sent.push(JSON.parse(data));
  }
  close() {
    this.closed = true;
    this.readyState = 3;
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  say(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  /** What the page told its host, in order. */
  get told(): unknown[] {
    return this.sent.flatMap((m) => ((m as { op: string }).op === 'tell' ? [(m as { message: unknown }).message] : []));
  }
}

const muse = { offer: null, memory: [], asOf: null, lastPlayed: null, log: [], dropped: [], players: { host: 'Jambot' } };
const forecast = { from: 0, count: 0, changed: [] };
const welcome = (protocol: number, song: unknown = null) => ({ kind: 'welcome', protocol, session: 'jam', resume: 'token', song, forecast, muse });
const frame = { meter: { cycle: 8, heights: [0, 2, 4, 6] }, swing: { level: '16n', share: 0.5 }, bpm: 120, key: { tonic: 9, mode: 'aeolian' } };
/** A welcome of a host of version 2 (#525): the song's conducts and scores, the fragments and the band. */
const welcome2 = (song: unknown = null) => ({
  kind: 'welcome',
  protocol: 31,
  session: 'jam',
  resume: 'token',
  song,
  forecast,
  muse,
  fragments: [],
  band: { id: 'band', hash: 'e2:0b7a' },
});
const conduct = (bar: number) => ({ bar, start: 1070 + 2 * bar, seed: 1, entropy: 0.3, offer: null, foreseen: `d${bar}` });
const score = (bar: number) => ({ bar, step: bar * 16, section: 'groove', text: '* from band', unstated: null, lock: [], fragments: [], energy: [0.5], foreseen: ['d0'], cut: [] });
const text = (bar: number, t: string) => ({ bar, step: bar * 16, text: t, unstated: null, frame, foreseen: Array.from({ length: 8 }, () => 'x'), cut: [] });

describe('SessionClient: Cell studio following a Jambot session', () => {
  let socket: FakeSocket;
  let now: number;
  let client: SessionClient;
  beforeEach(() => {
    vi.useFakeTimers();
    now = 1000;
    socket = new FakeSocket();
    client = new SessionClient({ now: () => now, socket: () => socket });
  });
  afterEach(() => vi.useRealTimers());

  /** Joined: the lobby said so, and the host welcomed it (a host of version 1, at its reader's protocol, unless given another welcome). */
  async function joined(song: unknown = null, first: unknown = welcome(PROTOCOL, song)) {
    const joining = client.join('wss://lobby.test', ' jam ', 'Cell studio');
    socket.open();
    socket.say({ op: 'joined', session: 'jam' });
    await joining;
    socket.say({ op: 'said', message: first });
  }

  /** The host answers every ping so far, its page clock 100 s ahead, its output 40 s behind its page, answered at once. */
  function pong() {
    const pings = socket.told.filter((m) => (m as { kind: string }).kind === 'ping') as { sent: number }[];
    for (const { sent } of pings.slice(socket.answered)) socket.say({ op: 'said', message: { kind: 'pong', sent, host: sent + 100, heard: -40 } });
    socket.answered = pings.length;
  }

  it('joins by the session’s name through the lobby, then says its protocol and name to the host', async () => {
    await joined();
    expect(socket.sent[0]).toEqual({ op: 'join', session: 'jam' });
    expect(socket.told[0]).toEqual({ kind: 'join', protocol: JOIN_PROTOCOL, name: 'Cell studio' });
    expect(client.status).toBe('joined');
  });

  it('sends nothing but the join, pings and, going, a leave', async () => {
    await joined({ seed: 1, start: 10, track: {}, swing: {}, tempoMeter: {}, bars: [], texts: [] });
    for (let i = 0; i < 20; i++) {
      now += 0.25;
      vi.advanceTimersByTime(250);
      pong();
    }
    client.leave();
    const kinds = new Set(socket.told.map((m) => (m as { kind: string }).kind));
    expect([...kinds].sort()).toEqual(['join', 'leave', 'ping']);
    expect(socket.closed).toBe(true);
    expect(client.status).toBe('idle');
  });

  it("sets its clock by the host's, and follows the host's song where it is heard: the text of the bar, and where in it", async () => {
    // (bars of 2 s from 1070 s on the host's output clock: heard at 1010 s on this page's)
    const bars = Array.from({ length: 8 }, (_, b) => ({ bar: { bar: b }, start: 1070 + 2 * b }));
    await joined({ seed: 1, start: 1070, track: {}, swing: {}, tempoMeter: {}, bars, texts: [text(0, '&a loop=A4')] });
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(50);
      pong();
    }
    expect(client.clock?.offset).toBeCloseTo(100, 9);
    expect(client.heading(1009)).toMatchObject({ before: true, bars: 0, text: { text: '&a loop=A4' } });
    expect(client.heading(1013)).toMatchObject({ before: false, bar: 1, bars: 1.5 });
    // (a later section's text, told while it plays: from its bar on)
    socket.say({ op: 'said', message: { kind: 'section', ...text(4, '&b loop=B4') } });
    expect(client.heading(1019)).toMatchObject({ bar: 4, bars: 0.5, text: { text: '&b loop=B4' } });
  });

  it('follows a host of version 1 by version 1’s reader, exactly as before: a conduct is a kind it doesn’t know', async () => {
    await joined();
    expect([client.version, client.scored]).toEqual([1, null]);
    socket.say({ op: 'said', message: { kind: 'conduct', ...conduct(0) } });
    expect(client.dropped).toEqual({ refused: 0, ignored: 1 });
  });

  it('follows a host of version 2 (#525): its conducts and scores kept, version 1’s kinds ignored, and nothing played yet', async () => {
    await joined(null, welcome2({ seed: 1, start: 1070, track: {}, swing: {}, tempoMeter: {}, conducts: [conduct(0)], scores: [score(0)] }));
    expect([client.status, client.version, client.hostPlaying, client.role]).toEqual(['joined', 2, true, 'player']);
    expect(client.scored?.conducts.map((c) => c.bar)).toEqual([0]);
    expect(client.scored?.scores.map((s) => s.bar)).toEqual([0]);
    expect(client.scored?.band).toEqual({ id: 'band', hash: 'e2:0b7a' });
    socket.say({ op: 'said', message: { kind: 'conduct', ...conduct(1) } });
    socket.say({ op: 'said', message: { kind: 'score', ...score(8) } });
    expect(client.scored?.conducts.map((c) => c.bar)).toEqual([0, 1]);
    expect(client.scored?.scores.map((s) => s.bar)).toEqual([0, 8]);
    // (version 1's bar and section, from a host of version 2: kinds its reader doesn't know)
    socket.say({ op: 'said', message: { kind: 'bar', sent: { bar: { bar: 2 }, start: 1074 } } });
    socket.say({ op: 'said', message: { kind: 'section', ...text(0, '&a loop=A4') } });
    expect(client.dropped).toEqual({ refused: 0, ignored: 2 });
    // (rung 2 plays it: until then the clock is set and nothing is heard or sounded)
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(50);
      pong();
    }
    expect(client.clock?.offset).toBeCloseTo(100, 9);
    expect([client.heading(1013), client.sounding(null, 1, 1013, () => 2), client.nextTurn(1013)]).toEqual([null, null, null]);
    socket.say({ op: 'said', message: { kind: 'finale', bar: 9 } });
    expect(client.scored?.finale).toBe(9);
    socket.say({ op: 'said', message: { kind: 'stop' } });
    expect([client.hostPlaying, client.scored?.conducts, client.scored?.scores, client.scored?.band]).toEqual([false, [], [], { id: 'band', hash: 'e2:0b7a' }]);
    socket.say({ op: 'said', message: { kind: 'start', song: { seed: 2, start: 1100, track: {}, swing: {}, tempoMeter: {} } } });
    expect(client.hostPlaying).toBe(true);
    client.leave();
    expect([client.version, client.scored]).toEqual([null, null]);
  });

  it('picks its reader by the welcome’s protocol: under 30 version 1’s, from 30 version 2’s', async () => {
    await joined(null, welcome(29));
    expect(client.version).toBe(1);
    client.leave();
    socket = new FakeSocket();
    await joined(null, welcome2());
    expect([client.version, client.hostPlaying, client.scored?.conducts]).toEqual([2, false, []]);
    client.leave();
    // (a welcome at 30 in version 1's shape: version 2's reader refuses it, and the join waits on)
    socket = new FakeSocket();
    await joined(null, welcome(30));
    expect([client.status, client.dropped.refused]).toEqual(['joining', 1]);
  });

  it('drops what it can’t read, counting it, and keeps the link', async () => {
    await joined();
    socket.say({ op: 'said', message: { kind: 'finale', bar: '9' } });
    socket.say({ op: 'said', message: { kind: 'encore' } });
    expect(client.dropped).toEqual({ refused: 1, ignored: 1 });
    expect(client.status).toBe('joined');
  });

  it('keeps the role the host seats it as: the welcome’s, then each `role` (session minor 4), and none once it left', async () => {
    await joined();
    expect(client.role).toBe('player');
    socket.say({ op: 'said', message: { kind: 'role', role: 'listener' } });
    expect(client.role).toBe('listener');
    socket.say({ op: 'said', message: { kind: 'role', role: 'host' } });
    expect([client.role, client.dropped.refused]).toEqual(['listener', 1]);
    socket.say({ op: 'said', message: { kind: 'role', role: 'player' } });
    expect(client.role).toBe('player');
    client.leave();
    expect(client.role).toBeNull();
    // (seated without the host's code: its welcome says it listens)
    const joining = client.join('wss://lobby.test', 'jam', 'Cell studio');
    socket.open();
    socket.say({ op: 'joined', session: 'jam' });
    await joining;
    socket.say({ op: 'said', message: { ...welcome(PROTOCOL), listening: true } });
    expect(client.role).toBe('listener');
  });

  it('reads the session’s log and a nudge’s kind without a change to what it sends or follows (session minors 5 to 7)', async () => {
    await joined();
    socket.say({ op: 'said', message: { kind: 'event', bar: null, who: 'conductor', what: 'moved', text: 'The tempo leans.' } });
    socket.say({ op: 'said', message: { kind: 'nudge', target: 'key', by: 1 } });
    expect(client.dropped).toEqual({ refused: 0, ignored: 1 });
    expect(client.status).toBe('joined');
    expect(new Set(socket.told.map((m) => (m as { kind: string }).kind))).toEqual(new Set(['join', 'ping']));
  });

  it('takes no refusal but one that names its name for a taken name', async () => {
    await joined();
    socket.say({ op: 'said', message: { kind: 'refused', reason: 'This host speaks version 15 of the session protocol, which takes 15 on, and this app 14: reload it.' } });
    expect([client.status, client.taken]).toEqual(['idle', null]);
  });

  it('joins once more by another name, where asked to, when the host refuses its name as taken; and only once', async () => {
    const sockets: FakeSocket[] = [];
    const c = new SessionClient({ now: () => now, socket: () => (sockets.push(new FakeSocket()), sockets.at(-1)!) });
    const refuse = async (as: string) => {
      const s = sockets.at(-1)!;
      s.open();
      s.say({ op: 'joined', session: 'jam' });
      await vi.waitFor(() => expect(s.told).toEqual([{ kind: 'join', protocol: JOIN_PROTOCOL, name: as }]));
      s.say({ op: 'said', message: { kind: 'refused', reason: `A player named ${as} is already in this session. Pick another name.` } });
    };
    void c.join('wss://lobby.test', 'jam', 'Cell studio abc', (taken) => `${taken} 2`);
    await refuse('Cell studio abc');
    expect([c.status, c.name, sockets.length]).toEqual(['joining', 'Cell studio abc 2', 2]);
    await refuse('Cell studio abc 2');
    expect([c.status, c.taken, sockets.length]).toEqual(['idle', 'Cell studio abc 2', 2]);
  });

  it('leaves a host of another version, saying leave as it goes', async () => {
    const joining = client.join('wss://lobby.test', 'jam', 'Cell studio');
    socket.open();
    socket.say({ op: 'joined', session: 'jam' });
    await joining;
    socket.say({ op: 'said', message: welcome(12) });
    expect(socket.told.at(-1)).toEqual({ kind: 'leave' });
    expect(client.status).toBe('idle');
    expect(client.ended).toMatch(/version 12/);
  });

  it('ends when the lobby knows no such session, when no welcome comes, when the host refuses or closes; and rejoins when it goes quiet', async () => {
    let joining = client.join('wss://lobby.test', 'jam', 'Cell studio');
    socket.open();
    socket.say({ op: 'refused', reason: 'No session named “jam” is open.' });
    await joining;
    expect([client.status, client.ended]).toEqual(['idle', 'No session named “jam” is open.']);

    socket = new FakeSocket();
    joining = client.join('wss://lobby.test', 'jam', 'Cell studio');
    socket.open();
    socket.say({ op: 'joined', session: 'jam' });
    await joining;
    vi.advanceTimersByTime(2000);
    expect(client.ended).toBe('No session named “jam” answered.');

    socket = new FakeSocket();
    await joined();
    socket.say({ op: 'said', message: { kind: 'refused', reason: 'A player named Cell studio is already in this session. Pick another name.' } });
    expect(client.ended).toMatch(/already in this session/);
    // (a refusal of the name: the panel offers another)
    expect(client.taken).toBe('Cell studio');

    socket = new FakeSocket();
    await joined();
    socket.say({ op: 'gone' });
    expect(client.ended).toBe('The host closed the session.');

    socket = new FakeSocket();
    await joined();
    const quiet = socket;
    now += 3.1;
    vi.advanceTimersByTime(250);
    // (a link quiet that long is taken for dropped: closed, and joined again, rejoin.test.ts)
    expect([client.status, client.ended, quiet.closed]).toEqual(['rejoining', null, true]);
  });

  it('asks for nothing without a session’s name and a player’s', async () => {
    await client.join('wss://lobby.test', '  ', 'Cell studio');
    expect([client.status, client.ended]).toEqual(['idle', 'A session needs a name.']);
    await client.join('wss://lobby.test', 'jam', ' ');
    expect(client.ended).toBe('A player needs a name to join.');
    expect(socket.sent).toEqual([]);
  });
});
