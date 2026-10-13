// The browser tools (smoke, repeatable, golden, shots) test dist/, not the source: a build older than the source it was
// made from tests code that isn't there any more (an edit since, a branch switched) and passes or fails for it. This
// stops them, naming the newest source file, unless STALE_BUILD=1 says the build is meant to be what it is.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// what the build is made from (tests don't go into it)
const INPUTS = ['src', 'public', 'examples', 'index.html', 'vite.config.ts', 'package-lock.json', 'tools/examples-index.ts'];

const files = (path) => (!existsSync(path) ? [] : statSync(path).isDirectory() ? readdirSync(path).flatMap((f) => files(join(path, f))) : /\.test\.ts$/.test(path) ? [] : [path]);

/** Exit (1) unless dist/ was built after every file it is built from changed. */
export function freshBuild(dist = 'dist') {
  if (process.env.STALE_BUILD) return;
  const built = existsSync(`${dist}/index.html`) ? statSync(`${dist}/index.html`).mtimeMs : null;
  if (built === null) {
    console.error(`no build in ${dist}/: npm run build first`);
    process.exit(1);
  }
  const newest = INPUTS.flatMap(files).reduce(
    (a, f) => {
      const t = statSync(f).mtimeMs;
      return t > a.t ? { f, t } : a;
    },
    { f: '', t: 0 },
  );
  if (newest.t > built) {
    console.error(`${dist}/ is older than ${newest.f}: npm run build first (or STALE_BUILD=1 to test the build as it is)`);
    process.exit(1);
  }
}
