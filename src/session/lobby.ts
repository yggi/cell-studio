/**
 * A client's link to a session through a lobby server (Jambot's `apps/lobby`), over a WebSocket, as the session
 * contract's link says: the page asks to `join` a session by its name, and once `joined` it `tell`s the host its
 * messages and hears the host's (`said`), and the lobby's own words: the host `away` (its link dropped, the lobby holds
 * the session for it) and `back`, or `gone`. A socket that closes under a joined link is a lost lobby.
 *
 * A lobby watched (`watchLobby`, the library's lobby cell: #478 rung 2) is asked, on a socket of its own, which
 * sessions are open, every `LIST_EVERY` while the library shows it, and nothing else: no session is joined on it.
 *
 * A page served over https can reach only a wss:// lobby, or one on localhost; the hosted lobby takes pages from
 * https://yggi.github.io and localhost.
 */
import { readFromLobby, type ClientMessage, type FromLobby, type ToLobby } from './protocol';

/** How long, in milliseconds, reaching the lobby and its first answer may take. */
const LOBBY_WAIT = 4000;

/** What a link hears: what the host said (unread: the session's reader reads it), and the lobby's own words. */
export type Heard = { readonly said: unknown } | { readonly lobby: 'away' | 'back' | 'gone' };

/** A client's end of a session: to its host. */
export interface ClientLink {
  send(message: ClientMessage): void;
  close(): void;
}

/** The part of a WebSocket a link uses, so a test can stand in for one. */
export interface Socket {
  readonly readyState: number;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  send(data: string): void;
  close(): void;
}

const OPEN = 1;

/** Open a WebSocket: the browser's. */
const webSocket = (url: string) => new WebSocket(url) as unknown as Socket;

/** Why `url` is no lobby this page can reach, or null: a lobby is a ws:// or wss:// address. */
const noLobby = (url: string): string | null => (/^wss?:\/\/./.test(url) ? null : `“${url}” is no lobby address: it starts ws:// or wss://.`);
/** Why a socket to `url` couldn't be opened (the browser refused the address). */
const unreachable = (url: string) => `“${url}” is no lobby address${url.startsWith('ws://') ? ' this page can reach: an https page reaches wss:// only, or localhost' : ''}.`;

/** A join the lobby answered and refused (no such session, its host away, full), where another failed to reach it. */
export class LobbyRefused extends Error {}

/**
 * Join the session named `session` at the lobby at `url`: the link, once the lobby says `joined`; refused (thrown, its
 * reason: a `LobbyRefused` when the lobby answered so) when the lobby knows no such session, or can't be reached. `hear` hears everything after; `lost` that the
 * lobby went away under the link (not when the link is closed here).
 */
export function joinLobby(url: string, session: string, hear: (heard: Heard) => void, lost: (why: string) => void, open: (url: string) => Socket = webSocket): Promise<ClientLink> {
  const bad = noLobby(url);
  if (bad) return Promise.reject(new Error(bad));
  let socket: Socket;
  try {
    socket = open(url);
  } catch {
    return Promise.reject(new Error(unreachable(url)));
  }
  const send = (request: ToLobby) => {
    if (socket.readyState === OPEN) socket.send(JSON.stringify(request));
  };
  return new Promise((resolve, reject) => {
    let answered = false;
    let closing = false;
    const fail = (why: string, refused = false) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      socket.onclose = null;
      socket.close();
      reject(refused ? new LobbyRefused(why) : new Error(why));
    };
    const timer = setTimeout(() => fail(`The lobby at ${url} did not answer.`), LOBBY_WAIT);
    socket.onopen = () => send({ op: 'join', session });
    socket.onerror = () => fail(`Can't reach the lobby at ${url}.`);
    socket.onclose = () => {
      if (!answered) return fail(`Can't reach the lobby at ${url}.`);
      if (!closing) lost(`Lost the lobby at ${url}.`);
    };
    socket.onmessage = ({ data }) => {
      let said: FromLobby | null;
      try {
        said = typeof data === 'string' ? readFromLobby(JSON.parse(data)) : null;
      } catch {
        return;
      }
      if (!said) return;
      if (!answered) {
        if (said.op === 'refused') return fail(said.reason, true);
        if (said.op !== 'joined') return fail(`The lobby answered ${said.op}.`);
        answered = true;
        clearTimeout(timer);
        return resolve({
          send: (message) => send({ op: 'tell', message }),
          close() {
            closing = true;
            socket.close();
          },
        });
      }
      if (said.op === 'said') hear({ said: said.message });
      else if (said.op === 'away' || said.op === 'back') hear({ lobby: said.op });
      else if (said.op === 'gone') {
        closing = true;
        hear({ lobby: 'gone' });
      }
    };
  });
}

