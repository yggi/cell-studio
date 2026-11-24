// Lifted from yggi/cells src/engine/snapshot.test.ts @ e7d8793 (v0.29.0), its live half: the view lives in Cell studio
// (cells decision 086, #650). Hashed with FNV-1a, not node:crypto, so it stays pure TypeScript as layout/ is.
/**
 * The live view of every example at a few moments (`liveAt`: which wires carry sound, what is dimmed, the state the
 * graph draws), hashed, one line per piece in `live.snapshot.txt` (cells #325). A change to it is a change to what the
 * graph draws while a piece plays, not to what it plays: when it is meant, refresh with
 * `npx vitest run src/layout/live.snapshot.test.ts -u` and say in the PR which pieces changed and why.
 */
import { describe, expect, it } from 'vitest';
import { codeShifts, compileSource, EXAMPLES, resolveSeed } from '@yggi/cells';
import { liveAt } from './live';

/** Plain data for hashing: maps and sets in a fixed order, numbers to 9 significant digits. */
function plain(x: unknown): unknown {
  if (typeof x === 'number') return Number.isFinite(x) ? +x.toPrecision(9) : String(x);
  if (x instanceof Map) return [...x.entries()].map(([k, v]) => [String(k), plain(v)]).sort((a, b) => (a[0]! < b[0]! ? -1 : 1));
  if (x instanceof Set) return [...x].map(String).sort();
  if (Array.isArray(x)) return x.map(plain);
  if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, plain(v)]));
  return x;
}

/** FNV-1a over the text, two 32-bit lanes: 16 hex digits. */
function hash(x: unknown): string {
  const text = JSON.stringify(plain(x));
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c ^ (a >>> 7), 0x01000193) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

const LIVE_TIMES = [2.1, 13.3, 37.9];

describe('every example shows the live view it showed (live.snapshot.txt)', () => {
  it('the live view at three moments, hashed per piece', async () => {
    const lines = Object.entries(EXAMPLES).map(([key, { source }]) => {
      const result = compileSource(source, undefined, { resolve: resolveSeed });
      const shifts = codeShifts(result);
      return `${key}  live ${hash(LIVE_TIMES.map((t) => liveAt(result, shifts, new Set(), t)))}`;
    });
    await expect(lines.join('\n') + '\n').toMatchFileSnapshot('./live.snapshot.txt');
  });

  it('is shown firing: a live view a moment later hashes otherwise', () => {
    const result = compileSource(EXAMPLES.funk.source, undefined, { resolve: resolveSeed });
    const shifts = codeShifts(result);
    expect(hash(liveAt(result, shifts, new Set(), 2.1))).not.toBe(hash(liveAt(result, shifts, new Set(), 2.35)));
  });
});
