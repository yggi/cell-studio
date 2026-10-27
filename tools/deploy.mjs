// Deploy `main`, gated (#361): nothing else stops a tree whose checks fail from going live. deploy.yml runs it on each merge
// into main (#481); from a clone it is the fallback when Actions is blocked.
// Refuses unless the working tree is clean and HEAD is origin/main's head; then runs every check CI runs (all the
// tests, slow ones too: `test:all`), builds afresh, and only then publishes dist/ with .github/scripts/pages.sh.
//
//   node tools/deploy.mjs             # check, build, publish
//   node tools/deploy.mjs --dry-run   # check and build only
//
// PAGES_REMOTE: where to push (default: origin's URL), as pages.sh takes it.
import { execFileSync, spawnSync } from 'node:child_process';

const dry = process.argv.includes('--dry-run');
// (joined: knip would read the path written whole as an import)
const PAGES = ['.github', 'scripts', 'pages.sh'].join('/');
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const stop = (why) => {
  console.error(`deploy: ${why}; nothing published`);
  process.exit(1);
};

if (git('status', '--porcelain')) stop('the working tree has changes (commit or stash them: what is built must be what is on main)');
git('fetch', '-q', 'origin', 'main');
const [head, main] = [git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main')];
if (head !== main) stop(`HEAD (${head.slice(0, 7)}) is not origin/main (${main.slice(0, 7)})`);

for (const script of ['check', 'lint', 'format:check', 'knip', 'test:all', 'build']) {
  console.log(`\ndeploy: npm run ${script}`);
  if (spawnSync('npm', ['run', script], { stdio: 'inherit' }).status !== 0) stop(`npm run ${script} failed`);
}
if (dry) {
  console.log(`\ndeploy: ${head.slice(0, 7)} passed every check and built (--dry-run: not published)`);
  process.exit(0);
}
const env = { ...process.env, PAGES_REMOTE: process.env.PAGES_REMOTE ?? git('remote', 'get-url', 'origin'), MESSAGE: `Deploy ${head}` };
if (spawnSync('bash', [PAGES, 'main', 'dist'], { stdio: 'inherit', env }).status !== 0) stop('pages.sh failed');
console.log(`\ndeploy: ${head.slice(0, 7)} published`);
