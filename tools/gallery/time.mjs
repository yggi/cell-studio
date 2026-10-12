// The time view's sheet (`node tools/gallery.mjs time [pieces…]`, #286): each piece opened in the real app (vite's dev
// server, the working tree, no build), the time view shown, and a picture of each state once the worker has answered.
//   mix     the default layers: the notes, the scalogram as breaks · entries · density, the meter and the levels heard,
//           the sections, the boundaries heard
//   keys    the scalogram listening to new pitch classes alone (5 to 12's keys)
//   sound   the waterfall (each band in its voice's colour) and the waveform on (rendered: one round, five minutes at most)
//   zoom    zoomed in eight times, a third of the way in
//   patterns  the motifs heard at two time scales boxed, the foldings alike listed
//   phone   at a phone's width, the Time tab
// Writes <OUT>/tiles/<piece>-<state>.png and <OUT>/index.html; OUT defaults to shots/time. STATES=mix,keys picks states.
// Pieces by their example names (default: hypercell pop korobeiniki fiveto12 pachelbel). Fails on a page error.
import { createServer } from 'vite';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '../profile/playwright.mjs';

const pieces = process.argv.slice(2).filter((a) => Number.isNaN(Number(a)));
const wanted = pieces.length ? pieces : ['hypercell', 'pop', 'korobeiniki', 'fiveto12', 'pachelbel'];
const states = (process.env.STATES ?? 'mix,keys,sound,zoom,patterns,phone').split(',');
const out = process.env.OUT ?? 'shots/time';
rmSync(join(out, 'tiles'), { recursive: true, force: true });
mkdirSync(join(out, 'tiles'), { recursive: true });

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const problems = [];
const tiles = [];

/** The view of a piece in a fresh page: opened from the library, the time view shown, settled. */
async function open(piece, wide) {
  const page = await browser.newPage({ viewport: wide ? { width: 1400, height: 900 } : { width: 400, height: 820 } });
  page.on('pageerror', (e) => problems.push(`${piece}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && problems.push(`${piece}: ${m.text()}`));
  await page.goto(url, { timeout: 120000 });
  await page.getByRole('radio', { name: 'Cards' }).click();
  await page.waitForSelector('button.open', { state: 'attached' });
  await page.locator(`button.open[data-id="example:${piece}"]`).dispatchEvent('click');
  await page.waitForTimeout(800);
  if (wide) await page.locator('.toolbar button', { hasText: /^time$/ }).click();
  else await page.getByRole('tab', { name: 'Time' }).click();
  await page.waitForSelector('.time canvas');
  return page;
}
/** Until the worker and the render are done (a day's scalogram takes a minute; five minutes of sound longer). */
async function settle(page) {
  await page.waitForTimeout(2500);
  await page.waitForFunction(() => !document.querySelector('.time .busy'), null, { timeout: 600000 });
  await page.waitForTimeout(400);
}
const toggle = (page, name) => page.locator('.time .toggle', { hasText: new RegExp(`^${name}$`) }).click();

for (const piece of wanted)
  for (const state of states) {
    const page = await open(piece, state !== 'phone');
    if (state === 'keys') await page.locator('.time select').selectOption('harmony');
    if (state === 'patterns') await toggle(page, 'patterns');
    if (state === 'sound') {
      await toggle(page, 'waterfall');
      await toggle(page, 'waveform');
    }
    await settle(page);
    if (state === 'zoom') {
      const box = await page.locator('.time canvas').boundingBox();
      await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
      for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -175);
      await page.waitForTimeout(400);
    }
    const name = `${piece}-${state}.png`;
    await page.screenshot({ path: join(out, 'tiles', name) });
    tiles.push(name);
    await page.close();
    console.log(name);
  }
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Time view</title><style>body{background:#111;color:#ddd;font:14px system-ui}img{max-width:100%;display:block;margin:4px 0 24px}</style>${tiles.map((t) => `<h3>${t}</h3><img src="tiles/${t}">`).join('')}`,
);
await browser.close();
await server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
