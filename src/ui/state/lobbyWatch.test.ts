import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyWatch } from './lobbyWatch.svelte';
import { LIST_EVERY, type Socket } from '../../session/lobby';

/** A lobby's socket, faked: it counts what the page sends, and lists what the test says is open. */
class FakeSocket implements Socket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  sent = 0;
  closed = false;
  constructor(readonly url: string) {}
  send() {
    this.sent++;
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
}

describe('the library’s lobby cell, watched (#478, rung 2)', () => {
  let sockets: FakeSocket[];
  let watch: LobbyWatch;
  const sent = () => sockets.reduce((n, s) => n + s.sent, 0);
  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    watch = new LobbyWatch((url) => (sockets.push(new FakeSocket(url)), sockets.at(-1)!));
  });
  afterEach(() => vi.useRealTimers());

  it('watches the lobby while the library shows it, and sends nothing while it is closed', () => {
    watch.show(true, 'wss://lobby.test');
    sockets[0]!.open();
    sockets[0]!.say({ op: 'sessions', sessions: [{ name: 'jam', players: 2 }] });
    expect([watch.answered, watch.sessions]).toEqual([true, [{ name: 'jam', players: 2, away: false }]]);
    watch.show(false, 'wss://lobby.test');
    // (closed: no socket open, nothing listed, and nothing sent however long it stays closed)
    expect(sockets.every((s) => s.closed)).toBe(true);
    expect([watch.answered, watch.sessions]).toEqual([false, []]);
    const before = sent();
    vi.advanceTimersByTime(60_000);
    expect([sent(), sockets.length]).toEqual([before, 1]);
    // (shown again: a fresh socket, asked at once)
    watch.show(true, 'wss://lobby.test');
    sockets[1]!.open();
    expect(sockets[1]!.sent).toBe(1);
  });

  it('marks a session whose host is away within LIST_EVERY, offers no join to it while the lobby says so, and offers it again once back (session minor 3)', () => {
    expect(LIST_EVERY).toBeLessThanOrEqual(2000);
    watch.show(true, 'wss://lobby.test');
    const lobby = sockets[0]!;
    // (the lobby answers each ask with the sessions as they are at that moment)
    const now = { away: false };
    lobby.send = () => {
      lobby.sent++;
      lobby.say({ op: 'sessions', sessions: [{ name: 'Jam', players: 2, away: now.away }] });
    };
    lobby.open();
    expect([watch.sessions[0]?.away, watch.joinable('Jam')]).toEqual([false, true]);
    now.away = true;
    vi.advanceTimersByTime(LIST_EVERY);
    expect([watch.sessions[0]?.away, watch.joinable('Jam'), watch.joinable(' jam '), watch.joinable('reel')]).toEqual([true, false, false, true]);
    vi.advanceTimersByTime(5 * LIST_EVERY);
    expect(watch.joinable('Jam')).toBe(false);
    now.away = false;
    vi.advanceTimersByTime(LIST_EVERY);
    expect([watch.sessions[0]?.away, watch.joinable('Jam')]).toEqual([false, true]);
  });

  it('watches another lobby once its address has stood a moment, not one socket a keystroke', () => {
    watch.show(true, 'wss://lobby.test');
    for (const url of ['wss://l', 'wss://lo', 'wss://lob', 'wss://other.test']) {
      watch.show(true, url);
      vi.advanceTimersByTime(100);
    }
    expect(sockets.map((s) => s.url)).toEqual(['wss://lobby.test']);
    vi.advanceTimersByTime(LIST_EVERY);
    expect(sockets.map((s) => s.url)).toEqual(['wss://lobby.test', 'wss://other.test']);
    expect(sockets[0]!.closed).toBe(true);
  });
});
