// The fragment browser in the real app (`node tools/gallery.mjs browser`): the library's wheel, its fragments cell, the
// map, a filter, a fragment's details and a fragment opened (one per facet), each at a phone's size (touch, the page's
// own pinch) and a desktop's, from vite's dev server (the working tree, no build). Besides the pictures, what a picture
// can't say, measured in `browser.json`:
//   pinch     the page's own zoom (`visualViewport.scale`) after a two-finger pinch on each screen: 1 where the screen
//             keeps the gesture (it zooms its own canvas or nothing), more where the whole UI zoomed
//   zoomed    whether the map zoomed itself (a pinch on a phone, a wheel on a desktop): its Fit shows
//   blank     the room the map leaves empty, px between its plot and its region's edges (below, left, right): its
//             padding only, where the plot fills what the controls leave
//   overlaps  the visible controls of a screen whose boxes cross (buttons, fields, a dialog's parts, the fragment's
//             bar and preview), a pair each, by their text or label
//   filtered  a fragment the facet filter leaves out, tapped: whether it opened, its card or itself (it shouldn't)
// Writes <OUT>/tiles/<size>-<state>.png, <OUT>/browser.json and <OUT>/index.html; OUT defaults to shots/browser.
// SIZES=phone,wide picks sizes; FACETS=rhythm,harmony picks the facets opened. Fails on a page error.
import { createServer } from 'vite';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '../profile/playwright.mjs';

const out = process.env.OUT ?? 'shots/browser';
const sizes = (process.env.SIZES ?? 'phone,wide').split(',');
rmSync(join(out, 'tiles'), { recursive: true, force: true });
mkdirSync(join(out, 'tiles'), { recursive: true });

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const problems = [];
const tiles = [];
const report = { pinch: {}, zoomed: {}, blank: {}, overlaps: {}, filtered: {} };

/** The visible controls on the page whose boxes cross: each pair once, by its text or label. */
const overlaps = (page) =>
  page.evaluate(() => {
    const sel = 'button, input, select, label, [role=button], [role=status], .preview, .following, h2, h3, header, .controls, .facets';
    const named = (el) => (el.getAttribute('aria-label') || el.textContent || el.className || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
    const shown = [...document.querySelectorAll(sel)].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
      // (what's under a dialog or an overlay doesn't count: the topmost at its middle must be it or inside it)
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && (el === top || el.contains(top) || top.contains(el));
    });
    const pairs = [];
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < shown.length; j++) {
        const a = shown[i];
        const b = shown[j];
        if (a.contains(b) || b.contains(a)) continue;
        const p = a.getBoundingClientRect();
        const q = b.getBoundingClientRect();
        const w = Math.min(p.right, q.right) - Math.max(p.left, q.left);
        const h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
        if (w > 2 && h > 2) pairs.push(`${named(a)} × ${named(b)} (${Math.round(w)}×${Math.round(h)} px)`);
      }
    return pairs;
  });

/** Pinch out with two fingers about the middle of `box` (touch events, as a hand), then read the page's zoom, and reset it. */
async function pinch(page, box) {
  const cdp = await page.context().newCDPSession(page);
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  const at = (d) => [
    { x: x - d, y, id: 0 },
    { x: x + d, y, id: 1 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(30) });
  for (let d = 35; d <= 120; d += 5) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(d) });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const scale = await page.evaluate(() => window.visualViewport?.scale ?? 1);
  // (back to 1 for the pictures after: what a person can't always do, which is the bug this measures)
  await cdp.send('Emulation.resetPageScaleFactor').catch(() => {});
  await cdp.detach();
  return Math.round(scale * 100) / 100;
}

async function shoot(page, size, state) {
  await page.waitForTimeout(250);
  const name = `${size}-${state}.png`;
  await page.screenshot({ path: join(out, 'tiles', name) });
  tiles.push(name);
  report.overlaps[`${size}-${state}`] = await overlaps(page);
  console.log(name, report.overlaps[`${size}-${state}`].length ? `${report.overlaps[`${size}-${state}`].length} overlaps` : '');
}

const facetsWanted = (process.env.FACETS ?? '').split(',').filter(Boolean);

