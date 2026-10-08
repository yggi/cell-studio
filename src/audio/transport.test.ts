import { describe, expect, it } from 'vitest';
import { transition, type TransportEvent, type TransportState } from './transport';

const STATES: TransportState[] = ['stopped', 'paused', 'playing'];
const EVENTS: TransportEvent[] = ['play', 'pause', 'stop', 'touch'];

describe('the transport states', () => {
  it('every state and event: the whole table', () => {
    const table = Object.fromEntries(STATES.map((s) => [s, EVENTS.map((e) => transition(s, e))]));
    //                              play       pause      stop       touch
    expect(table).toEqual({
      stopped: ['playing', 'stopped', 'stopped', 'paused'],
      paused: ['playing', 'paused', 'stopped', 'paused'],
      playing: ['playing', 'paused', 'stopped', 'playing'],
    });
  });
  it('a touch is the only way out of stopped but play', () => {
    for (const e of EVENTS) if (e !== 'play' && e !== 'touch') expect(transition('stopped', e)).toBe('stopped');
  });
  it('stop gets to stopped from anywhere, and is idempotent', () => {
    for (const s of STATES) expect(transition(transition(s, 'stop'), 'stop')).toBe('stopped');
  });
  it('pause only ever stops a run', () => {
    expect(transition('stopped', 'pause')).toBe('stopped');
    expect(transition('paused', 'pause')).toBe('paused');
    expect(transition('playing', 'pause')).toBe('paused');
  });
});
