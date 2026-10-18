// The gallery's `sky` subject: the tower layout's audible sky (src/ui/TowerSky.svelte, docs/notes/tower-sky.md) in the
// built app, playing, over pieces of every kind (slow and fast, classical and electronic, arrangements, loops, a tone).
// For each piece:
//   - a still of the graph at `secs` (`tiles/<piece>-still.png`);
//   - a close-up, zoomed in ZOOMS wheel notches over the audible (`-close.png`), a filmstrip of its upper half, FRAMES
//     frames 120 ms apart (`-film-<n>.png`: is it blinking or sparkling), and it again with the graph hidden
//     (`-sky.png`): the sky alone;
//   - each out's socket close, its loudness wheel (SOCKETS of them at most): stopped, before play (`-rest-socket-<k>.png`:
//     the score's shape), and playing, in the close-up (`-live-socket-<k>.png`); SCALE=2 for sharper tiles;
//   - the numbers (`sky.json`): `flicker`, how much the sky's pixels change from one 50 ms sample to the next against how
//     bright it is (blinking is a high flicker; a sky that breathes is a low one), `bright` its mean brightness, and
//     `lagPx`, `lagMax`, how far the sky's drawing is from where the graph is while the graph is panned and zoomed
//     (px, mean and worst over a pan's frames, from the sky's `data-view`: what it shows, against the flow's transform).
// A contact sheet of all of them (`sheet.png`, `index.html`).
//
//   node tools/gallery.mjs sky [secs] [pieces…]          # builds first (DIST= another build); OUT default shots/sky/
//   OUT=shots/sky-before DIST=/tmp/dist-old node tools/gallery.mjs sky 20 Hypercell
//
// Chromium as for the smoke test (CHROME_PATH=/opt/pw-browsers/chromium in a cloud session).
import { preview } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '../profile/playwright.mjs';
import { freshBuild } from '../fresh-build.mjs';

