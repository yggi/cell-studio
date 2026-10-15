// `postverify`: npm runs it when `npm run verify` has passed. It stamps the tree that passed in the git directory
// (`cell-studio-verified`, a line `<tree> <tests passed>`), so the pre-push hook (.githooks/pre-push) lets a push of
// that tree through without running verify again, and says how many tests passed. Nothing is stamped while a tracked
// file has uncommitted changes: what passed is then not a tree git knows. The count comes from `npm test`'s reporter
// (tools/test-count.mjs), and is used once.
import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { countFile } from './test-count.mjs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

let gitdir;
try {
  gitdir = git('rev-parse', '--absolute-git-dir');
} catch {
  process.exit(0);
}
const file = countFile();
let count = '?';
try {
  count = readFileSync(file, 'utf8').trim() || '?';
} catch {}
rmSync(file, { force: true });
if (git('status', '--porcelain', '--untracked-files=no')) {
  console.log(`verify passed (${count} tests), on a tree with uncommitted changes: not stamped, so the pre-push hook will run verify again`);
} else {
  appendFileSync(join(gitdir, 'cell-studio-verified'), `${git('rev-parse', 'HEAD^{tree}')} ${count}\n`);
  console.log(`verify passed on ${git('rev-parse', '--short', 'HEAD')}: ${count} tests passed (stamped: the pre-push hook won't run verify on this tree again)`);
}
