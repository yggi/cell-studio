import { describe, expect, it } from 'vitest';
import { anotherName, defaultPlayerName, keepPlayerName, refusesName, type NameStore } from './name';

/** A browser's storage, faked: a map, or one that refuses every call (a private window, blocked site data). */
const memory = (): NameStore & { kept: Map<string, string> } => {
  const kept = new Map<string, string>();
  return { kept, getItem: (k) => kept.get(k) ?? null, setItem: (k, v) => void kept.set(k, v) };
};
const refusing: NameStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('SecurityError');
  },
};
/** A draw that walks through the given numbers, round again. */
const draws = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length]!;
};

describe('the name Cell studio goes by in a session', () => {
  it('is "Cell studio" and a suffix of its own, the same after a reload', () => {
    const store = memory();
    const first = defaultPlayerName(store, 'k', draws(0, 0.5, 0.99));
    expect(first).toMatch(/^Cell studio [a-z2-9]{3}$/);
    expect(defaultPlayerName(store, 'k', draws(0.3))).toBe(first);
  });

  it('differs between two browsers, so both can join one session', () => {
    expect(defaultPlayerName(memory(), 'k', draws(0.1))).not.toBe(defaultPlayerName(memory(), 'k', draws(0.7)));
  });

  it('is drawn afresh where storage refuses, and keeping it fails quietly', () => {
    expect(defaultPlayerName(refusing, 'k', draws(0.2))).toMatch(/^Cell studio [a-z2-9]{3}$/);
    expect(defaultPlayerName(null, 'k', draws(0.2))).toMatch(/^Cell studio [a-z2-9]{3}$/);
    expect(() => keepPlayerName(refusing, 'k', 'Ada')).not.toThrow();
  });

  it('keeps a name joined with, typed or offered, for the next visit', () => {
    const store = memory();
    keepPlayerName(store, 'k', ' Ada ');
    expect(defaultPlayerName(store, 'k')).toBe('Ada');
  });

  it('offers another for one a host refused: the same, its suffix drawn anew, never the same', () => {
    expect(anotherName('Cell studio abc', draws(0.5))).toMatch(/^Cell studio [a-z2-9]{3}$/);
    expect(anotherName('Cell studio abc', draws(0.5))).not.toBe('Cell studio abc');
    expect(anotherName('Ada', draws(0))).toBe('Ada aaa');
    // (a draw that gives the refused suffix every time)
    expect(anotherName('Ada aaa', draws(0))).toBe('Ada aaa 2');
  });

  it("tells a refusal of the name from another: Jambot's names it", () => {
    const taken = 'A player named Cell studio k7m is already in this session. Pick another name.';
    expect(refusesName(taken, 'cell studio K7M ')).toBe(true);
    expect(refusesName('This host speaks version 15 of the session protocol, which takes 15 on, and this app 14: reload it.', 'Cell studio k7m')).toBe(false);
    expect(refusesName(taken, null)).toBe(false);
  });
});
