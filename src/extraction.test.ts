// A selection turned into a fragment (#626): the id and facet it is offered with, and a piece taking it exported so it
// compiles with the seed library alone.
import { describe, expect, it } from 'vitest';
import { catalogue, compileSource, createRepository, EMPTY_LAYER, EXAMPLES, extract, fileFragment, LIBRARY, resolverOf, resolveSeed } from '@yggi/cells';
import { soundsIdentical } from '@yggi/cells/engine/sameness';
import { pointOf } from './ui/complete';
import { exportable, facetFor, fileOwn, idFor } from './extraction';

const k = EXAMPLES.kinderlied.source;
const at = (head: string) => k.split('\n').findIndex((l) => l.startsWith(head)) + 1;
const proposal = () => {
  const r = extract(k, [at('&harm '), at('&bassline ')], { id: 'my_harm', resolve: resolveSeed });
  if ('why' in r) throw new Error(r.why);
  return r;
};
const errors = (text: string) => compileSource(text, undefined, { resolve: resolveSeed }).diagnostics.filter((d) => d.severity === 'error');

describe('a selection turned into a fragment', () => {
  it('takes Kinderlieder’s vamp and its bass as one line over the key, and, filed, plays the same (#626)', () => {
    const r = extract(k, [at('&harm '), at('&bassline ')], { id: 'my_vamp_bass', resolve: resolveSeed });
    if ('why' in r) throw new Error(r.why);
    expect(r.line).toBe('&harm, &bassline from my_vamp_bass &key');
    expect(r.heads).toEqual(['&harm', '&bassline']);
    expect(r.main).toBe('&key');
    expect(r.same).toBe(true);
    // (filed as the app files it, `mine.file`, the piece read through that layer plays as it did, its first 16 s;
    // through the seed alone it doesn't)
    const filing = { text: r.fragment, point: pointOf([]), source: 'me', created: '2026-11-16T00:00:00Z', id: 'my_vamp_bass' };
    const filed = fileOwn(LIBRARY, EMPTY_LAYER, filing);
    expect(filed.id).toBe('my_vamp_bass');
    // (cells alone files this text of `from` lines alone as the seed `stick_count`, yggi/cells#941: when this fails, cells
    // reads such a text as itself, and `fileOwn`'s guard can go)
    expect(fileFragment(createRepository(LIBRARY), EMPTY_LAYER, filing).id).toBe('stick_count');
    expect(soundsIdentical(k, r.piece, 16, { resolve: resolverOf(filed.layer) })).toBe(true);
    expect(soundsIdentical(k, r.piece, 16, { resolve: resolveSeed })).toBe(false);
  });

  it('files a text of `from` lines alone that a seed is written as, as that seed (the guard of yggi/cells#941)', () => {
    for (const id of ['stick_count', 'hat_count', 'clave_count']) {
      const text = LIBRARY.find((f) => f.id === id)!.text;
      expect(fileOwn(LIBRARY, EMPTY_LAYER, { text, point: pointOf([]), source: 'me', created: '2026-11-24T00:00:00Z' }).id, id).toBe(id);
    }
  });

  it('offers an id the library doesn’t hold, after its first head', () => {
    expect(idFor(['&harm', '&bassline'], new Set())).toBe('my_harm');
    expect(idFor(['&harm'], new Set(['my_harm', 'my_harm_2']))).toBe('my_harm_3');
  });

  it('prefills the facet of what its head’s line takes: Kinderlieder’s vamp, a harmony', () => {
    expect(facetFor(proposal().fragment, catalogue())).toBe('harmony');
    expect(facetFor('&a from\n&a step=4n 0 2', catalogue())).toBeNull();
  });

  it('exports a piece taking it as the lines it was, compiling with the seed library alone', () => {
    const r = proposal();
    const mine = new Map([['my_harm', r.fragment]]);
    expect(errors(r.piece).length).toBeGreaterThan(0);
    const out = exportable(r.piece, mine, (id, hash) => mine.get(id) ?? resolveSeed(id, hash));
    expect(out).toBe(k);
    expect(errors(out)).toEqual([]);
    // (a piece that takes none is as it was)
    expect(exportable(k, mine, resolveSeed)).toBe(k);
  });

  it('writes the whole piece out where a take renames or passes arguments', () => {
    const mine = new Map([['my_beat', '&beat from\n&beat step=8n &bd ~ &sd ~\n&bd, &sd from gm_kit']]);
    const piece = '&bar meter("4/4") step=100bpm\n&groove=beat from my_beat\n&out map=sample [&groove]';
    const out = exportable(piece, mine, (id, hash) => mine.get(id) ?? resolveSeed(id, hash));
    expect(out).not.toContain('my_beat');
    expect(errors(out)).toEqual([]);
  });
});
