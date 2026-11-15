// A selection turned into a fragment (#626): the id and facet it is offered with, and a piece taking it exported so it
// compiles with the seed library alone.
import { describe, expect, it } from 'vitest';
import { compileSource } from '@yggi/cells/engine/compile';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { extract } from '@yggi/cells/repository/extract';
import { resolveSeed } from '@yggi/cells/repository/library';
import { catalogue } from '@yggi/cells/repository/catalogue';
import { exportable, facetFor, idFor } from './extraction';

const k = EXAMPLES.kinderlied.source;
const at = (head: string) => k.split('\n').findIndex((l) => l.startsWith(head)) + 1;
const proposal = () => {
  const r = extract(k, [at('&harm '), at('&bassline ')], { id: 'my_harm', resolve: resolveSeed });
  if ('why' in r) throw new Error(r.why);
  return r;
};
const errors = (text: string) => compileSource(text, undefined, { resolve: resolveSeed }).diagnostics.filter((d) => d.severity === 'error');

describe('a selection turned into a fragment', () => {
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
