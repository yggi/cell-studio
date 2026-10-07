// Shorten a .cells source with the studio's own Shorten (src/engine/shorten/): stdin → stdout, the steps on stderr.
// For generators (tools/bwv847.py) that write longhand and want the shorter form without a second copy of the rules.
//   node tools/shorten.mjs [--within "<regex>"] < in.cells > out.cells
// --within: take only suggestions whose cells all share one match of the regex's first group (a phrase shared
// across lines would draw as edges crossing the whole graph: bwv847 keeps its phrases inside a voice or a hand).
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';

const at = process.argv.indexOf('--within');
const within = at > 0 ? new RegExp(process.argv[at + 1]) : null;
const group = (name) => within?.exec(name)?.[1] ?? null;

const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { shorten } = await server.ssrLoadModule('/src/engine/shorten/');
  const ok = (s) => {
    if (!within) return true;
    const names = [...s.title.matchAll(/&([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]);
    const g = new Set(names.map(group));
    return g.size === 1 && !g.has(null);
  };
  let now = readFileSync(0, 'utf8');
  const steps = [];
  for (let i = 0; i < 60; i++) {
    const best = shorten(now).find(ok);
    if (!best) break;
    const next = best.apply(now);
    if (next.length >= now.length) break;
    steps.push(`−${best.saving}: ${best.title}`);
    now = next;
  }
  process.stderr.write(steps.join('\n') + '\n');
  process.stdout.write(now);
} finally {
  await server.close();
}
