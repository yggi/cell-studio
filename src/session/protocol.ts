/**
 * What a Jambot host and its clients say to each other through a lobby, as a client reads it: the session contract,
 * version 1 (yggi/music-commons `contracts/session-v1`, minor 11: protocol 24), implemented here from the contract, not
 * from Jambot's code (#478). The contract's vectors run against these readers (`protocol.test.ts`).
 *
 * Cell studio is a client that listens (rung 1 of #478): it asks a lobby which sessions are open (`list`, rung 2),
 * sends a host a `join`, `ping`s and a `leave`, and reads every host message, each kind's fields checked (a message of
 * a kind it knows without them is refused, one of a kind it doesn't know is ignored: both are dropped, and the link
 * kept). It keeps what it needs of each (the bars' starts, the section texts, the pongs, the role it is seated as) and
 * checks the rest only for its shape (the style, the forecast, the Muse, the session's log). A field a later minor adds
 * inside what it reads is kept beside it, unread: a motif's `origin` (minor 8), the style's `mood` (minor 9), a written
 * drum hit's `role: "ostinato"` (minor 10), a bar's `plan.section.song` and a section of the kinds verse, chorus or outro (minor 11).
 *
 * This is version 1's reader, of a host whose welcome says 13 to 29; version 2's (`protocol-v2.ts`) reads a host from
 * 30, and `readers.ts` picks between them (#525). What a page says to a lobby and a client's own messages are the same
 * in both versions, and are here.
 */

/**
 * The protocol this reader reads: version 1's minor 11. It is no longer the protocol a join carries, which is version
 * 2's (`JOIN_PROTOCOL` in `readers.ts`, #525): a host of version 1 admits a join of any protocol from `FIRST_PROTOCOL`
 * on and welcomes with its own, which then picks this reader. A join carries no code: a client that listens needs
 * none (minor 2); and it sends no `nudge` (minors 5 and 6), which is a player's.
 */
export const PROTOCOL = 24;

/**
 * The kinds a section may be, in both versions (a bar's `plan.section.type`, a score's `section`): one list, the one
 * place the follower names them. A kind outside it is refused, as the contract says (a vector, `coda`). Until a cells
 * tag exports the feel's own list (yggi/cells#851), this mirrors it: then it is that list, and a new kind arrives by
 * moving the pin.
 */
const SECTION_TYPES = ['intro', 'groove', 'bridge', 'build', 'drop', 'breakdown', 'verse', 'chorus', 'outro'] as const;
/** A section's kind. */
export type SectionKind = (typeof SECTION_TYPES)[number];
const SECTION_SET: ReadonlySet<unknown> = new Set(SECTION_TYPES);
/** Whether a value is one of the section kinds. */
export const isSectionKind = (v: unknown): v is SectionKind => SECTION_SET.has(v);
/** The first protocol of the contract's version 1: a host of it or later is one of this version (any minor joins). */
export const FIRST_PROTOCOL = 13;

/** Whether a protocol is one this reader stays with: an integer from `FIRST_PROTOCOL` on (version 2's, from 30, `readers.ts` gives its own reader before this one is asked). */
const sameMajor = (protocol: unknown): boolean => Number.isInteger(protocol) && (protocol as number) >= FIRST_PROTOCOL;

/** The contract's times a client keeps (`limits` in its vectors). */
export const LIMITS = {
  /** A client says something at least this often, in seconds: a host takes one silent that long for lost. */
  silentSeconds: 3,
  /** How often a client pings, in milliseconds: quickly until its clock is trusted, then steadily. */
  pingSettlingMs: 50,
  pingEveryMs: 250,
  /** How long a client waits for a welcome, in milliseconds. */
  welcomeWaitMs: 2000,
  /** How long, in seconds, a host keeps the seat of a client whose link dropped, for it to join again by its token. */
  resumeSeconds: 300,
  /** How long, in seconds, a lobby holds a session whose host's link dropped. */
  lobbyGraceSeconds: 30,
  /** The longest session name a lobby takes. */
  sessionNameMost: 40,
} as const;

