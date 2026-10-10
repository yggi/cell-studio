// Pictures for the rhythm scalogram probe (tools/probe/scalogram.test.ts, #286), from the probe's JSON. Time across,
// the period up the way the tower goes (fast at the top, slow at the bottom), power in decibels; the cone of influence
// (where the window's edges reach) veiled.
//   node tools/probe/scalogram-sheets.mjs <dir of JSON> <out dir>                   a sheet per piece: every signal a
//       panel, at its right the panel's global spectrum and the cells' spans on the tower (a bar from step to turn,
//       named), the notes under them by pitch
//   node tools/probe/scalogram-sheets.mjs <dir of JSON> <out dir> contact <signal>  the whole library, a tile a piece
//       (the cells' steps and turns ticked at the left)
// NORM=row: each period against its own mean over time (when a level is active, at every period) rather than against
// the panel's loudest (which levels carry the power). Playwright and Chromium as the profile's tools find them
// (tools/profile/playwright.mjs: CHROME_PATH for a binary).
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { chromium } from '../profile/playwright.mjs';

const [dir, out, mode = 'sheet', signal = 'envelope'] = process.argv.slice(2);
const norm = process.env.NORM === 'row' ? 'row' : 'max';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 400 }, deviceScaleFactor: 1 });

// (drawn in the page: self-contained, its argument serialised)
const draw = ({ mode, norm, signal, pieces }) => {
  const ramp = (t) => {
    // (black, blue, magenta, orange, pale yellow)
    const stops = [
      [0, 0, 0],
      [30, 30, 120],
      [160, 40, 140],
      [240, 120, 40],
      [255, 250, 190],
    ];
    const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(x));
    const f = x - i;
    return stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  };
  const lp = Math.log2;
  // (a duration in words: 1/8, 3 s, 2 min, 4 h)
  const span = (p) => (p < 1 ? `1/${Math.round(1 / p)}` : p < 120 ? `${+p.toFixed(1)} s` : p < 7200 ? `${+(p / 60).toFixed(1)} min` : `${+(p / 3600).toFixed(1)} h`);
  // (the piece's sections, `sections`: a line down a panel at each, white, faint)
  const marks = (g, d, x0, top, w, h) => {
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const s of d.sections ?? []) if (s.at > 0 && s.at < d.window) g.fillRect(x0 + (s.at / d.window) * w, top, 1, h);
  };
  // (the y of a period in a panel at `top`, `h` high: fast at the top)
  const yOf = (P, top, h, p) => top + ((lp(p) - lp(P[0])) / (lp(P[P.length - 1]) - lp(P[0]))) * h;
  const heat = (g, d, rows, x0, top, w, h) => {
    const P = d.periods;
    // (the cone of influence, doubled: twice the Morlet's e-folding time √2·s at each period, from each edge, as a
    // fraction of the window; within one e-folding time the window's edge still shows as a bright rim)
    const reachOf = (p) => Math.min(0.5, (2 * Math.SQRT2 * p) / 1.033 / d.window);
    // (a period's mean over the columns its cone leaves clear: the edges are the window's, not the piece's)
    const rowMean = rows.map((r, i) => {
      const edge = Math.min(Math.floor(r.length * reachOf(P[i])), Math.floor(r.length / 2) - 1);
      const inner = r.slice(edge, r.length - edge);
      return inner.reduce((a, v) => a + v, 0) / inner.length || 1;
    });
    const max = Math.max(...rows.map((r) => Math.max(...r)));
    const img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const ri = Math.round((y / (h - 1)) * (rows.length - 1));
      const r = rows[ri];
      for (let x = 0; x < w; x++) {
        const v = r[Math.min(r.length - 1, Math.floor((x / w) * r.length))];
        const db = 10 * Math.log10(Math.max(1e-30, v / (norm === 'row' ? rowMean[ri] : max)));
        const [R, G, B] = ramp(norm === 'row' ? 0.5 + db / 20 : 1 + db / 30);
        const k = (y * w + x) * 4;
        img.data[k] = R;
        img.data[k + 1] = G;
        img.data[k + 2] = B;
        img.data[k + 3] = 255;
      }
    }
    g.putImageData(img, x0, top);
    const reach = (p) => reachOf(p) * w;
    g.fillStyle = 'rgba(40,40,40,0.75)';
    for (const side of [0, 1]) {
      g.beginPath();
      g.moveTo(x0 + side * w, top);
      for (const p of P) g.lineTo(x0 + (side ? w - reach(p) : reach(p)), yOf(P, top, h, p));
      g.lineTo(x0 + side * w, top + h);
      g.fill();
    }
  };
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.appendChild(c);
    const g = c.getContext('2d');
    g.fillStyle = '#111';
    g.fillRect(0, 0, w, h);
    return g;
  };

  if (mode === 'contact') {
    const TW = 260;
    const TH = 96;
    const COLS = 5;
    const PAD = 22;
    const g = canvas(COLS * (TW + 30) + 10, Math.ceil(pieces.length / COLS) * (TH + PAD) + 30);
    g.font = '11px sans-serif';
    g.fillStyle = '#aaa';
    g.fillText(
      `${signal}, ${norm === 'row' ? 'each period against its mean' : 'against the loudest'}; ticks: the cells' steps (blue) and turns (grey), 1 s; fast at the top; white lines: the piece's sections; one length of each piece`,
      10,
      16,
    );
    pieces.forEach((d, i) => {
      const x0 = 10 + (i % COLS) * (TW + 30) + 18;
      const top = 30 + Math.floor(i / COLS) * (TH + PAD) + 14;
      heat(g, d, d.signals[signal].rows, x0, top, TW, TH);
      marks(g, d, x0, top, TW, TH);
      g.fillStyle = '#ddd';
      g.fillText(`${d.key} (${span(d.window)})`, x0, top - 3);
      const P = d.periods;
      for (const c of d.cells)
        for (const [p, colour] of [
          [c.turn, '#888'],
          [c.step, '#6bf'],
        ]) {
          if (p < P[0] || p > P[P.length - 1]) continue;
          g.fillStyle = colour;
          g.fillRect(x0 - 10, yOf(P, top, TH, p) - 1, 8, 2);
        }
      g.fillStyle = '#666';
      g.fillRect(x0 - 17, yOf(P, top, TH, 1), 5, 1);
    });
    return [g.canvas.width, g.canvas.height];
  }

  const d = pieces[0];
  const W = 960;
  const H = 150;
  const NOTES = 140;
  const names = Object.keys(d.signals);
  const g = canvas(60 + W + 330, 40 + names.length * (H + 18) + NOTES + 30);
  g.font = '12px sans-serif';
  g.fillStyle = '#ddd';
  g.fillText(
    `${d.key}: ${span(d.window)}, ${d.notes ?? d.events.length} notes; ${norm === 'row' ? 'each period against its mean over time' : 'against the panel’s loudest'}`,
    60,
    20,
  );
  const P = d.periods;
  names.forEach((name, n) => {
    const top = 34 + n * (H + 18);
    const { rows, mean } = d.signals[name];
    heat(g, d, rows, 60, top, W, H);
    marks(g, d, 60, top, W, H);
    g.fillStyle = '#ddd';
    g.font = '12px sans-serif';
    g.fillText(name, 4, top + 9);
    g.fillStyle = '#888';
    g.font = '10px sans-serif';
    // (a tick an octave, labelled every other one when there are many)
    const octaves = [];
    for (let p = Math.pow(2, Math.ceil(lp(P[0]))); p <= P[P.length - 1]; p *= 2) octaves.push(p);
    for (const [k, p] of octaves.entries()) {
      const y = yOf(P, top, H, p);
      if (octaves.length <= 11 || k % 2 === 0) g.fillText(span(p), 2, y + 3);
      g.fillRect(56, y, 4, 1);
    }
    // (the global spectrum, 30 dB across)
    const x0 = 60 + W + 10;
    const PW = 120;
    const mx = Math.max(...mean);
    g.strokeStyle = '#eee';
    g.beginPath();
    mean.forEach((v, i) => {
      const x = x0 + Math.max(0, 1 + (10 * Math.log10(Math.max(1e-30, v / mx))) / 30) * PW;
      const y = yOf(P, top, H, P[i]);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
    // (the cells: a bar from the step down to the turn, named at the step, in lanes so the names don't collide)
    const lanes = [];
    for (const cell of [...d.cells].sort((a, b) => a.step - b.step)) {
      const yA = yOf(P, top, H, Math.max(P[0], cell.step));
      const yB = yOf(P, top, H, Math.min(P[P.length - 1], cell.turn));
      let lane = lanes.findIndex((end) => end < yA - 2);
      if (lane < 0) lane = lanes.length;
      if (lane > 3) continue;
      lanes[lane] = Math.max(yA + 12, yB);
      const x = x0 + PW + 10 + lane * 48;
      g.fillStyle = 'rgba(120,200,255,0.9)';
      g.fillRect(x, yA, 3, Math.max(2, yB - yA));
      g.fillRect(x - 2, yA - 1, 7, 2);
      g.fillStyle = '#9cf';
      g.fillText(cell.name.slice(0, 7), x + 6, yA + 4);
      g.fillStyle = 'rgba(120,200,255,0.25)';
      g.fillRect(x0, yA, PW, 1);
    }
  });
  // (the notes: pitch up, a colour a voice)
  const top = 34 + names.length * (H + 18);
  const pitches = d.events.map((e) => e[3]);
  const lo = Math.min(...pitches, 36);
  const hi = Math.max(...pitches, 84);
  const voices = [...new Set(d.events.map((e) => e[2]))];
  for (const [at, dur, voice, pitch] of d.events) {
    g.fillStyle = `hsl(${(voices.indexOf(voice) * 137) % 360} 70% 60%)`;
    g.fillRect(60 + (at / d.window) * W, top + NOTES - ((pitch - lo) / (hi - lo + 1)) * NOTES, Math.max(1, (dur / d.window) * W), 2);
  }
  g.fillStyle = '#888';
  g.font = '10px sans-serif';
  // (the time axis: about ten marks, at a round step)
  const every = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200].find((x) => d.window / x <= 12) ?? 14400;
  for (let s = 0; s <= d.window; s += every) g.fillText(s ? span(s) : '0', 60 + (s / d.window) * W - 6, top + NOTES + 14);
  // (the sections' names, those that fit)
  let free = 0;
  for (const sec of d.sections ?? []) {
    const x = 60 + (sec.at / d.window) * W + 2;
    if (x < free) continue;
    g.fillStyle = '#bbb';
    g.fillText(sec.label.slice(0, 14), x, top - 2);
    free = x + g.measureText(sec.label.slice(0, 14)).width + 6;
  }
  g.fillStyle = '#888';
  g.fillText('notes', 4, top + 12);
  return [g.canvas.width, g.canvas.height];
};

