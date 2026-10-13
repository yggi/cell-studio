// The tower-layout probe (tools/probe/tower-layout.test.ts) on every core: the pieces in shards, one vitest each,
// side by side, then their layouts merged into one report — the same numbers as one run, in about a quarter of the time.
// Run: node tools/probe/parallel.mjs out.txt   (VARIANTS=, SEEDS=, ONLY=, TICKS=, COMPARE= as for the probe; JOBS=n)
import { spawn } from 'node:child_process';
import { availableParallelism, tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const out = process.argv[2];
if (!out) throw new Error('usage: node tools/probe/parallel.mjs out.txt');
const jobs = Number(process.env.JOBS ?? availableParallelism());
const dir = mkdtempSync(join(tmpdir(), 'probe-'));
const run = (env) =>
  new Promise((done, fail) => {
    const p = spawn('npx', ['vitest', 'run', 'tools/probe/tower-layout.test.ts', '--testTimeout=0'], { env: { ...process.env, ...env }, stdio: 'ignore' });
    p.on('exit', (code) => (code === 0 ? done() : fail(new Error(`a shard failed (${JSON.stringify(env)})`))));
  });
const started = Date.now();
const shards = Array.from({ length: jobs }, (_, k) => join(dir, `${k}.json`));
await Promise.all(shards.map((f, k) => run({ SHARD: `${k}/${jobs}`, PROBE: f })));
await run({ MERGE: shards.join(','), PROBE: resolve(out) });
rmSync(dir, { recursive: true });
console.log(`${jobs} shards, ${((Date.now() - started) / 1000).toFixed(0)} s → ${out}`);
