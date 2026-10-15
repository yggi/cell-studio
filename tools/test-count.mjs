// A vitest reporter that `npm test` (tools/test.mjs) adds beside the default one: when a run passes, it writes the
// number of tests that passed to the git directory (`cell-studio-tests-passed`), where `postverify`
// (tools/verified.mjs) reads it into the stamp of the tree that passed; a run that fails removes it. Outside a git
// checkout it does nothing.
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The file the count is kept in, or null outside a git checkout. */
export function countFile(cwd = process.cwd()) {
  try {
    const gitdir = execFileSync('git', ['rev-parse', '--absolute-git-dir'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return join(gitdir, 'cell-studio-tests-passed');
  } catch {
    return null;
  }
}

/** Keeps the count of a run that ended for `reason` in `file`, or removes it when the run failed. */
export function keepCount(file, modules, errors, reason) {
  if (reason !== 'passed' || errors.length) return rmSync(file, { force: true });
  let passed = 0;
  for (const module of modules) for (const _ of module.children.allTests('passed')) passed++;
  writeFileSync(file, `${passed}\n`);
}

export default class TestCount {
  onTestRunEnd(modules, errors, reason) {
    const file = countFile();
    if (file) keepCount(file, modules, errors, reason);
  }
}
