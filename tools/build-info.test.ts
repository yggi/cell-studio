import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildInfo, type Sources } from './build-info';

const sha = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';

/** A checkout with a package.json and some installed packages. */
function checkout(dependencies: Record<string, string>, installed: Record<string, string> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'build-info-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'app', version: '0.9.0', dependencies }));
  for (const [name, version] of Object.entries(installed)) {
    mkdirSync(join(dir, 'node_modules', name), { recursive: true });
    writeFileSync(join(dir, 'node_modules', name, 'package.json'), JSON.stringify({ name, version }));
  }
  return dir;
}

const sources = (dir: string, over: Partial<Sources> = {}): Sources => ({
  dir,
  env: {},
  git: (args) => (args[0] === 'rev-parse' && args[1] === 'HEAD' ? sha : args[1] === '--abbrev-ref' ? 'main' : ''),
  now: new Date('2026-10-17T14:03:59Z'),
  ...over,
});

describe('buildInfo', () => {
  it('reads the commit and the branch from git when CI says nothing', () => {
    const info = buildInfo(sources(checkout({})));
    expect(info).toMatchObject({ name: 'app', version: '0.9.0', commit: sha, branch: 'main', builtAt: '2026-10-17T14:03:59.000Z' });
  });

  it("prefers CI's: a pull request's own branch over its merge ref", () => {
    const env = { GITHUB_SHA: 'f'.repeat(40), GITHUB_HEAD_REF: 'ccr-feature', GITHUB_REF_NAME: '12/merge' };
    expect(buildInfo(sources(checkout({}), { env }))).toMatchObject({ commit: 'f'.repeat(40), branch: 'ccr-feature' });
  });

  it('leaves the commit and the branch empty where there is no git, and a detached head is no branch', () => {
    const none = buildInfo(sources(checkout({}), { git: () => '' }));
    expect([none.commit, none.branch]).toEqual(['', '']);
    const detached = buildInfo(sources(checkout({}), { git: (args) => (args[1] === '--abbrev-ref' ? 'HEAD' : sha) }));
    expect(detached.branch).toBe('');
  });

  it('lists a git dependency by its tag, an installed one by its installed version, an uninstalled one by what is asked', () => {
    const dir = checkout({ '@yggi/cells': 'github:yggi/cells#v0.2.0', tone: '^15.1.22', 'd3-force': '^3.0.0' }, { tone: '15.1.22' });
    expect(buildInfo(sources(dir)).dependencies).toEqual([
      { name: '@yggi/cells', version: 'v0.2.0' },
      { name: 'd3-force', version: '^3.0.0' },
      { name: 'tone', version: '15.1.22' },
    ]);
  });

  it('lists only the dependencies it is told to, and leaves out one that is not (yet) a dependency', () => {
    const dir = checkout({ tone: '^15.1.22', 'd3-force': '^3.0.0' }, { tone: '15.1.22' });
    expect(buildInfo(sources(dir), ['tone', 'webmidi']).dependencies).toEqual([{ name: 'tone', version: '15.1.22' }]);
    const withMidi = checkout({ tone: '^15.1.22', webmidi: '^3.1.12' }, { webmidi: '3.1.12' });
    expect(buildInfo(sources(withMidi), ['tone', 'webmidi']).dependencies.map((d) => d.name)).toEqual(['tone', 'webmidi']);
  });
});
