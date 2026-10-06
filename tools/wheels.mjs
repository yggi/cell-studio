// Contact sheet of every kind of wheel, each in a representative state: for a visual pass over the
// wheels, and before / after a change to how they're drawn. Every wheel carries `data-wheel` (its
// component) and, where it has one, `data-mode` / `data-show`; their combination, with where it sits
// (a graph node, a petal, the cell's sheet, the library), is a *kind*. Each piece is opened and played;
// the first wheel of each kind is kept, and replaced by one in a livelier state (live > idle > on >
// unrouted > off) when one turns up. For each new kind in the graph its cell's sheet is opened too.
//
//   npm run build && node tools/wheels.mjs                 # every piece, 3 s into each
//   node tools/wheels.mjs 4 Hypercell "Music Box"          # 4 s, only titles containing these words
//   OUT=shots/before DIST=/path/to/other/dist node tools/wheels.mjs   # another build, to compare
//   JOBS=2 SCALE=1 node tools/wheels.mjs                   # fewer pages at once, 1× pixels
//
// Writes <OUT>/tiles/*.png, <OUT>/index.html (the sheet, grouped), <OUT>/sheet.png (it, rendered) and
// <OUT>/wheels.json (every kind: where it was found, in which state, and which pieces have it).
// OUT defaults to shots/wheels. Viewport VIEW (default 3000x1900) at SCALE (default 2). Chromium as for the smoke test
// (tools/profile/playwright.mjs; in a cloud session CHROME_PATH=/opt/pw-browsers/chromium).
import { preview } from 'vite';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from './profile/playwright.mjs';

const [secs = '3', ...only] = process.argv.slice(2);
const out = process.env.OUT ?? 'shots/wheels';
const jobs = Number(process.env.JOBS ?? 4);
const scale = Number(process.env.SCALE ?? 2);
// a large viewport: the graph opens fitted, so its wheels come out near their own size, not at half of it
const [vw, vh] = (process.env.VIEW ?? '3000x1900').split('x').map(Number);
rmSync(join(out, 'tiles'), { recursive: true, force: true });
mkdirSync(join(out, 'tiles'), { recursive: true });

const RANK = { live: 5, idle: 4, on: 3, unrouted: 2, off: 1 };
const rank = (s) => RANK[s] ?? 0;
const PAD = 14;
/** kind → { key, family, where, wheel, mode, show, piece, name, state, zoom, file, pieces:Set } */
const kinds = new Map();
const problems = [];
/** graph kinds whose cell's sheet has been looked at (a failed try leaves it for another piece) */
const sheeted = new Set();

const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, build: process.env.DIST ? { outDir: process.env.DIST } : {}, logLevel: 'error' });
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const newPage = () => browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: scale });

const slug = (s) => s.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
const keyOf = (w) => [w.where, w.wheel, w.mode, w.show].filter(Boolean).join(':');
const FAMILY = { graph: 'Graph', petal: 'Graph — petals', sheet: "A cell's sheet", library: 'Library' };

/** Every wheel on the page under `scope`, with what it is and where its node is. */
async function wheelsIn(page, scope) {
  return page.evaluate((scope) => {
    const zoom = Number(/scale\(([\d.]+)\)/.exec(document.querySelector('.svelte-flow__viewport')?.style.transform ?? '')?.[1] ?? 1);
    return [...document.querySelectorAll(`${scope} [data-wheel]`)].map((el) => {
      const node = el.closest('.svelte-flow__node');
      const host = node ?? el;
      const r = host.getBoundingClientRect();
      // the node, the wheel (its ticks can stand out of the node) and the name under it
      const parts = [r, el.getBoundingClientRect(), ...[...(node?.querySelectorAll('.name') ?? [])].map((n) => n.getBoundingClientRect())];
      const box = { x: Math.min(...parts.map((p) => p.x)), y: Math.min(...parts.map((p) => p.y)), right: Math.max(...parts.map((p) => p.right)), bottom: Math.max(...parts.map((p) => p.bottom)) };
      return {
        wheel: el.dataset.wheel,
        mode: el.dataset.mode ?? '',
        show: el.dataset.show ?? '',
        id: node?.dataset.id ?? null,
        petal: !!node && !node.querySelector('.name'),
        state: el.closest('[data-state]')?.getAttribute('data-state') ?? '',
        name: (node?.dataset.id ?? '').replace(/^cell:/, ''),
        zoom: node ? zoom : 1,
        box: { x: box.x, y: box.y, width: box.right - box.x, height: box.bottom - box.y },
      };
    });
  }, scope);
}

