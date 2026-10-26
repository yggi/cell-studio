/**
 * The swing contract (yggi/music-commons `contracts/swing`, version 1) run against the warp a client reads a host's
 * playing back by (#492): the hub's vectors copied beside this file (`swing.vectors.json`, its `lifted` line naming the
 * commit), the hub's README the rule.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { swungAt, writtenAt, type SwingLevel } from './swing';

interface Vector {
  readonly name: string;
  readonly groups: readonly number[];
  readonly swing: readonly SwingLevel[];
  readonly onsets: readonly number[];
}
const contract = JSON.parse(readFileSync(new URL('./swing.vectors.json', import.meta.url), 'utf8')) as {
  lifted: string;
  contract: string;
  version: number;
  vectors: readonly Vector[];
};
const name = (v: Vector) => `${v.name} ${v.swing.map((l) => `${l.level}:${l.share}`).join(' ') || 'straight'}`;

describe('the swing contract (music-commons contracts/swing, version 1)', () => {
  it('is the version met, lifted with its source named: 131 vectors', () => {
    expect([contract.contract, contract.version]).toEqual(['swing', 1]);
    expect(contract.lifted).toMatch(/^Lifted from yggi\/music-commons contracts\/swing\/vectors\.json @ [0-9a-f]{7}/);
    expect(contract.vectors).toHaveLength(131);
  });

  it('plays every step of every vector at its onset, within 1e-9', () => {
    for (const v of contract.vectors) v.onsets.forEach((onset, step) => expect(Math.abs(swungAt(step, v.groups, v.swing) - onset), `${name(v)} step ${step}`).toBeLessThan(1e-9));
  });

  it('reads every onset back to its step, and any position between to where it was written', () => {
    for (const v of contract.vectors) {
      v.onsets.forEach((onset, step) => expect(Math.abs(writtenAt(onset, v.groups, v.swing) - step), `${name(v)} step ${step}`).toBeLessThan(1e-9));
      for (let x = 0; x < 2 * v.onsets.length; x += 0.37) expect(writtenAt(swungAt(x, v.groups, v.swing), v.groups, v.swing)).toBeCloseTo(x, 9);
    }
  });

  it('swings the bar after as this one: a note’s end past its bar', () => {
    const swing: SwingLevel[] = [{ level: '8n', share: 2 / 3 }];
    expect(swungAt(16 + 2, [2, 2, 2, 2], swing)).toBeCloseTo(16 + 8 / 3, 12);
    expect(writtenAt(16 + 8 / 3, [2, 2, 2, 2], swing)).toBeCloseTo(18, 12);
  });
});
