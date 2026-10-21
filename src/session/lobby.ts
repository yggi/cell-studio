/**
 * A client's link to a session through a lobby server (Jambot's `apps/lobby`), over a WebSocket, as the session
 * contract's link says: the page asks to `join` a session by its name, and once `joined` it `tell`s the host its
 * messages and hears the host's (`said`), and the lobby's own words: the host `away` (its link dropped, the lobby holds
 * the session for it) and `back`, or `gone`. A socket that closes under a joined link is a lost lobby.
 *
 * A page served over https can reach only a wss:// lobby, or one on localhost; the hosted lobby takes pages from
 * https://yggi.github.io and localhost.
 */
import { readFromLobby, type ClientMessage, type FromLobby, type ToLobby } from './protocol';

/** How long, in milliseconds, reaching the lobby and its first answer may take. */
export const LOBBY_WAIT = 4000;

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

/**
 * Join the session named `session` at the lobby at `url`: the link, once the lobby says `joined`; refused (thrown, its
 * reason) when the lobby knows no such session, or can't be reached. `hear` hears everything after; `lost` that the
 * lobby went away under the link (not when the link is closed here).
 */
export function joinLobby(
  url: string,
  session: string,
  hear: (heard: Heard) => void,
  lost: (why: string) => void,
  open: (url: string) => Socket = (u) => new WebSocket(u) as unknown as Socket,
): Promise<ClientLink> {
  if (!/^wss?:\/\/./.test(url)) return Promise.reject(new Error(`“${url}” is no lobby address: it starts ws:// or wss://.`));
  let socket: Socket;
  try {
    socket = open(url);
  } catch {
    return Promise.reject(new Error(`“${url}” is no lobby address${url.startsWith('ws://') ? ' this page can reach: an https page reaches wss:// only, or localhost' : ''}.`));
  }
  const send = (request: ToLobby) => {
    if (socket.readyState === OPEN) socket.send(JSON.stringify(request));
  };
  return new Promise((resolve, reject) => {
    let answered = false;
    let closing = false;
    const fail = (why: string) => {
      if (answered) return;
      answered = true;
      clearTimeout(timer);
      socket.onclose = null;
      socket.close();
      reject(new Error(why));
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
        if (said.op === 'refused') return fail(said.reason);
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
