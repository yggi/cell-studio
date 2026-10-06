// Contact sheet of every example's graph, laid out as the library's miniatures are (src/layout/miniature.ts),
// each with the numbers the layout's baseline records for it: for a look over every layout at once, and before /
// after a change to the layout (#27). From the working tree; no build.
//
//   node tools/graphs.mjs                         # shots/graphs/
//   OUT=shots/graphs-before node tools/graphs.mjs # (on the base commit, to compare)
//
// Writes <OUT>/index.html (the sheet: open it in a browser) and <OUT>/sheet.png (it, rendered). Chromium as for the
// smoke test (tools/profile/playwright.mjs; in a cloud session CHROME_PATH=/opt/pw-browsers/chromium).
import { runnerImport } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from './profile/playwright.mjs';

const out = process.env.OUT ?? 'shots/graphs';
mkdirSync(out, { recursive: true });
// (the sheet is TypeScript over src/: loaded through vite)
const { module } = await runnerImport('./tools/graphs/sheet.ts', { configFile: false });
const html = join(out, 'index.html');
writeFileSync(html, module.sheetHtml(pathToFileURL(resolve('src/app.css')).href));
const browser = await chromium.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
await page.goto(pathToFileURL(resolve(html)).href);
await page.screenshot({ path: join(out, 'sheet.png'), fullPage: true });
await browser.close();
console.log(`${out}/index.html, ${out}/sheet.png`);