for (const size of sizes) {
  const phone = size === 'phone';
  const context = await browser.newContext(
    phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1400, height: 900 } },
  );
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push(`${size}: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && problems.push(`${size}: ${m.text()}`));
  await page.goto(url, { timeout: 120000 });
  const cell = page.locator('button.disc[aria-label^="Fragments"]');
  await cell.waitFor({ timeout: 60000 });
  await cell.scrollIntoViewIfNeeded();
  await shoot(page, size, 'library');

  await cell.click();
  const map = page.locator('.map');
  await map.waitFor();
  await page.waitForTimeout(900);
  await shoot(page, size, 'map');
  // the room the map leaves empty: px between its plot and its region's edges (the region's padding included)
  report.blank[size] = await page.evaluate(() => {
    const [r, p] = [document.querySelector('.map').getBoundingClientRect(), document.querySelector('.map .plot svg').getBoundingClientRect()];
    return { below: Math.round(r.bottom - p.bottom), left: Math.round(p.left - r.left), right: Math.round(r.right - p.right) };
  });
  // the map's own zoom: a pinch on a phone, a wheel on a desktop; its names show once zoomed
  const plot = (await map.locator('.plot svg').boundingBox()) ?? { x: 0, y: 0, width: 390, height: 844 };
  if (phone) report.pinch[`${size}-map`] = await pinch(page, plot);
  else {
    await page.mouse.move(plot.x + plot.width / 2, plot.y + plot.height / 2);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -250);
  }
  report.zoomed = { ...report.zoomed, [size]: await map.locator('.fit').isVisible() };
  await shoot(page, size, 'map-zoomed');
  if (await map.locator('.fit').isVisible()) await map.locator('.fit').click();

  // a filter, then a fragment it leaves out tapped
  const chips = map.locator('.facets button:not(.kind)');
  const facets = await chips.allTextContents();
  await chips.first().click();
  await page.waitForTimeout(300);
  await shoot(page, size, 'map-filtered');
  // (tapped where it is drawn, as a hand would: whatever is there takes the tap)
  const left = map.locator('circle.fragment.dim').first();
  if (await left.count()) {
    const id = (await left.getAttribute('data-key')).slice(2);
    await left.click({ force: true });
    await page.waitForTimeout(600);
    // (opened: its card, or the fragment itself where there are no cards)
    const card = page.locator('.sheet.detail h3');
    const opened = ((await card.isVisible()) && (await card.textContent()).trim() === id) || !(await map.isVisible().catch(() => false));
    report.filtered[size] = { id, opened };
    if (opened) await shoot(page, size, 'filtered-opened');
    if (await card.isVisible()) await page.keyboard.press('Escape');
  }
  // a piece's card from the map
  await chips.first().click();
  const pieceNode = map.locator('circle.piece[role=button]').first();
  if (await pieceNode.count()) {
    await pieceNode.click({ force: true });
    await page.waitForTimeout(500);
    if (await page.locator('.sheet.detail').isVisible()) await shoot(page, size, 'details-piece');
  }
  await page.goto(url);
  await page.locator('button.disc[aria-label^="Fragments"]').waitFor({ timeout: 60000 });

  // a fragment of each facet: its details (where there are), then opened
  const ids = await page.evaluate(
    async (wanted) => {
      const { catalogue } = await import('/node_modules/@yggi/cells/src/repository/catalogue.ts');
      const firsts = new Map();
      for (const e of catalogue()) if (e.facets[0] && !firsts.has(e.facets[0]) && !e.id.includes('/')) firsts.set(e.facets[0], e.id);
      return [...firsts].filter(([f]) => !wanted.length || wanted.includes(f));
    },
    facetsWanted.length ? facetsWanted : facets,
  );
  for (const [facet, id] of ids) {
    await page.locator('button.disc[aria-label^="Fragments"]').click();
    await page.locator('.map').waitFor();
    await page.waitForTimeout(500);
    const node = page.locator(`.map circle[data-key="f:${id}"]`).first();
    await node.click({ force: true });
    await page.waitForTimeout(500);
    const details = page.locator('.sheet.detail');
    if (await details.isVisible()) {
      await shoot(page, size, `details-${facet}`);
      await details.getByRole('button', { name: 'Open', exact: true }).click();
    }
    await page.waitForSelector('.following.fragment', { timeout: 20000 });
    await page.waitForTimeout(800);
    await shoot(page, size, `fragment-${facet}`);
    if (phone) report.pinch[`${size}-fragment-${facet}`] = await pinch(page, { x: 0, y: 200, width: 390, height: 500 });
    await page.goto(url);
    await page.locator('button.disc[aria-label^="Fragments"]').waitFor({ timeout: 60000 });
  }
  await context.close();
}
await browser.close();
await server.close();

writeFileSync(join(out, 'browser.json'), JSON.stringify(report, null, 2));
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Fragment browser</title><style>body{background:#111;color:#ddd;font:14px system-ui}img{max-height:80vh;display:inline-block;margin:4px 8px 24px 0;vertical-align:top}</style><pre>${JSON.stringify(report, null, 2).replace(/</g, '&lt;')}</pre>${tiles.map((t) => `<figure style="display:inline-block"><figcaption>${t}</figcaption><img src="tiles/${t}"></figure>`).join('')}`,
);
console.log(JSON.stringify({ pinch: report.pinch, zoomed: report.zoomed, blank: report.blank, filtered: report.filtered }));
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
