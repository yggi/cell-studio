// Inclusive time by source line of an unminified build: node lines.mjs <profile.json> <dist/assets/index-*.js> [top=14]
import fs from 'fs';
const [pf, jsf, top = '14'] = process.argv.slice(2);
// only frames of this file count: the build has several chunks (Tone is lazy), each with its own line numbers
const file = jsf.split('/').pop();
const html = fs.readFileSync(jsf, 'utf8').split('\n');
const pr = JSON.parse(fs.readFileSync(pf));
const nodes = new Map(pr.nodes.map((n) => [n.id, n]));
const parent = new Map();
pr.nodes.forEach((n) => (n.children || []).forEach((c) => parent.set(c, n.id)));
const self = new Map();
pr.samples.forEach((id, i) => self.set(id, (self.get(id) || 0) + (pr.timeDeltas[i] || 0)));
const tot = [...self.values()].reduce((a, b) => a + b, 0);
const inc = new Map();
for (const [id, t] of self) {
  const seen = new Set();
  let c = id;
  while (c !== undefined) {
    const cf = nodes.get(c).callFrame;
    const k = cf.lineNumber;
    if (cf.url.endsWith(file) && !seen.has(k)) {
      seen.add(k);
      inc.set(k, (inc.get(k) || 0) + t);
    }
    c = parent.get(c);
  }
}
[...inc]
  .sort((a, b) => b[1] - a[1])
  .slice(0, Number(top))
  .forEach(([k, t]) => console.log(((100 * t) / tot).toFixed(1) + '%', k, (html[k] || '').trim().slice(0, 120)));
