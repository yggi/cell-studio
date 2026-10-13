import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Conversion, FRAME_MS } from './convert.svelte';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const frames = ['a', 'b', 'c', 'd'].map((source) => ({ source, says: `to ${source}` }));
const made = () => {
  const shown: string[] = [];
  let code = '';
  let ended = 0;
  const c = new Conversion(
    (s) => shown.push((code = s)),
    () => code,
    () => ended++,
  );
  return { c, shown, ended: () => ended, edit: (s: string) => (code = s) };
};

describe('Convert to cells, replayed: the code set a frame at a time', () => {
  it('shows each frame in turn at its pace, then ends', () => {
    const { c, shown, ended } = made();
    c.play(frames);
    expect([shown, c.says, c.progress]).toEqual([['a'], 'to a', 0.25]);
    vi.advanceTimersByTime(FRAME_MS * 3);
    expect(shown).toEqual(['a', 'b', 'c', 'd']);
    // (the last frame has its time too, then it ends)
    expect([c.phase, ended()]).toEqual(['playing', 0]);
    vi.advanceTimersByTime(FRAME_MS);
    expect([c.phase, ended()]).toEqual([null, 1]);
  });

  it('goes faster at a higher speed, which is kept for the next time', () => {
    const { c, shown } = made();
    c.setSpeed(2);
    c.play(frames);
    vi.advanceTimersByTime(FRAME_MS);
    expect(shown).toEqual(['a', 'b', 'c']);
    expect(made().c.speed).toBe(2);
    c.setSpeed(100);
    expect(c.speed).toBe(4);
  });

  it('skips to the end, or stops where it is', () => {
    const one = made();
    one.c.play(frames);
    one.c.skip();
    vi.advanceTimersByTime(FRAME_MS);
    expect([one.shown, one.ended()]).toEqual([['a', 'd'], 1]);
    const two = made();
    two.c.play(frames);
    vi.advanceTimersByTime(FRAME_MS);
    two.c.stop();
    vi.advanceTimersByTime(FRAME_MS * 5);
    expect([two.shown, two.c.phase, two.ended()]).toEqual([['a', 'b'], null, 0]);
  });

  it('stops when the code is edited under it, keeping the edit', () => {
    const { c, shown, edit } = made();
    c.play(frames);
    edit('a, changed');
    vi.advanceTimersByTime(FRAME_MS * 5);
    expect([shown, c.phase]).toEqual([['a'], null]);
  });
});