async function shoot(page, box, file) {
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - PAD);
  const y = Math.max(0, box.y - PAD);
  const width = Math.min(vp.width, box.x + box.width + PAD) - x;
  const height = Math.min(vp.height, box.y + box.height + PAD) - y;
  if (width < 8 || height < 8) return false;
  await page.screenshot({ path: join(out, 'tiles', file), clip: { x, y, width, height } });
  return true;
}

/** Keep `w` if its kind is new, or if it shows the kind in a livelier state than the one kept. */
async function offer(page, w, piece) {
  const key = keyOf(w);
  const had = kinds.get(key);
  if (had) had.pieces.add(piece);
  if (had && rank(w.state) <= rank(had.state)) return false;
  const file = `${slug(key)}.png`;
  // (claimed before the screenshot, so that another page finding the same kind meanwhile leaves it)
  const kept = { key, family: FAMILY[w.where], where: w.where, wheel: w.wheel, mode: w.mode, show: w.show, piece, name: w.name, state: w.state, zoom: w.zoom, file, pieces: new Set([...(had?.pieces ?? []), piece]) };
  kinds.set(key, kept);
  if (await shoot(page, w.box, file)) return !had;
  if (had) kinds.set(key, { ...had, pieces: kept.pieces });
  else kinds.delete(key);
  return false;
}

async function library(page) {
  await page.goto(url);
  await page.getByRole('radio', { name: 'Cards' }).click();
  await page.waitForSelector('[data-wheel="piece"]');
  await page.waitForTimeout(500);
  for (const w of (await wheelsIn(page, '.card')).slice(0, 1)) await offer(page, { ...w, where: 'library', mode: 'card', state: '' }, 'library');
  await page.getByRole('radio', { name: 'Graph' }).click();
  await page.waitForTimeout(2500); // (the layout settles)
  const all = await page.evaluate(() => {
    const el = document.querySelector('.svelte-flow');
    const r = el?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
  });
  if (all) await offer(page, { wheel: 'library', mode: 'graph', where: 'library', box: all, state: '', name: '', zoom: 1 }, 'library');
}

async function piece(page, p) {
  await page.goto(url);
  await page.getByRole('radio', { name: 'Cards' }).click();
  await page.locator(`button.open[data-id="${p.id}"]`).dispatchEvent('click');
  await page.waitForTimeout(2500); // (the layout settles)
  await page.locator('.transport').getByRole('button', { name: 'Play' }).first().click();
  await page.waitForTimeout(Number(secs) * 1000);
  let added = 0;
  const graph = await wheelsIn(page, '.svelte-flow');
  for (const w of graph) if (await offer(page, { ...w, where: w.petal ? 'petal' : 'graph' }, p.title)) added++;
  // the sheet of one cell of each graph kind (turntables, scopes and the sun open no sheet on a tap)
  for (const w of graph) {
    const key = keyOf({ ...w, where: 'graph' });
    if (!w.id || w.petal || !['cell', 'spectrum', 'wave'].includes(w.wheel) || sheeted.has(key)) continue;
    sheeted.add(key);
    const node = page.locator(`.svelte-flow__node[data-id="${w.id}"]`);
    await node.click({ force: true, timeout: 2000 }).catch(() => {});
    const sheet = page.locator('.sheet[role="dialog"]');
    if (!(await sheet.isVisible().catch(() => false))) {
      sheeted.delete(key);
      continue;
    }
    await page.waitForTimeout(600); // (it rises in)
    for (const s of await wheelsIn(page, '.sheet')) if (await offer(page, { ...s, where: 'sheet', name: w.name, zoom: 1 }, p.title)) added++;
    await sheet.getByRole('button', { name: 'Close' }).first().click().catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(200);
  }
  await page.locator('.transport').getByRole('button', { name: 'Pause' }).first().click().catch(() => {});
  return added;
}

// ---- the library first (and the list of pieces), then the pieces, JOBS pages at once
const first = await newPage();
first.on('pageerror', (e) => problems.push(`library: ${e.message}`));
await library(first);
await first.getByRole('radio', { name: 'Cards' }).click();
const pieces = (await first.$$eval('button.open', (bs) => bs.map((b) => ({ id: b.dataset.id, title: b.getAttribute('aria-label').replace(/^Open /, '') }))))
  .filter((p) => only.length === 0 || only.some((w) => p.title.toLowerCase().includes(w.toLowerCase())));
