import { describe, expect, it } from 'vitest';
// @ts-expect-error a plain script (tools/gallery/shotspec.mjs), exports for the test
import { isId, pairUp, parseStates, slug, tileName } from './shotspec.mjs';

describe("the gallery's shot and pair: what they read", () => {
  it('reads the states to show an element in, and refuses a word it does not know', () => {
    expect(parseStates()).toEqual([{ kind: 'rest', label: 'rest' }]);
    expect(parseStates('rest, hover,focus,type=out,click')).toEqual([
      { kind: 'rest', label: 'rest' },
      { kind: 'hover', label: 'hover' },
      { kind: 'focus', label: 'focus' },
      { kind: 'type', text: 'out', label: 'type-out' },
      { kind: 'click', label: 'click' },
    ]);
    expect(parseStates('type=')).toEqual([{ kind: 'type', text: '', label: 'type-empty' }]);
    expect(() => parseStates('hovre')).toThrow(/"hovre" is not/);
  });

  it('names a tile by its piece, its place among the matches and its state', () => {
    expect(tileName('Music Box', 0, 'hover')).toBe('music-box-0-hover.png');
    expect(tileName('example:lullaby', 2, 'type-out')).toBe('example-lullaby-2-type-out.png');
    expect(slug('  A tone! ')).toBe('a-tone');
  });

  it("pairs two runs' tiles by name, and says which are in one only", () => {
    expect(pairUp(['a.png', 'b.png', 'gone.png'], ['b.png', 'a.png', 'new.png'])).toEqual({ both: ['a.png', 'b.png'], onlyBefore: ['gone.png'], onlyAfter: ['new.png'] });
  });

  it('tells a piece id from a title', () => {
    expect(isId('example:lullaby')).toBe(true);
    expect(isId('Music Box')).toBe(false);
  });
});
