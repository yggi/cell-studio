import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from './player';
import { transportClock } from './clock.svelte';
import type { TransportState } from './transport';
import { compileSource } from '../engine/compile';
import { codeShifts } from '../engine/program';
import { plan } from '../engine/realize';

// (no Tone in node: the sound engine's waking is stubbed out; what is tested is the transport)
const hands: [string, (p: Player) => void, (p: Player) => void][] = [
  ['strike a resonator', (p) => p.strike('res', 0.5), () => {}],
  ['damp it', (p) => p.damp('res', true), (p) => p.damp('res', false)],
  ['bow it', (p) => p.bow('res', 0.3), (p) => p.bow('res', null)],
  ['scrub a tape', (p) => p.scrub('tape', 1), (p) => p.scrub('tape', null)],
  ['grab a belt', (p) => p.grab('belt', 0.5), (p) => p.grab('belt', null)],
];

function make(): Player {
  const p = new Player();
  vi.spyOn(p as unknown as { wake: () => Promise<void> }, 'wake').mockResolvedValue();
  return p;
}
const state = (): TransportState => transportClock.state;

describe('a hand takes a stopped transport to paused', () => {
  beforeEach(() => (transportClock.state = 'stopped'));
  afterEach(() => (transportClock.state = 'stopped'));

  it.each(hands)('%s', (_, lay) => {
    const p = make();
    expect(state()).toBe('stopped');
    lay(p);
    expect(state()).toBe('paused');
  });
  it.each(hands)('%s: letting go after Stop does not leave the initial state', (_, lay, lift) => {
    const p = make();
    lay(p);
    p.stop();
    expect(state()).toBe('stopped');
    lift(p);
    expect(state()).toBe('stopped');
  });
  it.each(hands)('%s: while playing, it stays playing', (_, lay) => {
    const p = make();
    transportClock.state = 'playing';
    lay(p);
    expect(state()).toBe('playing');
  });
  it('stop is the initial state from paused, and pause does not leave stopped', () => {
    const p = make();
    p.touch();
    expect(state()).toBe('paused');
    p.stop();
    expect(state()).toBe('stopped');
    p.pause();
    expect(state()).toBe('stopped');
  });
});

describe('pause lets go, stop silences', () => {
  // (a transport that plays, and a voice bank that says what it was asked)
  function playing() {
    const p = make();
    const asked: string[] = [];
    const tr = { stop: () => asked.push('transport.stop'), clear: () => {} };
    Object.assign(p as unknown as Record<string, unknown>, {
      Tone: { getTransport: () => tr, getContext: () => ({ currentTime: 0 }) },
      voices: { dropGates: () => asked.push('dropGates'), releaseAll: () => asked.push('releaseAll'), clearTapes: () => asked.push('clearTapes') },
      repeatId: 1,
    });
    transportClock.state = 'playing';
    return { p, asked };
  }
  afterEach(() => (transportClock.state = 'stopped'));

  it('pause drops the gates and leaves the tails: no hard cut', () => {
    const { p, asked } = playing();
    p.pause();
    expect(state()).toBe('paused');
    expect(asked).toContain('dropGates');
    expect(asked).not.toContain('releaseAll');
  });
  it('stop from playing drops the gates, then cuts what is left', () => {
    const { p, asked } = playing();
    p.stop();
    expect(state()).toBe('stopped');
    expect(asked.indexOf('dropGates')).toBeLessThan(asked.indexOf('releaseAll'));
  });
  it('stop from paused cuts the tails too (and the bodies)', () => {
    const { p, asked } = playing();
    p.pause();
    asked.length = 0;
    p.stop();
    expect(asked).toContain('releaseAll');
    expect(state()).toBe('stopped');
  });
});

