/**
 * The session contract's version 2 (yggi/music-commons `contracts/session`, minor 3) run against Cell studio's version 2
 * reader (`protocol-v2.ts`), as `protocol.test.ts` runs version 1's against its own: the hub's vectors are copied beside
 * this file (`vectors-v2.json`, its `lifted` line naming the hub and the commit), and the hub's README for the contract is
 * the rule. Every `client` and `page` vector runs here; the `host` and `lobby` vectors check that what this client sends
 * is of a shape those readers read.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Lacked } from './lacked';
import { LIMITS, readFromLobby, type ClientMessage, type LackedWhy, type ToLobby } from './protocol';
import type { Lack } from './sound';
import { FIRST_PROTOCOL, PROTOCOL, leaveOver, readHost } from './protocol-v2';
import { JOIN_PROTOCOL } from './readers';

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
  readonly kinds: Readonly<Record<string, readonly string[]>>;
  readonly limits: Readonly<Record<string, number>>;
  readonly vectors: readonly Vector[];
}
const contract: Contract = JSON.parse(readFileSync(new URL('./vectors-v2.json', import.meta.url), 'utf8'));

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

/** The vectors of a client's two readers this client doesn't meet, by name, each with its reason (the contract's "Host → client"). None, at minor 3. */
const RECORDED: ReadonlyMap<string, string> = new Map();

