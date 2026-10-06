// What a long task changes: for each task over 50 ms while a piece plays, how much of the DOM it rewrote —
// attributes and nodes by kind, and how many graph nodes it touched — and how far apart the bursts are.
// (The bursts in Bach's Prelude come once a bar, when the key tables turn: this shows what they redraw.)
// usage: THROTTLE=1 node tools/profile/bursts.mjs <url> "<piece title>" [seconds=20]
import { chromium } from './playwright.mjs';
const [url, title, secs = '20'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await c.newPage();
await p.addInitScript(() => {
  window.__long = [];
  window.__mut = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push({ at: e.startTime, dur: e.duration }))).observe({ entryTypes: ['longtask'] });
  const kind = (n) => {
    const e = n.nodeType === 1 ? n : n.parentElement;
    return (e?.tagName.toLowerCase() ?? '?') + (e?.getAttribute?.('class') ? '.' + e.getAttribute('class').split(/\s+/)[0] : '');
  };
  const nodeOf = (n) => (n.nodeType === 1 ? n.closest?.('.svelte-flow__node')?.getAttribute('data-id') : n.parentElement?.closest?.('.svelte-flow__node')?.getAttribute('data-id'));
  const start = () => {
    new MutationObserver((ms) => {
      const at = performance.now();
      const by = {};
      const nodes = new Set();
      for (const m of ms) {
        const k = (m.type === 'attributes' ? m.attributeName : m.type) + ' ' + kind(m.target);
        by[k] = (by[k] || 0) + 1;
        const id = nodeOf(m.target);
        if (id) nodes.add(id);
      }
      window.__mut.push({ at, n: ms.length, by, nodes: [...nodes] });
    }).observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', start) : start();
});
await p.goto(url);
await p.waitForTimeout(1000);
await p.getByRole('radio', { name: 'Cards' }).click();
await p.locator('input.search').fill(title);
await p.waitForTimeout(300);
await p.locator('button.open').first().dispatchEvent('click');
await p.waitForTimeout(2000);
const cdp = await c.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE ?? 1) });
await p.getByRole('button', { name: 'Play' }).click();
await p.waitForTimeout(4000);
await p.evaluate(() => {
  window.__long.length = 0;
  window.__mut.length = 0;
});
await p.waitForTimeout(Number(secs) * 1000);
const { long, mut, nodeCount } = await p.evaluate(() => ({ long: window.__long, mut: window.__mut, nodeCount: document.querySelectorAll('.svelte-flow__node').length }));
console.log(`${title}: ${long.length} long tasks in ${secs} s, ${nodeCount} graph nodes`);
let prev = null;
for (const t of long) {
  // the mutation batches that landed inside the task (the DOM writes of its reactive flush)
  const inside = mut.filter((m) => m.at >= t.at && m.at <= t.at + t.dur + 5);
  const by = {};
  const nodes = new Set();
  let n = 0;
  for (const m of inside) {
    n += m.n;
    m.nodes.forEach((x) => nodes.add(x));
    for (const [k, v] of Object.entries(m.by)) by[k] = (by[k] || 0) + v;
  }
  const top = Object.entries(by)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k, v]) => `${v}× ${k}`)
    .join(', ');
  console.log(
    `  +${prev === null ? '    ' : ((t.at - prev) / 1000).toFixed(2).padStart(4)} s  ${Math.round(t.dur).toString().padStart(4)} ms  ${String(n).padStart(5)} DOM writes in ${String(nodes.size).padStart(2)} nodes  ${top}`,
  );
  prev = t.at;
}
await b.close();
