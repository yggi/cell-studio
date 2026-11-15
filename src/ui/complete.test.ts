// Completion after `from` (#624, #587): every fragment of the library is offered, those headed by the line's names
// first, then by their distance to the piece's style.
import { describe, expect, it } from 'vitest';
import { catalogue } from '@yggi/cells/repository/catalogue';
import { FUNK } from '@yggi/cells/repository/styles';
import { fromContext, suggestFragments } from './complete';
import { EMPTY_LAYER } from '@yggi/cells/repository/fragments';

describe('completion after from', () => {
  it('reads a line that asks for an id, and none that doesn’t', () => {
    expect(fromContext('&bd, &sd from gm_k')).toEqual({ start: 14, partial: 'gm_k', names: ['bd', 'sd'] });
    expect(fromContext('&groove from ')).toEqual({ start: 13, partial: '', names: ['groove'] });
    expect(fromContext('* from ')).toEqual({ start: 7, partial: '', names: [] });
    expect(fromContext('&kick=bd from gm')?.names).toEqual(['kick']);
    expect(fromContext('&bar label="my bar" from met')?.partial).toBe('met');
    // (a signature, a comment, a cell's braid, a word after the id)
    expect(fromContext('&a from (')).toBeNull();
    expect(fromContext('# &a from g')).toBeNull();
    expect(fromContext('&a step=4n 0 2')).toBeNull();
    expect(fromContext('&a from gm_kit ')).toBeNull();
  });

  it('offers every fragment of the library, each by the start of its id', () => {
    for (const e of catalogue()) {
      const s = suggestFragments({ start: 0, partial: e.id, names: [] }, null, 200);
      expect(
        s.map((x) => x.text),
        e.id,
      ).toContain(e.id);
    }
  });

  it('puts first the fragments whose signature names the line’s head', () => {
    const s = suggestFragments(fromContext('&bassV from ')!, null);
    expect(s[0]!.heads).toBe(true);
    expect(s.filter((x) => x.heads).map((x) => x.text)).toContain('bass');
    expect(s.findIndex((x) => !x.heads)).toBeGreaterThan(s.findLastIndex((x) => x.heads));
  });

  it('ranks by the piece’s style: at Funk’s point the first three rhythms within 0.3 of it (cells #540’s miss distance)', () => {
    // (a line whose name heads no fragment: the style alone ranks; `&groove from` puts the grooves headed &groove first)
    const rhythms = suggestFragments(fromContext('&beat from ')!, FUNK, 500).filter((x) => x.facet === 'rhythm');
    expect(rhythms.slice(0, 3).map((x) => x.text)).toEqual(['funk_drums', 'rumba_clave_3_2', 'son_clave_2_3']);
    for (const r of rhythms.slice(0, 3)) expect(r.distance, r.text).toBeLessThanOrEqual(0.3);
    expect(rhythms.map((r) => r.distance)).toEqual([...rhythms.map((r) => r.distance)].sort((a, b) => a - b));
  });
});

describe('completion after from offers a person’s own fragments (#626)', () => {
  it('lists one filed, by its id, with the seed’s', () => {
    const fragment = {
      id: 'my_groove',
      text: '&groove from\n&groove step=8n &bd ~ &sd ~\n&bd, &sd from gm_kit',
      association: [{ point: { sync: 0.5 }, weight: 0.1, facet: 'rhythm' }],
    };
    const entries = catalogue({ ...EMPTY_LAYER, filed: [{ fragment, meta: { source: 'me', created: '2026-11-15T00:00:00Z' }, prose: '' }] });
    const s = suggestFragments(fromContext('&beat from my_g')!, null, 12, entries);
    expect(s.map((x) => x.text)).toContain('my_groove');
    expect(s.find((x) => x.text === 'my_groove')?.facet).toBe('rhythm');
  });
});
