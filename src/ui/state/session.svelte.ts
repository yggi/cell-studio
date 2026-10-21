import { LIMITS, PROTOCOL, leaveOver, readHost, sessionNameProblem, type ClientMessage, type HostMessage, type SectionText } from '../../session/protocol';
import { NO_CLOCK, hostHeardAt, reading, withPing, type HostClock } from '../../session/clock';
import { NOTHING_FOLLOWED, heardAt, pruned, withBar, withText, type Followed } from '../../session/follow';
import { joinLobby, type ClientLink, type Heard, type Socket } from '../../session/lobby';

export type SessionStatus = 'idle' | 'joining' | 'joined';

/** Where the host's song is heard now: the text that states the bar, how far into the text (in its bars), the bar. */
export interface Heading {
  readonly text: SectionText;
  readonly bars: number;
  readonly bar: number;
  /** Before the song's first bar: its count-in. */
  readonly before: boolean;
}

export interface SessionOptions {
  /** This page's clock, in seconds: the one pings are stamped with (`performance.now()`, which never jumps). */
  readonly now?: () => number;
  /** How a socket to the lobby is opened (a test stands in a fake). */
  readonly socket?: (url: string) => Socket;
}

/**
 * Cell studio as a Jambot session's client that listens (#478, rung 1): it joins a session by its name through a
 * lobby, sets its clock by the host's with pings, and follows the host's song: the bars' starts and the section texts
 * the host's band plays through cells (the session contract, `session/protocol.ts`). It sends the join, the pings
 * and, as it goes, a leave; nothing else (it plays nothing: the text is shown, not sounded).
 *
 * What it follows is read where it is heard (`heading`, by the page's frame loop): the text of the bar the host's
 * output sounds now, and where in it. It ends when asked, when the host closes or refuses it, when the lobby goes,
 * when no welcome comes within the contract's wait, when the host goes quiet for `silentSeconds`, and on a welcome of
 * another version of the protocol (saying `leave`). A link that drops isn't joined again (a later rung).
 */
export class SessionClient {
  status = $state<SessionStatus>('idle');
  /** The session joined (as asked), and this player's name in it. */
  session = $state<string | null>(null);
  name = $state<string | null>(null);
  /** Why it ended, when it ended on its own. */
  ended = $state<string | null>(null);
  /** Whether the host is playing a song, and whether its link dropped while the lobby holds the session for it. */
  hostPlaying = $state(false);
  hostAway = $state(false);
  /** The best round trip to the host lately, in milliseconds, and the clock's bound (half of it), once measured. */
  trip = $state<number | null>(null);
  /** How many host messages were dropped: refused (malformed) and ignored (a kind this client doesn't know). */
  dropped = $state({ refused: 0, ignored: 0 });

  #link: ClientLink | null = null;
  #clock: HostClock = NO_CLOCK;
  #followed: Followed = NOTHING_FOLLOWED;
  #token: string | null = null;
  #pinging: ReturnType<typeof setTimeout> | null = null;
  #welcomeWait: ReturnType<typeof setTimeout> | null = null;
  #lastHeard: number | null = null;
  /** Counts the joins begun, so one left meanwhile doesn't go on. */
  #joins = 0;
  readonly #now: () => number;
  readonly #socket: ((url: string) => Socket) | undefined;

  constructor({ now = () => performance.now() / 1000, socket }: SessionOptions = {}) {
    this.#now = now;
    this.#socket = socket;
  }

