// The pre-push hook (.githooks/pre-push), the stamp `npm run verify` leaves for it (tools/verified.mjs, with the count
// tools/test-count.mjs keeps), and the session-start hooks (.claude/hooks/): each run in a throwaway repository.
// Lifted from yggi/jambot tooling/hooks.test.ts @ 8871429ee9e489ad2af37270e7a4b0b090d91507 (adapted: the stamp and its
// count, the session-start message about yggi/cells).
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error a plain script (tools/test-count.mjs), exports for the test
import { keepCount } from './test-count.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const failing = 'echo verify ran and failed; exit 1';
const passing = 'echo "      Tests  12 passed (12)"';

// A hook run from a linked worktree hands its children GIT_DIR and friends, which beat `git -C <dir>`: a test that
// makes a throwaway repository would write to the real one instead. No spawn here inherits them.
const env: NodeJS.ProcessEnv = { ...process.env };
for (const name of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_PREFIX', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_NAMESPACE'])
  delete env[name];

const repos: string[] = [];
afterEach(() => {
  for (const dir of repos.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function git(dir: string, ...args: string[]) {
  const run = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim();
}

// The base repository is built once and copied, since building one takes most of a test's time in git.
let base: string;
beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'cell-studio-hook-base-'));
  git(base, 'init', '-q');
  git(base, 'config', 'user.email', 'hook@test');
  git(base, 'config', 'user.name', 'hook');
  writeFileSync(join(base, 'README.md'), 'a\n');
  git(base, 'add', '.');
  git(base, 'commit', '-qm', 'base');
  git(base, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
});
afterAll(() => rmSync(base, { recursive: true, force: true }));

/** A repository whose `origin/main` holds `README.md`, with `files` committed on top of it. */
function repoWith(files: string[]) {
  const dir = mkdtempSync(join(tmpdir(), 'cell-studio-hook-'));
  repos.push(dir);
  cpSync(base, dir, { recursive: true });
  for (const file of files) writeFileSync(join(dir, file), 'b\n');
  if (files.length > 0) {
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'change');
  }
  return dir;
}

const zero = '0'.repeat(40);

/** Runs git's pre-push hook in `dir` for pushes of `refs`, with the two checks replaced by shell commands. */
function hook(dir: string, refs: { local?: string; remote?: string } | 'head' = 'head', checks: { verify?: string; docs?: string } = {}) {
  const head = git(dir, 'rev-parse', 'HEAD');
  const { local = head, remote = 'refs/heads/work' } = refs === 'head' ? {} : refs;
  const run = spawnSync('sh', [`${root}/.githooks/pre-push`, 'origin', 'url'], {
    cwd: dir,
    input: `refs/heads/work ${local} ${remote} ${zero}\n`,
    env: { ...env, CELL_STUDIO_VERIFY: checks.verify ?? passing, CELL_STUDIO_VERIFY_DOCS: checks.docs ?? passing },
    encoding: 'utf8',
  });
  return { status: run.status, stdout: run.stdout, stderr: run.stderr };
}

