import { HOSTED_LOBBY, LIMITS, sessionNameProblem, type ClientMessage, type HostMessage, type KeptMessage, type Role } from '../../session/protocol';
import type { HostMessage as HostMessage2 } from '../../session/protocol-v2';
import { JOIN_PROTOCOL, leaveOver, readHostAs, versionOf, type Version } from '../../session/readers';
import { NOTHING_SCORED, welcomed, withConduct, withScore, type Scored } from '../../session/scored';
import { NO_CLOCK, hostHeardAt, reading, withPing, type HostClock } from '../../session/clock';
import { NOTHING_FOLLOWED, heardAt, nextTextAt, pruned, reaches, withBar, withText, type Followed, type Stating } from '../../session/follow';
import { followedOf, type ReadScore } from '../../session/follow-v2';
import { LobbyRefused, joinLobby, type ClientLink, type Heard, type Socket } from '../../session/lobby';
import { refusesName } from '../../session/name';
import { Lacked } from '../../session/lacked';
import { soundingOf, type Lack, type Place, type Sounding } from '../../session/sound';
import { failed, outage, retry, type Outage } from '../../session/rejoin';
import { storageKey } from '../../storageKey';

/** Where this browser keeps the name it joins a session by (`session/name.ts`). */
export const NAME_KEY = storageKey('cell-studio:jam-name');

/**
 * How late a ping's timer may fire before it finds this page held up rather than the host quiet, in seconds: four times
 * the steady ping (`LIMITS.pingEveryMs`, 250 ms). Laying out a followed text's graph held the page for 2 to 2.3 s when
 * following began (#670, profiled).
 */
const HELD_SECONDS = 1;

/** Idle; joining; joined (welcomed); or rejoining: seated, its link dropped, trying to come back (#482). */
export type SessionStatus = 'idle' | 'joining' | 'joined' | 'rejoining';

