// Screenshots of pieces while they play: the graph, and each node's and edge's drawn state (#11).
// For checking what the graph shows (off, unrouted, on, idle, live), before and after a change.
//
//   npm run build && node tools/shots.mjs 3 "Sound on Tape" Baustelle   # 3 s into each piece
//   OUT=shots/before DIST=/path/to/other/dist node tools/shots.mjs 3 Baustelle  # another build
//
// Writes <OUT>/<title>.png and <OUT>/<title>.json (name → state, edge id → class). Viewport 1600×1000.
// Chromium as for the smoke test (tools/profile/playwright.mjs; in a cloud session CHROME_PATH=/opt/pw-browsers/chromium).
import { preview } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from './profile/playwright.mjs';
import { freshBuild } from './fresh-build.mjs';

const [secs = '3', ...titles] = process.argv.slice(2);
const out = process.env.OUT ?? 'shots';
mkdirSync(out, { recursive: true });
if (!process.env.DIST) freshBuild();
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, build: process.env.DIST ? { outDir: process.env.DIST } : {}, logLevel: 'error' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
for (const title of titles) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(url);
  await page.getByRole('radio', { name: 'Cards' }).click();
  await page.locator('input.search').fill(title);
  await page.waitForTimeout(300);
  const exact = page.locator(`button.open[aria-label="Open ${title}"]`);
  await ((await exact.count()) ? exact : page.locator('button.open')).first().dispatchEvent('click');
  await page.waitForTimeout(2500); // (the layout settles)
  await page.locator('.transport').getByRole('button', { name: 'Play' }).first().click();
  await page.waitForTimeout(Number(secs) * 1000);
  const states = await page.evaluate(() => {
    const nodes = {};
    for (const n of document.querySelectorAll('.svelte-flow__node')) {
      const s = n.querySelector('[data-state]');
      nodes[n.dataset.id.replace(/^cell:/, '')] = s?.getAttribute('data-state') ?? null;
    }
    const edges = {};
    for (const e of document.querySelectorAll('.svelte-flow__edge')) {
      const id = e.getAttribute('data-id') ?? e.id;
      // (the state is on the edge's own path since #13; older builds had it on the group)
      const cls = [...e.classList, ...(e.querySelector('.svelte-flow__edge-path')?.classList ?? [])]
        .filter((c) => /^edge-(live|idle|on|off|unrouted|routed|cut)$/.test(c))
        .join(' ');
      edges[id.replace(/cell:/g, '')] = cls;
    }
    return { nodes, edges };
  });
  const file = title.replace(/[^\w]+/g, '-').toLowerCase();
  await page.screenshot({ path: join(out, `${file}.png`) });
  writeFileSync(join(out, `${file}.json`), JSON.stringify(states, null, 1));
  console.log(`${title}: ${join(out, file)}.png`);
  await page.close();
}
await browser.close();
await server.close();