describe('pre-push', () => {
  it('blocks a push when verify fails, and says why', () => {
    const { status, stderr } = hook(repoWith(['a.ts']), 'head', { verify: failing });
    expect(status).toBe(1);
    expect(stderr).toContain('verify ran and failed');
    expect(stderr).toContain('the push was blocked');
  });

  it('keeps the whole output of a failed check, and says where, since its end may miss the failure', () => {
    const dir = repoWith(['a.ts']);
    const long = 'echo the first line failed; for i in $(seq 100); do echo noise $i; done; exit 1';
    const { stderr } = hook(dir, 'head', { verify: long });
    expect(stderr).not.toContain('the first line failed');
    const kept = /full log: (\S+)/.exec(stderr)?.[1];
    expect(kept).toBeDefined();
    expect(readFileSync(kept!, 'utf8')).toContain('the first line failed');
    expect(kept!.startsWith(git(dir, 'rev-parse', '--absolute-git-dir'))).toBe(true);
  });

  it('lets a push through when verify passes, in one line with the number of tests that passed', () => {
    const { status, stdout } = hook(repoWith(['a.ts']));
    expect(status).toBe(0);
    expect(stdout.trim().split('\n')).toHaveLength(1);
    expect(stdout).toMatch(/passed npm run verify: 12 tests passed/);
  });

  it('reads the count through vitest’s colours', () => {
    const coloured = String.raw`printf '      Tests  \033[1m\033[32m7 passed\033[39m\033[22m (7)\n'`;
    expect(hook(repoWith(['a.ts']), 'head', { verify: coloured }).stdout).toContain(': 7 tests passed');
  });

  it.each([
    ['deleting a branch', { local: zero, remote: 'refs/heads/work' }],
    ['pushing a tag', { remote: 'refs/tags/v1' }],
    ['the deploy to gh-pages', { remote: 'refs/heads/gh-pages' }],
  ])('does not run verify for %s', (_, refs) => {
    expect(hook(repoWith(['a.ts']), refs, { verify: failing })).toEqual({ status: 0, stdout: '', stderr: '' });
  });

  it('refuses to push a commit other than the one checked out', () => {
    const dir = repoWith(['a.ts']);
    const { status, stderr } = hook(dir, { local: git(dir, 'rev-parse', 'origin/main') });
    expect(status).toBe(1);
    expect(stderr).toContain('not the checked out commit');
  });

  it('refuses a push while a tracked file has uncommitted changes', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'a.ts'), 'edited\n');
    const { status, stderr } = hook(dir);
    expect(status).toBe(1);
    expect(stderr).toContain('uncommitted');
  });

  it('refuses an untracked file git does not ignore, which verify would see and the commit lacks, and names it', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'helper.ts'), 'verify needs me\n');
    const { status, stderr } = hook(dir);
    expect(status).toBe(1);
    expect(stderr).toContain('untracked files are in it but not in the commit');
    expect(stderr).toContain('  helper.ts');
  });

  it('is not troubled by an ignored file', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(git(dir, 'rev-parse', '--absolute-git-dir'), 'info', 'exclude'), 'scratch.txt\n');
    writeFileSync(join(dir, 'scratch.txt'), 'x\n');
    expect(hook(dir).status).toBe(0);
  });

  it('is not troubled by an untracked file once the commit passed verify without it', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir).status).toBe(0);
    writeFileSync(join(dir, 'scratch.txt'), 'x\n');
    expect(hook(dir, 'head', { verify: failing }).status).toBe(0);
  });

  it('stamps the tree its own run saw, and nothing when a file changed while the check ran', () => {
    const dir = repoWith(['a.ts']);
    const { status, stdout } = hook(dir, 'head', { verify: `echo edited > a.ts; ${passing}` });
    expect(status).toBe(0);
    expect(stdout).toContain('a file changed while it ran: let through, not stamped');
    git(dir, 'checkout', '--', 'a.ts');
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
  });

  it('does not verify a tree again that another worktree of the clone passed', () => {
    const dir = repoWith(['a.ts']);
    const other = join(dir, '.other');
    git(dir, 'worktree', 'add', '-q', '--detach', other, 'HEAD');
    writeFileSync(join(dir, '.git', 'info', 'exclude'), '.other\n');
    expect(hook(other).status).toBe(0);
    const again = hook(dir, 'head', { verify: failing });
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('already (12 tests passed)');
  });

  it('does not verify a tree twice, so a retried push is free, and still says how many tests passed', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir).status).toBe(0);
    const again = hook(dir, 'head', { verify: failing });
    expect(again.status).toBe(0);
    expect(again.stdout).toContain('already (12 tests passed)');
  });

  it('verifies again once the tree changes', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir).status).toBe(0);
    writeFileSync(join(dir, 'b.ts'), 'c\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'more');
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
  });

  it('does not remember a tree that failed', () => {
    const dir = repoWith(['a.ts']);
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
  });

  it('runs only the docs check for a branch that changes markdown alone', () => {
    const dir = repoWith(['notes.md']);
    expect(hook(dir, 'head', { verify: failing }).status).toBe(0);
    expect(hook(dir, 'head', { verify: passing, docs: failing }).status).toBe(1);
  });

  it('runs everything once code changes with the markdown', () => {
    const dir = repoWith(['notes.md', 'a.ts']);
    expect(hook(dir, 'head', { verify: failing, docs: passing }).status).toBe(1);
  });

  it('does not remember a tree that only the docs check passed', () => {
    const dir = repoWith(['notes.md']);
    expect(hook(dir).status).toBe(0);
    expect(hook(dir, 'head', { verify: passing, docs: failing }).status).toBe(1);
  });

  it('runs its check without the GIT_DIR a linked worktree hands a hook', () => {
    const dir = repoWith(['a.ts']);
    const head = git(dir, 'rev-parse', 'HEAD');
    const run = spawnSync('sh', [`${root}/.githooks/pre-push`, 'origin', 'url'], {
      cwd: dir,
      input: `refs/heads/work ${head} refs/heads/work ${zero}\n`,
      env: { ...env, GIT_DIR: join(dir, '.git'), CELL_STUDIO_VERIFY: 'test -z "$GIT_DIR" || { echo GIT_DIR leaked; exit 1; }' },
      encoding: 'utf8',
    });
    expect(run.stderr).not.toContain('GIT_DIR leaked');
    expect(run.status).toBe(0);
  });

  it('is what a checkout runs: the install points core.hooksPath at it, and verify stamps what passed', () => {
    const scripts = JSON.parse(readFileSync(`${root}/package.json`, 'utf8')).scripts;
    expect(scripts.prepare).toContain('core.hooksPath .githooks');
    expect(scripts.preverify).toMatch(/&& node tools\/verified\.mjs begin$/);
    expect(scripts.postverify).toBe('node tools/verified.mjs end');
  });
});

