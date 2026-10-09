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
// (GATES=on: the arrangement as gates, a probe: src/layout/gates.ts)
if (process.env.GATES) q.set('gates', process.env.GATES);
// (JUNCTIONS=bodies: junctions as nodes in the layout, a probe)
if (process.env.JUNCTIONS) q.set('junctions', process.env.JUNCTIONS);
// (golden: CELLS=piece.cells draws that source instead, in the real Graph)
if (process.env.CELLS) q.set('src', readFileSync(process.env.CELLS, 'utf8'));
const url = `${server.resolvedUrls.local[0]}tools/gallery/harness.html?${q}`;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: { edges: 2560, golden: 2840 }[subject] ?? 1500, height: 1000 }, deviceScaleFactor: scale });
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
await page.waitForSelector('figure[data-kind]', { timeout: 60000 });
await page.waitForTimeout(subject === 'golden' ? 6000 : 1500); // (the spectra fill in from the made-up sound; a graph lays itself out and frames itself)
const kinds = await page.$$eval('figure[data-kind]', (fs) =>
  fs.map((f) => ({
    key: f.dataset.kind,
    caption: f.querySelector('figcaption')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    wheels: [...f.querySelectorAll('[data-wheel]')].map((w) => [w.dataset.wheel, w.dataset.mode, w.dataset.show].filter(Boolean).join(':')),
  })),
);
const slug = (s) =>
  s
    .replace(/[^\w@]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
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
