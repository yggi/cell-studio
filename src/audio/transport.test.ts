import { describe, expect, it } from 'vitest';
import { recordTransition, transition, type RecordEvent, type RecordState, type TransportEvent, type TransportState } from './transport';

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

describe('recording (#210)', () => {
  const RECORDS: RecordState[] = ['off', 'armed', 'taking'];
  const REVENTS: RecordEvent[] = ['record', 'begin', 'done', 'cancel'];
  it('every record state and event, playing: the whole table', () => {
    const table = Object.fromEntries(RECORDS.map((r) => [r, REVENTS.map((e) => recordTransition(r, e, 'playing'))]));
    //                    record   begin     done     cancel
    expect(table).toEqual({
      off: ['armed', 'off', 'off', 'off'],
      armed: ['off', 'taking', 'armed', 'off'],
      taking: ['off', 'taking', 'off', 'off'],
    });
  });
  it('a pass begins only while playing', () => {
    expect(recordTransition('armed', 'begin', 'stopped')).toBe('armed');
    expect(recordTransition('armed', 'begin', 'paused')).toBe('armed');
  });
});
