// tools/witness.mjs, CI's witness for the deploy: "skip" only when every condition holds, "run" when any one fails.
import { describe, expect, it } from 'vitest';
// @ts-expect-error a plain script (tools/witness.mjs), exports for the test
import { testsPlan, witness } from './witness.mjs';

type Shell = (command: string, args: string[]) => string;

const SHA = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const TREE = 'c'.repeat(40);
const OTHER = 'd'.repeat(40);
const RUN = 'https://github.com/yggi/cell-studio/actions/runs/1/job/12';

const pull = (over: object = {}) => ({
  number: 7,
  merged_at: '2026-11-05T10:00:00Z',
  merge_commit_sha: SHA,
  head: { sha: HEAD },
  ...over,
});
const checkRun = (over: object = {}) => ({
  id: 12,
  name: 'check',
  status: 'completed',
  conclusion: 'success',
  html_url: RUN,
  ...over,
});

/** A world in which every condition holds; each test breaks one. */
interface World {
  pulls: unknown;
  headTree: string;
  checkRuns: unknown;
  files: string[];
  fail: string[];
}
const world = (over: Partial<World> = {}): World => ({
  pulls: [pull()],
  headTree: TREE,
  checkRuns: { total_count: 3, check_runs: [checkRun(), checkRun({ id: 13, name: 'slow' }), checkRun({ id: 14, name: 'smoke', conclusion: 'failure' })] },
  files: ['src/layout/library.ts', 'docs/testing.md'],
  fail: [],
  ...over,
});

/** The commands the witness runs, answered from `w`; a command named in `w.fail` fails, as gh and git do. */
function shellOf(w: World): Shell {
  return (command, args) => {
    const line = `${command} ${args.join(' ')}`;
    if (w.fail.some((part) => line.includes(part))) throw new Error(`${line} failed\nmore`);
    if (line === 'git rev-parse HEAD^{tree}') return TREE;
    if (line === `git rev-parse ${HEAD}^{tree}`) return w.headTree;
    if (line.startsWith('git fetch')) return '';
    if (line === `gh api repos/yggi/cell-studio/commits/${SHA}/pulls`) return JSON.stringify(w.pulls);
    if (line === `gh api repos/yggi/cell-studio/commits/${HEAD}/check-runs?per_page=100`) return JSON.stringify(w.checkRuns);
    if (line.startsWith('gh api --paginate repos/yggi/cell-studio/pulls/7/files')) return w.files.join('\n');
    throw new Error(`unexpected: ${line}`);
  };
}

const decide = (over: Partial<World> = {}, event = 'push') => witness(event, 'yggi/cell-studio', SHA, shellOf(world(over)));

describe('witness: the deploy skips its tests', () => {
  it('when a merge of code has the tree of a head whose check CI passed', () => {
    expect(decide()).toEqual({
      skip: true,
      head: HEAD,
      run: RUN,
      tree: TREE,
      reason: `CI passed \`check\` and \`slow\` on #7's head bbbbbbb (run ${RUN}), same tree ccccccc`,
    });
  });

  it("when the head's sha can't be fetched but the pull request's ref can", () => {
    expect(decide({ fail: [`fetch --quiet --no-tags --depth=1 origin ${HEAD}`] }).skip).toBe(true);
  });

  it('when the latest check passed after an earlier one failed', () => {
    const runs = [checkRun({ id: 9, conclusion: 'failure' }), checkRun({ id: 12 }), checkRun({ id: 13, name: 'slow' })];
    expect(decide({ checkRuns: { check_runs: runs } }).skip).toBe(true);
  });
});

