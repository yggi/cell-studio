// The fast contact sheets (`node tools/gallery.mjs <wheels|edges|mockups>`): the harness (harness.html) sets every kind
// of the subject up directly — no piece played, no layout settling — so a sheet takes seconds, not minutes. Served by
// vite's dev server from the working tree (no build).
//
//   node tools/gallery.mjs wheels --fast                      # every example, 3 s in
//   node tools/gallery.mjs wheels --fast 5 Hypercell Metronome   # 5 s in, only these pieces
//   SIZES=32,44,64 STOPPED=1 OUT=shots/fast node tools/gallery.mjs wheels --fast   (wheels: sizes, stopped)
//   node tools/gallery.mjs edges                              # every kind of edge, in every state
//   node tools/gallery.mjs mockups                            # the design questions of #107 (Mockups.svelte)
//   CELLS=piece.cells node tools/gallery.mjs golden           # any source in the real Graph, stopped and live
//   ZOOM=parts node tools/gallery.mjs zoom 3 pop korobeiniki  # close-ups of &parts in each, stopped and live (default:
//                                                              # every wheel with bulbs), tiles/<piece>-<state>-<cell>.png
//
// Writes <OUT>/sheet.png (the whole page), <OUT>/tiles/<kind>.png (one per kind: a <figure data-kind>), <OUT>/index.html
// (the tiles) and <OUT>/<subject>.json. OUT defaults to shots/<subject>-fast (mockups: shots/wheel-mockups).
import { createServer } from 'vite';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '../profile/playwright.mjs';