// (one of each kind: an arrangement, a dance, ambient, a fugue, a canon, a fast break, an acid line, jazz, a loop, a tone)
const PIECES = ['Hypercell', 'Pop song', 'Cellscape', 'Prelude and Fugue in C minor', 'Pachelbel', 'IDM', 'Acid', 'Swing blues', 'In C, a sketch', 'A tone'];
const [secs = '20', ...named] = process.argv.slice(2);
const titles = named.length ? named : PIECES;
const out = process.env.OUT ?? 'shots/sky';
const FRAMES = Number(process.env.FRAMES ?? 6);
// (wheel notches in, for the close-up)
const ZOOMS = Number(process.env.ZOOMS ?? 5);
// (sockets pictured close, at most)
const SOCKETS = Number(process.env.SOCKETS ?? 6);
mkdirSync(join(out, 'tiles'), { recursive: true });
if (!process.env.DIST) freshBuild();
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, build: process.env.DIST ? { outDir: process.env.DIST } : {}, logLevel: 'error' });
const url = server.resolvedUrls.local[0] + (process.env.QUERY ? `?${process.env.QUERY}` : '');
const [vw, vh] = (process.env.VIEW ?? '1600x1000').split('x').map(Number);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const results = [];
for (const title of titles) {
  const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: Number(process.env.SCALE ?? 1) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.getByRole('radio', { name: 'Cards' }).click();
  await page.locator('input.search').fill(title);
  await page.waitForTimeout(300);
  const exact = page.locator(`button.open[aria-label="Open ${title}"]`);
  await ((await exact.count()) ? exact : page.locator('button.open')).first().dispatchEvent('click');
  await page.waitForTimeout(2500); // (the layout settles)
  const file0 = title
    .replace(/[^\w]+/g, '-')
    .toLowerCase()
    .replace(/-$/, '');
  // each out's socket, its loudness wheel, close (SOCKETS at most): stopped (the score's shape), then playing
  const sockets = async (tag) => {
    const els = await page.locator('[data-wheel="socket"]').all();
    let k = 0;
    for (const el of els.slice(0, SOCKETS)) {
      const b = await el.boundingBox();
      if (!b || b.width < 4) continue;
      const pad = b.width * 0.35;
      await page.screenshot({
        path: join(out, 'tiles', `${file0}-${tag}-socket-${k++}.png`),
        clip: { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad },
      });
    }
    return k;
  };
  const rest = await sockets('rest');
  await page.locator('.transport').getByRole('button', { name: 'Play' }).first().click();
  await page.waitForTimeout(Number(secs) * 1000);
  const file = file0;
  const sky = page.locator('[data-sky]').first();
  if (!(await sky.count())) {
    console.log(`${title}: no sky`);
    results.push({ title, file, sky: false });
    await page.close();
    continue;
  }
  await page.screenshot({ path: join(out, 'tiles', `${file}-still.png`) });
  const box = await sky.boundingBox();
  // close up: the view zoomed in on the sky (the wheel, over the audible's middle), as one would to look at it
  const pane = await page.locator('.svelte-flow__pane').first().boundingBox();
  const audible = await page.evaluate(() => {
    const el = document.querySelector('[data-sky]');
    return el ? Number(el.dataset.audible ?? NaN) : NaN;
  });
  const cx = pane.x + pane.width * 0.45;
  const cy = Number.isFinite(audible) ? box.y + audible : pane.y + pane.height * 0.15;
  await page.mouse.move(cx, cy);
  for (let i = 0; i < ZOOMS; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, 'tiles', `${file}-close.png`), clip: box });
  for (let k = 0; k < FRAMES; k++) {
    await page.screenshot({ path: join(out, 'tiles', `${file}-film-${k}.png`), clip: { ...box, height: box.height / 2 } });
    await page.waitForTimeout(120);
  }
  const playing = await sockets('live');
  // the sky alone: the graph hidden over it
  const hide = await page.addStyleTag({ content: '.svelte-flow__viewport { opacity: 0 !important; }' });
  await page.screenshot({ path: join(out, 'tiles', `${file}-sky.png`), clip: box });
  await hide.evaluate((e) => e.remove());
  // flicker: the sky's canvases sampled small, every 50 ms for 3 s
  const { flicker, bright } = await page.evaluate(async () => {
    const W = 160;
    const el = document.querySelector('[data-sky]');
    const H = Math.max(1, Math.round((W * el.clientHeight) / el.clientWidth));
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    const sample = () => {
      g.clearRect(0, 0, W, H);
      for (const k of el.querySelectorAll('canvas')) g.drawImage(k, 0, 0, W, H);
      return g.getImageData(0, 0, W, H).data;
    };
    let prev = sample();
    let diff = 0;
    let sum = 0;
    const n = 60;
    for (let i = 0; i < n; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const now = sample();
      for (let p = 0; p < now.length; p += 4) {
        const l = (now[p] + now[p + 1] + now[p + 2]) / 3;
        diff += Math.abs(l - (prev[p] + prev[p + 1] + prev[p + 2]) / 3);
        sum += l;
      }
      prev = now;
    }
    return { flicker: diff / Math.max(1, sum), bright: sum / n / (W * H) };
  });
  // lag: the pane dragged and wheeled, each frame the sky's drawn view against the flow's transform
  await page.evaluate(() => {
    window.__lag = [];
    const flow = document.querySelector('.svelte-flow__viewport');
    const el = document.querySelector('[data-sky]');
    const tick = () => {
      if (!window.__lag) return;
      const m = /translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/.exec(flow.style.transform);
      const v = el.dataset.view?.split(',').map(Number);
      if (m && v) {
        const [x, y, z] = m.slice(1).map(Number);
        // (where a point in the middle of the sky is drawn, against where the graph has it)
        const gx = el.clientWidth / 2;
        const gy = el.clientHeight / 2;
        const px = (gx - x) / z;
        const py = (gy - y) / z;
        window.__lag.push(Math.hypot(px * v[2] + v[0] - gx, py * v[2] + v[1] - gy));
      } else window.__lag.push(null);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) {
    await page.mouse.move(cx - 6 * i, cy + 3 * i);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, i < 5 ? -60 : 60);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(200);
  const lags = await page.evaluate(() => {
    const l = window.__lag;
    window.__lag = null;
    return l;
  });
  const known = lags.filter((v) => v !== null);
  const lagPx = known.length ? known.reduce((a, b) => a + b, 0) / known.length : null;
  const lagMax = known.length ? Math.max(...known) : null;
  const r = {
    title,
    file,
    sky: true,
    sockets: [rest, playing],
    flicker: +flicker.toFixed(3),
    bright: +bright.toFixed(1),
    lagPx: lagPx === null ? null : +lagPx.toFixed(1),
    lagMax: lagMax === null ? null : +lagMax.toFixed(1),
    frames: lags.length,
    errors,
  };
  results.push(r);
  console.log(JSON.stringify(r));
  await page.close();
}
writeFileSync(join(out, 'sky.json'), JSON.stringify(results, null, 1));
const cell = (r) =>
  `<figure data-kind="${r.file}"><figcaption><b>${r.title}</b> · flicker ${r.flicker ?? '–'} · bright ${r.bright ?? '–'} · lag ${r.lagPx ?? 'n/a'} px (worst ${r.lagMax ?? 'n/a'})</figcaption>` +
  (r.sky
    ? `<div class="row"><img src="tiles/${r.file}-still.png" class="still"><img src="tiles/${r.file}-close.png" class="still"><img src="tiles/${r.file}-sky.png" class="still"></div><div class="row">${Array.from({ length: FRAMES }, (_, k) => `<img src="tiles/${r.file}-film-${k}.png">`).join('')}</div>` +
      `<div class="row sockets">${['rest', 'live'].flatMap((tag, j) => Array.from({ length: r.sockets?.[j] ?? 0 }, (_, k) => `<img src="tiles/${r.file}-${tag}-socket-${k}.png" title="${tag}">`)).join('')}</div>`
    : '<p>no sky</p>') +
  '</figure>';
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>The audible sky</title><style>body{background:#111;color:#ddd;font:13px system-ui;margin:12px}figure{margin:0 0 18px}.row{display:flex;gap:4px;margin-top:4px}.row img{width:${(100 / FRAMES).toFixed(2)}%;min-width:0}.row img.still{width:33.3%}.row.sockets img{width:110px;flex:none}</style>${results.map(cell).join('')}`,
);
const sheet = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
await sheet.goto('file://' + join(process.cwd(), out, 'index.html'));
await sheet.waitForTimeout(500);
await sheet.screenshot({ path: join(out, 'sheet.png'), fullPage: true });
await browser.close();
await server.close();
console.log(`${join(out, 'index.html')}, ${join(out, 'sheet.png')}`);
