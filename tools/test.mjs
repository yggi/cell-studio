// `npm test`: every quick test, and the slow ones (`*.slow.test.ts`, the vitest project `slow`) only when the change
// reaches them: a slow test file runs when it, or anything it imports, differs from origin/main (committed, staged,
// changed or new: vitest's `--changed`), or when a file it reads from disk moves (`forceRerunTriggers`, vite.config.ts).
// One vitest run: the slow files picked share the workers with the quick ones.
//
//   npm test                 # quick, and the slow tests the change reaches
//   npm test -- --all        # every test (as `npm run test:all`)
//   npm test -- <file|name>  # what you name, in whichever project it is
//
// Fail-safes: on CI (CI set), with no origin/main to compare with, or when vitest can't list what changed, every slow
// test runs; and it says which it runs and why. TEST_BASE=<ref> compares with another base (a stacked branch's parent). CI (`.github/workflows/ci.yml`) calls vitest itself:
// the quick project, and the slow one by hand.
import { execFileSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const all = args.includes('--all') && args.splice(args.indexOf('--all'), 1);
const vitest = (a, env = {}) => spawnSync('npx', ['vitest', ...a], { stdio: 'inherit', env: { ...process.env, ...env } }).status ?? 1;

// a file named (a word that isn't an option's value): run it, slow or not
const VALUED = new Set(['--bail', '--shard', '-t', '--testNamePattern', '--project', '--reporter', '--outputFile', '--maxWorkers', '--changed', '--retry']);
if (args.some((a, i) => !a.startsWith('-') && !VALUED.has(args[i - 1]))) process.exit(vitest(['run', ...args]));

const ref = process.env.TEST_BASE ?? 'origin/main';
const base = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--verify', '-q', ref], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
})();
const why = all ? '--all' : process.env.CI ? 'on CI' : !base ? `no ${ref} to compare with` : null;
if (why) {
  console.log(`test: every test, the slow ones too (${why})`);
  process.exit(vitest(['run', ...args]));
}

let slow;
try {
  const out = execFileSync('npx', ['vitest', 'list', '--project', 'slow', '--changed', base, '--filesOnly', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  slow = [...new Set(JSON.parse(out.slice(out.indexOf('['))).map((t) => t.file))];
} catch (e) {
  console.log(`test: every test, the slow ones too (vitest could not list what changed: ${String(e.message).split('\n')[0]})`);
  process.exit(vitest(['run', ...args]));
}
const rel = (f) => f.replace(`${process.cwd()}/`, '');
if (!slow.length) {
  console.log(`test: the quick tests; no slow test is reached by the change from ${ref} (${base.slice(0, 7)}): \`npm run test:all\` runs them`);
  process.exit(vitest(['run', '--project', 'quick', ...args]));
}
console.log(`test: the quick tests, and the slow tests the change from ${ref} (${base.slice(0, 7)}) reaches: ${slow.map(rel).join(', ')}`);
// (vite.config.ts narrows the slow project to these: one run, the workers shared)
process.exit(vitest(['run', ...args], { SLOW_TESTS: JSON.stringify(slow.map(rel)) }));