const subject = process.env.GALLERY_SUBJECT ?? 'wheels';
const mockups = subject === 'mockups';
const args = process.argv.slice(2);
// (the seconds are optional: a first word that isn't a number is a piece's)
const [secs, ...only] = args.length && !Number.isNaN(Number(args[0])) ? args : ['3', ...args];
const out = process.env.OUT ?? (mockups ? 'shots/wheel-mockups' : `shots/${subject}-fast`);
const scale = Number(process.env.SCALE ?? 2);
rmSync(join(out, 'tiles'), { recursive: true, force: true });
mkdirSync(join(out, 'tiles'), { recursive: true });

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const q = new URLSearchParams({ subject, t: secs });
if (only.length) q.set('only', only.join(','));
if (process.env.SIZES) q.set('sizes', process.env.SIZES);
if (process.env.STOPPED) q.set('stopped', '');
// (ROWS=tower: the rows by the frequency tower, a probe: src/layout/tower.ts)
if (process.env.ROWS) q.set('rows', process.env.ROWS);
// (OUTPUTS=top: the outputs-top probe, src/ui/outputs.ts)
if (process.env.OUTPUTS) q.set('outputs', process.env.OUTPUTS);
// (golden: CELLS=piece.cells draws that source instead, in the real Graph)
if (process.env.CELLS) q.set('src', readFileSync(process.env.CELLS, 'utf8'));
const url = `${server.resolvedUrls.local[0]}tools/gallery/harness.html?${q}`;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: { edges: 2560, golden: 2840, zoom: 1600 }[subject] ?? 1500, height: 1000 }, deviceScaleFactor: scale });
const problems = [];
page.on('pageerror', (e) => problems.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && problems.push(m.text()));
page.on('response', (r) => r.status() >= 400 && !/favicon/.test(r.url()) && problems.push(`${r.status()} ${r.url()}`));
// (a cold dev server compiles the app's modules on the first load: that can take longer than playwright's 30 s)
await page.goto(url, { timeout: 120000 });
if (mockups) {
  // the design questions (#107): a picture of each, and of the whole page
  await page.waitForSelector('section[data-mock]', { timeout: 60000 });
  await page.waitForTimeout(1500);
  const sections = page.locator('section[data-mock]');
  const names = await sections.evaluateAll((ss) => ss.map((s) => s.getAttribute('data-mock')));
  for (const [i, n] of names.entries()) await sections.nth(i).screenshot({ path: join(out, `${n}.png`) });
  await page.screenshot({ path: join(out, 'mockups.png'), fullPage: true });
  await browser.close();
  await server.close();
  console.log(`${names.length} questions → ${out}/`);
  if (problems.length) console.log(`${problems.length} problems:\n  ` + problems.slice(0, 20).join('\n  '));
  process.exit(problems.length ? 1 : 0);
}
const slug = (s) =>
  s
    .replace(/[^\w@]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
await page.waitForSelector('figure[data-kind]', { timeout: 60000 });
await page.waitForTimeout(subject === 'golden' || subject === 'zoom' ? 6000 : 1500); // (the spectra fill in from the made-up sound; a graph lays itself out and frames itself)
if (subject === 'zoom') {
  // each frame zoomed in on its cells (ZOOM=a,b, or every wheel with bulbs), a close-up of each with room round it
  const want = process.env.ZOOM?.split(',').filter(Boolean);
  const frames = await page.$$eval('figure[data-kind]', (fs) => fs.map((f) => f.dataset.kind));
  let n = 0;
  for (const [i, key] of frames.entries()) {
    const figure = page.locator('figure[data-kind]').nth(i);
    const cells =
      want ??
      (await figure.locator('[data-bulb]').evaluateAll((bs) => [...new Set(bs.map((b) => b.closest('.svelte-flow__node')?.getAttribute('data-id')?.slice(5)).filter(Boolean))]));
    for (const cell of cells) {
      const node = figure.locator(`.svelte-flow__node[data-id="cell:${cell}"]`);
      if (!(await node.count())) continue;
      await node.scrollIntoViewIfNeeded();
      // (zoomed by the wheel, as a hand would, centred on the cell)
      for (let k = 0; k < 7; k++) {
        const b = await node.boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
        await page.mouse.wheel(0, -300);
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(500);
      const b = await node.boundingBox();
      const pad = b.width * 0.45;
      await page.screenshot({
        path: join(out, 'tiles', `${slug(key)}-${slug(cell)}.png`),
        clip: { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad },
      });
      // (back out, for the next cell)
      for (let k = 0; k < 7; k++) await page.mouse.wheel(0, 300);
      await page.waitForTimeout(300);
      n++;
    }
  }
  await browser.close();
  await server.close();
  console.log(`${n} close-ups → ${join(out, 'tiles')}`);
  if (problems.length) console.log(`${problems.length} problems:\n  ` + problems.slice(0, 20).join('\n  '));
  process.exit(problems.length ? 1 : 0);
}
const kinds = await page.$$eval('figure[data-kind]', (fs) =>
  fs.map((f) => ({
    key: f.dataset.kind,
    caption: f.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    wheels: [...f.querySelectorAll('[data-wheel]')].map((w) => [w.dataset.wheel, w.dataset.mode, w.dataset.show].filter(Boolean).join(':')),
  })),
);
const figures = page.locator('figure[data-kind]');
for (const [i, k] of kinds.entries()) {
  k.file = `${slug(k.key)}.png`;
  await figures.nth(i).screenshot({ path: join(out, 'tiles', k.file) });
}
await page.screenshot({ path: join(out, 'sheet.png'), fullPage: true });
await browser.close();
await server.close();

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>${esc(subject)} (fast)</title><style>body{margin:0;padding:20px;background:#1f222b;color:#e6e8ee;font:13px system-ui}img{display:block;max-width:100%;margin:6px 0 18px}</style>
<h1>${esc(subject)} (fast)</h1><p>${kinds.length} kinds · ${esc(secs)} s in${only.length ? ' · ' + esc(only.join(', ')) : ''}</p>
${kinds.map((k) => `<div>${esc(k.caption)}</div><img src="tiles/${esc(k.file)}" alt="${esc(k.key)}">`).join('\n')}${problems.length ? `<h2>Problems</h2><pre>${esc(problems.join('\n'))}</pre>` : ''}`,
);
writeFileSync(join(out, `${subject}.json`), JSON.stringify(kinds, null, 1));
console.log(`${kinds.length} kinds → ${join(out, 'sheet.png')}, ${join(out, 'index.html')}`);
if (problems.length) {
  console.log(`${problems.length} problems:\n  ` + problems.slice(0, 20).join('\n  '));
  process.exitCode = 1;
}
