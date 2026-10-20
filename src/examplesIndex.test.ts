import { describe, expect, test } from 'vitest';
import built from 'virtual:examples-index';
import { examplesIndexModule, type buildExamplesIndex } from '../tools/examples-index';

describe('examples/*.md', () => {
  test('the index module keeps an endless cycle (JSON would make it null)', () => {
    // (the first entry of the index as built: working every miniature out again only to take one is slow)
    const [first] = built as ReturnType<typeof buildExamplesIndex>;
    const text = examplesIndexModule([{ ...first, time: { ends: null, cycle: Infinity, chance: false, longest: null } }]);
    expect(text).toContain('"cycle":Infinity');
  });
});