/** Runs tools/verified.mjs in `dir`: `begin` as npm's `preverify` does, `end` as its `postverify` does after a pass. */
function verified(dir: string, ...args: string[]) {
  return spawnSync('node', [`${root}/tools/verified.mjs`, ...args], { cwd: dir, env, encoding: 'utf8' });
}

/** Keeps `n` as the count `npm test`'s reporter leaves in `dir`'s git directory. */
function counted(dir: string, n: number) {
  const file = join(git(dir, 'rev-parse', '--absolute-git-dir'), 'cell-studio-tests-passed');
  writeFileSync(file, `${n}\n`);
  return file;
}

describe('the stamp npm run verify leaves (tools/verified.mjs)', () => {
  it('lets the push of the files verify saw through, untracked ones too, even when they were committed after', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'a.ts'), 'edited\n');
    writeFileSync(join(dir, 'new.ts'), 'new\n');
    verified(dir, 'begin');
    counted(dir, 1234);
    expect(verified(dir, 'end').stdout).toContain('1234 tests passed');
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'what verify saw');
    const { status, stdout } = hook(dir, 'head', { verify: failing });
    expect(status).toBe(0);
    expect(stdout).toContain('already (1234 tests passed)');
  });

  it('stamps nothing for a commit that leaves out a file verify saw', () => {
    const dir = repoWith(['a.ts']);
    writeFileSync(join(dir, 'helper.ts'), 'verify needed me\n');
    verified(dir, 'begin');
    expect(verified(dir, 'end').stdout).toContain('commit exactly these files');
    rmSync(join(dir, 'helper.ts'));
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
  });

  it('stamps nothing when a file changed while verify ran, since verify may have read either version', () => {
    const dir = repoWith(['a.ts']);
    verified(dir, 'begin');
    writeFileSync(join(dir, 'a.ts'), 'edited while verify ran\n');
    expect(verified(dir, 'end').stdout).toContain('not stamped');
    // Neither the tree it began on (the edit undone) nor the one it ended on (the edit committed) passed.
    git(dir, 'checkout', '--', 'a.ts');
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
    writeFileSync(join(dir, 'a.ts'), 'edited while verify ran\n');
    git(dir, 'commit', '-qam', 'the edit');
    expect(hook(dir, 'head', { verify: failing }).status).toBe(1);
  });

  it('does nothing at the end of a run that did not begin (a verify that failed leaves its begin behind, harmless)', () => {
    const dir = repoWith(['a.ts']);
    expect(verified(dir, 'end').stdout).toBe('');
    expect(existsSync(join(git(dir, 'rev-parse', '--absolute-git-dir'), 'cell-studio-verified'))).toBe(false);
  });

  it('uses a count once, takes one it is given, and says it does not know one it was not given', () => {
    const dir = repoWith(['a.ts']);
    verified(dir, 'begin');
    const file = counted(dir, 5);
    verified(dir, 'end');
    expect(existsSync(file)).toBe(false);
    commit(dir, 'b.ts');
    verified(dir, 'begin');
    expect(verified(dir, 'end').stdout).toContain('? tests passed');
    commit(dir, 'c.ts');
    verified(dir, 'begin');
    expect(verified(dir, 'end', '7').stdout).toContain('7 tests passed');
  });

  it('forgets a count an earlier npm test left when verify begins', () => {
    const dir = repoWith(['a.ts']);
    const file = counted(dir, 99);
    verified(dir, 'begin');
    expect(existsSync(file)).toBe(false);
  });

  it('keeps the number of tests a passing run passed, and none for a failing run', () => {
    const dir = repoWith([]);
    const file = join(dir, 'count');
    const test = (state: string) => ({ state });
    const modules = [
      {
        children: {
          *allTests(state: string) {
            for (const t of [test('passed'), test('passed'), test('skipped')]) if (t.state === state) yield t;
          },
        },
      },
    ];
    keepCount(file, modules, [], 'passed');
    expect(readFileSync(file, 'utf8')).toBe('2\n');
    keepCount(file, modules, [], 'failed');
    expect(existsSync(file)).toBe(false);
  });
});

