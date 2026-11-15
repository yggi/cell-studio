// Typing latency in the code view (#587, #624): a piece opened by its card, its code's end focused, then `keys`
// characters typed `gap` ms apart; each key's latency from its keydown to the frame after its input (two
// requestAnimationFrames: the paint that shows it), and the long tasks while typing. One JSON line per run.
// node typing.mjs <url> <throttle> "<piece title>" [runs] [keys=60] [gap=80]
// (a slow page at ×4 types for longer than Playwright's 30 s an action: the typing has no timeout)
import { chromium } from './playwright.mjs';
const [url, throttle = '1', what, runs = '1', keys = '60', gap = '80'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--no-sandbox'] });
for (let r = 0; r < Number(runs); r++) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__lat = [];
    window.__long = [];
    window.__on = false;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__on && window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] });
    let down = 0;
    document.addEventListener('keydown', () => (down = performance.now()), true);
    document.addEventListener(
      'input',
      () => {
        const t = down;
        requestAnimationFrame(() => requestAnimationFrame(() => window.__on && window.__lat.push(performance.now() - t)));
      },
      true,
    );
  });
  await p.goto(url);
  await p.waitForTimeout(1000);
  await p.getByRole('radio', { name: 'Cards' }).click();
  await p.locator('input.search').fill(what);
  await p.waitForTimeout(300);
  const card = p.locator('button.open').first();
  if (!(await card.count())) throw new Error(`no card in the library matches ${JSON.stringify(what)}`);
  await card.dispatchEvent('click');
  await p.waitForTimeout(4000);
  const area = p.getByRole('textbox', { name: 'Cell program' });
  await area.focus();
  await area.press('Control+End');
  // (a comment line, so what is typed doesn't change what plays or how the graph is laid out)
  await area.press('Enter');
  // (env PREFIX: what the line starts with; `&beat from ` types after a from line, where completion offers ids)
  await area.type(process.env.PREFIX ?? '# ', { delay: 50 });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
  await p.evaluate(() => (window.__on = true));
  await area.type('abcdefghij'.repeat(Math.ceil(Number(keys) / 10)).slice(0, Number(keys)), { delay: Number(gap), timeout: 0 });
  await p.waitForTimeout(500);
  const { lat, long } = await p.evaluate(() => ({ lat: window.__lat.slice(), long: window.__long.slice() }));
  const s = [...lat].sort((x, y) => x - y);
  const q = (f) => Math.round(s[Math.min(s.length - 1, Math.floor(f * s.length))] ?? NaN);
  console.log(
    JSON.stringify({
      piece: what,
      throttle,
      run: r,
      keys: lat.length,
      medianMs: q(0.5),
      p95Ms: q(0.95),
      maxMs: Math.round(s.at(-1) ?? NaN),
      longtasks: long.length,
      longMax: Math.round(Math.max(0, ...long)),
    }),
  );
  await ctx.close();
}
await b.close();
