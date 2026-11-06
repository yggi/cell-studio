import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error a plain script (tools/sync-pr.mjs), exports for the test
import { duplicateDecisions, fixEntries, parseConflicts, removeSync, resolveText, union, GATE, REGENERATE, RESOLVERS } from './sync-pr.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

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
    expect(Object.keys(RESOLVERS).sort()).toEqual(['CHANGELOG.md', 'docs/MEMORY.md', 'docs/decisions/README.md', 'docs/examples.md', 'src/layout/quality.baseline.json']);
    expect(RESOLVERS['src/ui/Graph.svelte']).toBeUndefined();
  });

  it('names only files in this tree, and regenerates with scripts this package has (#426: the engine moved to cells)', () => {
    for (const f of Object.keys(RESOLVERS)) expect(existsSync(join(root, f)), f).toBe(true);
    const scripts = (JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;
    for (const [cmd, ...args] of REGENERATE as string[][]) {
      expect(cmd).toBe('npm');
      expect(scripts[args[1]!], args.join(' ')).toBeDefined();
    }
  });

  it('gates as the pre-push hook does: npm run verify', () => {
    expect(GATE).toEqual([['npm', 'run', 'verify']]);
  });

  it('finds decisions that share a number', () => {
    expect(duplicateDecisions(['017-a.md', '018-free-braid.md', '018-tutorial-tiers.md', 'README.md'])).toEqual(['018: 018-free-braid.md, 018-tutorial-tiers.md']);
    expect(duplicateDecisions(['001-a.md', '002-b.md'])).toEqual([]);
    expect(duplicateDecisions(['014-splices.md', '014-splices.png', '016-a.md', '016-a.jpg'])).toEqual([]);
  });
});

describe('sync-pr: what a run leaves behind (#426)', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

  it("removes a run's worktree and its sync/<pr> branch, and leaves another's", () => {
    const repo = mkdtempSync(join(tmpdir(), 'sync-pr-repo-'));
    const trees = mkdtempSync(join(tmpdir(), 'sync-pr-trees-'));
    dirs.push(repo, trees);
    git(repo, 'init', '-q', '-b', 'main');
    writeFileSync(join(repo, 'a.txt'), 'a\n');
    git(repo, 'add', 'a.txt');
    git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'a');
    git(repo, 'worktree', 'add', '-q', '-B', 'sync/7', join(trees, 'pr7'), 'main');
    git(repo, 'worktree', 'add', '-q', '-B', 'sync/8', join(trees, 'pr8'), 'main');
    // (a stale one, from a stopped run: its worktree and branch go, so the next run can make them again)
    expect(removeSync(repo, '7')).toEqual([join(trees, 'pr7')]);
    expect(existsSync(join(trees, 'pr7'))).toBe(false);
    expect(git(repo, 'branch', '--list', 'sync/7')).toBe('');
    expect(existsSync(join(trees, 'pr8'))).toBe(true);
    expect(git(repo, 'branch', '--list', 'sync/8')).not.toBe('');
    // (nothing left: nothing to do)
    expect(removeSync(repo, '7')).toEqual([]);
    git(repo, 'worktree', 'add', '-q', '-B', 'sync/7', join(trees, 'pr7'), 'main');
    expect(existsSync(join(trees, 'pr7'))).toBe(true);
  });
});
