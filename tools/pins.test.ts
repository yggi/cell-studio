import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pinDrift, type Lock } from './pins';

/** A lockfile with one pin: its spec's tag and its entry's version. */
const lock = (spec: string, version?: string): Lock => ({
  packages: {
    '': { dependencies: { '@yggi/webmidi': spec, tone: '^15.1.22' } },
    'node_modules/@yggi/webmidi': version === undefined ? {} : { version },
    'node_modules/tone': { version: '15.1.22' },
  },
});

describe('a git-tag pin and its lockfile entry (#546)', () => {
  it('says so when the entry installs another version than the tag (#540: v0.1.3 pinned, v0.1.2 installed)', () => {
    expect(pinDrift(lock('github:yggi/webmidi#v0.1.3', '0.1.2'))).toEqual([{ name: '@yggi/webmidi', pinned: '0.1.3', locked: '0.1.2' }]);
    expect(pinDrift(lock('github:yggi/webmidi#v0.1.3'))).toEqual([{ name: '@yggi/webmidi', pinned: '0.1.3', locked: null }]);
  });

  it('passes one that agrees, and leaves other specs alone', () => {
    expect(pinDrift(lock('github:yggi/webmidi#v0.1.3', '0.1.3'))).toEqual([]);
    expect(pinDrift(lock('github:yggi/webmidi#main', '0.1.2'))).toEqual([]);
  });

  it("this repository's package-lock.json installs every pin at its tag (move one with npm install @yggi/<repo>@github:yggi/<repo>#vX.Y.Z)", () => {
    const real = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')) as Lock;
    expect(pinDrift(real)).toEqual([]);
  });
});
