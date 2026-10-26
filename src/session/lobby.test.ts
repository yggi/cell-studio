import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIST_EVERY, LIST_GOOD_FOR, LIST_RETRY, watchLobby, type Listed, type Socket } from './lobby';

/** A lobby's socket, faked: it records what the page sends, and says what the test makes it say. */
class FakeSocket implements Socket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  readonly sent: unknown[] = [];
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
  /** The lobby goes: its socket closes under the page. */
  drop() {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe('a lobby watched: the sessions open, for the library’s lobby cell (#478, rung 2)', () => {
  let sockets: FakeSocket[];
  let heard: { listed: readonly Listed[] | null; why: string | null }[];
  let stop: () => void;
  const last = () => heard.at(-1);
  const socket = () => sockets.at(-1)!;
  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    heard = [];
    stop = watchLobby(
      'wss://lobby.test',
      (listed, why) => heard.push({ listed, why }),
      () => (sockets.push(new FakeSocket()), socket()),
    );
  });
  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  it('asks which sessions are open as it opens and every LIST_EVERY, and sends nothing else', () => {
    socket().open();
    expect(socket().sent).toEqual([{ op: 'list' }]);
    for (let i = 0; i < 3; i++) {
      socket().say({ op: 'sessions', sessions: [] });
      vi.advanceTimersByTime(LIST_EVERY);
    }
    expect(socket().sent).toEqual(Array(4).fill({ op: 'list' }));
  });

  it('hears each list, sorted by name, and nothing but a list', () => {
    socket().open();
    socket().say({
      op: 'sessions',
      sessions: [
        { name: 'zebra', players: 1 },
        { name: 'Ada’s jam', players: 3, extra: true },
      ],
    });
    expect(last()).toEqual({
      listed: [
        { name: 'Ada’s jam', players: 3, away: false },
        { name: 'zebra', players: 1, away: false },
      ],
      why: null,
    });
    socket().say({ op: 'joined', session: 'jam' });
    socket().say({ op: 'sessions', sessions: 'none' });
    expect(heard).toHaveLength(1);
  });

  it('hears a session’s host away and back, and lists nothing for a list whose away isn’t a boolean (session minor 3)', () => {
    socket().open();
    socket().say({
      op: 'sessions',
      sessions: [
        { name: 'jam', players: 2, away: true },
        { name: 'reel', players: 1, away: false },
      ],
    });
    expect(last()?.listed).toEqual([
      { name: 'jam', players: 2, away: true },
      { name: 'reel', players: 1, away: false },
    ]);
    socket().say({ op: 'sessions', sessions: [{ name: 'jam', players: 2 }] });
    expect(last()?.listed).toEqual([{ name: 'jam', players: 2, away: false }]);
    for (const away of ['yes', 1, null]) socket().say({ op: 'sessions', sessions: [{ name: 'jam', players: 2, away }] });
    expect(heard).toHaveLength(2);
  });

  it('shows a session opened or closed within LIST_EVERY of the lobby listing it so: under the 5 s bound', () => {
    expect(LIST_EVERY).toBeLessThan(5000);
    socket().open();
    const listing = { now: [{ name: 'jam', players: 1 }] };
    // (the lobby answers each ask with what is open at that moment)
    const answer = () => socket().say({ op: 'sessions', sessions: listing.now });
    answer();
    listing.now = [];
    vi.advanceTimersByTime(LIST_EVERY);
    answer();
    expect(last()?.listed).toEqual([]);
  });

  it('lists nothing once the lobby has not answered for LIST_GOOD_FOR, and asks again, on a new socket, after LIST_RETRY', () => {
    socket().open();
    socket().say({ op: 'sessions', sessions: [{ name: 'jam', players: 2 }] });
    vi.advanceTimersByTime(LIST_GOOD_FOR - 1);
    expect(last()?.listed).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(last()).toEqual({ listed: null, why: 'The lobby at wss://lobby.test isn’t answering.' });
    expect(sockets[0]!.closed).toBe(true);
    vi.advanceTimersByTime(LIST_RETRY);
    expect(sockets).toHaveLength(2);
    socket().open();
    expect(socket().sent).toEqual([{ op: 'list' }]);
  });

  it('lists nothing when the lobby goes or can’t be reached, and tries again', () => {
    socket().open();
    socket().say({ op: 'sessions', sessions: [{ name: 'jam', players: 2 }] });
    socket().drop();
    expect(last()).toEqual({ listed: null, why: 'Lost the lobby at wss://lobby.test.' });
    vi.advanceTimersByTime(LIST_RETRY);
    socket().onerror?.();
    expect(last()).toEqual({ listed: null, why: 'Can’t reach the lobby at wss://lobby.test.' });
    expect(sockets).toHaveLength(2);
  });

  it('stopped, closes its socket and asks nothing again', () => {
    socket().open();
    stop();
    const sent = socket().sent.length;
    vi.advanceTimersByTime(10 * LIST_EVERY + LIST_RETRY);
    expect([socket().closed, socket().sent.length, sockets.length]).toEqual([true, sent, 1]);
  });

  it('opens nothing for an address that is no lobby', () => {
    const opened: string[] = [];
    const said: (string | null)[] = [];
    watchLobby(
      'https://lobby.test',
      (_, why) => said.push(why),
      (url) => (opened.push(url), new FakeSocket()),
    );
    vi.advanceTimersByTime(LIST_RETRY * 2);
    expect(opened).toEqual([]);
    expect(said).toEqual(['“https://lobby.test” is no lobby address: it starts ws:// or wss://.']);
  });
});
