import { HOSTED_LOBBY, LIMITS, PROTOCOL, leaveOver, readHost, sessionNameProblem, type ClientMessage, type HostMessage, type SectionText } from '../../session/protocol';
import { NO_CLOCK, hostHeardAt, reading, withPing, type HostClock } from '../../session/clock';
import { NOTHING_FOLLOWED, heardAt, nextTextAt, pruned, reaches, withBar, withText, type Followed } from '../../session/follow';
import { LobbyRefused, joinLobby, type ClientLink, type Heard, type Socket } from '../../session/lobby';
import { refusesName } from '../../session/name';
import { sounding, type Place, type Sounding } from '../../session/sound';
import { failed, outage, retry, type Outage } from '../../session/rejoin';
import { storageKey } from '../../storageKey';

/** Where this browser keeps the name it joins a session by (`session/name.ts`). */
export const NAME_KEY = storageKey('cell-studio:jam-name');

/** Idle; joining; joined (welcomed); or rejoining: seated, its link dropped, trying to come back (#482). */
export type SessionStatus = 'idle' | 'joining' | 'joined' | 'rejoining';

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
 * and, as it goes, a leave; nothing else. What it follows is sounded by the player through `sounding` (rung 3).
 *
 * What it follows is read where it is heard (`heading`, by the page's frame loop): the text of the bar the host's
 * output sounds now, and where in it. It ends when asked, when the host closes or refuses it, when the lobby says the
 * session is gone, when no welcome comes within the contract's wait, and on a welcome of another version of the
 * protocol (saying `leave`).
 *
 * A link that drops once seated is no leaving (#482): the socket closing, or the host quiet for `silentSeconds` (a
 * socket dead without closing). It is `rejoining`: still following what it has (the bars and texts already sent, on
 * the clock it had), it joins again with the welcome's `resume` token, trying as `session/rejoin.ts` says, under its
 * name. Seated again, it follows the host from the welcome, the same song's bars and texts kept beneath the welcome's.
 * A welcome with another token is a host that no longer kept the seat (past `resumeSeconds`): joined as a new player,
 * and it says so (`notice`).
 */
export class SessionClient {
  /** The lobby joined through, and the one the library's lobby cell lists (the Jam page sets it). */
  lobby = $state(HOSTED_LOBBY);
  status = $state<SessionStatus>('idle');
  /** Whether a session is followed: joined, or rejoining after its link dropped. */
  readonly live = $derived(this.status === 'joined' || this.status === 'rejoining');
  /** What to say while in the session, beside its status: a rejoin as a new player. */
  notice = $state<string | null>(null);
  /** How many times the link came back since the join: seated as the same player, and as a new one. */
  rejoins = $state({ same: 0, new: 0 });
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
  /** The name a host refused as taken, when the last join ended so (the panel offers another); else null. */
  taken = $state<string | null>(null);
  /** How many host messages were dropped: refused (malformed) and ignored (a kind this client doesn't know). */
  dropped = $state({ refused: 0, ignored: 0 });

  #link: ClientLink | null = null;
  /** The lobby joined through, while in a session. */
  #lobby: string | null = null;
  /** Counts the links made and dropped: what a link no longer the latest hears or loses is not this client's. */
  #generation = 0;
  /** The outage, while rejoining, and the timer of its next try. */
  #outage: Outage | null = null;
  #retrying: ReturnType<typeof setTimeout> | null = null;
  /** The song followed, by its seed and start: a rejoin's welcome of the same song keeps what was followed of it. */
  #song: { seed: number; start: number } | null = null;
  #clock: HostClock = NO_CLOCK;
  #followed: Followed = NOTHING_FOLLOWED;
  #token: string | null = null;
  #pinging: ReturnType<typeof setTimeout> | null = null;
  #welcomeWait: ReturnType<typeof setTimeout> | null = null;
  #lastHeard: number | null = null;
  /** The join's second try, for a name refused as taken: through which lobby, and by which name. */
  #again: { lobby: string; another: (taken: string) => string } | null = null;
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
    if (!this.live || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    if (at === null) return null;
    const heard = heardAt(this.#followed, at);
    if (!heard) return null;
    this.#followed = pruned(this.#followed, heard.place.bar);
    return { text: heard.text, bars: heard.bars, bar: heard.place.bar, before: heard.place.before };
  }

  /**
   * What to play of the host's song (`session/sound.ts`) from where the last ask got to (`done`; null: where it is heard
   * now) to `lead` seconds past `now` on this page's clock, and on to `reach` through the bars the host has told (#513);
   * `shift` is the host's clock less this page's, to place it here. Null while not following a song, or before the clock
   * is trusted.
   */
  sounding(done: Place | null, lead: number, now: number, length: (text: SectionText) => number | null, reach = lead): (Sounding & { shift: number }) | null {
    if (!this.live || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    if (at === null) return null;
    return { ...sounding(this.#followed, done, at + lead, at, length, at + reach), shift: at - now };
  }

  /** When, on this page's clock (seconds), the text heard next gives way to another, as known at `now`; null where none is known yet. */
  nextTurn(now = this.#now()): number | null {
    if (!this.live || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    const next = at === null ? null : nextTextAt(this.#followed, at);
    return next === null || at === null ? null : now + (next - at);
  }

  /** Why a join with these can't be asked for, or null. */
  static problem(session: string, name: string): string | null {
    return sessionNameProblem(session) ?? (name.trim() === '' ? 'A player needs a name to join.' : null);
  }

  /**
   * Join the session named `session` at the lobby at `lobby`, as `name`. With `another`, a host's refusal of the name
   * as taken joins once more, by the name `another` gives (the library's lobby cell: nobody there to ask).
   */
  async join(lobby: string, session: string, name: string, another?: (taken: string) => string): Promise<void> {
    this.leave();
    this.#again = another ? { lobby, another } : null;
    const problem = SessionClient.problem(session, name);
    this.ended = null;
    this.taken = null;
    this.notice = null;
    this.rejoins = { same: 0, new: 0 };
    if (problem) return void (this.ended = problem);
    this.status = 'joining';
    this.session = session.trim();
    this.name = name.trim();
    this.#lobby = lobby.trim();
    // (the generation the link takes: one left or joined again meanwhile is another)
    const generation = this.#generation + 1;
    try {
      if (!(await this.#open())) return;
    } catch (e) {
      if (generation === this.#generation) this.#end(e instanceof Error ? e.message : String(e));
      return;
    }
    this.#welcomeWait = setTimeout(() => this.#end(`No session named “${this.session}” answered.`), LIMITS.welcomeWaitMs);
    this.#sendJoin();
  }

  /** A link to the session through its lobby, made the latest (null where another was made or the session left meanwhile); thrown where the lobby refused or couldn't be reached. */
  async #open(): Promise<ClientLink | null> {
    const generation = ++this.#generation;
    const link = await joinLobby(
      this.#lobby ?? '',
      this.session ?? '',
      (heard) => generation === this.#generation && this.#heard(heard),
      (why) => generation === this.#generation && this.#dropped(why),
      this.#socket,
    );
    if (generation !== this.#generation) {
      link.close();
      return null;
    }
    this.#link = link;
    return link;
  }

  /**
   * The link is gone without the host saying so: the lobby's socket closed, or the host went quiet. A client that was
   * seated keeps following what it has and tries to come back; one never seated ends; a try that loses its link fails.
   */
  #dropped(why: string): void {
    if (this.status === 'rejoining') return this.#failed(false);
    if (this.status !== 'joined' || this.#token === null || this.#lobby === null) return this.#end(why);
    this.#generation++;
    this.#link?.close();
    this.#link = null;
    if (this.#pinging) clearTimeout(this.#pinging);
    this.#pinging = null;
    this.status = 'rejoining';
    this.hostAway = false;
    this.#outage = outage(this.#now());
    this.#schedule();
  }

  /** The next try, when `session/rejoin.ts` says; or the end, when it says to stop. */
  #schedule(): void {
    if (this.#retrying) clearTimeout(this.#retrying);
    this.#retrying = null;
    if (!this.#outage) return;
    const next = retry(this.#outage, this.#now());
    if ('giveUp' in next) return this.#end(next.giveUp);
    this.#retrying = setTimeout(() => void this.#attempt(), next.wait * 1000);
  }

  /** One try to come back: a link through the lobby, and the join with the token, its welcome waited for. */
  async #attempt(): Promise<void> {
    this.#retrying = null;
    if (this.status !== 'rejoining') return;
    const generation = this.#generation + 1;
    try {
      if (!(await this.#open())) return;
    } catch (e) {
      if (generation === this.#generation) this.#failed(e instanceof LobbyRefused);
      return;
    }
    if (this.status !== 'rejoining') return;
    this.#welcomeWait = setTimeout(() => this.#failed(false), LIMITS.welcomeWaitMs);
    this.#sendJoin();
  }

  /** A try that ended without a welcome (refused by the lobby, or not): its link dropped, and the next one waited for. */
  #failed(refused: boolean): void {
    if (this.status !== 'rejoining' || !this.#outage) return;
    this.#generation++;
    this.#link?.close();
    this.#link = null;
    if (this.#welcomeWait) clearTimeout(this.#welcomeWait);
    this.#welcomeWait = null;
    this.#outage = failed(this.#outage, this.#now(), refused);
    this.#schedule();
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
    this.#generation++;
    this.#link?.close();
    this.#link = null;
    if (this.#pinging) clearTimeout(this.#pinging);
    if (this.#welcomeWait) clearTimeout(this.#welcomeWait);
    if (this.#retrying) clearTimeout(this.#retrying);
    this.#pinging = this.#welcomeWait = this.#retrying = null;
    this.#outage = null;
    this.#lobby = null;
    this.#song = null;
    this.#clock = NO_CLOCK;
    this.#followed = NOTHING_FOLLOWED;
    this.#token = null;
    this.notice = null;
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
        const { song } = message;
        // (back after a drop: seated as the same player where the host kept its seat, which its token says)
        const back = this.status === 'rejoining';
        if (back) {
          if (this.#retrying) clearTimeout(this.#retrying);
          this.#retrying = null;
          this.#outage = null;
          const same = message.resume === this.#token;
          this.rejoins = same ? { ...this.rejoins, same: this.rejoins.same + 1 } : { ...this.rejoins, new: this.rejoins.new + 1 };
          this.notice = same ? null : `The link was down longer than the host keeps a seat (${LIMITS.resumeSeconds / 60} minutes): joined again as a new player.`;
        }
        this.status = 'joined';
        this.hostAway = false;
        this.#token = message.resume;
        // (the host's page clock may be another: it reloaded)
        this.#clock = NO_CLOCK;
        this.#lastHeard = this.#now();
        this.hostPlaying = song !== null;
        // (the song: the welcome's bars and texts; on a rejoin to the same song, over what was followed of it where
        // that reaches the bar playing now, the one before the welcome's first, so that bar keeps its text and start,
        // which the welcome sends no more; a longer drop starts afresh from the welcome's)
        const kept = back && song && this.#song?.seed === song.seed && this.#song.start === song.start && reaches(this.#followed, song.bars);
        let f = kept ? this.#followed : NOTHING_FOLLOWED;
        for (const sent of song?.bars ?? []) f = withBar(f, sent);
        for (const text of song?.texts ?? []) f = withText(f, text);
        this.#followed = f;
        this.#song = song && { seed: song.seed, start: song.start };
        if (this.#pinging) clearTimeout(this.#pinging);
        return this.#ping();
      }
      case 'refused': {
        const [name, session, again] = [this.name, this.session, this.#again];
        // (coming back, its name taken meanwhile by another: once more by another name, where asked to)
        if (this.status === 'rejoining' && again && name && refusesName(message.reason, name)) {
          this.#again = null;
          this.name = again.another(name);
          return this.#failed(false);
        }
        this.#end(message.reason);
        if (!refusesName(message.reason, name)) return;
        if (again && name && session) return void this.join(again.lobby, session, again.another(name));
        this.taken = name;
        return;
      }
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
        this.#song = { seed: message.song.seed, start: message.song.start };
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
        this.#song = null;
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
    if (!this.hostAway && this.#lastHeard !== null && now - this.#lastHeard > LIMITS.silentSeconds) return this.#dropped('The host went quiet.');
    this.#send({ kind: 'ping', sent: now });
    const every = this.clock ? LIMITS.pingEveryMs : LIMITS.pingSettlingMs;
    this.#pinging = setTimeout(() => this.#ping(), every);
  }
}
