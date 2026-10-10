import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dock } from './dock.svelte';
import { OCTAVE_MAX, OCTAVE_MIN } from '../../layout/keyboard';

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) });
});
afterEach(() => vi.unstubAllGlobals());

describe('Dock: the keys and pads, kept in this browser', () => {
  it('closed on the keys at first, middle C, velocity by height', () => {
    const d = new Dock();
    expect([d.open, d.tab, d.octave, d.velocity]).toEqual([false, 'keys', 4, 'height']);
  });

  it('open, its tab, the octave and the velocity come back in the next page', () => {
    const d = new Dock();
    d.toggle();
    d.tab = 'pads';
    d.octave = 2;
    d.velocity = 'fixed';
    const again = new Dock();
    expect([again.open, again.tab, again.octave, again.velocity]).toEqual([true, 'pads', 2, 'fixed']);
  });

  it('the octave stays within the keyboard', () => {
    const d = new Dock();
    d.octave = 99;
    expect(d.octave).toBe(OCTAVE_MAX);
    d.octave = -99;
    expect(d.octave).toBe(OCTAVE_MIN);
  });

  it('anything odd kept falls back to the defaults', () => {
    store.set('cell-studio:dock', JSON.stringify({ open: 'yes', tab: 'drums', octave: 4.5, velocity: 'loud' }));
    const d = new Dock();
    expect([d.open, d.tab, d.octave, d.velocity]).toEqual([false, 'keys', 4, 'height']);
    store.set('cell-studio:dock', '{not json');
    expect(new Dock().open).toBe(false);
  });

  it('a browser that keeps nothing (a private window): it works, only not kept', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    const d = new Dock();
    d.open = true;
    expect(d.open).toBe(true);
  });
});
