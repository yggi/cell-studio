// Smoke test: open every piece of the library and press Play, and fail on any page error, any console
// error, or an AudioContext that isn't running (and, for a piece played in full, advancing). It builds
// the audio graph of every voice kind (tapes, resonators, FM, kits …), which the unit tests can't (no
// Web Audio in node). Every piece is started (its voices built, its first window asked for) and stopped
// again at once; the fewest pieces that between them use every kind of audio node (tools/smoke-pick.ts)
// play in full.
//
//   npm run build && npm run smoke            # every piece started, the picks played 2 s each
//   npm run smoke -- 3 Hypercell "Music Box"  # 3 s each, only titles containing these words
//   npm run smoke -- --all                    # every piece played in full (2 s, or the seconds given)
//   npm run smoke -- --list                   # which pieces play in full, and what each brings
//   ENGINE=worker npm run smoke               # with the engine in a Web Worker (?engine=worker, #15)
//
// Chromium: Playwright's, or CHROME_PATH=/path/to/chrome (CI uses the runner's Chrome). See tools/profile/playwright.mjs.
import { preview, runnerImport } from 'vite';
import { chromium } from './profile/playwright.mjs';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f) && args.splice(args.indexOf(f), 1);
const [all, list] = [flag('--all'), flag('--list')];
const [secs = '2', ...only] = args;
// (the picker is TypeScript over src/engine: loaded through vite, as vite.config.ts loads the examples' index)
const { module: pick } = await runnerImport('./tools/smoke-pick.ts', { configFile: false });
const picks = pick.smokePicks();
if (list) {
  for (const p of picks) console.log(`${p.title}\n    ${p.brings.join(', ')}`);
  process.exit(0);
}
const full = new Set(picks.map((p) => `example:${p.key}`)); // (as the library names an example: src/App.svelte)
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
const missing = [...full].filter((k) => !pieces.some((p) => p.id === k));
if (missing.length) throw new Error(`the library has no piece ${missing.join(', ')} (tools/smoke-pick.ts)`);
const wanted = pieces
  .filter((p) => only.length === 0 || only.some((w) => p.title.toLowerCase().includes(w.toLowerCase())))
  .map((p) => ({ ...p, full: all || only.length > 0 || full.has(p.id) }));
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
    // until it sounds (a running AudioContext, a window asked of the engine), but at least 250 ms for errors to surface
    await Promise.all([
      page.waitForTimeout(250),
      page.waitForFunction(() => window.__ctx.some((c) => c.state === 'running') && window.cellStudio.engine().windows > 0).catch(() => {}), // (if not, the checks below say what's missing)
    ]);
    const t0 = await page.evaluate(() => window.__ctx.map((c) => c.currentTime));
    if (p.full) await page.waitForTimeout(Number(secs) * 1000);
    const now = await page.evaluate(() => window.__ctx.map((c) => ({ state: c.state, t: c.currentTime })));
    const live = now.filter((c) => c.state === 'running');
    if (live.length === 0) problems.push('no running AudioContext');
    else if (p.full && !live.some((c, _k) => c.t > (t0[now.indexOf(c)] ?? 0) + 0.5 * Number(secs))) problems.push('audio clock did not advance');
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
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)}/${wanted.length} ${p.full ? `${secs} s` : 'start'} ${p.title}${
      ok
        ? ''
        : '\n       ' +
          [...new Set(problems)]
            .slice(0, 3)
            .map((x) => x.slice(0, 200))
            .join('\n       ')
    }`,
  );
  if (!ok) failed.push(p.title);
}
await browser.close();
await server.close();
if (failed.length) {
  console.error(`\n${failed.length} of ${wanted.length} pieces failed: ${failed.join(', ')}`);
  process.exit(1);
}
const played = wanted.filter((p) => p.full).length;
console.log(`\nall ${wanted.length} pieces opened and started; ${played === wanted.length ? 'all' : played} played ${secs} s`);
if (engine) console.log('engine:', JSON.stringify(stats));