describe('witness: the deploy runs its tests', () => {
  const runs = (over: Partial<World>, reason: RegExp, event = 'push') => {
    const decision = decide(over, event);
    expect(decision.skip).toBe(false);
    expect(decision.reason).toMatch(reason);
  };

  it('on a deploy by hand', () => runs({}, /by workflow_dispatch/, 'workflow_dispatch'));
  it('with no event at all', () => runs({}, /by hand/, ''));
  it('when the pull requests are unreadable', () => runs({ fail: ['/pulls'] }, /could not read the pull requests/));
  it('when GitHub answers with something other than JSON', () => runs({ pulls: undefined }, /could not read the pull requests/));
  it('when no pull request holds the commit', () => runs({ pulls: [] }, /no pull request/));
  it('when the pull request is open, not merged', () => runs({ pulls: [pull({ merged_at: null })] }, /no pull request was merged/));
  it('when the pull request was merged as another commit', () => runs({ pulls: [pull({ merge_commit_sha: OTHER })] }, /no pull request was merged/));
  it("when the head can't be fetched", () => runs({ fail: ['git fetch'] }, /could not fetch/));
  it('when the head has another tree', () => runs({ headTree: OTHER }, /has tree ddddddd, HEAD ccccccc/));
  it('when the check runs are unreadable', () => runs({ fail: ['check-runs'] }, /could not read the check runs/));
  it('when CI ran no check', () => runs({ checkRuns: { check_runs: [checkRun({ name: 'e2e' })] } }, /ran no `check`/));
  it('when the check runs hold none at all', () => runs({ checkRuns: {} }, /ran no `check`/));
  it('when the check is still running', () => runs({ checkRuns: { check_runs: [checkRun({ status: 'in_progress', conclusion: null })] } }, /is in_progress/));
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out', 'neutral'])
    it(`when the check's conclusion is ${conclusion}`, () => runs({ checkRuns: { check_runs: [checkRun({ conclusion })] } }, new RegExp(`is ${conclusion}`)));
  it('when the latest check failed after an earlier one passed', () =>
    runs(
      {
        checkRuns: {
          check_runs: [checkRun({ id: 20, conclusion: 'failure' }), checkRun({ id: 12 })],
        },
      },
      /is failure/,
    ));
  it('when CI ran no slow', () => runs({ checkRuns: { check_runs: [checkRun()] } }, /ran no `slow`/));
  it('when the slow job failed and the check passed', () =>
    runs({ checkRuns: { check_runs: [checkRun(), checkRun({ id: 13, name: 'slow', conclusion: 'failure' })] } }, /`slow` on bbbbbbb is failure/));
  it("when the pull request's files are unreadable", () => runs({ fail: ['/files'] }, /could not read #7's changed files/));
  it('when the pull request changes markdown alone', () => runs({ files: ['README.md', 'docs/ROADMAP.md'] }, /`\*\.md` files alone/));
  it('when the pull request lists no files', () => runs({ files: [] }, /`\*\.md` files alone/));
});

describe('deploy.mjs --tests-passed-on: what it does about the tests', () => {
  const trees: Record<string, string> = { [HEAD]: TREE, [OTHER]: OTHER };
  const options = { actions: true, tree: TREE, treeOf: (sha: string) => trees[sha], run: RUN };

  it('skips them on Actions when the head has HEAD tree, and says whose run stands for them', () => {
    expect(testsPlan(HEAD, options)).toEqual({
      skip: true,
      message: `tests: skipped, CI passed them on bbbbbbb (run ${RUN}), same tree ccccccc`,
    });
  });

  it('runs them without the flag, on Actions or not', () => {
    expect(testsPlan(undefined, options).skip).toBe(false);
    expect(testsPlan(undefined, { ...options, actions: false }).message).toMatch(/running every check/);
  });

  it('runs them when the head has another tree, or none here', () => {
    expect(testsPlan(OTHER, options)).toMatchObject({
      skip: false,
      message: /has tree ddddddd and HEAD ccccccc/,
    });
    expect(testsPlan(SHA, options)).toMatchObject({ skip: false, message: /has no tree here/ });
  });

  it('refuses the flag outside Actions, so a clone runs every test', () => {
    expect(() => testsPlan(HEAD, { ...options, actions: false })).toThrow(/from a clone the deploy runs every check/);
  });
});