  /** The host's clock as read: its offset from this page's and the bound it is good to, in seconds; null until trusted. */
  get clock(): { offset: number; bound: number; heard: number | null } | null {
    const r = reading(this.#clock);
    return r && { ...r, heard: this.#clock.heard };
  }

  /** Where the host's song is heard at `now` on this page's clock (seconds): null while not joined, stopped, or before its clock and first text. */
  heading(now = this.#now()): Heading | null {
    if (this.status !== 'joined' || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    if (at === null) return null;
    const heard = heardAt(this.#followed, at);
    if (!heard) return null;
    this.#followed = pruned(this.#followed, heard.place.bar);
    return { text: heard.text, bars: heard.bars, bar: heard.place.bar, before: heard.place.before };
  }

  /** Why a join with these can't be asked for, or null. */
  static problem(session: string, name: string): string | null {
    return sessionNameProblem(session) ?? (name.trim() === '' ? 'A player needs a name to join.' : null);
  }

  /** Join the session named `session` at the lobby at `lobby`, as `name`. */
  async join(lobby: string, session: string, name: string): Promise<void> {
    this.leave();
    const attempt = ++this.#joins;
    const problem = SessionClient.problem(session, name);
    this.ended = null;
    if (problem) return void (this.ended = problem);
    this.status = 'joining';
    this.session = session.trim();
    this.name = name.trim();
    let link: ClientLink;
    try {
      link = await joinLobby(
        lobby.trim(),
        this.session,
        (heard) => attempt === this.#joins && this.#heard(heard),
        (why) => attempt === this.#joins && this.#end(why),
        this.#socket,
      );
    } catch (e) {
      if (attempt === this.#joins) this.#end(e instanceof Error ? e.message : String(e));
      return;
    }
    if (attempt !== this.#joins || this.status !== 'joining') return void link.close();
    this.#link = link;
    this.#welcomeWait = setTimeout(() => this.#end(`No session named “${this.session}” answered.`), LIMITS.welcomeWaitMs);
    this.#sendJoin();
  }

  /** Leave the session (saying so to the host): back to idle. */
  leave(): void {
    if (this.status === 'idle') return;
    this.#send({ kind: 'leave' });
    this.#end(null);
  }

  #sendJoin(): void {
    this.#send({ kind: 'join', protocol: PROTOCOL, name: this.name ?? '', ...(this.#token === null ? {} : { resume: this.#token }) });
  }

  #send(message: ClientMessage): void {
    this.#link?.send(message);
  }

  #end(why: string | null): void {
    this.#joins++;
    this.#link?.close();
    this.#link = null;
    if (this.#pinging) clearTimeout(this.#pinging);
    if (this.#welcomeWait) clearTimeout(this.#welcomeWait);
    this.#pinging = this.#welcomeWait = null;
    this.#clock = NO_CLOCK;
    this.#followed = NOTHING_FOLLOWED;
    this.#token = null;
    this.#lastHeard = null;
    this.status = 'idle';
    this.hostPlaying = false;
    this.hostAway = false;
    this.trip = null;
    this.ended = why;
  }

  #heard(heard: Heard): void {
    if ('lobby' in heard) {
      if (heard.lobby === 'gone') return this.#end('The host closed the session.');
      this.hostAway = heard.lobby === 'away';
      // (the host took its session back: it seats this player again by its token)
      if (heard.lobby === 'back' && this.status === 'joined') this.#sendJoin();
      return;
    }
    const read = readHost(heard.said);
    if ('dropped' in read) {
      this.dropped = { ...this.dropped, [read.dropped]: this.dropped[read.dropped] + 1 };
      return;
    }
    this.#hear(read.message);
  }

  #hear(message: HostMessage): void {
    switch (message.kind) {
      case 'welcome': {
        if (this.#welcomeWait) clearTimeout(this.#welcomeWait);
        this.#welcomeWait = null;
        const over = leaveOver(message.protocol);
        if (over) {
          this.#send({ kind: 'leave' });
          return this.#end(over);
        }
        this.status = 'joined';
        this.hostAway = false;
        this.#token = message.resume;
        // (the host's page clock may be another: it reloaded)
        this.#clock = NO_CLOCK;
        this.#lastHeard = this.#now();
        this.#followed = NOTHING_FOLLOWED;
        this.hostPlaying = message.song !== null;
        if (message.song) {
          let f = NOTHING_FOLLOWED;
          for (const sent of message.song.bars) f = withBar(f, sent);
          for (const text of message.song.texts ?? []) f = withText(f, text);
          this.#followed = f;
        }
        if (this.#pinging) clearTimeout(this.#pinging);
        return this.#ping();
      }
      case 'refused':
        return this.#end(message.reason);
      case 'closed':
        return this.#end('The host closed the session.');
      case 'pong': {
        const received = this.#now();
        this.#lastHeard = received;
        this.#clock = withPing(this.#clock, { sent: message.sent, received, host: message.host, heard: message.heard });
        const r = reading(this.#clock);
        if (r) this.trip = Math.round(r.bound * 2000);
        return;
      }
      case 'start':
        this.#followed = NOTHING_FOLLOWED;
        this.hostPlaying = true;
        return;
      case 'bar':
        this.#followed = withBar(this.#followed, message.sent);
        return;
      case 'section': {
        const { kind, ...text } = message;
        void kind;
        this.#followed = withText(this.#followed, text);
        return;
      }
      case 'finale':
        this.#followed = { ...this.#followed, finale: message.bar };
        return;
      case 'stop':
        this.hostPlaying = false;
        this.#followed = NOTHING_FOLLOWED;
        return;
      // (the style, the bars ahead and the Muse: read, and not shown yet)
      case 'track':
      case 'forecast':
      case 'muse':
        return;
    }
  }

  #ping(): void {
    if (this.status !== 'joined') return;
    const now = this.#now();
    if (!this.hostAway && this.#lastHeard !== null && now - this.#lastHeard > LIMITS.silentSeconds) return this.#end('The host went quiet.');
    this.#send({ kind: 'ping', sent: now });
    const every = this.clock ? LIMITS.pingEveryMs : LIMITS.pingSettlingMs;
    this.#pinging = setTimeout(() => this.#ping(), every);
  }
}
