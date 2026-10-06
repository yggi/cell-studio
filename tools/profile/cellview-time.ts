// What a table turn costs in the engine alone: `cellView` for every cell at a few moments of a piece
// (what each glyph recomputes when its tables turn), without Svelte or the DOM. If this is small, a burst's
// time is in the reactive flush and DOM, not in the layout code.
// usage: npx vite-node tools/profile/cellview-time.ts [examples/bwv847.cells] [seconds=60]
import { readFileSync } from 'node:fs';
import { compileSource } from '../../src/engine/compile';
import { codeShifts } from '../../src/engine/program';
import { cellView } from '../../src/layout/cellview';
import { shiftsAt, playedCells } from '../../src/engine/clocking';
const file = process.argv[2] ?? 'examples/bwv847.cells';
const horizon = Number(process.argv[3] ?? 60);
const r = compileSource(readFileSync(file, 'utf8'));
const statics = codeShifts(r);
const played = playedCells(r);
const names = [...r.cells.values()].filter((c) => !c.note && !c.voice).map((c) => c.name);
console.log(`${file}: ${names.length} drawn cells`);
let prev = '';
let turns = 0;
const times: number[] = [];
for (let t = 0; t <= horizon; t += 0.25) {
  const sh = shiftsAt(r, statics, t, played);
  // a "turn": some stepped table's shift changed since the last quarter second
  const key = names.map((n) => sh(n)).join('|');
  if (key === prev) continue;
  prev = key; turns++;
  const t0 = performance.now();
  for (const n of names) cellView(r, n, sh, false);
  times.push(performance.now() - t0);
}
times.sort((a, b) => a - b);
console.log(`${turns} moments where some shift changed; cellView of every cell: median ${times[times.length >> 1]?.toFixed(1)} ms, max ${times.at(-1)?.toFixed(1)} ms (node, warmed up)`);
// the dearest cells over all those moments
const per = new Map<string, number>();
prev = '';
for (let t = 0; t <= horizon; t += 0.25) {
  const sh = shiftsAt(r, statics, t, played);
  const key = names.map((n) => sh(n)).join('|');
  if (key === prev) continue;
  prev = key;
  for (const n of names) { const a = performance.now(); cellView(r, n, sh, false); per.set(n, (per.get(n) ?? 0) + performance.now() - a); }
}
const total = [...per.values()].reduce((a, b) => a + b, 0);
console.log('dearest cells (share of all cellView time):');
for (const [n, v] of [...per].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  const c = r.cells.get(n)!;
  console.log(`  ${(100 * v / total).toFixed(0).padStart(3)} %  &${n.padEnd(14)} steps ${String(c.steps).padStart(4)}  ${c.step ? 'stepped' : ''}`);
}
