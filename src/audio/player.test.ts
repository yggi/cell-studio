import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Player } from './player';
import { transportClock } from './clock.svelte';
import type { TransportState } from './transport';

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
