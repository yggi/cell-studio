import { describe, expect, it } from 'vitest';
import { cpSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cachedExamplesIndexModule, EXAMPLES_DIR, indexKey } from './examples-index';

describe('the examples index, kept', () => {
  it('is keyed by what it is made from: the same examples, the same key; one changed, another', () => {
    const dir = mkdtempSync(join(tmpdir(), 'examples-'));
    cpSync(EXAMPLES_DIR, dir, { recursive: true });
    expect(indexKey(dir)).toBe(indexKey(EXAMPLES_DIR));
    const [first] = readdirSync(dir).filter((f) => f.endsWith('.md'));
    writeFileSync(join(dir, first!), '# changed\n');
    expect(indexKey(dir)).not.toBe(indexKey(EXAMPLES_DIR));
  });

  it('is made once for a key, then read back', () => {
    const cache = mkdtempSync(join(tmpdir(), 'cache-'));
    let made = 0;
    const make = () => `export default ${++made};`;
    expect(cachedExamplesIndexModule({ cache, make })).toBe('export default 1;');
    expect(cachedExamplesIndexModule({ cache, make })).toBe('export default 1;');
    expect(made).toBe(1);
  });
});