describe('the session contract (music-commons contracts/session, version 2, minor 3)', () => {
  it('is the version this reader reads, lifted with its source named; and the join carries its protocol', () => {
    expect(contract.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/session\/vectors\.json @ [0-9a-f]{7}/);
    expect([contract.contract, contract.version, contract.minor]).toEqual(['session', 2, 3]);
    expect(contract.protocol).toBe(PROTOCOL);
    expect(contract.firstProtocol).toBe(FIRST_PROTOCOL);
    expect(JOIN_PROTOCOL).toBe(PROTOCOL);
    for (const [k, v] of Object.entries(LIMITS)) expect([k, contract.limits[k]]).toEqual([k, v]);
  });

  it('has vectors for each of the four readers, and runs every one of the two a client has', () => {
    const counts = Object.fromEntries((['host', 'client', 'lobby', 'page'] as const).map((r) => [r, of(r).length]));
    expect(counts.client! + counts.page! + counts.host! + counts.lobby!).toBe(contract.vectors.length);
    expect(counts.client).toBeGreaterThan(150);
    expect(counts.page).toBeGreaterThan(10);
    const names = new Set([...of('client'), ...of('page')].map((v) => v.name));
    for (const [name, why] of RECORDED) expect([name, names.has(name), why.length > 0]).toEqual([name, true, true]);
  });

  it('reads each kind of a client the contract names, and one of each it reads', () => {
    for (const kind of contract.kinds.client!) {
      const read = of('client').filter((v) => v.reads && (v.message as { kind?: unknown }).kind === kind);
      expect([kind, read.length > 0]).toEqual([kind, true]);
      for (const v of read) expect([v.name, readHost(messageOf(v))]).toHaveProperty('1.message');
    }
  });

  it.each(['verse', 'chorus', 'outro', 'coda'])('admits a score of the section %s only if it is one of the nine (minor 3)', (kind) => {
    const score = of('client').find((v) => v.reads && (v.message as { kind?: unknown }).kind === 'score')!.message;
    expect([kind, 'message' in readHost({ ...(score as object), section: kind })]).toEqual([kind, kind !== 'coda']);
  });

  describe("a host's messages, as a client reads them", () => {
    for (const v of of('client'))
      it(v.name, () => {
        const read = readHost(messageOf(v));
        const met = [
          'message' in read === v.reads,
          v.reads || ('dropped' in read && read.dropped === (v.ignored ? 'ignored' : 'refused')),
          // (a welcome's version: this reader stays with a host of version 2, and leaves one before it)
          v.admits === undefined || (leaveOver((v.message as { protocol: number }).protocol) === null) === v.admits,
        ];
        expect([read, met.every(Boolean)]).toEqual([read, !RECORDED.has(v.name)]);
      });
  });

  describe('what a lobby says, as a page reads it (the lobby reads no version: one reader for both)', () => {
    for (const v of of('page'))
      it(v.name, () => {
        expect((readFromLobby(messageOf(v)) !== null) === v.reads).toBe(!RECORDED.has(v.name));
      });
  });

  /** The keys of a message and the type of each value: the shape a reader reads it by. */
  const shape = (m: unknown): string =>
    JSON.stringify(
      Object.entries(m as Record<string, unknown>)
        .map(([k, x]) => [k, x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x])
        .sort(),
    );

  it("sends a host only what a host's reader reads: a join of the join's protocol, pings and a leave, each in a vector's shape", () => {
    const sent: ClientMessage[] = [{ kind: 'join', protocol: JOIN_PROTOCOL, name: 'Cell studio' }, { kind: 'ping', sent: 12.5 }, { kind: 'leave' }];
    const read = of('host').filter((v) => v.reads);
    for (const m of sent) expect(read.map((v) => shape(v.message))).toContain(shape(m));
    // (a join of this protocol is admitted by a host of version 2: the handshake's vector at this minor)
    expect(read.some((v) => v.admits && (v.message as { protocol?: number }).protocol === JOIN_PROTOCOL)).toBe(true);
  });

  it('sends a host of version 2 a lacked bar in each reason’s vector’s shape, and never a refused one (#698)', () => {
    const lack = (bar: number, kind: LackedWhy): Lack => ({ bar, why: `a reason in words`, kind });
    const lacked = new Lacked();
    const whys: LackedWhy[] = ['silent', 'digest', 'lock', 'late'];
    lacked.add(whys.map((w, i) => lack(12 + i, w)));
    const sent = lacked.take(0);
    expect(sent.map((m) => (m as { why: string }).why)).toEqual(whys);
    for (const m of sent) {
      const v = of('host').find((x) => x.reads && x.name === `lacked, ${(m as { why: string }).why}`)!;
      expect(shape(m)).toBe(shape(v.message));
      // (what the refused vectors have wrong, this never sends: a whole bar, one of the four reasons, the text there)
      const { bar, why, text } = m as { bar: number; why: string; text: unknown };
      expect([Number.isInteger(bar), whys.includes(why as LackedWhy), typeof text === 'string']).toEqual([true, true, true]);
    }
    // (the three refused vectors: bar = 1.5, why = "muted", text absent)
    expect(of('host').filter((v) => !v.reads && (v.message as { kind?: string } | null)?.kind === 'lacked').length).toBe(3);
  });

  it("asks a lobby only what a lobby's reader reads: the sessions open, to join one, and to tell its host", () => {
    const asked: ToLobby[] = [{ op: 'list' }, { op: 'join', session: 'jam' }, { op: 'tell', message: { kind: 'leave' } }];
    const read = of('lobby').filter((v) => v.reads);
    for (const r of asked) expect(read.map((v) => shape(v.message))).toContain(shape(r));
  });

  it("is shown firing: version 1's kinds ignored, the band never locked, a conduct's entropy bounded, a host before version 2 left", () => {
    const conduct = { kind: 'conduct', bar: 3, start: 12.5, seed: 42, entropy: 0.3, offer: null, foreseen: 'x' };
    expect(readHost(conduct)).toHaveProperty('message');
    expect(readHost({ ...conduct, entropy: 1.01 })).toEqual({ dropped: 'refused' });
    expect(readHost({ ...conduct, entropy: -0.01 })).toEqual({ dropped: 'refused' });
    const score = { kind: 'score', bar: 0, step: 0, section: 'groove', text: '* from band', unstated: null, lock: [], fragments: [], energy: [0.5], foreseen: ['x'], cut: [] };
    expect(readHost(score)).toHaveProperty('message');
    expect(readHost({ ...score, lock: [{ id: 'band', hash: 'e2:0b7a' }] })).toEqual({ dropped: 'refused' });
    expect(readHost({ ...score, section: 'coda' })).toEqual({ dropped: 'refused' });
    expect(readHost({ kind: 'bar', sent: { bar: {}, start: 1 } })).toEqual({ dropped: 'ignored' });
    expect(readHost({ kind: 'section' })).toEqual({ dropped: 'ignored' });
    expect(readHost({ kind: 'finale', bar: '9' })).toEqual({ dropped: 'refused' });
    expect(readHost({ kind: 'away' })).toEqual({ dropped: 'refused' });
    expect(leaveOver(FIRST_PROTOCOL - 1)).toMatch(/version 1/);
    expect(leaveOver(FIRST_PROTOCOL)).toBeNull();
    expect(leaveOver(PROTOCOL + 1)).toBeNull();
  });
});
