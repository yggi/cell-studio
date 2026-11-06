// tools/corpus.mjs, the corpus yardstick, run on one example (#462: it loaded src/engine/, gone since the extraction,
// and read examples/*.cells, which are piece files now; nothing ran it, so it rotted unseen).
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'cell-studio-corpus-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const run = (...args: string[]) => spawnSync('node', ['tools/corpus.mjs', '--only', 'acid', ...args], { cwd: root, encoding: 'utf8' });

describe('the corpus yardstick (#462)', () => {
  it('measures an example from its piece file, through cells, its uses read from the seed library', () => {
    const r = run();
    expect(r.status).toBe(0);
    const acid = (JSON.parse(r.stdout) as Record<string, { events: number; diagnostics: number; notes: string }>).acid!;
    expect(acid.diagnostics).toBe(0);
    expect(acid.events).toBeGreaterThan(100);
    expect(r.stderr).toContain('1 pieces');
  });

  it('checks against its own record: the same passes; notes that moved fail, unless expected', () => {
    const record = run().stdout;
    const file = join(dir, 'corpus.json');
    writeFileSync(file, record);
    expect(run('--check', file).status).toBe(0);
    const moved = JSON.parse(record) as Record<string, { notes: string }>;
    moved.acid!.notes = '0000000000000000';
    writeFileSync(file, JSON.stringify(moved));
    const changed = run('--check', file);
    expect(changed.status).toBe(1);
    expect(changed.stdout).toContain('NOTES CHANGED');
    expect(run('--check', file, '--expect', 'acid').status).toBe(0);
  });
});
