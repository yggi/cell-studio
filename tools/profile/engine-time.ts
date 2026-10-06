import { PRESETS } from '../../src/engine/presets';
import { compileSource, codeShifts } from '../../src/engine/compile';
import { plan, eventsBetween } from '../../src/engine/realize';
const rows: string[] = [];
for (const [k, p] of Object.entries(PRESETS) as [string, { source: string }][]) {
  const t0 = performance.now(); const r = compileSource(p.source); const t1 = performance.now();
  const sh = codeShifts(r); const pl = plan(r, sh); const t2 = performance.now();
  let n = 0; const t3 = performance.now(); for (let s = 0; s < 8; s += 0.25) n += eventsBetween(pl, s, s + 0.25).length; const t4 = performance.now();
  rows.push(`${k.padEnd(22)} compile ${(t1 - t0).toFixed(0).padStart(4)} ms  plan ${(t2 - t1).toFixed(0).padStart(4)} ms  events(8s) ${(t4 - t3).toFixed(1).padStart(6)} ms (${n} ev)`);
}
console.log(rows.join('\n'));
