import { afterEach, describe, expect, it, vi } from 'vitest';
import { contextClock, heardLatency } from './device';

type ToneNS = Parameters<typeof heardLatency>[0];

/**
 * A context whose output is heard `lag` after it is made, on a page clock the test moves (`pageMs`): its pairing reads
 * the moment heard now. `suspend(s)` moves the page on `s` seconds while the context's clock stands still.
 */
function device(lag: number, paired = true) {
  const d = {
    currentTime: 1,
    pageMs: 50_000,
    lag,
    step(s: number) {
      d.currentTime += s;
      d.pageMs += s * 1000;
    },
    suspend(s: number) {
      d.pageMs += s * 1000;
    },
  };
  const native = {
    get currentTime() {
      return d.currentTime;
    },
    outputLatency: lag,
    ...(paired && { getOutputTimestamp: () => ({ contextTime: d.currentTime - d.lag, performanceTime: d.pageMs }) }),
  };
  const T = { getContext: () => ({ rawContext: native }) } as unknown as ToneNS;
  vi.spyOn(performance, 'now').mockImplementation(() => d.pageMs);
  return { d, T };
}

afterEach(() => vi.restoreAllMocks());

describe('contextClock', () => {
  it('is one estimate per context, and none without a context', () => {
    const a = device(0.03);
    const b = device(0.03);
    expect(contextClock(a.T)).toBe(contextClock(a.T));
    expect(contextClock(a.T)).not.toBe(contextClock(b.T));
    expect(contextClock({ getContext: () => ({ rawContext: null }) } as unknown as ToneNS)).toBeNull();
  });

  it('reads the moment heard: the audio clock less the lag', () => {
    const { d, T } = device(0.03);
    const clock = contextClock(T)!;
    for (let i = 0; i < 4; i++, d.step(0.5)) clock.update();
    expect(clock.heard()).toBeCloseTo(d.currentTime - 0.03, 9);
    expect(clock.toDeviceMs(d.currentTime)).toBeCloseTo(d.pageMs + 30, 6);
  });
});

describe('heardLatency', () => {
  it("is the lag from made to heard, from the output timestamp's pairing", () => {
    const { d, T } = device(0.03);
    for (let i = 0; i < 4; i++, d.step(0.5)) expect(heardLatency(T)).toBeCloseTo(0.03, 9);
  });

  it('is null where the platform has no pairing (Safari): the browser output latency stands in elsewhere', () => {
    expect(heardLatency(device(0.03, false).T)).toBeNull();
  });

  it('follows another output device at its first reading', () => {
    const { d, T } = device(0.03);
    for (let i = 0; i < 4; i++, d.step(0.5)) heardLatency(T);
    d.lag = 0.2;
    expect(heardLatency(T)).toBeCloseTo(0.2, 9);
  });

  it('reads the lag again at once after the context is suspended and resumed, not 0', () => {
    const { d, T } = device(0.03);
    for (let i = 0; i < 4; i++, d.step(0.5)) heardLatency(T);
    d.suspend(5);
    d.step(0.5);
    expect(heardLatency(T)).toBeCloseTo(0.03, 9);
  });

  it('holds a dropped buffer (10 ms) for three readings, as the MIDI clock does, and is never negative', () => {
    const { d, T } = device(0.03);
    for (let i = 0; i < 4; i++, d.step(0.5)) heardLatency(T);
    d.lag = 0.02;
    const read = [0, 1, 2].map(() => (d.step(0.5), heardLatency(T)!));
    expect(read[0]).toBeCloseTo(0.03, 9);
    expect(read[2]).toBeCloseTo(0.02, 9);
    d.lag = -0.5;
    for (let i = 0; i < 4; i++, d.step(0.5)) expect(heardLatency(T)).toBeGreaterThanOrEqual(0);
  });

  it('is null when the context throws', () => {
    expect(
      heardLatency({
        getContext: () => {
          throw new Error('closed');
        },
      } as unknown as ToneNS),
    ).toBeNull();
  });
});
