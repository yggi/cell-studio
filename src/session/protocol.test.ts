/**
 * The session contract (yggi/music-commons `contracts/session`, version 1, minor 1) run against Cell studio's client
 * side, in the form cells and webmidi run theirs (yggi/webmidi src/contracts.test.ts @ 41ef16b): the hub's vectors are
 * copied beside this file (`vectors.json`, its `lifted` line naming the hub and the commit), and the hub's README for
 * the contract is the rule. A client reads two of the contract's four readers: a host's messages (`client`) and what a
 * lobby says to a page (`page`); every one of their vectors is run here. The other two, a host's reader of a client's
 * messages and a lobby's of a page's requests, are Jambot's: their vectors check, here, that what this client sends is
 * of a shape those readers read.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIRST_PROTOCOL, LIMITS, PROTOCOL, leaveOver, readFromLobby, readHost, sessionNameProblem, type ClientMessage, type ToLobby } from './protocol';

interface Vector {
  readonly name: string;
  readonly reader: 'host' | 'client' | 'lobby' | 'page';
  readonly reads: boolean;
  readonly message: unknown;
  readonly ignored?: boolean;
  readonly put?: Readonly<Record<string, 'NaN' | 'Infinity' | '-Infinity'>>;
  readonly admits?: boolean;
}
interface Contract {
  readonly lifted: string;
  readonly contract: string;
  readonly version: number;
  readonly minor: number;
  readonly protocol: number;
  readonly firstProtocol: number;
  readonly limits: Readonly<Record<string, number>>;
  readonly vectors: readonly Vector[];
}
const contract: Contract = JSON.parse(readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));

/** A vector's message as it is read: a copy, with each number JSON can't hold set at its dotted path. */
function messageOf(v: Vector): unknown {
  const m: unknown = structuredClone(v.message);
  for (const [path, value] of Object.entries(v.put ?? {})) {
    const keys = path.split('.');
    let at = m as Record<string, unknown>;
    for (const k of keys.slice(0, -1)) at = at[k] as Record<string, unknown>;
    at[keys.at(-1)!] = Number(value);
  }
  return m;
}

const of = (reader: Vector['reader']) => contract.vectors.filter((v) => v.reader === reader);

describe('the session contract (music-commons contracts/session, version 1, minor 1)', () => {
  it('is the version this client speaks, lifted with its source named', () => {
    expect(contract.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/session\/vectors\.json @ [0-9a-f]{7}/);
    expect([contract.contract, contract.version, contract.minor]).toEqual(['session', 1, 1]);
    expect(contract.protocol).toBe(PROTOCOL);
    expect(contract.firstProtocol).toBe(FIRST_PROTOCOL);
    for (const [k, v] of Object.entries(LIMITS)) expect([k, contract.limits[k]]).toEqual([k, v]);
  });

  it('has vectors for each of the four readers, and runs every one of the two a client has', () => {
    const counts = Object.fromEntries((['host', 'client', 'lobby', 'page'] as const).map((r) => [r, of(r).length]));
    expect(counts.client! + counts.page! + counts.host! + counts.lobby!).toBe(contract.vectors.length);
    expect(counts.client).toBeGreaterThan(100);
    expect(counts.page).toBeGreaterThan(10);
  });

  describe("a host's messages, as a client reads them", () => {
    for (const v of of('client'))
      it(v.name, () => {
        const read = readHost(messageOf(v));
        expect('message' in read).toBe(v.reads);
        if (!v.reads) expect('dropped' in read && read.dropped).toBe(v.ignored ? 'ignored' : 'refused');
        // (a welcome's version: a client stays with a host of its version, and leaves one of another)
        if (v.admits !== undefined) expect(leaveOver((v.message as { protocol: number }).protocol) === null).toBe(v.admits);
      });
  });

  describe('what a lobby says, as a page reads it', () => {
    for (const v of of('page'))
      it(v.name, () => {
        expect(readFromLobby(messageOf(v)) !== null).toBe(v.reads);
      });
  });

  /** The keys of a message and the type of each value: the shape a reader reads it by. */
  const shape = (m: unknown): string =>
    JSON.stringify(
      Object.entries(m as Record<string, unknown>)
        .map(([k, x]) => [k, x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x])
        .sort(),
    );

  it("sends a host only what a host's reader reads: a join of this protocol, pings and a leave, each in a vector's shape", () => {
    const sent: ClientMessage[] = [{ kind: 'join', protocol: PROTOCOL, name: 'Cell studio' }, { kind: 'ping', sent: 12.5 }, { kind: 'leave' }];
    const read = of('host').filter((v) => v.reads);
    for (const m of sent) expect(read.map((v) => shape(v.message))).toContain(shape(m));
    // (a join of this protocol is admitted by a host of the version: the handshake's vector at this minor)
    expect(read.some((v) => v.admits && (v.message as { protocol?: number }).protocol === PROTOCOL)).toBe(true);
  });

  it("asks a lobby only what a lobby's reader reads: the sessions open, to join one, and to tell its host", () => {
    const asked: ToLobby[] = [{ op: 'list' }, { op: 'join', session: 'jam' }, { op: 'tell', message: { kind: 'leave' } }];
    const read = of('lobby').filter((v) => v.reads);
    for (const r of asked) expect(read.map((v) => shape(v.message))).toContain(shape(r));
  });

  it('is shown firing: a malformed message, a lobby word, a later kind and a host of another version are each told apart', () => {
    expect(readHost({ kind: 'finale', bar: 9 })).toHaveProperty('message');
    expect(readHost({ kind: 'finale', bar: '9' })).toEqual({ dropped: 'refused' });
    expect(readHost({ kind: 'away' })).toEqual({ dropped: 'refused' });
    expect(readHost({ kind: 'encore' })).toEqual({ dropped: 'ignored' });
    expect(leaveOver(FIRST_PROTOCOL - 1)).toMatch(/version 12/);
    expect(leaveOver(PROTOCOL + 1)).toBeNull();
  });

  it("names a session as a lobby takes it: trimmed, not blank, at most the contract's length", () => {
    expect(sessionNameProblem('  jam ')).toBeNull();
    expect(sessionNameProblem('  ')).toMatch(/needs a name/);
    expect(sessionNameProblem('x'.repeat(contract.limits.sessionNameMost! + 1))).toMatch(/at most/);
    expect(sessionNameProblem(` ${'x'.repeat(contract.limits.sessionNameMost!)} `)).toBeNull();
  });
});
