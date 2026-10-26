/**
 * The feel contract (yggi/music-commons `contracts/feel`, version 1, minor 1) run against Cell studio's feel (#484): the hub's
 * vectors are copied beside this file (`feel.vectors.json`, its `lifted` line naming the hub and the commit; the hub's own,
 * what it lifted from Jambot, kept as `liftedByTheHub`), and the hub's README for the contract is the rule. Every vector
 * runs, and none is recorded: the summit needs 0 (#478 rung 3).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { feelOf, frameOf, played, readingOf, type FeelEvent, type FeelFrame } from './feel';
import type { SentBar } from './protocol';

interface Vector {
  readonly preset: string;
  readonly meter: string;
  readonly frame: FeelFrame;
  readonly feel: number;
  readonly events: readonly (FeelEvent & { readonly onset: number })[];
  readonly played: readonly { readonly velocity: number; readonly length: number }[];
}
interface Contract {
  readonly lifted: string;
  readonly liftedByTheHub: string;
  readonly contract: string;
  readonly version: number;
  readonly minor: number;
  readonly reading: readonly { readonly output: string; readonly reads: { readonly part: string; readonly role?: string } | null }[];
  readonly vectors: readonly Vector[];
}
const read = (name: string) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const contract: Contract = read('./feel.vectors.json');
const name = (v: Vector) => `${v.preset} ${v.meter} seed ${v.frame.seed} bar ${v.frame.bar}`;

describe('the feel contract (music-commons contracts/feel, version 1, minor 1)', () => {
  it('is the version Cell studio meets, lifted with its source named, 256 bars from Jambot', () => {
    expect([contract.contract, contract.version, contract.minor]).toEqual(['feel', 1, 1]);
    expect(contract.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/feel\/vectors\.json @ [0-9a-f]{7}/);
    expect(contract.liftedByTheHub).toMatch(/^Lifted from yggi\/jambot @ [0-9a-f]{7}/);
    expect(contract.vectors).toHaveLength(256);
  });

  it('the feel of every bar is the vector’s', () => {
    for (const v of contract.vectors) expect(feelOf(v.frame), name(v)).toBe(v.feel);
  });

  it('every event plays at the vector’s velocity and length, equal: 7,140 of 7,140, none recorded', () => {
    let events = 0;
    for (const v of contract.vectors) {
      expect(
        v.events.map((e) => played(v.frame, e)),
        name(v),
      ).toEqual(v.played);
      events += v.events.length;
    }
    expect(events).toBe(7140);
  });

  it('reads each output a host’s text names an event by as the vector’s part and role, or as none of the feel’s: 17 of 17', () => {
    expect(contract.reading).toHaveLength(17);
    for (const r of contract.reading) expect(readingOf(r.output), r.output).toEqual(r.reads);
    expect(readingOf(undefined)).toBeNull();
  });
});

describe('the frame of a bar a host sent', () => {
  // (the session contract's bar, as a host sends it: the hub's vectors beside this file)
  const session = read('./vectors.json') as { vectors: readonly { reader: string; reads: boolean; message: { kind: string; sent?: SentBar } }[] };
  const sent = session.vectors.find((v) => v.reader === 'client' && v.reads && v.message.kind === 'bar')!.message.sent!;

  it('is read off its plan, style, swing and energy: the meter’s eighths, each pulse a group', () => {
    expect(frameOf(sent)).toEqual({
      seed: 42,
      bar: 0,
      groups: [2, 2, 2, 2],
      section: 'intro',
      style: { entropy: 0.3, artic: 0.55, sync: 0.3 },
      swing: { level: '16n', share: 0.5 },
      energy: 0.25000000000000006,
    });
  });

  it('…and is null where a field the feel reads is missing or not what it reads', () => {
    const without = (path: string[], value?: unknown): SentBar => {
      const copy = structuredClone(sent) as unknown as Record<string, unknown>;
      const at = path.slice(0, -1).reduce((o, k) => o[k] as Record<string, unknown>, copy.bar as Record<string, unknown>);
      if (value === undefined) delete at[path.at(-1)!];
      else at[path.at(-1)!] = value;
      return copy as unknown as SentBar;
    };
    for (const path of [
      ['seed'],
      ['bar'],
      ['barEnergy'],
      ['plan', 'meter'],
      ['plan', 'section', 'type'],
      ['style', 'entropy'],
      ['style', 'artic'],
      ['style', 'sync'],
      ['swing', 'share'],
    ])
      expect(frameOf(without(path)), path.join('.')).toBeNull();
    expect(frameOf(without(['swing', 'level'], '4n'))).toBeNull();
    expect(frameOf(without(['plan', 'section', 'type'], 'chorus'))).toBeNull();
    expect(frameOf(without(['plan', 'meter', 'heights'], [2, 0]))).toBeNull();
  });
});
