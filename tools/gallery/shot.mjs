// The gallery's `shot` subject: any element of the real app, picked by a CSS selector, in the states asked for, with
// its computed styles. For a change to one component that the contact sheets don't reach (a margin scope, a sheet's
// field, the keys dock), and for the "how verified" of a style fix: what the browser computes, not what the CSS says.
//
//   node tools/gallery.mjs shot 'aside.margin .scope' 3 Lullaby Hypercell     # the margin's scopes, 3 s into each piece
//   STATES=rest,hover,focus,type=out PROPS=border-bottom-color TARGET=input OPEN=lead STOPPED=1 \
//     node tools/gallery.mjs shot '.cell-sheet .name' 0 'Two voices'          # a sheet's name, its field in four states
//   DOCK=keys PROPS=tab-index node tools/gallery.mjs shot '.keyboard' 0 Sailor # the keys dock open
//
// A piece is a title's words (the first match) or an id (`example:lullaby`). Env: STATES (rest, hover, focus, click,
// type=<text>; default rest), PROPS (computed styles to record, comma-separated; `tab-index` reads the element's
// tabIndex), TARGET (a selector inside the element: what the states act on and the props are read from, the element
// still pictured: a field inside its label), OPEN (a cell whose sheet is opened first: its node is clicked), DOCK (keys or pads: the dock opened, through
// the state it keeps in the browser), STOPPED=1 (not played), PAD (px round each element's tile, default 8), QUERY (the app's query; default `margin`, the margin
// open), MAX (elements per piece, default 8), VIEW (default 1600x1000), SCALE (default 2), OUT (default shots/shot),
// DIST (another build). Writes <OUT>/tiles/<piece>-<n>-<state>.png and <OUT>/shot.json: per tile, the piece, the
// selector's match, the state and the props. It fails on a page error or a selector that matches nothing.
import { preview } from 'vite';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '../profile/playwright.mjs';
import { freshBuild } from '../fresh-build.mjs';
import { isId, parseStates, tileName } from './shotspec.mjs';

const [selector, secs = '3', ...asked] = process.argv.slice(2);
if (!selector || !asked.length) {
  console.error('usage: node tools/gallery.mjs shot <selector> [secs] <pieces…>');
  process.exit(2);
}
const states = parseStates(process.env.STATES);
const props = (process.env.PROPS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const out = process.env.OUT ?? 'shots/shot';
const max = Number(process.env.MAX ?? 8);
const pad = Number(process.env.PAD ?? 8);
const [vw, vh] = (process.env.VIEW ?? '1600x1000').split('x').map(Number);
rmSync(join(out, 'tiles'), { recursive: true, force: true });
mkdirSync(join(out, 'tiles'), { recursive: true });
if (!process.env.DIST) freshBuild();
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, build: process.env.DIST ? { outDir: process.env.DIST } : {}, logLevel: 'error' });
const query = process.env.QUERY ?? 'margin';
const url = server.resolvedUrls.local[0] + (query ? `?${query}` : '');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });

const record = [];
const problems = [];
for (const want of asked) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: Number(process.env.SCALE ?? 2) });
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => problems.push(`${want}: ${e.message}`));
  // (the dock is opened as a person's last visit would leave it: `state/dock.svelte.ts` keeps it in the browser)
  if (process.env.DOCK) {
    const dock = { open: true, tab: process.env.DOCK, octave: 4, velocity: 'height' };
    await page.addInitScript((d) => localStorage.setItem('cell-studio:dock', d), JSON.stringify(dock));
  }
  await page.goto(url);
  await page.getByRole('radio', { name: 'Cards' }).click();
  // (a title's words: the first card whose title holds them, as the smoke test picks pieces)
  const cards = await page.$$eval('button.open', (bs) => bs.map((b) => ({ id: b.dataset.id, title: (b.getAttribute('aria-label') ?? '').replace(/^Open /, '') })));
  const card = isId(want) ? cards.find((c) => c.id === want) : cards.find((c) => c.title.toLowerCase().includes(want.toLowerCase()));
  if (!card) {
    problems.push(`${want}: no piece matches`);
    await page.close();
    continue;
  }
  const title = card.title;
  await page.locator(`button.open[data-id="${card.id}"]`).dispatchEvent('click');
  await page.waitForTimeout(2500); // (the layout settles)
  if (!process.env.STOPPED) {
    await page.locator('.transport').getByRole('button', { name: 'Play' }).first().click();
    await page.waitForTimeout(Number(secs) * 1000);
  }
  if (process.env.OPEN) {
    const node = page.locator(`.svelte-flow__node[data-id="cell:${process.env.OPEN}"]`);
    if (await node.count()) await node.click({ force: true });
    else {
      const cells = await page.$$eval('.svelte-flow__node[data-id^="cell:"]', (ns) => ns.map((n) => n.dataset.id.slice(5)));
      problems.push(`${title}: no cell &${process.env.OPEN} drawn (there are ${cells.join(', ')})`);
      await page.close();
      continue;
    }
  }
  const found = page.locator(selector);
  await found
    .first()
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  const n = Math.min(max, await found.count());
  if (!n) problems.push(`${title}: nothing matches ${selector}`);
  for (let i = 0; i < n; i++) {
    const el = found.nth(i);
    // (what the states act on and the props are read from: the element, or TARGET inside it, a field in its label)
    const target = process.env.TARGET ? el.locator(process.env.TARGET).first() : el;
    for (const s of states) {
      // (each state from rest: the pointer away, nothing focused)
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      if (s.kind === 'hover') await target.hover();
      if (s.kind === 'focus') await target.focus();
      if (s.kind === 'click') await target.click();
      if (s.kind === 'type') {
        await target.fill(s.text);
        await page.waitForTimeout(150);
        await target.evaluate((e) => e.blur());
      }
      await page.waitForTimeout(100);
      const file = tileName(title, i, s.label);
      // (with PAD px round it, in the page: an element's own box clips what is drawn at its edge)
      const box = await el.boundingBox();
      if (!box) continue;
      const x = Math.max(0, box.x - pad);
      const y = Math.max(0, box.y - pad);
      await page.screenshot({ path: join(out, 'tiles', file), clip: { x, y, width: Math.min(vw - x, box.width + 2 * pad), height: Math.min(vh - y, box.height + 2 * pad) } });
      const style = await target.evaluate(
        (e, ps) => Object.fromEntries(ps.map((p) => [p, p === 'tab-index' ? String(e.tabIndex) : getComputedStyle(e).getPropertyValue(p)])),
        props,
      );
      record.push({ piece: title, index: i, state: s.label, file, ...(props.length ? { style } : {}) });
      console.log(
        `${file}${
          props.length
            ? '  ' +
              Object.entries(style)
                .map(([k, v]) => `${k}: ${v}`)
                .join('; ')
            : ''
        }`,
      );
    }
  }
  await page.close();
}
writeFileSync(join(out, 'shot.json'), JSON.stringify({ selector, states: states.map((s) => s.label), props, tiles: record }, null, 1));
await browser.close();
await server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`${record.length} tiles in ${join(out, 'tiles')}`);
