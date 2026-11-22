/**
 * The follower's two readers of a host, chosen by the welcome's protocol (#525, the session contract's rollout: Cell
 * studio reads both versions for one release, so Jambot's host can move to version 2 in one deploy).
 *
 * A join carries version 2's protocol (`JOIN_PROTOCOL`, 33): a host of version 2 admits it, and a host of version 1
 * admits any join from 13 on (its `sameMajor`) and welcomes with its own protocol. The welcome's protocol then picks the
 * reader of what follows: under 30, version 1's (`protocol.ts`, which reads 13 to 29 and leaves a host under 13, as
 * before); from 30, version 2's (`protocol-v2.ts`). A message before any welcome, or between a dropped link and the
 * welcome that seats it again, is read by the version last chosen (before the first welcome, the join's).
 */
import { leaveOver as leaveOver1, readHost as readHost1, type Reading as Reading1 } from './protocol';
import { FIRST_PROTOCOL as FIRST_PROTOCOL_V2, PROTOCOL as PROTOCOL_V2, leaveOver as leaveOver2, readHost as readHost2, type Reading as Reading2 } from './protocol-v2';

/** The protocol a join of this client carries: version 2's minor 3, which hosts of either version admit. */
export const JOIN_PROTOCOL = PROTOCOL_V2;

export type Version = 1 | 2;

/** The version of a host whose welcome says this protocol: version 2 from its first protocol on, else version 1 (whose reader leaves a host under 13). */
export const versionOf = (protocol: number): Version => (protocol >= FIRST_PROTOCOL_V2 ? 2 : 1);

/** What came from a host, read by the reader its version picks. */
export type Heard = { readonly version: 1; readonly reading: Reading1 } | { readonly version: 2; readonly reading: Reading2 };

/** Read what a host said: a welcome by the reader of its own protocol's version, anything else by `current`'s. */
export function readHostAs(data: unknown, current: Version): Heard {
  const protocol = typeof data === 'object' && data !== null && (data as { kind?: unknown }).kind === 'welcome' ? (data as { protocol?: unknown }).protocol : undefined;
  const version = Number.isInteger(protocol) ? versionOf(protocol as number) : current;
  return version === 1 ? { version, reading: readHost1(data) } : { version, reading: readHost2(data) };
}

/** Why a client leaves a host of this version whose welcome says this protocol, or null to stay. */
export const leaveOver = (version: Version, protocol: number): string | null => (version === 1 ? leaveOver1(protocol) : leaveOver2(protocol));
