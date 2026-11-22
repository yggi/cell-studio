/**
 * What a Jambot host says to its clients, as a client reads it: the session contract, version 2 (yggi/music-commons
 * `contracts/session`, minor 3: protocol 33), implemented here from the contract, not from Jambot's code (#525). The
 * contract's vectors run against this reader (`protocol-v2.test.ts`).
 *
 * Version 2 sends each bar's **conduct** in place of the bar it composed, and a section's **score** in place of its
 * text: each client plays the score on its own band, which never travels (a score's `lock` never names `band`, and a
 * reader refuses one that does). Its welcome carries the conducts and scores not yet played, the fragments a score in
 * force locks, and the default band the host plays (`{ id, hash }`, shown and never played). Version 1's `bar` and
 * `section` are kinds this reader doesn't know: ignored. The other kinds are version 1's as they are (`KEPT_FITS` in
 * `protocol.ts`), with what version 1's minors 6 to 9 added; a client's messages and the lobby's are version 1's too.
 *
 * The follower picks this reader or version 1's by the welcome's protocol (`readers.ts`).
 */
import {
  KEPT_FITS,
  LOBBY_WORDS,
  arrayOf,
  isFinite,
  isForecast,
  isInt,
  isLogLine,
  isMuse,
  isObject,
  isSectionKind,
  isSong,
  type SectionKind,
  isString,
  type KeptMessage,
  type LogLine,
  type Obj,
  type Song,
} from './protocol';

/** The protocol of the contract's version 2, minor 3: the one a join of this client carries (`readers.ts`). */
export const PROTOCOL = 33;
/** The first protocol of version 2: a host of it or later is one of this version (any minor joins). */
export const FIRST_PROTOCOL = 30;

/** A fragment named by its id and hash: a score's lock's entry, and a welcome's `band`. */
export interface Locked {
  readonly id: string;
  readonly hash: string;
}
/** A fragment's cells text, by its id and hash: what a score in force locks that a client may lack. */
export interface Fragment extends Locked {
  readonly text: string;
}

/** A bar's conduct: where it starts on the host's clock (null for one passed without laying), its seed, entropy and the Muse's offer, and its digest. */
export interface Conduct {
  readonly bar: number;
  readonly start: number | null;
  readonly seed: number;
  readonly entropy: number;
  readonly offer: Obj | null;
  readonly foreseen: string;
}

/** A section's score: the first bar it states and that bar's first step, its type, its cells text (or empty, `unstated` saying why), what it locks and carries, and each bar's energy, digest and cut. */
export interface Score {
  readonly bar: number;
  readonly step: number;
  readonly section: SectionKind;
  readonly text: string;
  readonly unstated: string | null;
  readonly lock: readonly Locked[];
  readonly fragments: readonly Fragment[];
  readonly energy: readonly number[];
  readonly foreseen: readonly string[];
  readonly cut: readonly number[];
}

export type HostMessage =
  | KeptMessage
  | {
      readonly kind: 'welcome';
      readonly protocol: number;
      readonly session: string;
      readonly resume: string;
      /** Seated without a code, to listen: `true` or absent. */
      readonly listening?: true;
      /** The song playing, with the conducts sent and not played and the scores that state a bar not played; null while stopped. */
      readonly song: (Song & { readonly conducts: readonly Conduct[]; readonly scores: readonly Score[] }) | null;
      readonly forecast: Obj;
      readonly muse: Obj;
      readonly fragments: readonly Fragment[];
      /** The default band the host plays, which a client may show and never plays; null for none. */
      readonly band: Locked | null;
      /** The session log's tail. */
      readonly events?: readonly LogLine[];
    }
  | ({ readonly kind: 'conduct' } & Conduct)
  | ({ readonly kind: 'score' } & Score);

const isLocked = (l: unknown): boolean => isObject(l) && isString(l.id) && isString(l.hash);
const isFragment = (f: unknown): boolean => isLocked(f) && isString((f as Obj).text);
const isConduct = (c: unknown): boolean =>
  isObject(c) &&
  isInt(c.bar) &&
  (c.start === null || isFinite(c.start)) &&
  isInt(c.seed) &&
  isFinite(c.entropy) &&
  c.entropy >= 0 &&
  c.entropy <= 1 &&
  (c.offer === null || isObject(c.offer)) &&
  isString(c.foreseen);
const isScore = (s: unknown): boolean =>
  isObject(s) &&
  isInt(s.bar) &&
  isInt(s.step) &&
  isSectionKind(s.section) &&
  isString(s.text) &&
  (s.unstated === null || isString(s.unstated)) &&
  // (the band never travels: a lock that names it is refused)
  arrayOf(s.lock, (l) => isLocked(l) && (l as Obj).id !== 'band') &&
  arrayOf(s.fragments, isFragment) &&
  arrayOf(s.energy, isFinite) &&
  arrayOf(s.foreseen, isString) &&
  arrayOf(s.cut, isInt);

/** Whether each kind's fields are there, of their types (version 2's table of host messages). */
const FITS: Record<HostMessage['kind'], (m: Obj) => boolean> = {
  ...KEPT_FITS,
  welcome: (m) =>
    isInt(m.protocol) &&
    isString(m.session) &&
    isString(m.resume) &&
    (m.listening === undefined || m.listening === true) &&
    (m.song === null || (isSong(m.song) && arrayOf((m.song as Obj).conducts, isConduct) && arrayOf((m.song as Obj).scores, isScore))) &&
    isForecast(m.forecast) &&
    isMuse(m.muse) &&
    arrayOf(m.fragments, isFragment) &&
    (m.band === null || isLocked(m.band)) &&
    (m.events === undefined || arrayOf(m.events, isLogLine)),
  conduct: isConduct,
  score: isScore,
};

/** What this reader makes of what came: a host message it reads, or one it drops, ignored (a kind it doesn't know, version 1's `bar` and `section` among them) or refused. */
export type Reading = { readonly message: HostMessage } | { readonly dropped: 'ignored' | 'refused' };

/** Read what a host of version 2 said: its kind, and the fields that kind carries, of their types. */
export function readHost(data: unknown): Reading {
  if (!isObject(data) || !isString(data.kind) || LOBBY_WORDS.has(data.kind)) return { dropped: 'refused' };
  if (!Object.hasOwn(FITS, data.kind)) return { dropped: 'ignored' };
  return FITS[data.kind as HostMessage['kind']](data) ? { message: data as unknown as HostMessage } : { dropped: 'refused' };
}

/** Why this reader leaves a host whose welcome says this protocol, or null to stay: one under version 2's first (`readers.ts` gives such a welcome to version 1's reader instead). */
export const leaveOver = (protocol: number): string | null =>
  Number.isInteger(protocol) && protocol >= FIRST_PROTOCOL
    ? null
    : `This host speaks protocol ${protocol}, of version 1 of the session protocol, and this reader reads version 2, from ${FIRST_PROTOCOL}.`;
