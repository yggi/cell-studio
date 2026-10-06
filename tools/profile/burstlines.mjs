// Inclusive time by source line over the *bursts only* of a CPU profile (cpu.mjs, unminified build): stretches
// where the main thread is busy ≥ 95 % for ≥ 50 ms. Shows what a long task spends its time on, which the
// whole-run profile (agg.mjs, lines.mjs) averages away.
// usage: node tools/profile/burstlines.mjs <profile.json> <dist/assets/index-*.js> [top=18]
import fs from 'fs';
const [pf, jsf, top = '18'] = process.argv.slice(2);
// only frames of this file count: the build has several chunks (Tone is lazy), each with its own line numbers
const file = jsf.split('/').pop();
const html = fs.readFileSync(jsf, 'utf8').split('\n');
const pr = JSON.parse(fs.readFileSync(pf));
const nodes = new Map(pr.nodes.map((n) => [n.id, n]));
const parent = new Map();
pr.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
const idle = new Set(pr.nodes.filter((n) => n.callFrame.functionName === '(idle)').map((n) => n.id));
// sample times, 10 ms bins, busy fraction per bin
const BIN = 10000;
let t = pr.startTime;
const at = pr.samples.map((_, i) => (t += pr.timeDeltas[i]));
const bins = new Map();
pr.samples.forEach((id, i) => {
  const k = Math.floor((at[i] - pr.startTime) / BIN);
  const b = bins.get(k) || { busy: 0, n: 0 };
  b.n++;
  if (!idle.has(id)) b.busy++;
  bins.set(k, b);
});
const hot = new Set([...bins].filter(([, b]) => b.busy / b.n >= 0.95).map(([k]) => k));
// runs of ≥ 5 consecutive hot bins
const keep = new Set();
let run = [];
for (let k = 0; k <= Math.max(...bins.keys()) + 1; k++) {
  if (hot.has(k)) run.push(k);
  else {
    if (run.length >= 5) run.forEach((x) => keep.add(x));
    run = [];
  }
}
const inc = new Map();
let total = 0,
  count = 0;
pr.samples.forEach((id, i) => {
  if (!keep.has(Math.floor((at[i] - pr.startTime) / BIN))) return;
  const dt = pr.timeDeltas[i] || 0;
  total += dt;
  const seen = new Set();
  let c = id;
  while (c !== undefined) {
    const cf = nodes.get(c).callFrame;
    const k = cf.lineNumber;
    if (cf.url.endsWith(file) && !seen.has(k)) {
      seen.add(k);
      inc.set(k, (inc.get(k) || 0) + dt);
    }
    c = parent.get(c);
  }
});
console.log(`bursts: ${keep.size * 10} ms of ${((at.at(-1) - pr.startTime) / 1e3) | 0} ms profiled`);
[...inc]
  .sort((a, b) => b[1] - a[1])
  .slice(0, Number(top))
  .forEach(([k, v]) => console.log(((100 * v) / total).toFixed(1).padStart(5) + '%', String(k).padStart(6), (html[k] || '').trim().slice(0, 110)));
// self time in the bursts: the native "(program)" share is style/layout/paint and DOM writes the JS profile can't split
const self = new Map();
pr.samples.forEach((id, i) => {
  if (!keep.has(Math.floor((at[i] - pr.startTime) / BIN))) return;
  const f = nodes.get(id).callFrame;
  const k = (f.functionName || '(anon)') + (f.lineNumber >= 0 ? ':' + f.lineNumber : '');
  self.set(k, (self.get(k) || 0) + (pr.timeDeltas[i] || 0));
});
console.log('self:');
[...self]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .forEach(([k, v]) => console.log(((100 * v) / total).toFixed(1).padStart(5) + '%', k));
