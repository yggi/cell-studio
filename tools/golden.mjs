// Golden renders: every example rendered offline in the browser; per piece its level block by block (2048 samples)
// and a hash of its samples. For refactors of the audio code that must not change the sound: record on the base
// commit, check on the change.
//
//   npm run build && node tools/golden.mjs 6 > /tmp/golden.json          # record (6 s per piece)
//   npm run build && node tools/golden.mjs 6 --check /tmp/golden.json    # compare; exit 1 on any difference
//
// Math.random is seeded afresh before each piece (noise, the reverb's impulse, the bow). Even so a render is not
// bit-repeatable in Chromium: a finished note's nodes are disconnected from its `onended` handler on the main
// thread while the offline context renders on, so where a tail far below hearing is cut varies a little. So the
// check compares the block levels: a piece passes when no block differs by more than TOL (default 1e-4, −80 dB
// of full scale); the hash only says whether it was bit-identical. A piece that differs is rendered up to twice
// more before it counts: the resonator pieces (forks, kalimba) vary by up to about −45 dB from run to run on their
// own (their feedback loops, #65). In a cloud session set CHROME_PATH=/opt/pw-browsers/chromium. Not a CI check (yet): see #18.
import { readFileSync, readdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from './profile/playwright.mjs';
import { freshBuild } from './fresh-build.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check') ? JSON.parse(readFileSync(args[args.indexOf('--check') + 1], 'utf8')) : null;
const secs = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a)) ?? 6);
const TOL = Number(process.env.TOL ?? 1e-4);
const files = readdirSync('examples')
  .filter((f) => f.endsWith('.cells'))
  .sort();

freshBuild();
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.addInitScript(() => {
  let s = 1;
  window.__seed = (n) => (s = n >>> 0 || 1);
  // mulberry32
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
});
await page.goto(server.resolvedUrls.local[0]);
await page.waitForFunction(() => window.cellStudio?.render);

const out = {};
let diff = 0;
const render = (source) => page.evaluate(async ([src, s]) => (window.__seed(1), await window.cellStudio.render(src, s)), [source, secs]);
const print = (r) => ({ hash: r.hash, rms: +r.rms.toFixed(3), peak: +r.peak.toFixed(3), blocks: r.blocks.map((x) => +x.toFixed(6)) });
// the largest difference between two renders' block levels (a different length counts as a difference of 1)
const worst = (a, b) => (a.blocks.length !== b.blocks.length ? 1 : Math.max(0, ...a.blocks.map((x, i) => Math.abs(x - b.blocks[i]))));
for (const f of files) {
  const source = readFileSync(`examples/${f}`, 'utf8');
  out[f] = print(await render(source));
  if (!check) continue;
  const was = check[f];
  let w = was ? worst(was, out[f]) : Infinity;
  // (resonator pieces vary from run to run on their own: a difference that is real is there every time)
  for (let again = 0; again < 2 && was && w > TOL; again++) w = Math.min(w, worst(was, print(await render(source))));
  const same = w <= TOL;
  if (!same) diff++;
  const how = was?.hash === out[f].hash ? 'bit-identical' : `largest block difference ${w > 0 ? `${(20 * Math.log10(w)).toFixed(0)} dB` : '0'}`;
  console.error(`${same ? 'same' : 'DIFF'}  ${f.padEnd(28)} ${how}${same ? '' : `  rms ${was?.rms} → ${out[f].rms}, peak ${was?.peak} → ${out[f].peak}`}`);
}
await browser.close();
await server.close();
if (check) {
  console.error(diff ? `${diff} of ${files.length} pieces sound different` : `all ${files.length} pieces the same`);
  process.exit(diff ? 1 : 0);
} else console.log(JSON.stringify(out));
