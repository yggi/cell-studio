// Smoke test: open every piece of the library, press Play for a few seconds, and fail on any page
// error, any console error, or an AudioContext that isn't running and advancing. It builds the audio
// graph of every voice kind (tapes, resonators, FM, kits …), which the unit tests can't (no Web Audio in node).
//
//   npm run build && npm run smoke            # all pieces, 2 s each
//   npm run smoke -- 3 Hypercell "Music Box"  # 3 s each, only titles containing these words
//   ENGINE=worker npm run smoke               # with the engine in a Web Worker (?engine=worker, #15)
//
// Chromium: Playwright's, or CHROME_PATH=/path/to/chrome (CI uses the runner's Chrome). See tools/profile/playwright.mjs.
import { preview } from 'vite';
import { chromium } from './profile/playwright.mjs';

const [secs = '2', ...only] = process.argv.slice(2);
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const engine = process.env.ENGINE;
const url = server.resolvedUrls.local[0] + (engine ? `?engine=${engine}` : '');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.setDefaultTimeout(8000);
let problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
await page.addInitScript(() => {
  window.__ctx = [];
  const A = window.AudioContext;
  window.AudioContext = class extends A {
    constructor(...a) {
      super(...a);
      window.__ctx.push(this);
    }
  };
});

await page.goto(url);
await page.getByRole('radio', { name: 'Cards' }).click();
await page.waitForSelector('button.open', { state: 'attached' });
const pieces = await page.$$eval('button.open', (bs) => bs.map((b) => ({ id: b.dataset.id, title: b.getAttribute('aria-label').replace(/^Open /, '') })));
const wanted = pieces.filter((p) => only.length === 0 || only.some((w) => p.title.toLowerCase().includes(w.toLowerCase())));
if (wanted.length === 0) throw new Error('no piece matches ' + only.join(', '));

const failed = [];
let stats = null;
for (const [i, p] of wanted.entries()) {
  problems = [];
  try {
    if (await page.locator('button.title').count()) {
      await page.locator('button.title').first().click();
      await page.getByRole('radio', { name: 'Cards' }).click();
    }
    await page.locator(`button.open[data-id="${p.id}"]`).dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.locator('.transport').getByRole('button', { name: 'Play' }).first().click();
    await page.waitForTimeout(500);
    const t0 = await page.evaluate(() => window.__ctx.map((c) => c.currentTime));
    await page.waitForTimeout(Number(secs) * 1000);
    const now = await page.evaluate(() => window.__ctx.map((c) => ({ state: c.state, t: c.currentTime })));
    const live = now.filter((c) => c.state === 'running');
    if (live.length === 0) problems.push('no running AudioContext');
    else if (!live.some((c, k) => c.t > (t0[now.indexOf(c)] ?? 0) + 0.5 * Number(secs))) problems.push('audio clock did not advance');
    await page.locator('.transport').getByRole('button', { name: 'Pause' }).first().click();
    // the engine asked for is the one that played, and it answered (a window it misses is worked out locally)
    const st = await page.evaluate(() => window.cellStudio.engine());
    if (engine && st.kind !== engine) problems.push(`engine: ${st.kind}, not ${engine}`);
    if (st.windows === 0) problems.push('no window asked of the engine');
    if (engine === 'worker' && st.late >= st.windows) problems.push('the worker answered no window in time');
    stats = st;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
    await page.goto(url); // start the next piece from a fresh page
    await page.getByRole('radio', { name: 'Cards' }).click();
  }
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)}/${wanted.length} ${p.title}${ok ? '' : '\n       ' + [...new Set(problems)].slice(0, 3).map((x) => x.slice(0, 200)).join('\n       ')}`);
  if (!ok) failed.push(p.title);
}
await browser.close();
await server.close();
if (failed.length) {
  console.error(`\n${failed.length} of ${wanted.length} pieces failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`\nall ${wanted.length} pieces opened and played ${secs} s`);
if (engine) console.log('engine:', JSON.stringify(stats));
