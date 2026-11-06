// CI's witness for the deploy on a merge into main (deploy.yml): whether the checks CI passed on the pull request's head
// stand for the deploy's own (tools/deploy.mjs: check, lint, format:check, knip, test:all), so a merge doesn't wait on the
// same tests a third time. They do only when every condition holds, and the deploy runs everything otherwise:
// - the run is a push to main, not a deploy by hand;
// - a pull request was merged as the commit deployed (its `merge_commit_sha` is HEAD);
// - its head has HEAD's tree, so the head already held everything main had;
// - the latest run of each of CI's jobs that make up the gate (`check` and `slow`: verify's checks, the quick and the
//   slow tests) on that head completed with `success`, read as yggi/cells' review skill reads them;
// - the pull request changes more than `*.md` files, since CI runs the docs-only check alone for those.
// Anything unreadable (the API, the fetch) means run everything: the fail-safe is the full gate.
//
//   node tools/witness.mjs
//
// It reads GITHUB_EVENT_NAME and GITHUB_REPOSITORY, asks GitHub through `gh api` (GH_TOKEN), and prints its decision and
// why. On "skip" it writes `head=<sha>` and `run=<url>` to GITHUB_OUTPUT, for `node tools/deploy.mjs --tests-passed-on`,
// which asks `testsPlan` here. It always exits 0.
// Lifted from yggi/jambot tooling/witness.ts @ 399d66a.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** CI's jobs whose success on the head stands for the deploy's checks. */
export const GATE_JOBS = ['check', 'slow'];

const run = (reason) => ({ skip: false, reason });
const short = (sha) => String(sha).slice(0, 7);

/**
 * Decides, asking GitHub and git through `shell(command, args)` (its output trimmed; it throws when the command fails),
 * whether the deploy of `sha` (HEAD) in `repo` (`owner/name`) may skip the checks CI's `jobs` passed on its pull
 * request's head: `{ skip: true, head, run, tree, reason }` or `{ skip: false, reason }`.
 */
export function witness(event, repo, sha, shell, jobs = GATE_JOBS) {
  if (event !== 'push') return run(`a deploy by ${event || 'hand'}, not a merge's push`);
  const ask = (what, args) => {
    try {
      return { value: JSON.parse(shell('gh', ['api', ...args])) };
    } catch (error) {
      return { failed: `could not read ${what} (${String(error?.message ?? error).split('\n')[0]})` };
    }
  };

  const pulls = ask('the pull requests of HEAD', [`repos/${repo}/commits/${sha}/pulls`]);
  if (pulls.failed) return run(pulls.failed);
  const pull = Array.isArray(pulls.value) ? pulls.value.find((p) => p.merged_at && p.merge_commit_sha === sha) : undefined;
  if (!pull) return run(`no pull request was merged as ${short(sha)}`);
  const head = pull.head.sha;

  let tree, headTree;
  try {
    tree = shell('git', ['rev-parse', 'HEAD^{tree}']);
    // (the deploy's checkout is shallow: the head alone; by its sha, or, where GitHub won't serve that, by its ref)
    try {
      shell('git', ['fetch', '--quiet', '--no-tags', '--depth=1', 'origin', head]);
    } catch {
      shell('git', ['fetch', '--quiet', '--no-tags', '--depth=1', 'origin', `pull/${pull.number}/head`]);
    }
    headTree = shell('git', ['rev-parse', `${head}^{tree}`]);
  } catch {
    return run(`could not fetch #${pull.number}'s head ${short(head)}`);
  }
  if (headTree !== tree) return run(`#${pull.number}'s head ${short(head)} has tree ${short(headTree)}, HEAD ${short(tree)}`);

  const checks = ask(`the check runs of ${short(head)}`, [`repos/${repo}/commits/${head}/check-runs?per_page=100`]);
  if (checks.failed) return run(checks.failed);
  const runs = Array.isArray(checks.value?.check_runs) ? checks.value.check_runs : [];
  const last = (name) => runs.filter((r) => r.name === name).sort((a, b) => b.id - a.id)[0];
  for (const job of jobs) {
    const latest = last(job);
    if (!latest) return run(`CI ran no \`${job}\` on ${short(head)}`);
    if (latest.status !== 'completed' || latest.conclusion !== 'success')
      return run(`CI's \`${job}\` on ${short(head)} is ${latest.status === 'completed' ? latest.conclusion : latest.status}`);
  }

  let files;
  try {
    files = shell('gh', ['api', '--paginate', `repos/${repo}/pulls/${pull.number}/files?per_page=100`, '--jq', '.[].filename'])
      .split('\n')
      .filter(Boolean);
  } catch {
    return run(`could not read #${pull.number}'s changed files`);
  }
  if (files.length === 0 || files.every((file) => file.endsWith('.md'))) return run(`#${pull.number} changes \`*.md\` files alone, so CI ran its docs-only check`);

  const witnessed = last(jobs[0]);
  return {
    skip: true,
    head,
    run: witnessed.html_url,
    tree,
    reason: `CI passed ${jobs.map((job) => `\`${job}\``).join(' and ')} on #${pull.number}'s head ${short(head)} (run ${witnessed.html_url}), same tree ${short(tree)}`,
  };
}

/**
 * Whether tools/deploy.mjs skips its checks because CI passed them on `passedOn`, a pull request's head (`witness`
 * decides that): `{ skip, message }`. Only on Actions (`actions`), and only when `passedOn` has HEAD's `tree` (`treeOf(sha)`
 * gives a commit's tree, or undefined when it isn't known); otherwise they run. A clone always runs them: there the flag
 * is refused (it throws).
 */
export function testsPlan(passedOn, { actions, tree, treeOf, run: url }) {
  if (passedOn === undefined) return { skip: false, message: 'tests: running every check (no --tests-passed-on)' };
  if (!actions) throw new Error('--tests-passed-on is for the deploy on Actions; from a clone the deploy runs every check');
  const witnessed = treeOf(passedOn);
  if (witnessed !== tree)
    return { skip: false, message: `tests: running every check, since ${short(passedOn)} has ${witnessed ? `tree ${short(witnessed)}` : 'no tree here'} and HEAD ${short(tree)}` };
  return { skip: true, message: `tests: skipped, CI passed them on ${short(passedOn)} (run ${url || 'unnamed'}), same tree ${short(tree)}` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let decision;
  try {
    const shell = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    decision = witness(process.env.GITHUB_EVENT_NAME ?? '', process.env.GITHUB_REPOSITORY ?? 'yggi/cell-studio', shell('git', ['rev-parse', 'HEAD']), shell);
  } catch (error) {
    decision = run(`the witness failed (${error?.message ?? error})`);
  }
  if (decision.skip) {
    console.log(`witness: the deploy skips its checks: ${decision.reason}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `head=${decision.head}\nrun=${decision.run}\n`);
  } else console.log(`witness: the deploy runs its checks: ${decision.reason}`);
}
