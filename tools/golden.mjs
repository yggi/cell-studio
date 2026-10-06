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
// of full scale); the hash only says whether it was bit-identical. In a cloud session set
// CHROME_PATH=/opt/pw-browsers/chromium. Not a CI check (yet): see #18 for golden renders in CI.
import { readFileSync, readdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from './profile/playwright.mjs';

const args = process.argv.slice(2);
const check = args.includes('--check') ? JSON.parse(readFileSync(args[args.indexOf('--check') + 1], 'utf8')) : null;
const secs = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a)) ?? 6);
const TOL = Number(process.env.TOL ?? 1e-4);
const files = readdirSync('examples').filter((f) => f.endsWith('.cells')).sort();

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
for (const f of files) {
  const source = readFileSync(`examples/${f}`, 'utf8');
  const r = await page.evaluate(async ([src, s]) => (window.__seed(1), await window.cellStudio.render(src, s)), [source, secs]);
  out[f] = { hash: r.hash, rms: +r.rms.toFixed(3), peak: +r.peak.toFixed(3), blocks: r.blocks.map((x) => +x.toFixed(6)) };
  if (check) {
    const was = check[f];
    const worst = was ? Math.max(Math.abs(was.blocks.length - out[f].blocks.length), ...out[f].blocks.map((x, i) => Math.abs(x - (was.blocks[i] ?? 0)))) : Infinity;
    const same = worst <= TOL;
    if (!same) diff++;
    const db = worst > 0 ? `${(20 * Math.log10(worst)).toFixed(0)} dB` : '0';
    console.error(`${same ? 'same' : 'DIFF'}  ${f.padEnd(28)} ${was?.hash === r.hash ? 'bit-identical' : `largest block difference ${db}`}${same ? '' : `  rms ${was?.rms} → ${out[f].rms}, peak ${was?.peak} → ${out[f].peak}`}`);
  }
}
await browser.close();
await server.close();
if (check) {
  console.error(diff ? `${diff} of ${files.length} pieces sound different` : `all ${files.length} pieces the same`);
  process.exit(diff ? 1 : 0);
} else console.log(JSON.stringify(out));
