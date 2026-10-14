// Repeatability guard (#37): every example rendered offline twice in the browser, and the two renders must sound the same.
// (the first render of a piece only warms Tone's noise cache; the next two are compared.) Tone.js is left alone: its Reverb (the impulse) and Noise (a tape's hiss) draw on Math.random, so Math.random is
// seeded afresh before each render (as golden.mjs does), which makes Tone's part repeatable. Two things are checked:
//   1. None of OUR code calls Math.random while a render runs. Every call is recorded with its caller; those from Tone's
//      chunk (`esm-*.js` in the build) are listed as known, any other fails (it prints where).
//   2. The two renders agree block by block (the level of every 2048 samples) within TOL (default 1e-5, −100 dB).
//      Not bit for bit: Chromium sums three or more inputs of a node in an order that changes from run to run, so the
//      last bit of a float differs (about −180 dB; two inputs are stable, six differ every time). Pieces with a
//      resonator loop (couple=, a board: forks, kalimba, sympathy) vary much more (−45 dB, #65: the order Chromium processes a loop in
//      changes from run to run; accepted): they are listed as KNOWN and don't fail the run.
//
//   npm run build && node tools/repeatable.mjs 6 [piece words…]
//
//   3. A loudness ceiling (#92; the convention in docs/language/display.md, the card's postgain=): no sample clipped, the peak at or
//      under PEAK (−1 dB) and the average at or under RMS (−18 dB), over the seconds rendered. Only a ceiling: a short
//      render of a piece with a quiet start averages far under the −24 dB of the whole piece, so there is no floor.
//
// Exit 1 on a Math.random call of ours, a piece that differs beyond TOL (other than the known ones) or one over the
// ceiling. The smoke workflow runs it on every PR (`node tools/repeatable.mjs 4`); `src/audio/repeatable.test.ts` is the
// cheap first line in `npm test`. In a cloud session set CHROME_PATH=/opt/pw-browsers/chromium.
import { readdirSync } from 'node:fs';
import { preview } from 'vite';
import { chromium } from './profile/playwright.mjs';
import { freshBuild } from './fresh-build.mjs';

const args = process.argv.slice(2);
const secs = Number(args.find((a) => /^\d+(\.\d+)?$/.test(a)) ?? 6);
const TOL = Number(process.env.TOL ?? 1e-5);
const PEAK = Number(process.env.PEAK ?? -1);
const RMS = Number(process.env.RMS ?? -18);
const KNOWN = { 'forks.cells': '#65', 'kalimba.cells': '#65', 'sympathy.cells': '#65' };
const words = args.filter((a) => !/^\d+(\.\d+)?$/.test(a)).map((w) => w.toLowerCase());
const files = readdirSync('node_modules/@yggi/cells/examples')
  .filter((f) => f.endsWith('.cells'))
  .sort()
  .filter((f) => !words.length || words.some((w) => f.includes(w)));

freshBuild();
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.addInitScript(() => {
  let seed = 1;
  window.__seed = (n) => (seed = n >>> 0 || 1);
  window.__calls = null;
  // mulberry32, seeded afresh before each render; the top frame of the caller is recorded while a render runs
  Math.random = () => {
    if (window.__calls) {
      const where = (new Error().stack ?? '')
        .split('\n')
        .slice(2, 4)
        .map((l) =>
          l
            .trim()
            .replace(/^at /, '')
            .replace(/https?:\/\/[^/]+\//, ''),
        );
      const key = where.join(' < ');
      window.__calls.set(key, [(window.__calls.get(key)?.[0] ?? 0) + 1, /esm-[\w-]+\.js/.test(where[0] ?? '')]);
    }
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
});
await page.goto(server.resolvedUrls.local[0]);
await page.waitForFunction(() => window.cellStudio?.render);

const { readFileSync } = await import('node:fs');
const render = (source) =>
  page.evaluate(
    async ([src, s]) => {
      window.__seed(1);
      window.__calls = new Map();
      const r = await window.cellStudio.render(src, s);
      const calls = [...window.__calls];
      window.__calls = null;
      return { hash: r.hash, blocks: r.blocks, calls, rms: r.rms, peak: r.peak, clipped: r.clipped };
    },
    [source, secs],
  );

let bad = 0;
let loud = 0;
const callers = new Map();
for (const f of files) {
  const source = readFileSync(`node_modules/@yggi/cells/examples/${f}`, 'utf8');
  // (a first render warms Tone's cache of noise buffers, made once per page from the first draws: it is left out)
  const warm = await render(source);
  const a = await render(source);
  const b = await render(source);
  for (const [where, [n, tone]] of [...warm.calls, ...a.calls, ...b.calls]) callers.set(where, [(callers.get(where)?.[0] ?? 0) + n, tone]);
  // (how far apart: the largest difference in block level)
  const apart = a.blocks.length !== b.blocks.length ? 1 : Math.max(0, ...a.blocks.map((x, i) => Math.abs(x - b.blocks[i])));
  const dB = apart > 0 ? `${(20 * Math.log10(apart)).toFixed(0)} dB` : '0';
  const known = KNOWN[f];
  const ok = apart <= TOL || known;
  if (!ok) bad++;
  const over = [
    a.clipped > 0 && `${a.clipped} samples clipped`,
    a.peak > PEAK && `peak ${a.peak.toFixed(1)} dB over ${PEAK}`,
    a.rms > RMS && `average ${a.rms.toFixed(1)} dB over ${RMS}`,
  ].filter(Boolean);
  if (over.length) loud++;
  const level = `rms ${a.rms.toFixed(1)} peak ${a.peak.toFixed(1)}`;
  const how = a.hash === b.hash ? 'bit-identical' : `largest block difference ${dB}, first at ${((a.blocks.findIndex((x, i) => x !== b.blocks[i]) * 2048) / 44100).toFixed(2)} s`;
  console.error(
    `${apart <= TOL ? 'same ' : known ? 'KNOWN' : 'DIFF '} ${f.padEnd(28)} ${level.padEnd(22)} ${how}${over.length ? `  LOUD: ${over.join(', ')}` : ''}${apart > TOL && known ? `  (${known})` : ''}${[...warm.calls, ...a.calls, ...b.calls].some(([, [, tone]]) => !tone) ? '  Math.random called by our code' : ''}`,
  );
}
await browser.close();
await server.close();
let ours = 0;
for (const [where, [n, tone]] of callers) {
  if (!tone) ours++;
  console.error(`${tone ? 'Tone (known)' : 'OURS'}: Math.random ×${n}: ${where}`);
}
const fail = bad || ours || loud;
console.error(
  fail
    ? [
        bad && `${bad} of ${files.length} pieces differ between two renders`,
        ours && `Math.random called from ${ours} place(s) of ours`,
        loud && `${loud} of ${files.length} pieces over the loudness ceiling (peak ${PEAK} dB, average ${RMS} dB, no clipping)`,
      ]
        .filter(Boolean)
        .join('; ')
    : `all ${files.length} pieces render the same twice (within ${(20 * Math.log10(TOL)).toFixed(0)} dB) and under the loudness ceiling; none of our code calls Math.random`,
);
process.exit(fail ? 1 : 0);
