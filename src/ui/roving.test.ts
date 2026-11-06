import { describe, expect, it } from 'vitest';
import { roveTo } from './roving';

describe('a roving tabindex (#338)', () => {
  const keys = [60, 61, 62, 63, 64];
  it('moves one along with the arrows, to the ends with Home and End, and stops at the ends', () => {
    expect(roveTo(keys, 62, 'ArrowRight')).toBe(63);
    expect(roveTo(keys, 62, 'ArrowLeft')).toBe(61);
    expect(roveTo(keys, 62, 'ArrowDown')).toBe(63);
    expect(roveTo(keys, 62, 'ArrowUp')).toBe(61);
    expect(roveTo(keys, 62, 'Home')).toBe(60);
    expect(roveTo(keys, 62, 'End')).toBe(64);
    expect(roveTo(keys, 64, 'ArrowRight')).toBe(64);
    expect(roveTo(keys, 60, 'ArrowLeft')).toBe(60);
  });
  it('leaves any other key, and a control not in the row, to the control', () => {
    expect(roveTo(keys, 62, ' ')).toBeNull();
    expect(roveTo(keys, 62, 'Enter')).toBeNull();
    expect(roveTo(keys, 70, 'ArrowRight')).toBeNull();
  });
});