await first.close();
if (pieces.length === 0) throw new Error('no piece matches ' + only.join(', '));

const queue = [...pieces];
let done = 0;
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    const page = await newPage();
    page.setDefaultTimeout(8000);
    let current = '';
    page.on('pageerror', (e) => problems.push(`${current}: ${e.message}`));
    for (let p; (p = queue.shift()); ) {
      current = p.title;
      let added = 0;
      try {
        added = await piece(page, p);
      } catch (e) {
        problems.push(`${p.title}: ${String(e.message).split('\n')[0]}`);
      }
      console.log(`${String(++done).padStart(2)}/${pieces.length} ${p.title}${added ? `  +${added}` : ''}`);
    }
    await page.close();
  }),
);

// ---- the sheet: grouped by where the wheel sits, then by component
const list = [...kinds.values()].sort((a, b) => Object.keys(FAMILY).indexOf(a.where) - Object.keys(FAMILY).indexOf(b.where) || a.key.localeCompare(b.key));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const groups = Object.entries(FAMILY)
  .map(([where, title]) => ({ title, items: list.filter((k) => k.where === where) }))
  .filter((g) => g.items.length);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wheels</title>
<style>
  :root { color-scheme: dark; --bg: #0f1115; --card: #171a21; --line: #2a2f3a; --text: #e6e8ee; --muted: #8b93a7; --accent: #f0b429; }
  body { margin: 0; padding: 24px; background: var(--bg); color: var(--text); font: 13px/1.4 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 28px 0 10px; color: var(--muted); font-weight: 600; }
  p.meta { color: var(--muted); margin: 0 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  figure { margin: 0; background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
  figure.wide { grid-column: 1 / -1; }
  .img { height: 200px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .img img { max-width: 100%; max-height: 200px; object-fit: contain; }
  figure.wide .img { height: 640px; }
  figure.wide .img img { max-height: 640px; }
  figcaption b { font-family: ui-monospace, monospace; font-size: 12px; color: var(--accent); }
  figcaption span { display: block; overflow-wrap: anywhere; color: var(--muted); font-size: 11.5px; }
  .state { display: inline-block; padding: 0 6px; border-radius: 6px; border: 1px solid var(--line); font-size: 11px; margin-left: 4px; }
</style></head><body>
<h1>Wheels</h1>
<p class="meta">${list.length} kinds from ${pieces.length} pieces, ${secs} s into each · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · <code>node tools/wheels.mjs</code></p>
${groups
  .map(
    (g) => `<h2>${esc(g.title)} · ${g.items.length}</h2><div class="grid">
${g.items
  .map(
    (k) => `<figure${k.wheel === 'library' ? ' class="wide"' : ''}><div class="img"><img src="tiles/${esc(k.file)}" alt="${esc(k.key)}"></div><figcaption><b>${esc([k.wheel, k.mode, k.show && `show=${k.show}`].filter(Boolean).join(' · '))}</b>${k.state ? `<span class="state">${esc(k.state)}</span>` : ''}
<span>${esc(k.piece)}${k.name ? ` · &amp;${esc(k.name)}` : ''}${k.zoom !== 1 ? ` · zoom ${k.zoom.toFixed(2)}` : ''}</span><span>in ${k.pieces.size} piece${k.pieces.size === 1 ? '' : 's'}</span></figcaption></figure>`,
  )
  .join('\n')}</div>`,
  )
  .join('\n')}
${problems.length ? `<h2>Problems</h2><pre>${esc(problems.join('\n'))}</pre>` : ''}
</body></html>`;
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'wheels.json'), JSON.stringify(list.map((k) => ({ ...k, pieces: [...k.pieces].sort() })), null, 1));

const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
await sheet.goto(pathToFileURL(resolve(out, 'index.html')).href);
await sheet.waitForLoadState('load');
await sheet.screenshot({ path: join(out, 'sheet.png'), fullPage: true });
await browser.close();
await server.close();
console.log(`\n${list.length} kinds → ${join(out, 'index.html')}, ${join(out, 'sheet.png')}`);
if (problems.length) console.log(`${problems.length} problems:\n  ` + problems.slice(0, 20).join('\n  '));