/** Commits `name` on the current branch. */
function commit(dir: string, name: string) {
  writeFileSync(join(dir, name), 'x\n');
  git(dir, 'add', '.');
  git(dir, 'commit', '-qm', name);
}

/** What branch-status.sh says in `dir`. */
function branchStatus(dir: string) {
  return spawnSync('sh', [`${root}/.claude/hooks/branch-status.sh`], { cwd: dir, env, encoding: 'utf8' }).stdout.trim();
}

describe('branch-status', () => {
  it('says how far the branch is ahead of origin/main', () => {
    const dir = repoWith(['a.ts']);
    expect(branchStatus(dir)).toMatch(/: 0 behind, 1 ahead of origin\/main \(/);
    expect(branchStatus(dir)).not.toContain(';');
  });

  it('tells a branch that is behind and has work to merge main', () => {
    const dir = repoWith(['a.ts']);
    git(dir, 'checkout', '-q', '-b', 'other', 'origin/main');
    commit(dir, 'main-moves.ts');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(dir, 'checkout', '-q', '-');
    expect(branchStatus(dir)).toContain('1 behind, 1 ahead');
    expect(branchStatus(dir)).toContain('merge origin/main before starting');
  });

  it('tells a branch main already holds to restart from main', () => {
    const dir = repoWith([]);
    git(dir, 'checkout', '-q', '-b', 'old');
    commit(dir, 'merged.ts');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    commit(dir, 'later-on-main.ts');
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    git(dir, 'reset', '-q', '--hard', 'HEAD~1');
    expect(branchStatus(dir)).toContain('1 behind, 0 ahead');
    expect(branchStatus(dir)).toContain('git checkout -B old origin/main');
  });

  it('tells a checkout that the remote branch has moved', () => {
    const dir = repoWith(['a.ts']);
    const branch = git(dir, 'branch', '--show-current');
    const mine = git(dir, 'rev-parse', 'HEAD');
    commit(dir, 'pushed-elsewhere.ts');
    git(dir, 'update-ref', `refs/remotes/origin/${branch}`, 'HEAD');
    git(dir, 'reset', '-q', '--hard', mine);
    expect(branchStatus(dir)).toContain(`origin/${branch} has 1 commits this checkout lacks: git merge --ff-only`);
  });

  it('says so when HEAD is detached or origin/main is not fetched', () => {
    const dir = repoWith([]);
    git(dir, 'update-ref', '-d', 'refs/remotes/origin/main');
    expect(branchStatus(dir)).toContain('origin/main unknown');
    git(dir, 'checkout', '-q', '--detach');
    expect(branchStatus(dir)).toBe('branch: detached HEAD');
  });
});

describe('session-start', () => {
  /** Runs session-start.sh in a cloud session over `dir`, with an `npm` that runs `npm` (a shell command) instead. */
  function sessionStart(dir: string, npm: string) {
    const bin = join(dir, '.fake-bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'npm'), `#!/bin/sh\n${npm}\n`);
    chmodSync(join(bin, 'npm'), 0o755);
    return spawnSync('bash', [`${root}/.claude/hooks/session-start.sh`], {
      cwd: dir,
      env: { ...env, PATH: `${bin}:${env.PATH}`, CLAUDE_CODE_REMOTE: 'true', CLAUDE_PROJECT_DIR: dir },
      encoding: 'utf8',
    });
  }

  it('says a missing yggi/cells is the network or the proxy, since the package is public, and to retry npm ci', () => {
    const dir = repoWith(['a.ts']);
    const run = sessionStart(dir, 'echo "npm error network request to https://codeload.github.com/yggi/cells failed"; exit 1');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('node_modules/@yggi/cells is missing');
    expect(run.stdout).toContain('npm error network request');
    expect(run.stdout).toContain('yggi/cells is public');
    expect(run.stdout).toContain('the network or the proxy');
    expect(run.stdout).toContain('run `npm ci` again');
    expect(run.stdout).not.toMatch(/private|add_repo|attach/);
    expect(git(dir, 'config', 'core.hooksPath')).toBe('.githooks');
  });

  it('says nothing of it when the install brings the language, and ends with how the branch stands', () => {
    const dir = repoWith(['a.ts']);
    const run = sessionStart(dir, 'mkdir -p node_modules/@yggi/cells');
    expect(run.stdout).not.toContain('yggi/cells');
    expect(run.stdout.trim()).toMatch(/^branch \S+: 0 behind, 1 ahead of origin\/main/);
  });
});
