// Repeatability guard (#37): every example rendered offline twice in the browser, Math.random NOT seeded (the point),
// and the two renders must sound the same. Two things are checked:
//   1. Math.random is never called while a render runs (the first stack of each distinct caller is printed, so a failure
//      says where the chance came from). This is exact: any call fails.
//   2. The two renders agree block by block (the level of every 2048 samples) within TOL (default 1e-5, −100 dB).
//      Not bit for bit: Chromium sums three or more inputs of a node in an order that changes from run to run, so the
//      last bit of a float differs (about −180 dB; two inputs are stable, six differ every time). Pieces with a
//      resonator (forks, kalimba) vary much more (−45 dB, #65): they are listed as KNOWN and don't fail the run.
//
//   npm run build && node tools/repeatable.mjs 6 [piece words…]
//
// Exit 1 on a Math.random call or a piece that differs beyond TOL (other than the known ones). Not a CI check (like
// golden.mjs, #18); `src/audio/repeatable.test.ts` is the cheap first line that runs in CI. In a cloud session set
// CHROME_PATH=/opt/pw-browsers/chromium.
import { readdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from './profile/playwright.mjs';

const args = process.argv.slice(2);
const secs = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a)) ?? 6);
const TOL = Number(process.env.TOL ?? 1e-5);
const KNOWN = { 'forks.cells': '#65', 'kalimba.cells': '#65' };
const words = args.filter((a) => !/^\d+(\.\d+)?$/.test(a)).map((w) => w.toLowerCase());
const files = readdirSync('examples').filter((f) => f.endsWith('.cells')).sort().filter((f) => !words.length || words.some((w) => f.includes(w)));

const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.addInitScript(() => {
  const real = Math.random;
  window.__calls = null;
  Math.random = () => {
    if (window.__calls) {
      const where = (new Error().stack ?? '').split('\n').slice(2, 4).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < ');
      window.__calls.set(where, (window.__calls.get(where) ?? 0) + 1);
    }
    return real();
  };
});
await page.goto(server.resolvedUrls.local[0]);
await page.waitForFunction(() => window.cellStudio?.render);

const { readFileSync } = await import('node:fs');
const render = (source) =>
  page.evaluate(async ([src, s]) => {
    window.__calls = new Map();
    const r = await window.cellStudio.render(src, s);
    const calls = [...window.__calls];
    window.__calls = null;
    return { hash: r.hash, blocks: r.blocks, calls };
  }, [source, secs]);

let bad = 0;
const callers = new Map();
for (const f of files) {
  const source = readFileSync(`examples/${f}`, 'utf8');
  const a = await render(source);
  const b = await render(source);
  for (const [where, n] of [...a.calls, ...b.calls]) callers.set(where, (callers.get(where) ?? 0) + n);
  // (how far apart: the largest difference in block level)
  const apart = a.blocks.length !== b.blocks.length ? 1 : Math.max(0, ...a.blocks.map((x, i) => Math.abs(x - b.blocks[i])));
  const dB = apart > 0 ? `${(20 * Math.log10(apart)).toFixed(0)} dB` : '0';
  const known = KNOWN[f];
  const ok = apart <= TOL || known;
  if (!ok) bad++;
  const how = a.hash === b.hash ? 'bit-identical' : `largest block difference ${dB}, first at ${((a.blocks.findIndex((x, i) => x !== b.blocks[i]) * 2048) / 44100).toFixed(2)} s`;
  console.error(`${apart <= TOL ? 'same ' : known ? 'KNOWN' : 'DIFF '} ${f.padEnd(28)} ${how}${apart > TOL && known ? `  (${known})` : ''}${a.calls.length + b.calls.length ? '  Math.random called' : ''}`);
}
await browser.close();
await server.close();
for (const [where, n] of callers) console.error(`Math.random ×${n}: ${where}`);
const fail = bad || callers.size;
console.error(fail ? `${bad} of ${files.length} pieces differ between two renders${callers.size ? `; Math.random called from ${callers.size} place(s)` : ''}` : `all ${files.length} pieces render the same twice (within ${(20 * Math.log10(TOL)).toFixed(0)} dB), Math.random never called`);
process.exit(fail ? 1 : 0);
