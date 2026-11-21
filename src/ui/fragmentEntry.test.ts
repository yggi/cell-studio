// A fragment's card (#679): one card for a piece and a fragment, the library's search over both.
import { describe, expect, it } from 'vitest';
import { catalogue } from '@yggi/cells/repository/catalogue';
import { firstParagraph, fragmentEntry, matches } from './entries';
import { exampleTakes, takersOf } from '../references';

describe('a fragment as a card of the library', () => {
  it('reads its prose’s first paragraph as plain words', () => {
    expect(firstParagraph('# Head\n\nA [vamp](x.md) of **two** `&harm`\nchords.\n\nMore.')).toBe('A vamp of two &harm chords.');
    expect(firstParagraph('')).toBe('');
  });

  it('is titled by its id, tagged by its facets, found by the library’s search', () => {
    const e = catalogue().find((x) => x.id === 'vamp_to_the_fifth')!;
    const card = fragmentEntry(e);
    expect(card).toMatchObject({ id: 'fragment:vamp_to_the_fifth', kind: 'fragment', title: 'vamp_to_the_fifth', tags: ['harmony'] });
    expect(card.description).toMatch(/^A vamp/);
    expect(matches(card, 'harmony')).toBe(true);
    expect(matches(card, 'vamp')).toBe(true);
    expect(matches(card, 'nothing like it')).toBe(false);
  });

  it('knows what takes it and what a piece takes, each way round', () => {
    // (every piece a fragment is in takes it)
    for (const e of catalogue().slice(0, 40)) for (const key of takersOf(e.id).pieces) expect(exampleTakes(key)).toContain(e.id);
    expect(takersOf('no such fragment')).toEqual({ pieces: [], fragments: [] });
  });
});
