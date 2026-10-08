// A keyboard walk (#135): Tab through each view and report the stops that show no focus ring.
// A stop shows one when its computed outline or box-shadow is drawn; `all: unset` and `outline: none` take it away.
//
//   CHROME_PATH=/opt/pw-browsers/chromium node tools/tabwalk.mjs            # 70 stops in every view, desktop and phone width
//   node tools/tabwalk.mjs 120 start library                                # 120 stops, only the views with these words
//
// Runs the working tree on a dev server (no build; the first load is slow). Prints one line per view and width;
// exits 1 when a stop has no ring. Chromium as for the smoke test (tools/profile/playwright.mjs).
import { createServer } from 'vite';
import { chromium } from './profile/playwright.mjs';

const args = process.argv.slice(2);
const stops = args.length && !Number.isNaN(Number(args[0])) ? Number(args.shift()) : 70;
const T = { timeout: 5000 };
const click = (selector) => (p) => p.evaluate((s) => document.querySelector(s).click(), selector);
const byText = (re) => (p) => p.evaluate((src) => [...document.querySelectorAll('button')].find((e) => new RegExp(src).test(e.textContent)).click(), re.source);
const tab = (re) => (p) =>
  p
    .locator('button:visible', { hasText: re })
    .first()
    .click({ force: true, ...T });
// (each view: how to get to it from the start view; `phone` ones only exist at phone width)
const VIEWS = {
  start: async () => {},
  files: byText(/^Files/),
  shorten: byText(/Shorten/),
  forces: click('[title^="Layout forces"]'),
  legend: click('[title^="What the colours"]'),
  'add-cell': byText(/^\+/),
  cards: byText(/^Cards$/),
  library: async (p) => {
    await byText(/^Cards$/)(p);
    await p.locator('.piece:visible').first().click(T);
  },
  'cell-sheet': (p) =>
    p
      .locator('.svelte-flow__node:visible')
      .nth(3)
      .dblclick({ force: true, ...T }),
  'phone-graph': tab(/^Graph$/),
  'phone-code': tab(/^Code$/),
};
const WIDTHS = [1280, 390];

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
let missing = 0;
for (const width of WIDTHS) {
  for (const [name, open] of Object.entries(VIEWS)) {
    if ((width > 800 && name.startsWith('phone')) || (args.length && !args.some((a) => name.includes(a)))) continue;
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    const label = `${String(width).padStart(4)} ${name.padEnd(12)}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForTimeout(2500); // (the layout settles)
      await open(page);
      await page.waitForTimeout(800);
    } catch (e) {
      console.log(`${label} could not be opened: ${String(e).split('\n')[0]}`);
      missing++;
      await page.close();
      continue;
    }
    const bare = new Set();
    let n = 0;
    for (let i = 0; i < stops; i++) {
      await page.keyboard.press('Tab');
      const stop = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const c = getComputedStyle(e);
        const ring = (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== 'none';
        const label = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || '').trim().slice(0, 24);
        return { ring, what: `${e.tagName.toLowerCase()}.${(e.getAttribute('class') || '').split(' ')[0]} "${label}"` };
      });
      if (!stop) continue;
      n++;
      if (!stop.ring) bare.add(stop.what);
    }
    console.log(`${label} ${n} stops, ${bare.size ? `${bare.size} without a ring: ${[...bare].join(' | ')}` : 'all with a ring'}`);
    missing += bare.size;
    await page.close();
  }
}
await browser.close();
await server.close();
process.exit(missing ? 1 : 0);