/** Where the host's song is heard now: the text that states the bar (a section text, or a version 2 score), how far into the text (in its bars), the bar. */
export interface Heading {
  readonly text: Stating;
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
 * It reads both versions of the contract (#525): the join carries version 2's protocol, and the welcome's protocol
 * picks the reader (`session/readers.ts`). A host of version 1 is followed as above. A host of version 2 is followed
 * by its conducts and scores (`scored`, `session/scored.ts`), and heard and sounded as version 1's is, each bar from
 * the score that states it (`session/follow-v2.ts`, #525's rung 2).
 *
 * What it follows is read where it is heard (`heading`, by the page's frame loop): the text of the bar the host's
 * output sounds now, and where in it. It ends when asked, when the host closes or refuses it, when the lobby says the
 * session is gone, when no welcome comes within the contract's wait, and on a welcome of another version of the
 * protocol (saying `leave`).
 *
 * It keeps the role the host seats it as (`role`): its welcome's `listening` says the first, and a `role` message a
 * change (session minor 4). Either way it sends the same: Cell studio plays nothing to a host yet, so a player's seat
 * changes only what the Jam page says. The session's log (`event`, minor 7) is read and not kept yet.
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
  /** The role the host seats this client as, while seated: a player, or a listener (seated without the host's code). */
  role = $state<Role | null>(null);
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
  /** The version of the session contract the host speaks, by its welcome's protocol, while seated; null before. */
  version = $state<Version | null>(null);
  /** What is kept of a version 2 host's song: its conducts, scores, fragments and band; null for a host of version 1. */
  scored = $state.raw<Scored | null>(null);

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
  /** A version 2 song as followed, made of what is kept of it (`scored`) when that changes. */
  #followed2: { scored: Scored; followed: Followed<ReadScore> } | null = null;
  #token: string | null = null;
  #pinging: ReturnType<typeof setTimeout> | null = null;
  #welcomeWait: ReturnType<typeof setTimeout> | null = null;
  /** The bars not played that the host is told of (`report`), and the timer for the rest of a queue. */
  #lacked = new Lacked();
  #lacking: ReturnType<typeof setTimeout> | null = null;
  #lastHeard: number | null = null;
  /** When this page last pinged: a ping's timer that fires `HELD_SECONDS` after it found the page itself held up. */
  #lastPing: number | null = null;
  /** The reader of what the host says, between welcomes: the last welcome's version, or before one the join's. */
  #reader: Version = versionOf(JOIN_PROTOCOL);
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

  /** The song as followed: version 1's, or a version 2 song's made of its conducts and scores (each score read once, `follow-v2.ts`). */
  #song2(): Followed<Stating> {
    if (this.version !== 2 || !this.scored) return this.#followed;
    if (this.#followed2?.scored !== this.scored) this.#followed2 = { scored: this.scored, followed: followedOf(this.scored) };
    return this.#followed2.followed;
  }

  /** Where the host's song is heard at `now` on this page's clock (seconds): null while not joined, stopped, or before its clock and first text. */
  heading(now = this.#now()): Heading | null {
    if (!this.live || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    if (at === null) return null;
    const heard = heardAt(this.#song2(), at);
    if (!heard) return null;
    // (version 2's is kept bounded as it comes, `scored.ts`)
    if (this.version !== 2) this.#followed = pruned(this.#followed, heard.place.bar);
    return { text: heard.text, bars: heard.bars, bar: heard.place.bar, before: heard.place.before };
  }

  /**
   * What to play of the host's song (`session/sound.ts`) from where the last ask got to (`done`; null: where it is heard
   * now) to `lead` seconds past `now` on this page's clock, and on to `reach` through the bars the host has told (#513);
   * `shift` is the host's clock less this page's, to place it here. Null while not following a song, or before the clock
   * is trusted.
   */
  sounding(done: Place | null, lead: number, now: number, length: (text: Stating) => number | null, reach = lead): (Sounding<Stating> & { shift: number }) | null {
    if (!this.live || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    if (at === null) return null;
    return { ...soundingOf(this.#song2(), done, at + lead, at, length, at + reach), shift: at - now };
  }

  /**
   * Say to the host the bars not played (`lacked`, session version 2, minor 2; #698): each bar once, within the bounds of
   * `session/lacked.ts`. Nothing to a host of version 1, which has no such kind, nor before a welcome.
   */
  report(lacked: readonly Lack[]): void {
    if (this.version !== 2 || this.status !== 'joined') return;
    this.#lacked.add(lacked);
    this.#sayLacked();
  }

  #sayLacked(): void {
    if (this.#lacking) clearTimeout(this.#lacking);
    this.#lacking = null;
    if (this.version !== 2 || this.status !== 'joined') return;
    for (const m of this.#lacked.take(this.#now())) this.#send(m);
    // (the rest as the rate allows)
    if (this.#lacked.waiting) this.#lacking = setTimeout(() => this.#sayLacked(), 125);
  }

  /** When, on this page's clock (seconds), the text heard next gives way to another, as known at `now`; null where none is known yet. */
  nextTurn(now = this.#now()): number | null {
    if (!this.live || !this.hostPlaying) return null;
    const at = hostHeardAt(this.#clock, now);
    const next = at === null ? null : nextTextAt(this.#song2(), at);
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
    this.#send({ kind: 'join', protocol: JOIN_PROTOCOL, name: this.name ?? '', ...(this.#token === null ? {} : { resume: this.#token }) });
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
    if (this.#lacking) clearTimeout(this.#lacking);
    this.#pinging = this.#welcomeWait = this.#retrying = this.#lacking = null;
    this.#lacked = new Lacked();
    this.#outage = null;
    this.#lobby = null;
    this.#song = null;
    this.#clock = NO_CLOCK;
    this.#followed = NOTHING_FOLLOWED;
    this.#followed2 = null;
    this.#token = null;
    this.notice = null;
    this.#lastHeard = null;
    this.#lastPing = null;
    this.status = 'idle';
    this.hostPlaying = false;
    this.hostAway = false;
    this.trip = null;
    this.role = null;
    this.version = null;
    this.scored = null;
    this.#reader = versionOf(JOIN_PROTOCOL);
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
    const read = readHostAs(heard.said, this.#reader);
    if ('dropped' in read.reading) {
      const { dropped } = read.reading;
      this.dropped = { ...this.dropped, [dropped]: this.dropped[dropped] + 1 };
      return;
    }
    if (read.version === 1) this.#hear(read.reading.message);
    else this.#hear2(read.reading.message);
  }

  /** A welcome, either version's: true where it seats this client (else it left), its version chosen for what follows. */
  #welcomed(version: Version, message: { protocol: number; resume: string; listening?: true }): boolean {
    if (this.#welcomeWait) clearTimeout(this.#welcomeWait);
    this.#welcomeWait = null;
    const over = leaveOver(version, message.protocol);
    if (over) {
      this.#send({ kind: 'leave' });
      this.#end(over);
      return false;
    }
    // (back after a drop: seated as the same player where the host kept its seat, which its token says)
    if (this.status === 'rejoining') {
      if (this.#retrying) clearTimeout(this.#retrying);
      this.#retrying = null;
      this.#outage = null;
      const same = message.resume === this.#token;
      this.rejoins = same ? { ...this.rejoins, same: this.rejoins.same + 1 } : { ...this.rejoins, new: this.rejoins.new + 1 };
      this.notice = same ? null : `The link was down longer than the host keeps a seat (${LIMITS.resumeSeconds / 60} minutes): joined again as a new player.`;
    }
    this.#reader = version;
    this.version = version;
    this.status = 'joined';
    this.hostAway = false;
    this.role = message.listening ? 'listener' : 'player';
    this.#token = message.resume;
    // (the host's page clock may be another: it reloaded)
    this.#clock = NO_CLOCK;
    this.#lastHeard = this.#now();
    return true;
  }

  /**
   * What a host of version 2 said: its welcome, conducts, scores, and the moves of its song kept (`scored`); the kinds
   * it keeps from version 1 as version 1's are heard. A rejoin's welcome starts what is kept afresh (#525).
   */
  #hear2(message: HostMessage2): void {
    switch (message.kind) {
      case 'welcome': {
        // (back after a drop to the same song: what was kept of it carries on beneath the welcome's)
        const back = this.status === 'rejoining';
        if (!this.#welcomed(2, message)) return;
        const { song } = message;
        const same = back && song && this.#song?.seed === song.seed && this.#song.start === song.start;
        this.hostPlaying = song !== null;
        this.#followed = NOTHING_FOLLOWED;
        this.scored = welcomed(song, message.fragments, message.band, same && this.scored ? this.scored : undefined);
        this.#song = song && { seed: song.seed, start: song.start };
        if (this.#pinging) clearTimeout(this.#pinging);
        return this.#ping();
      }
      case 'conduct': {
        const { kind, ...conduct } = message;
        void kind;
        this.scored = withConduct(this.scored ?? NOTHING_SCORED, conduct);
        return;
      }
      case 'score': {
        const { kind, ...score } = message;
        void kind;
        this.scored = withScore(this.scored ?? NOTHING_SCORED, score);
        return;
      }
      case 'start':
      case 'stop': {
        const { band, fragments } = this.scored ?? NOTHING_SCORED;
        this.scored = { ...NOTHING_SCORED, band, fragments };
        return this.#hear(message);
      }
      case 'finale':
        this.scored = { ...(this.scored ?? NOTHING_SCORED), finale: message.bar };
        return;
      default:
        return this.#hear(message satisfies KeptMessage);
    }
  }

  #hear(message: HostMessage): void {
    switch (message.kind) {
      case 'welcome': {
        // (back after a drop: what was followed of the song may carry on beneath the welcome's, below)
        const back = this.status === 'rejoining';
        if (!this.#welcomed(1, message)) return;
        const { song } = message;
        this.scored = null;
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
      case 'role':
        this.role = message.role;
        return;
      // (the style, the bars ahead, the Muse and the session's log: read, and not shown yet)
      case 'track':
      case 'forecast':
      case 'muse':
      case 'event':
        return;
    }
  }

  #ping(): void {
    if (this.status !== 'joined') return;
    const now = this.#now();
    // (a timer that fires that late found this page held up, a long task: what the host said meanwhile waits in the queue
    // behind it, so the host is judged on the next ping's, on time)
    const held = this.#lastPing !== null && now - this.#lastPing > HELD_SECONDS;
    if (!held && !this.hostAway && this.#lastHeard !== null && now - this.#lastHeard > LIMITS.silentSeconds) return this.#dropped('The host went quiet.');
    this.#lastPing = now;
    this.#send({ kind: 'ping', sent: now });
    const every = this.clock ? LIMITS.pingEveryMs : LIMITS.pingSettlingMs;
    this.#pinging = setTimeout(() => this.#ping(), every);
  }
}
