import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, parseLatency, parseLookAhead, resolveTuning } from './tuning';

const none = { latency: null, lookahead: null };

describe('tuning', () => {
  it('parses the hints and a number of seconds, and nothing else', () => {
    expect(parseLatency('interactive')).toBe('interactive');
    expect(parseLatency('balanced')).toBe('balanced');
    expect(parseLatency('0.05')).toBe(0.05);
    expect(parseLatency('2')).toBeNull();
    expect(parseLatency('fast')).toBeNull();
    expect(parseLatency('')).toBeNull();
    expect(parseLookAhead('0.1')).toBe(0.1);
    expect(parseLookAhead('0')).toBeNull();
    expect(parseLookAhead('5')).toBeNull();
  });
  it('is the safe default when nothing is asked for', () => {
    expect(resolveTuning('', none).tuning).toEqual(DEFAULT_TUNING);
    expect(resolveTuning('?perf', none).keep).toEqual(none);
  });
  it('takes the address, and keeps it', () => {
    const r = resolveTuning('?latency=interactive&lookahead=0.1', none);
    expect(r.tuning).toEqual({ latencyHint: 'interactive', lookAhead: 0.1 });
    expect(r.keep).toEqual({ latency: 'interactive', lookahead: '0.1' });
  });
  it('uses what was kept, and the address wins over it', () => {
    expect(resolveTuning('', { latency: '0.05', lookahead: null }).tuning.latencyHint).toBe(0.05);
    expect(resolveTuning('?latency=balanced', { latency: '0.05', lookahead: null }).tuning.latencyHint).toBe('balanced');
  });
  it('off forgets it; nonsense is ignored', () => {
    expect(resolveTuning('?latency=off', { latency: 'interactive', lookahead: null })).toMatchObject({ tuning: DEFAULT_TUNING, keep: { latency: null } });
    expect(resolveTuning('?latency=nonsense', { latency: 'interactive', lookahead: null }).tuning.latencyHint).toBe('interactive');
    expect(resolveTuning('?lookahead=9', none).tuning.lookAhead).toBeNull();
  });
});