/** The hosted lobby (Jambot's `apps/lobby` on Fly.io), which takes pages from https://yggi.github.io and localhost. */
export const HOSTED_LOBBY = 'wss://jambot-lobby.fly.dev';

export type Obj = Readonly<Record<string, unknown>>;

/** A section's cells text, as the host's band through cells states it (`section`, and a welcome's `song.texts`). */
export interface SectionText {
  /** The first bar it states, and that bar's first step on the song's clock. */
  readonly bar: number;
  readonly step: number;
  /** cells' text, or empty where none states the bars (`unstated` says why). */
  readonly text: string;
  readonly unstated: string | null;
  /** What cells' reading of the text needs beside it: its first bar's meter, swing, tempo and key. */
  readonly frame: { readonly meter: Obj; readonly swing: Obj; readonly bpm: number; readonly key: Obj };
  /** A digest of what each bar from `bar` on was built from: as many as the text states bars. */
  readonly foreseen: readonly string[];
  /** The bars, by their place from `bar`, a note was cut in. */
  readonly cut: readonly number[];
}

/** A bar the host sent: the bar as it wrote it (its number at `bar.bar`), and where it starts on the host's clock, or null for one its head passed without laying. */
export interface SentBar {
  readonly bar: Obj;
  readonly start: number | null;
}

/** The role a host seats a client as: a player's `played`, `judged` and `forget` reach its Muse, a listener's are dropped. */
export type Role = 'player' | 'listener';

/** A line of the session's log: the bar it is about (null while stopped), who said it (a player's id, or the band's `conductor`, `composer` or `muse`), the kind of line, and the line for people. */
export interface LogLine {
  readonly bar: number | null;
  readonly who: string;
  readonly what: string;
  readonly text: string;
}

/** A song a host plays: `start` is where step 0 falls on the host's clock, in seconds. */
export interface Song {
  readonly seed: number;
  readonly start: number;
  readonly track: Obj;
  readonly swing: Obj;
  readonly tempoMeter: Obj;
}

/** The kinds version 2 keeps from version 1 as they are (`protocol-v2.ts` reads them by the same checks). */
export type KeptMessage =
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'start'; readonly song: Song }
  | { readonly kind: 'track'; readonly track: Obj; readonly swing: Obj; readonly tempoMeter: Obj }
  | { readonly kind: 'forecast'; readonly forecast: Obj }
  | { readonly kind: 'muse'; readonly muse: Obj }
  | { readonly kind: 'finale'; readonly bar: number }
  /** A ping answered: its `sent`, the host's page clock as it answered, its output's offset from that (null until paired). */
  | { readonly kind: 'pong'; readonly sent: number; readonly host: number; readonly heard: number | null }
  /** The role the host now seats this client as (minor 4): sent only for a change, never with a welcome, whose `listening` says the first. */
  | { readonly kind: 'role'; readonly role: Role }
  /** A line of the session's log (minor 7). */
  | ({ readonly kind: 'event' } & LogLine)
  | { readonly kind: 'stop' }
  | { readonly kind: 'closed' };

export type HostMessage =
  | KeptMessage
  | {
      readonly kind: 'welcome';
      readonly protocol: number;
      readonly session: string;
      readonly resume: string;
      /** Seated without a code, to listen (from a host of 15 on): `true` or absent. */
      readonly listening?: true;
      /** The song playing, with the bars composed and not played and (from a host of 14 on) the texts stating them; null while stopped. */
      readonly song: (Song & { readonly bars: readonly SentBar[]; readonly texts?: readonly SectionText[] }) | null;
      readonly forecast: Obj;
      readonly muse: Obj;
      /** The session log's tail (from a host of 20 on). */
      readonly events?: readonly LogLine[];
    }
  | { readonly kind: 'bar'; readonly sent: SentBar }
  | ({ readonly kind: 'section' } & SectionText);

/** Why a bar wasn't played (version 2, minor 2): no score stated it, its conduct's digest isn't the one its score foresaw, a fragment its score locks is lacking, or the client came to it too late. */
export type LackedWhy = 'silent' | 'digest' | 'lock' | 'late';

