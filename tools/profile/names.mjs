import fs from 'fs';
const want = process.argv[2].split(',');
for (const f of process.argv.slice(3)) {
  const pr = JSON.parse(fs.readFileSync(f)); const nodes = new Map(pr.nodes.map(n=>[n.id,n]));
  const parent = new Map(); pr.nodes.forEach(n => (n.children||[]).forEach(c => parent.set(c, n.id)));
  const self = new Map(); pr.samples.forEach((id,i)=>self.set(id,(self.get(id)||0)+(pr.timeDeltas[i]||0)));
  const total=[...self.values()].reduce((a,b)=>a+b,0); const res={};
  for (const [id,t] of self){ const seen=new Set(); let c=id; while(c!==undefined){const n=nodes.get(c).callFrame.functionName; if(!seen.has(n)){seen.add(n); res[n]=(res[n]||0)+t;} c=parent.get(c);} }
  console.log(f.slice(8,30), want.map(w=>`${w}=${(100*(res[w]||0)/total).toFixed(1)}%`).join(' '));
}
