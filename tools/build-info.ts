// What a build knows about itself (src/buildInfo.ts), read at build time for vite.config.ts: the commit and the branch
// (CI's variables, else git), the date, and the versions of the dependencies it ships. Everything it reads from outside
// is an argument, so the test runs it over a made-up checkout.
// yggi/jambot has the same file (apps/web/build-info.ts), lifted: the two apps keep one shape.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BuildInfo } from '../src/buildInfo';

interface Manifest {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
}

export interface Sources {
  /** The app's directory, where package.json and node_modules are. */
  dir: string;
  /** CI's variables (`GITHUB_SHA`, `GITHUB_HEAD_REF`, `GITHUB_REF_NAME`). */
  env: Record<string, string | undefined>;
  /** `git <args>`'s output, or '' where there is no git or no repository. */
  git: (args: string[]) => string;
  now: Date;
}

const readManifest = (path: string): Manifest | undefined => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as Manifest) : undefined);

/** The version a dependency runs: its tag when it is taken from git (`github:yggi/cells#v0.2.0`), else the installed one, else what package.json asks for. */
function versionOf(dir: string, name: string, wanted: string): string {
  const tag = /#(.+)$/.exec(wanted)?.[1];
  if (tag !== undefined) return tag;
  return readManifest(join(dir, 'node_modules', name, 'package.json'))?.version ?? wanted;
}

/** The build's facts. `names` are the dependencies to list: those of package.json's `dependencies` that it names, all of them when it is undefined; one that isn't a dependency (yet) is left out, so naming a future one costs nothing. */
export function buildInfo({ dir, env, git, now }: Sources, names?: string[]): BuildInfo {
  const manifest = readManifest(join(dir, 'package.json')) ?? {};
  const declared = manifest.dependencies ?? {};
  const commit = env.GITHUB_SHA ?? git(['rev-parse', 'HEAD']);
  // a pull request's build runs on a merge ref: GITHUB_HEAD_REF is its branch
  const ci = env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME;
  const branch = ci || git(['rev-parse', '--abbrev-ref', 'HEAD']);
  return {
    name: manifest.name ?? '',
    version: manifest.version ?? '',
    commit,
    // a detached head (git says `HEAD`) is no branch
    branch: branch === 'HEAD' ? '' : branch,
    builtAt: now.toISOString(),
    dependencies: (names ?? Object.keys(declared))
      .filter((name) => name in declared)
      .sort()
      .map((name) => ({ name, version: versionOf(dir, name, declared[name]!) })),
  };
}
