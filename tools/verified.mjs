// The stamp of a tree that passed `npm run verify`, in the git directory (`cell-studio-verified`, a line
// `<tree> <tests passed>`), read by the pre-push hook (.githooks/pre-push): a push of a stamped tree is let through
// without running verify again, and says how many tests passed.
//
//   begin       (npm's `preverify`) records the tree verify is about to check: the checkout's files as they stand,
//               tracked or not, but not ignored, written as a git tree through a scratch index (the real index is
//               left alone). A commit of exactly those files has that tree, and a commit that leaves one out doesn't.
//   end [n]     (npm's `postverify`, which npm runs only when verify passed) stamps that tree, unless a file changed
//               while verify ran, with `n` tests passed, or the count `npm test`'s reporter kept
//               (tools/test-count.mjs), used once.
//   tree        prints the tree `begin` would record.
//
// Outside a git checkout, or at `end` with nothing begun, it does nothing: verify's result never depends on it.
//
// Lifted from yggi/cells tools/verified.sh @ 0641f5e0f0bd36110e654a82f48627ad8a4dc664 (adapted: Node, the count of
// tests in the stamp).
import { execFileSync } from 'node:child_process';
import { appendFileSync, copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { countFile } from './test-count.mjs';

const git = (args, env = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, ...env } }).trim();

/** The tree of every file in the checkout that git doesn't ignore, tracked or not, as it stands on disk. */
function workingTree() {
  const scratch = mkdtempSync(join(tmpdir(), 'cell-studio-index-'));
  const index = join(scratch, 'index');
  try {
    // A copy of the index keeps its file stats, so only what changed is hashed again.
    try {
      copyFileSync(git(['rev-parse', '--path-format=absolute', '--git-path', 'index']), index);
    } catch {}
    git(['add', '-A', '.'], { GIT_INDEX_FILE: index });
    return git(['write-tree'], { GIT_INDEX_FILE: index });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

let gitdir;
try {
  process.chdir(git(['rev-parse', '--show-toplevel']));
  gitdir = git(['rev-parse', '--absolute-git-dir']);
} catch {
  process.exit(0);
}
const pending = join(gitdir, 'cell-studio-verifying');
const stamps = join(gitdir, 'cell-studio-verified');
const [what, given] = process.argv.slice(2);

if (what === 'tree') {
  console.log(workingTree());
} else if (what === 'begin') {
  // (a count left by an earlier `npm test` is not this run's)
  rmSync(countFile(), { force: true });
  try {
    writeFileSync(pending, `${workingTree()}\n`);
  } catch {
    rmSync(pending, { force: true });
  }
} else if (what === 'end') {
  let began = '';
  try {
    began = readFileSync(pending, 'utf8').trim();
  } catch {}
  rmSync(pending, { force: true });
  const counted = countFile();
  let count = given || '?';
  try {
    if (!given) count = readFileSync(counted, 'utf8').trim() || '?';
  } catch {}
  rmSync(counted, { force: true });
  if (!began) process.exit(0);
  if (workingTree() !== began) {
    console.log(`verify passed (${count} tests), but a file changed while it ran: not stamped, so the pre-push hook will run verify again`);
    process.exit(0);
  }
  let known = '';
  try {
    known = readFileSync(stamps, 'utf8');
  } catch {}
  if (!known.split('\n').some((line) => line.startsWith(`${began} `))) appendFileSync(stamps, `${began} ${count}\n`);
  let head = '';
  try {
    head = git(['rev-parse', 'HEAD^{tree}']);
  } catch {}
  const commit = head === began ? '' : '; commit exactly these files, untracked ones too, for the push to find it';
  console.log(
    `verify passed on tree ${began.slice(0, 7)} (the files as they stand, untracked ones too): ${count} tests passed (stamped: the pre-push hook won't run verify on this tree again${commit})`,
  );
} else {
  console.error('usage: node tools/verified.mjs begin|end [tests passed]|tree');
  process.exit(2);
}