describe('a hand on the timeline plays the notes it passes', () => {
  // &t plays at 0, 1, 2, 3 s (one step a second)
  const piece = compileSource('&bar step=1\n&t step=&bar 0 2 4 5\n&v s=sine loop=C4\n&out loop=SAMPLE_RATE map=sample [&t * &v]');
  function listening() {
    const p = make();
    const played: { at: number; code: number }[] = [];
    p.load(plan(piece, codeShifts(piece)));
    Object.assign(p as unknown as Record<string, unknown>, {
      Tone: { getContext: () => ({ currentTime: 10 }) },
      voices: { open: () => {}, tapeScrub: () => {}, play: (e: { at: number; code?: number }) => played.push({ at: e.at, code: e.code ?? NaN }) },
    });
    return { p, played };
  }
  const settle = () => new Promise((r) => setTimeout(r, 0));
  afterEach(() => (transportClock.state = 'stopped'));

  it('forward: each note it passes sounds, in order, as the hand reaches it', async () => {
    const { p, played } = listening();
    p.scroll(0.5, 2.5, true);
    await settle();
    expect(played.map((e) => e.code)).toEqual([1, 2]);
    expect(played[0].at).toBeLessThan(played[1].at);
    expect(state()).toBe('paused');
  });
  it('backward: the same notes, the other way round', async () => {
    const { p, played } = listening();
    p.scroll(2.5, 0.5, true);
    await settle();
    expect([...played].sort((a, b) => a.at - b.at).map((e) => e.code)).toEqual([2, 1]);
  });
  it('the slider jumping, or a hand standing still, plays nothing', async () => {
    const { p, played } = listening();
    p.scroll(0.5, 2.5, false);
    p.scroll(1, 1, true);
    await settle();
    expect(played).toEqual([]);
  });
  it('while playing the clock plays, not the hand', async () => {
    const { p, played } = listening();
    transportClock.state = 'playing';
    p.scroll(0.5, 2.5, true);
    await settle();
    expect(played).toEqual([]);
  });
});

describe('keys: press and release, a hand on a voice (#207)', () => {
  // (a voice bank that says what it was asked: its ids count from 100)
  function keyed() {
    const p = make();
    const asked: string[] = [];
    let bank = 99;
    Object.assign(p as unknown as Record<string, unknown>, {
      Tone: { getTransport: () => ({ stop: () => {}, clear: () => {} }), getContext: () => ({ currentTime: 0 }) },
      voices: {
        open: () => {},
        press: (v: string, f: number, vel: number) => (asked.push(`press ${v} ${f} v${vel} → ${++bank}`), bank),
        release: (id: number) => void asked.push(`release ${id}`),
        dropGates: () => asked.push('dropGates'),
        releaseAll: () => asked.push('releaseAll'),
        clearTapes: () => {},
      },
    });
    return { p, asked };
  }
  const settle = () => new Promise((r) => setTimeout(r, 0));
  beforeEach(() => (transportClock.state = 'stopped'));
  afterEach(() => (transportClock.state = 'stopped'));

  it('a press takes a stopped transport to paused, as a strike does, and sounds; its release lets that note go', async () => {
    const { p, asked } = keyed();
    const id = p.press('lead', 440, 90);
    expect(state()).toBe('paused');
    await settle();
    p.release(id);
    expect(asked).toEqual(['press lead 440 v90 → 100', 'release 100']);
  });
  it('a release with no matching press is ignored, and so is a second one', async () => {
    const { p, asked } = keyed();
    p.release(7);
    const id = p.press('lead', 440, 90);
    await settle();
    p.release(id);
    p.release(id);
    expect(asked).toEqual(['press lead 440 v90 → 100', 'release 100']);
  });
  it('let go before the sound engine woke: it sounds, then lets go at once (a quick tap is heard)', async () => {
    const { p, asked } = keyed();
    const id = p.press('lead', 440, 90);
    p.release(id);
    expect(asked).toEqual([]);
    await settle();
    expect(asked).toEqual(['press lead 440 v90 → 100', 'release 100']);
  });
  it('pause leaves a key held sounding (the bank drops only the plan’s gates); Stop cuts it, tells the keys, and its release is then ignored', async () => {
    const { p, asked } = keyed();
    const cut = vi.fn();
    p.onKeysCut = cut;
    const id = p.press('lead', 440, 90);
    await settle();
    transportClock.state = 'playing';
    Object.assign(p as unknown as Record<string, unknown>, { repeatId: 1 });
    p.pause();
    expect(asked).toEqual(['press lead 440 v90 → 100', 'dropGates']);
    p.stop();
    expect(asked.slice(2)).toEqual(['releaseAll']);
    expect(cut).toHaveBeenCalledOnce();
    p.release(id);
    expect(asked.slice(3)).toEqual([]);
  });
  it('pressed and cut by Stop before the engine woke: it never sounds', async () => {
    const { p, asked } = keyed();
    p.press('lead', 440, 90);
    p.stop();
    await settle();
    expect(asked).toEqual(['releaseAll']);
  });
  it('while playing, a press leaves it playing', () => {
    const { p } = keyed();
    transportClock.state = 'playing';
    p.press('lead', 440, 90);
    expect(state()).toBe('playing');
  });
});