const shoot = async (args, path) => {
  const [w, h] = await page.evaluate(draw, args);
  await page.setViewportSize({ width: w, height: h });
  await page.locator('canvas').screenshot({ path, type: 'jpeg', quality: 82 });
};
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const suffix = norm === 'row' ? '-row' : '';
if (mode === 'contact') {
  // (in the library's order: the keys as order.ts lists them)
  const order = [...readFileSync(new URL('../../src/engine/order.ts', import.meta.url), 'utf8').matchAll(/^\s*'([\w-]+)',/gm)].map((m) => m[1]);
  const keys = files.map((f) => basename(f, '.json')).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  // (only the signal drawn, and none of the notes: the whole library's JSON is too much to hand the page)
  const pieces = keys.map((k) => {
    const d = JSON.parse(readFileSync(join(dir, `${k}.json`), 'utf8'));
    return { ...d, events: [], signals: { [signal]: d.signals[signal] } };
  });
  await shoot({ mode, norm, signal, pieces }, join(out, `contact-${signal}${suffix}.jpg`));
} else for (const f of files) await shoot({ mode, norm, signal, pieces: [JSON.parse(readFileSync(join(dir, f), 'utf8'))] }, join(out, `${basename(f, '.json')}${suffix}.jpg`));
await browser.close();
