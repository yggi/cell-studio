import { describe, expect, it } from 'vitest';
import { builtOn, shortVersion } from './buildInfo';

describe('shortVersion', () => {
  it('is the first 7 characters of the commit', () => {
    expect(shortVersion({ commit: '0123456789abcdef0123456789abcdef01234567' })).toBe('0123456');
  });
  it('is `dev` when the build knows no commit', () => {
    expect(shortVersion({ commit: '' })).toBe('dev');
  });
});

describe('builtOn', () => {
  it('reads the date and the minute, in UTC', () => {
    expect(builtOn({ builtAt: '2026-10-17T14:03:59.123Z' })).toBe('2026-10-17 14:03 UTC');
  });
});