/** A session a lobby lists: its name, how many players are in it, its host counted, and whether its host is away (a join to it refused till the host is back). */
export interface Listed {
  readonly name: string;
  readonly players: number;
  readonly away: boolean;
}

/**
 * How often a lobby watched is asked which sessions are open, in milliseconds. A session opened or closed on the lobby
 * shows or goes within this and a round trip: under #478's bound of 5 s with a round trip of up to 3 s.
 */
export const LIST_EVERY = 2000;
/**
 * How long a list is good for, in milliseconds: a lobby that hasn't answered for this long (two asks) is taken for
 * lost, and nothing is listed, so a session that ended is never shown for longer than this after the lobby last listed
 * it, however the link fails.
 */
export const LIST_GOOD_FOR = 4000;
/** How long, in milliseconds, before a lobby lost or out of reach is tried again. */
export const LIST_RETRY = 5000;

/**
 * Watch the lobby at `url`: what sessions are open, now and every `LIST_EVERY`, on a socket of its own that sends
 * nothing but `list`. `heard` hears each list, sorted by name, and, when the lobby can't be reached, stops answering
 * or goes, `null` and why (it is tried again after `LIST_RETRY`; an address that is none isn't). Returns what stops it:
 * the socket closed, nothing asked again.
 */
export function watchLobby(url: string, heard: (listed: readonly Listed[] | null, why: string | null) => void, open: (url: string) => Socket = webSocket): () => void {
  let stopped = false;
  let socket: Socket | null = null;
  let asking: ReturnType<typeof setInterval> | undefined;
  let good: ReturnType<typeof setTimeout> | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const quiet = () => {
    clearInterval(asking);
    clearTimeout(good);
    clearTimeout(retry);
    if (!socket) return;
    socket.onopen = socket.onclose = socket.onerror = socket.onmessage = null;
    socket.close();
    socket = null;
  };
  const lost = (why: string) => {
    if (stopped) return;
    quiet();
    heard(null, why);
    retry = setTimeout(connect, LIST_RETRY);
  };
  // (no answer for as long as a list is good for: the lobby is taken for lost)
  const answerWithin = () => {
    clearTimeout(good);
    good = setTimeout(() => lost(`The lobby at ${url} isn’t answering.`), LIST_GOOD_FOR);
  };
  const ask = () => {
    if (socket?.readyState === OPEN) socket.send(JSON.stringify({ op: 'list' } satisfies ToLobby));
  };
  function connect() {
    const bad = noLobby(url);
    if (bad) return heard(null, bad);
    let s: Socket;
    try {
      s = open(url);
    } catch {
      return heard(null, unreachable(url));
    }
    socket = s;
    answerWithin();
    s.onopen = () => {
      ask();
      asking = setInterval(ask, LIST_EVERY);
    };
    s.onerror = () => lost(`Can’t reach the lobby at ${url}.`);
    s.onclose = () => lost(`Lost the lobby at ${url}.`);
    s.onmessage = ({ data }) => {
      let said: FromLobby | null;
      try {
        said = typeof data === 'string' ? readFromLobby(JSON.parse(data)) : null;
      } catch {
        return;
      }
      if (said?.op !== 'sessions') return;
      answerWithin();
      heard(
        [...said.sessions].map(({ name, players, away }) => ({ name, players, away: away === true })).sort((a, b) => a.name.localeCompare(b.name)),
        null,
      );
    };
  }
  connect();
  return () => {
    stopped = true;
    quiet();
  };
}
