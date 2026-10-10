import { describe, expect, it } from 'vitest';
// @ts-expect-error a plain script (tools/sync-pr.mjs), exports for the test
import { duplicateDecisions, fixEntries, parseConflicts, resolveText, union, RESOLVERS } from './sync-pr.mjs';

const conflict = (ours: string, theirs: string) => `<<<<<<< HEAD\n${ours}=======\n${theirs}>>>>>>> origin/main\n`;

describe('sync-pr: the mechanical resolutions', () => {
  it('splits a file into text and conflicts, the branch as ours and main as theirs', () => {
    expect(parseConflicts(`a\n${conflict('mine\n', 'main\n')}b\n`)).toEqual([{ text: 'a\n' }, { ours: 'mine\n', theirs: 'main\n' }, { text: 'b\n' }]);
  });

  it("keeps both sides' lines, main's first, and a shared line once", () => {
    expect(union('- b\n- shared\n', '- a\n- shared\n')).toBe('- a\n- shared\n- b\n');
    expect(union('x\n', 'y\n')).toBe('y\nx\n');
  });

  it('resolves several conflicts in one file and leaves the rest as it was', () => {
    const text = `head\n${conflict('p1\n', 'm1\n')}middle\n${conflict('p2\n', 'm2\n')}tail\n`;
    expect(resolveText(text, 'union')).toBe('head\nm1\np1\nmiddle\nm2\np2\ntail\n');
  });

  it('puts the commas right in a JSON object of one entry a line', () => {
    const text = `{\n  "a": {"x":1},\n${conflict('  "mine": {"x":3}\n', '  "gate": {"x":2},\n')}  "z": {"x":4}\n}\n`;
    const out = resolveText(text, 'entries');
    expect(JSON.parse(out)).toEqual({ a: { x: 1 }, gate: { x: 2 }, mine: { x: 3 }, z: { x: 4 } });
    expect(Object.keys(JSON.parse(out))).toEqual(['a', 'gate', 'mine', 'z']);
  });

  it('adds a comma to a last entry that is no longer last, and drops one that is', () => {
    expect(fixEntries('{\n  "a": 1\n  "b": 2,\n}\n')).toBe('{\n  "a": 1,\n  "b": 2\n}\n');
  });

  it('names the files it resolves, and none that need a person', () => {
    expect(Object.keys(RESOLVERS).sort()).toEqual([
      'CHANGELOG.md',
      'docs/MEMORY.md',
      'docs/examples.md',
      'docs/language/reference.md',
      'src/engine/ladder.ts',
      'src/engine/order.ts',
      'src/engine/snapshot.txt',
      'src/layout/quality.baseline.json',
    ]);
    expect(RESOLVERS['src/ui/Graph.svelte']).toBeUndefined();
  });

  it('finds decisions that share a number', () => {
    expect(duplicateDecisions(['017-a.md', '018-free-braid.md', '018-tutorial-tiers.md', 'README.md'])).toEqual(['018: 018-free-braid.md, 018-tutorial-tiers.md']);
    expect(duplicateDecisions(['001-a.md', '002-b.md'])).toEqual([]);
    expect(duplicateDecisions(['014-splices.md', '014-splices.png', '016-a.md', '016-a.jpg'])).toEqual([]);
  });
});
