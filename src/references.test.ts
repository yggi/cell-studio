// The code view's references (#624): every `from` id of every example painted as a link, and every name a `from` line
// gives shows its chain, from the fragment that defines it out to the piece's own line.
import { describe, expect, it } from 'vitest';
import { EXAMPLES } from '@yggi/cells/engine/examples';
import { references } from '@yggi/cells/engine/references';
import { compilePiece } from './compile';
import { chainOf, fragmentCard, linksOf } from './references';
import { tokenize, withLinks } from './ui/highlight';

describe('references in the code view', () => {
  it('paints every reference in every example as a link over exactly its id', () => {
    let n = 0;
    for (const [key, e] of Object.entries(EXAMPLES)) {
      const lines = e.source.split('\n');
      const links = linksOf(e.source);
      expect(links.length, key).toBe(references(e.source).length);
      for (const l of links) {
        const painted = withLinks(tokenize(lines[l.line - 1]!), [l]);
        expect(painted.map((p) => p.text).join(''), `${key}:${l.line}`).toBe(lines[l.line - 1]);
        expect(
          painted
            .filter((p) => p.link === l.id)
            .map((p) => p.text)
            .join(''),
          `${key}:${l.line}`,
        ).toBe(lines[l.line - 1]!.slice(l.from, l.to));
        n++;
      }
    }
    expect(n).toBeGreaterThan(100);
  });

  it('gives every given name of every example a chain: its fragment first, the piece’s own line last (an argument the piece writes: that line alone)', () => {
    let n = 0;
    for (const [key, e] of Object.entries(EXAMPLES)) {
      const r = compilePiece(e.source);
      for (const name of r.origins?.keys() ?? []) {
        const steps = chainOf(r, name);
        expect(steps?.length, `${key}: &${name}`).toBeGreaterThan(0);
        // (an argument the piece writes, `&bar from meter 96bpm`'s tempo, is its line's alone: a chain of one)
        if (steps!.length > 1) expect(steps![0]!.id, `${key}: &${name}`).not.toBeNull();
        expect(steps!.at(-1)!.id, `${key}: &${name}`).toBeNull();
        n++;
      }
      expect(chainOf(r, 'nothing_given_here')).toBeNull();
    }
    expect(n).toBeGreaterThan(100);
  });

  it('reads Electroswing’s &hh from gm_kit, through drums_performer, to the piece’s line 1', () => {
    const r = compilePiece(EXAMPLES.electroswing.source);
    expect(chainOf(r, 'hh')).toEqual([
      { id: 'gm_kit', line: 9 },
      { id: 'drums_performer', line: 2 },
      { id: null, line: 1 },
    ]);
  });

  it('cards a fragment by its facet, signature, prose and who takes it; none for an id the library lacks', () => {
    const c = fragmentCard('drums_performer')!;
    // (its signature carries the style of each of its eight modules, as cells v0.26.0 writes it: the head is what is held)
    expect([c.facets, c.signature?.split(' style=')[0], c.takes]).toEqual([['performer'], '&drums, &drumsOut from (&kit) &drumlines', ['gm_kit']]);
    expect(c.prose).toMatch(/^The drummer/);
    expect(c.takenBy).toBeGreaterThan(0);
    expect(fragmentCard('no_such_fragment')).toBeNull();
  });
});
