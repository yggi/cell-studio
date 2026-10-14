import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { compileSource } from '@yggi/cells/engine/compile';

// docs/ promises (see docs/MEMORY.md): a ```cells block in a page can't rot (the language's own pages are yggi/cells'), INDEX.md lists every page,
// and relative links resolve.

const DOCS = resolve(__dirname, '../docs');
const markdown = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? markdown(p) : p.endsWith('.md') ? [p] : [];
  });
const rel = (p: string) => relative(DOCS, p).split('\\').join('/');
const pages = existsSync(DOCS) ? markdown(DOCS) : [];
const read = (p: string) => readFileSync(p, 'utf8');

/** The ```cells blocks of a page: each must compile standalone with no diagnostics. */
const blocks = (text: string): string[] => [...text.matchAll(/^```cells\n([\s\S]*?)^```/gm)].map((m) => m[1]);

describe('docs: cells blocks compile', () => {
  const withBlocks = pages.filter((p) => blocks(read(p)).length > 0);
  // (the language's pages, and their blocks, are yggi/cells'; a page here may still carry one)
  if (withBlocks.length === 0) it('no page here carries a ```cells block', () => expect(withBlocks).toEqual([]));
  for (const page of withBlocks)
    for (const [i, src] of blocks(read(page)).entries())
      it(`${rel(page)} block ${i + 1}`, () => {
        const r = compileSource(src);
        // a small example may leave out the sound card; anything else is a diagnostic to fix
        const problems = r.diagnostics.filter((d) => !d.message.startsWith('Nothing plays yet'));
        expect(problems.map((d) => d.message)).toEqual([]);
        expect(r.ok).toBe(true);
      });
});

describe('docs: structure', () => {
  const index = read(join(DOCS, 'INDEX.md'));
  // notes/ and decisions/ are listed as directories only; their files change too often
  const listed = pages.filter((p) => !/^(notes|decisions)\//.test(rel(p)) && rel(p) !== 'INDEX.md');

  for (const page of listed) it(`INDEX.md lists ${rel(page)}`, () => expect(index).toContain(`](${rel(page)})`));

  it('INDEX.md lists notes/ and decisions/', () => {
    expect(index).toContain('](notes/)');
    expect(index).toContain('](decisions/)');
  });

  for (const page of pages)
    it(`links in ${rel(page)} resolve`, () => {
      const text = read(page).replace(/^```[\s\S]*?^```/gm, '');
      for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const file = resolve(dirname(page), target.split('#')[0]);
        expect(existsSync(file), `${rel(page)} → ${target}`).toBe(true);
      }
    });

  it('every decision linked from MEMORY.md exists', () => {
    const memory = read(join(DOCS, 'MEMORY.md'));
    for (const [, target] of memory.matchAll(/→ (decisions\/[\w.-]+\.md)/g)) expect(existsSync(join(DOCS, target)), target).toBe(true);
  });
});