/** What this client sends: a join, pings, a leave and, to a host of version 2, each bar it didn't play (`lacked`). */
export type ClientMessage =
  | { readonly kind: 'join'; readonly protocol: number; readonly name: string; readonly resume?: string }
  | { readonly kind: 'ping'; readonly sent: number }
  | { readonly kind: 'leave' }
  | { readonly kind: 'lacked'; readonly bar: number; readonly why: LackedWhy; readonly text: string };

/** A lobby's words, never a peer's: refused on the wire. */
export const LOBBY_WORDS: ReadonlySet<string> = new Set(['lost', 'away', 'back']);

export const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isInt = (v: unknown): v is number => Number.isInteger(v);
export const isFinite = (v: unknown): v is number => Number.isFinite(v);
export const isString = (v: unknown): v is string => typeof v === 'string';
export const arrayOf = (v: unknown, each: (x: unknown) => boolean): boolean => Array.isArray(v) && v.every(each);
const intOrNull = (v: unknown) => v === null || isInt(v);

export const isSong = (s: unknown): boolean => isObject(s) && isInt(s.seed) && isFinite(s.start) && isObject(s.track) && isObject(s.swing) && isObject(s.tempoMeter);
const isSentBar = (b: unknown): boolean => isObject(b) && isObject(b.bar) && (b.start === null || isFinite(b.start));
export const isForecast = (f: unknown): boolean => isObject(f) && isInt(f.from) && isInt(f.count) && arrayOf(f.changed, (c) => isObject(c) && isInt(c.bar));
export const isMuse = (m: unknown): boolean =>
  isObject(m) &&
  (m.offer === null || isObject(m.offer)) &&
  Array.isArray(m.memory) &&
  Array.isArray(m.log) &&
  Array.isArray(m.dropped) &&
  intOrNull(m.asOf) &&
  intOrNull(m.lastPlayed) &&
  isObject(m.players) &&
  Object.values(m.players).every(isString);
export const isLogLine = (l: unknown): boolean => isObject(l) && intOrNull(l.bar) && isString(l.who) && isString(l.what) && isString(l.text);
const isFrame = (f: unknown): boolean => isObject(f) && isObject(f.meter) && isObject(f.swing) && isObject(f.key) && isFinite(f.bpm);
const isSectionText = (t: unknown): boolean =>
  isObject(t) &&
  isInt(t.bar) &&
  isInt(t.step) &&
  isString(t.text) &&
  (t.unstated === null || isString(t.unstated)) &&
  isFrame(t.frame) &&
  arrayOf(t.foreseen, isString) &&
  arrayOf(t.cut, isInt);

/** Whether each kept kind's fields are there, of their types: the same in version 1's table of host messages and in version 2's. */
export const KEPT_FITS: Record<KeptMessage['kind'], (m: Obj) => boolean> = {
  refused: (m) => isString(m.reason),
  start: (m) => isSong(m.song),
  track: (m) => isObject(m.track) && isObject(m.swing) && isObject(m.tempoMeter),
  forecast: (m) => isForecast(m.forecast),
  muse: (m) => isMuse(m.muse),
  finale: (m) => isInt(m.bar),
  pong: (m) => isFinite(m.sent) && isFinite(m.host) && (m.heard === null || isFinite(m.heard)),
  role: (m) => m.role === 'player' || m.role === 'listener',
  event: isLogLine,
  stop: () => true,
  closed: () => true,
};

/** Whether each kind's fields are there, of their types (the contract's table of host messages). */
const FITS: Record<HostMessage['kind'], (m: Obj) => boolean> = {
  ...KEPT_FITS,
  welcome: (m) =>
    isInt(m.protocol) &&
    isString(m.session) &&
    isString(m.resume) &&
    (m.listening === undefined || m.listening === true) &&
    (m.song === null || (isSong(m.song) && arrayOf((m.song as Obj).bars, isSentBar) && ((m.song as Obj).texts === undefined || arrayOf((m.song as Obj).texts, isSectionText)))) &&
    isForecast(m.forecast) &&
    isMuse(m.muse) &&
    (m.events === undefined || arrayOf(m.events, isLogLine)),
  bar: (m) => isSentBar(m.sent),
  section: isSectionText,
};

