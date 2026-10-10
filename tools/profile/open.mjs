// Time to open and lay out a piece, and the main-thread load while the layout settles (no playing).
// node open.mjs <url> <throttle> <example search text | file:/path.cells> [runs]
// env PROFILE=out.json: also record a CPU profile from the click to rest.
import { chromium } from './playwright.mjs';
import fs from 'fs';
const [url, throttle = '1', what, runs = '1'] = process.argv.slice(2);
const QUIET = 1500;
const MAX = 60000;
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
for (let r = 0; r < Number(runs); r++) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__long = [];
    window.__t0 = Infinity;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => e.startTime >= window.__t0 && window.__long.push(e.duration))).observe({ entryTypes: ['longtask'] });
    window.__first = null;
    window.__last = null;
    window.__moves = 0;
    const mo = new MutationObserver((ms) => {
      const now = performance.now();
      if (now < window.__t0) return;
      for (const m of ms) {
        const t = m.target;
        const hit =
          (m.type === 'attributes' && t.classList?.contains('svelte-flow__node') && t.closest('.graph')) ||
          (m.type === 'childList' && [...m.addedNodes].some((n) => n.nodeType === 1 && (n.matches('.graph .svelte-flow__node') || n.querySelector?.('.graph .svelte-flow__node'))));
        if (hit) {
          if (window.__first === null) window.__first = now;
          window.__last = now;
          window.__moves++;
          return;
        }
      }
    });
    document.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'transform'] }));
  });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url);
  await p.waitForTimeout(1000);
  const file = what.startsWith('file:') ? what.slice(5) : null;
  let card;
  if (!file) {
    await p.getByRole('radio', { name: 'Cards' }).click();
    await p.locator('input.search').fill(what);
    await p.waitForTimeout(300);
    card = p.locator('button.open').first();
  }
  await p.waitForTimeout(500);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
  if (process.env.PROFILE) {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
    await cdp.send('Profiler.start');
  }
  const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const m0 = await m();
  await p.evaluate(() => (window.__t0 = performance.now()));
  if (file) {
    // (the file input is on the sidebar's Files page)
    await p.getByRole('button', { name: /^Files/ }).click();
    await p.locator('input[type=file]').setInputFiles(file);
  } else await card.dispatchEvent('click');
  // wait for rest: nodes appeared, then no node moved for QUIET ms
  const w0 = Date.now();
  let st;
  for (;;) {
    await p.waitForTimeout(250);
    st = await p.evaluate(() => ({ t0: window.__t0, first: window.__first, last: window.__last, moves: window.__moves, now: performance.now() }));
    if (st.first !== null && st.now - st.last > QUIET) break;
    if (Date.now() - w0 > MAX) break;
  }
  const m1 = await m();
  const winMs = st.now - st.t0;
  const settleMs = st.last - st.t0;
  const busyMs = (m1.TaskDuration - m0.TaskDuration) * 1000;
  const scriptMs = (m1.ScriptDuration - m0.ScriptDuration) * 1000;
  if (process.env.PROFILE) {
    const { profile } = await cdp.send('Profiler.stop');
    fs.writeFileSync(process.env.PROFILE.replace('.json', `-${r}.json`), JSON.stringify(profile));
  }
  const long = await p.evaluate(() => window.__long.slice());
  const size = await p.evaluate(() => ({
    nodes: document.querySelectorAll('.graph .svelte-flow__node').length,
    edges: document.querySelectorAll('.graph .svelte-flow__edge').length,
  }));
  console.log(
    JSON.stringify({
      piece: what.replace(/^file:.*\//, 'file:'),
      throttle,
      run: r,
      firstNodeMs: Math.round(st.first - st.t0),
      settleMs: Math.round(settleMs),
      timedOut: Date.now() - w0 > MAX,
      moves: st.moves,
      busyMs: Math.round(busyMs),
      scriptMs: Math.round(scriptMs),
      busyPct: +((100 * busyMs) / winMs).toFixed(1),
      longtasks: long.length,
      longMax: Math.round(Math.max(0, ...long)),
      longSum: Math.round(long.reduce((a, c) => a + c, 0)),
      ...size,
      errs: errs.slice(0, 2),
    }),
  );
  await ctx.close();
}
await b.close();
