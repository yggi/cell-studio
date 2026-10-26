import { watchLobby, type Listed, type Socket } from '../../session/lobby';

/** How long, in milliseconds, another lobby address must stand before it is watched. */
const SETTLES = 800;

/**
 * The library's lobby cell (#478, rung 2): the sessions a lobby lists as open, watched only while the library shows
 * it (`show`): asked every `LIST_EVERY` on a socket of its own that sends nothing but `list` (`session/lobby.ts`), the
 * socket closed when the library closes or the page is hidden, so there is no lobby traffic then. Nothing is listed
 * while it isn't watched, nor when the lobby can't be reached or stops answering: a session that ended never stays.
 * A session whose host is away is listed, marked, and not joined (`joinable`).
 */
export class LobbyWatch {
  /** The sessions open, sorted by name; empty while not watched or out of reach. */
  sessions = $state.raw<readonly Listed[]>([]);
  /** Why nothing is listed, when the lobby can't be reached, stopped answering or went; else null. */
  problem = $state<string | null>(null);
  /** Whether the lobby has answered since it was last watched (before that, nothing is known: not "none open"). */
  answered = $state(false);

  #url: string | null = null;
  #stop: (() => void) | null = null;
  #settling: ReturnType<typeof setTimeout> | undefined;
  readonly #socket: ((url: string) => Socket) | undefined;

  constructor(socket?: (url: string) => Socket) {
    this.#socket = socket;
  }

  /**
   * Whether the session named `session` may be joined from the list: not while the lobby lists its host away (a join
   * then is refused: session minor 3). It is offered again with the first list that says its host is back.
   */
  joinable(session: string): boolean {
    const key = session.trim().toLowerCase();
    return !this.sessions.some((s) => s.away && s.name.trim().toLowerCase() === key);
  }

  /**
   * Watch the lobby at `url` while `shown`, and only then: not shown, it stops at once. Another address while shown
   * (one being typed on the Jam page) is watched once it has stood for `SETTLES`, not one socket a keystroke.
   */
  show(shown: boolean, url: string): void {
    const want = shown ? url.trim() : null;
    if (want === this.#url) return;
    const moved = want !== null && this.#url !== null;
    this.#stop?.();
    this.#stop = null;
    clearTimeout(this.#settling);
    this.#url = want;
    this.sessions = [];
    this.problem = null;
    this.answered = false;
    if (want === null) return;
    const watch = () => {
      this.#stop = watchLobby(
        want,
        (listed, why) => {
          this.sessions = listed ?? [];
          this.problem = why;
          this.answered = listed !== null;
        },
        this.#socket,
      );
    };
    if (moved) this.#settling = setTimeout(watch, SETTLES);
    else watch();
  }
}
