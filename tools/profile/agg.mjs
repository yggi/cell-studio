import fs from 'fs';
for (const f of process.argv.slice(2)) {
  const pr = JSON.parse(fs.readFileSync(f));
  const nodes = new Map(pr.nodes.map((n) => [n.id, n]));
  const self = new Map(); const dt = pr.timeDeltas; 
  pr.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (dt[i] || 0)));
  const parent = new Map(); pr.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  const idle = pr.nodes.filter(n => ['(idle)'].includes(n.callFrame.functionName)).reduce((a,n)=>a+(self.get(n.id)||0),0);
  const name = (n) => (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber;
  const fself = new Map(), fincl = new Map();
  for (const [id, t] of self) {
    const n = nodes.get(id); fself.set(name(n), (fself.get(name(n)) || 0) + t);
    const seen = new Set(); let c = id;
    while (c !== undefined) { const k = name(nodes.get(c)); if (!seen.has(k)) { seen.add(k); fincl.set(k, (fincl.get(k) || 0) + t); } c = parent.get(c); }
  }
  const pct = (t) => (100 * t / (total - idle)).toFixed(1);
  const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, t]) => `${pct(t).padStart(5)}%  ${k}`).join('\n');
  console.log(`\n=== ${f}  busy ${(100*(total-idle)/total).toFixed(0)}% of ${(total/1e6).toFixed(1)}s\n-- self\n${top(fself, 14)}\n-- inclusive\n${top(fincl, 34)}`);
}
