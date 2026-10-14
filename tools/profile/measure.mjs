import { chromium } from './playwright.mjs';
const [url, throttle = '1', secs = '20', ...titles] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
for (const t of titles) {
  const ctxp = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctxp.newPage();
  await p.addInitScript(() => {
    window.__ctx = [];
    const A = window.AudioContext;
    window.AudioContext = class extends A {
      constructor(...a) {
        super(...a);
        window.__ctx.push(this);
      }
    };
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] });
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url);
  await p.waitForTimeout(1000);
  await p.getByRole('radio', { name: 'Cards' }).click();
  await p.locator('input.search').fill(t);
  await p.waitForTimeout(300);
  await p.locator('button.open').first().dispatchEvent('click');
  await p.waitForTimeout(500);
  if (await p.locator('button.big').count()) await p.locator('button.big').first().click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'before-play.png' });
  const cdp = await ctxp.newCDPSession(p);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
  const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  await p.getByRole('button', { name: 'Play', exact: true }).click();
  await p.waitForTimeout(4000); // warm-up (reverb impulse, first windows)
  await p.evaluate(() => (window.__long.length = 0));
  const m0 = await m();
  const t0 = Date.now();
  const s0 = await p.evaluate(() => window.__ctx.map((c) => ({ t: c.currentTime, st: c.playoutStats ? c.playoutStats.underrunEvents : null })));
  await p.waitForTimeout(Number(secs) * 1000);
  const m1 = await m();
  const wall = (Date.now() - t0) / 1000;
  const s1 = await p.evaluate(() =>
    window.__ctx.map((c) => ({
      t: c.currentTime,
      st: c.playoutStats ? c.playoutStats.underrunEvents : null,
      state: c.state,
      sr: c.sampleRate,
      bl: c.baseLatency,
      ol: c.outputLatency,
    })),
  );
  const long = await p.evaluate(() => window.__long.slice());
  const d = (k) => ((m1[k] - m0[k]) / wall) * 100;
  console.log(
    JSON.stringify({
      piece: t,
      throttle,
      wall: +wall.toFixed(1),
      taskPct: +d('TaskDuration').toFixed(1),
      scriptPct: +d('ScriptDuration').toFixed(1),
      layoutPct: +d('LayoutDuration').toFixed(1),
      stylePct: +d('RecalcStyleDuration').toFixed(1),
      longtasks: long.length,
      longMax: Math.round(Math.max(0, ...long)),
      longSum: Math.round(long.reduce((a, c) => a + c, 0)),
      audioAdvance: s1.map((x, i) => +(x.t - s0[i].t).toFixed(2)),
      underruns: s1.map((x) => x.st),
      state: s1.map((x) => x.state),
      errs: errs.slice(0, 2),
    }),
  );
  await ctxp.close();
}
await b.close();