/** What a client's reader makes of what came: a host message it reads, or one it drops, ignored (a kind it doesn't know) or refused (not a message, a lobby's word, or a kind it knows, malformed). */
export type Reading = { readonly message: HostMessage } | { readonly dropped: 'ignored' | 'refused' };

/** Read what a host said: its kind, and the fields that kind carries, of their types. */
export function readHost(data: unknown): Reading {
  if (!isObject(data) || !isString(data.kind) || LOBBY_WORDS.has(data.kind)) return { dropped: 'refused' };
  if (!Object.hasOwn(FITS, data.kind)) return { dropped: 'ignored' };
  return FITS[data.kind as HostMessage['kind']](data) ? { message: data as unknown as HostMessage } : { dropped: 'refused' };
}

/** What a page sends a lobby: the sessions open (the library's lobby cell, #478 rung 2), and a client's own two requests. */
export type ToLobby = { readonly op: 'list' } | { readonly op: 'join'; readonly session: string } | { readonly op: 'tell'; readonly message: ClientMessage };

/** What a lobby says to a page (`readFromLobby`): the ops a client hears, the sessions it lists, and those a client never asks for (a host's), read and left. */
export type FromLobby =
  /** The sessions open; `away` is `true` while a session's host is away and a join to it is refused (minor 3), else false or absent. */
  | { readonly op: 'sessions'; readonly sessions: readonly { readonly name: string; readonly players: number; readonly away?: boolean }[] }
  | { readonly op: 'hosting'; readonly session: string; readonly reclaim: string }
  | { readonly op: 'joined'; readonly session: string }
  | { readonly op: 'refused'; readonly reason: string }
  | { readonly op: 'heard'; readonly from: string; readonly message: Obj }
  | { readonly op: 'left'; readonly from: string }
  | { readonly op: 'said'; readonly message: unknown }
  | { readonly op: 'gone' }
  | { readonly op: 'away' }
  | { readonly op: 'back' };

const FROM_LOBBY: Record<FromLobby['op'], (d: Obj) => boolean> = {
  sessions: (d) => arrayOf(d.sessions, (s) => isObject(s) && isString(s.name) && isFinite(s.players) && (s.away === undefined || typeof s.away === 'boolean')),
  hosting: (d) => isString(d.session) && isString(d.reclaim),
  joined: (d) => isString(d.session),
  refused: (d) => isString(d.reason),
  heard: (d) => isString(d.from) && isObject(d.message),
  left: (d) => isString(d.from),
  // (what a host said is the session's reader's to read: `readHost`)
  said: () => true,
  gone: () => true,
  away: () => true,
  back: () => true,
};

/** What a lobby said, or null for anything that isn't (an op it doesn't say, or one without its fields). */
export function readFromLobby(data: unknown): FromLobby | null {
  if (!isObject(data) || !isString(data.op) || !Object.hasOwn(FROM_LOBBY, data.op)) return null;
  return FROM_LOBBY[data.op as FromLobby['op']](data) ? (data as unknown as FromLobby) : null;
}

/** Why a client leaves a host whose welcome says this protocol, or null to stay: a host of another version. */
export const leaveOver = (protocol: number): string | null =>
  sameMajor(protocol) ? null : `This host speaks version ${protocol} of the session protocol, and Cell studio reads ${FIRST_PROTOCOL} on: the host needs a newer Jambot.`;

/** Why a lobby would refuse a session's name, or null: blank, or longer than it takes. */
export function sessionNameProblem(session: string): string | null {
  const name = session.trim();
  if (name === '') return 'A session needs a name.';
  if (name.length > LIMITS.sessionNameMost) return `A session's name is ${LIMITS.sessionNameMost} characters at most.`;
  return null;
}
