// Engine cost per example, without a browser: compile, plan, and the events of the first 8 seconds.
// usage: npx vite-node tools/profile/engine-time.ts
import { readdirSync, readFileSync } from 'node:fs';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { plan, eventsBetween } from '../../src/engine/realize';
const dir = new URL('../../examples/', import.meta.url);
const rows: string[] = [];
for (const f of readdirSync(dir)
  .filter((x) => x.endsWith('.cells'))
  .sort()) {
  const src = readFileSync(new URL(f, dir), 'utf8');
  const t0 = performance.now();
  const r = compileSource(src);
  const t1 = performance.now();
  const sh = codeShifts(r);
  const pl = plan(r, sh);
  const t2 = performance.now();
  let n = 0;
  const t3 = performance.now();
  for (let s = 0; s < 8; s += 0.25) n += eventsBetween(pl, s, s + 0.25).length;
  const t4 = performance.now();
  rows.push(
    `${f.padEnd(26)} compile ${(t1 - t0).toFixed(0).padStart(4)} ms  plan ${(t2 - t1).toFixed(0).padStart(4)} ms  events(8s) ${(t4 - t3).toFixed(1).padStart(6)} ms (${n} ev)`,
  );
}
console.log(rows.join('\n'));
