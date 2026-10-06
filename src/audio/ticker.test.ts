import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A frame stand-in: frames run when the test says, at the times it gives. */
let pending: ((t: number) => void) | null = null;
let requests = 0;
const frameAt = async (t: number) => {
  const f = pending;
  pending = null;
  f?.(t);
  await Promise.resolve(); // (the views run in a microtask after the clock)
};

beforeEach(() => {
  vi.resetModules();
  pending = null;
  requests = 0;
  vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) => ((pending = f), ++requests));
  vi.stubGlobal('document', { hidden: false });
});
afterEach(() => vi.unstubAllGlobals());

describe('ticker', () => {
  it('runs the clock first, then the views, each at its own interval', async () => {
    const { onFrames } = await import('./ticker');
    const seen: string[] = [];
    onFrames(
      (t) => seen.push(`view ${t}`),
      () => 30,
    );
    onFrames(
      (t) => seen.push(`clock ${t}`),
      () => 0,
      'clock',
    );
    for (const t of [0, 16, 32, 48]) await frameAt(t);
    expect(seen).toEqual(['clock 0', 'view 0', 'clock 16', 'clock 32', 'view 32', 'clock 48']);
  });

  it('asks for frames only while there are jobs, and skips a hidden page', async () => {
    const { onFrames } = await import('./ticker');
    let runs = 0;
    const stop = onFrames(() => runs++);
    expect(requests).toBe(1);
    await frameAt(0);
    (document as { hidden: boolean }).hidden = true;
    await frameAt(16);
    (document as { hidden: boolean }).hidden = false;
    await frameAt(32);
    expect(runs).toBe(2);
    stop();
    await frameAt(48); // (the frame already asked for finds no jobs and asks for no more)
    expect(pending).toBeNull();
    onFrames(() => runs++);
    expect(pending).not.toBeNull();
  });

  it('spreads views that fall due together over frames, within a budget, taking turns', async () => {
    const { onFrames } = await import('./ticker');
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const seen: string[] = [];
    // three views, 4 ms each: a 6 ms budget fits two a frame
    for (const name of ['a', 'b', 'c'])
      onFrames(
        () => ((now += 4), seen.push(name)),
        () => 30,
      );
    await frameAt(0);
    expect(seen).toEqual(['a', 'b']);
    await frameAt(16); // c was left over: it goes first
    expect(seen).toEqual(['a', 'b', 'c']);
    await frameAt(32); // a and b are due again
    expect(seen).toEqual(['a', 'b', 'c', 'a', 'b']);
  });

  it('keeps going when a job throws', async () => {
    const { onFrames } = await import('./ticker');
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    let runs = 0;
    onFrames(() => {
      throw new Error('a view failed');
    });
    onFrames(() => runs++);
    await frameAt(0);
    await frameAt(16);
    expect(runs).toBe(2);
    expect(err).toHaveBeenCalled();
  });
});
