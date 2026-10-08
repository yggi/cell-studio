import { describe, expect, it } from 'vitest';
import { freezeTape, holdTape, type TapeNet } from './tape';

/** A parameter that records what is done to it; `value` is where it stands. */
function param(value = 0) {
  const calls: { what: string; v?: number; t: number }[] = [];
  return {
    value,
    calls,
    getValueAtTime(this: { value: number }) {
      return this.value;
    },
    cancelScheduledValues: (t: number) => calls.push({ what: 'cancel', t }),
    setValueAtTime: (v: number, t: number) => calls.push({ what: 'set', v, t }),
    linearRampToValueAtTime: (v: number, t: number) => calls.push({ what: 'ramp', v, t }),
    setTargetAtTime: (v: number, t: number) => calls.push({ what: 'target', v, t }),
  };
}
const ramps = (p: ReturnType<typeof param>) => p.calls.filter((c) => c.what === 'ramp');

/** A frozen tape of 4 tape-seconds whose loop takes `period` audio seconds, with one head. */
function frozen(period = 4, at = 0.75) {
  const head = { node: { delayTime: param(at) }, at };
  const out = { gain: param(1) };
  const net = { taps: [head], length: 4, maxDelay: 20, frozen: { at: 0, period }, heads: new Map([['h', out]]), scrubbing: false } as unknown as TapeNet;
  return { net, head, out };
}
/** Where a head is sent to for content `behind` tape-seconds behind where the tape was held, at audio time `now`. */
function target(behind: number, now = 0, period = 4) {
  const { net, head } = frozen(period);
  holdTape(now, net, () => behind);
  return ramps(head.node.delayTime)[0].v!;
}

describe('a frozen tape is turned, not run (holdTape)', () => {
  it('only its length matters: a lap further back is the same place', () => {
    expect(target(1.5)).toBeCloseTo(target(1.5 + 4));
    expect(target(1.5)).toBeCloseTo(target(1.5 - 4));
    expect(target(1.5)).toBeCloseTo(target(1.5 + 40));
  });
  it('turned on by a second of tape, its content lies a second further round the loop (and wraps)', () => {
    expect(target(2.5) - target(1.5)).toBeCloseTo(1);
    // (a slower tape: its loop takes longer, so a second of tape is two of the loop)
    expect(target(2.5, 0, 8) - target(1.5, 0, 8)).toBeCloseTo(2);
    // (round the end of the lap: from the last of it back to the first)
    const a = target(3.9);
    const b = target(0.1);
    expect(Math.abs(a - b) % 4).toBeCloseTo(3.8, 5);
  });
  it('held still it keeps its content: a moment later it has moved on with the loop', () => {
    expect(target(1.5, 0.5) - target(1.5, 0)).toBeCloseTo(0.5);
  });
  it('and it takes the short way round: no jump of a lap when the hand turns it across the end', () => {
    // a head at 3.8 s (end of the loop's lap); the hand turns the content it reads on past the end, to 0.2
    const { net, head } = frozen(4, 3.8);
    holdTape(0, net, () => 3.9);
    const first = ramps(head.node.delayTime)[0].v!;
    head.node.delayTime.value = first;
    holdTape(0.02, net, () => 3.9 - 0.2);
    const second = ramps(head.node.delayTime).at(-2)!.v!;
    expect(Math.abs(second - first)).toBeLessThan(2);
  });
  it('a head plays while it is turned and falls silent a moment after', () => {
    const { net, out } = frozen();
    holdTape(1, net, () => 1);
    const g = out.gain.calls.filter((c) => c.what === 'target');
    expect(g.map((c) => [c.v, c.t])).toEqual([
      [1, 1],
      [0, 1.4],
    ]);
  });
});

describe('freezing a tape (freezeTape)', () => {
  function tape() {
    const log: string[] = [];
    const node = (name: string) => ({
      connect: (to: { name: string }) => log.push(`${name}→${to.name}`),
      disconnect: (to: { name: string }) => log.push(`${name}⊘${to.name}`),
      name,
    });
    const loss = node('loss');
    const bus = node('bus');
    const delay = { ...node('loop'), delayTime: param(3.2) };
    const input = { gain: param(1) };
    const hiss = { gain: { gain: param(0.006) }, level: 0.006 };
    const net = { loop: { delay, loss }, bus, input, hiss, heads: new Map([['h', { gain: param(1) }]]), frozen: null } as unknown as TapeNet;
    return { net, log, input, hiss, delay };
  }
  it('closes the write gate and the hiss, takes the loss out of the loop and keeps its period', () => {
    const { net, log, input, hiss } = tape();
    freezeTape(5, net, true);
    expect(net.frozen).toEqual({ at: 5, period: 3.2 });
    expect(log).toEqual(['loop⊘loss', 'loop→bus']);
    expect(input.gain.calls.at(-1)).toMatchObject({ what: 'target', v: 0 });
    expect(hiss.gain.gain.calls.at(-1)).toMatchObject({ what: 'target', v: 0 });
  });
  it('and puts it all back when the tape runs again; twice is once', () => {
    const { net, log, input, hiss } = tape();
    freezeTape(5, net, true);
    freezeTape(5.1, net, true);
    log.length = 0;
    freezeTape(9, net, false);
    freezeTape(9.1, net, false);
    expect(net.frozen).toBeNull();
    expect(log).toEqual(['loop⊘bus', 'loop→loss']);
    expect(input.gain.calls.at(-1)).toMatchObject({ v: 1 });
    expect(hiss.gain.gain.calls.at(-1)).toMatchObject({ v: 0.006 });
  });
});
