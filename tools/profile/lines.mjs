// Inclusive time by source line of an unminified build: node lines.mjs <profile.json> <dist/index.html> [top=14]
import fs from 'fs';
const [pf, htmlf, top = '14'] = process.argv.slice(2);
const html = fs.readFileSync(htmlf, 'utf8').split('\n');
const pr = JSON.parse(fs.readFileSync(pf)); const nodes = new Map(pr.nodes.map((n) => [n.id, n])); const parent = new Map();
pr.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
const self = new Map(); pr.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (pr.timeDeltas[i] || 0)));
const tot = [...self.values()].reduce((a, b) => a + b, 0); const inc = new Map();
for (const [id, t] of self) { const seen = new Set(); let c = id; while (c !== undefined) { const k = nodes.get(c).callFrame.lineNumber; if (!seen.has(k)) { seen.add(k); inc.set(k, (inc.get(k) || 0) + t); } c = parent.get(c); } }
[...inc].filter(([k]) => k > 3200).sort((a, b) => b[1] - a[1]).slice(0, Number(top)).forEach(([k, t]) => console.log((100 * t / tot).toFixed(1) + '%', k, (html[k] || '').trim().slice(0, 120)));
