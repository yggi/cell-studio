import { describe, expect, it } from 'vitest';
import { savedText } from './shortenText';

describe("Shorten's panel says what a suggestion saves in cells' units (#541)", () => {
  it('a saving of 1 reads as structure, not characters', () => {
    expect(savedText(1)).toBe('1 in structure');
    expect(savedText(1)).not.toMatch(/character/);
  });
});
