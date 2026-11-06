// The gallery's `pair` subject: two runs of any subject, before and after a change, as one sheet. Tiles pair up by
// name (`tiles/*.png`, or the folder's own `*.png` for `play`), each pair a row, before on the left; the tiles in one run
// only are listed, so a kind that appeared or went is seen.
//
//   OUT=shots/wheels-before … (on the base) ; OUT=shots/wheels-after … (on the change)
//   node tools/gallery.mjs pair shots/wheels-before shots/wheels-after     # <after>/pairs.html and pairs.png
//
// Env: OUT (default: the after folder), WIDTH (the sheet's width, default 1400). A `shot` run's computed styles
// (its shot.json) are said under each tile.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '../profile/playwright.mjs';
import { pairUp } from './shotspec.mjs';

const [before, after] = process.argv.slice(2);
if (!before || !after) {
  console.error('usage: node tools/gallery.mjs pair <before folder> <after folder>');
  process.exit(2);
}
const tiles = (dir) => (existsSync(join(dir, 'tiles')) ? join(dir, 'tiles') : dir);
const pngs = (dir) => readdirSync(tiles(dir)).filter((f) => f.endsWith('.png') && f !== 'sheet.png' && f !== 'pairs.png');
const { both, onlyBefore, onlyAfter } = pairUp(pngs(before), pngs(after));
// (a shot's computed styles, by tile, where the run wrote them: said under each tile)
const styles = (dir) => {
  const f = join(dir, 'shot.json');
  if (!existsSync(f)) return {};
  return Object.fromEntries(
    (JSON.parse(readFileSync(f, 'utf8')).tiles ?? [])
      .filter((t) => t.style)
      .map((t) => [
        t.file,
        Object.entries(t.style)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; '),
      ]),
  );
};
const [styleBefore, styleAfter] = [styles(before), styles(after)];
const out = process.env.OUT ?? after;
const width = Number(process.env.WIDTH ?? 1400);
const src = (dir, f) => relative(resolve(out), resolve(tiles(dir), f));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Before / after</title>
<style>
  body { margin: 0; padding: 24px; width: ${width}px; background: #15171c; color: #d8dbe2; font: 13px/1.4 system-ui, sans-serif; }
  h1 { font-size: 18px; margin: 0 0 4px; } p { color: #8b90a0; margin: 0 0 16px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
  figure { margin: 0; } figcaption { color: #8b90a0; margin-bottom: 4px; }
  img { max-width: 100%; display: block; border: 1px solid #2a2e38; border-radius: 6px; }
  ul { color: #8b90a0; }
</style></head><body>
<h1>Before / after</h1>
<p>${esc(before)} → ${esc(after)}: ${both.length} pairs${onlyBefore.length ? `, ${onlyBefore.length} before only` : ''}${onlyAfter.length ? `, ${onlyAfter.length} after only` : ''}</p>
${both
  .map(
    (f) =>
      `<div class="row"><figure><figcaption>before · ${esc(f)}${styleBefore[f] ? `<br><code>${esc(styleBefore[f])}</code>` : ''}</figcaption><img src="${esc(src(before, f))}"></figure><figure><figcaption>after${styleAfter[f] ? `<br><code>${esc(styleAfter[f])}</code>` : ''}</figcaption><img src="${esc(src(after, f))}"></figure></div>`,
  )
  .join('\n')}
${onlyBefore.length ? `<h2>Before only</h2><ul>${onlyBefore.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
${onlyAfter.length ? `<h2>After only</h2><ul>${onlyAfter.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
</body></html>`;
writeFileSync(join(out, 'pairs.html'), html);
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: width + 48, height: 800 } });
await page.goto(pathToFileURL(resolve(out, 'pairs.html')).href);
await page.waitForLoadState('load');
await page.screenshot({ path: join(out, 'pairs.png'), fullPage: true });
await browser.close();
console.log(
  `${both.length} pairs: ${join(out, 'pairs.html')}, ${join(out, 'pairs.png')}${onlyBefore.length + onlyAfter.length ? ` (${onlyBefore.length} before only, ${onlyAfter.length} after only)` : ''}`,
);
