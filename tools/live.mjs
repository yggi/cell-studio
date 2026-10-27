// Checks that the live site serves the build just deployed: the last step of the `land` skill, after `node tools/deploy.mjs`.
// 1. The module script of dist/index.html (its name carries the build's hash) is the one the live page loads; while it
//    isn't, Pages is still publishing: it asks again every 10 s, for up to 10 min (a Pages build takes one or two).
// 2. The live page opens in Chromium with no console error and no uncaught exception, within 5 s of its `load`.
// Each request carries a fresh query, past the CDN's cache (Pages caches a page for 10 min).
//
//   node tools/live.mjs                 # https://yggi.github.io/cell-studio/ against dist/
//   node tools/live.mjs <url>           # another URL (a PR preview: .../cell-studio/pr-<n>/)
//   node tools/live.mjs --no-browser    # the script asset only
//
// Chromium as tools/profile/playwright.mjs finds it (the cloud container's when Playwright's own is missing). LIVE_DIST= another build folder;
// LIVE_WAIT= the wait in seconds (0: ask once). Exit 0 when both hold, 1 when either doesn't, saying which.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://yggi.github.io/cell-studio/';
const EVERY_S = 10;
const SETTLE_MS = 5000;

/** The `src` of the page's module script (the app's entry, `./assets/index-<hash>.js`), or null when it has none. */
export function scriptAsset(html) {
  for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
    if (!/\btype=["']?module\b/.test(tag)) continue;
    const src = tag.match(/\bsrc=["']?([^"'\s>]+)/);
    if (src) return src[1].replace(/^\.\//, '');
  }
  return null;
}

/** What is wrong when the live page's module script isn't the built one's, or null when they are the same. */
export function assetMismatch(built, live) {
  if (!built) return 'dist/index.html has no module script: build first (node tools/deploy.mjs builds)';
  if (!live) return 'the live page has no module script';
  return built === live ? null : `the live page loads ${live}, the build ${built}`;
}

/** The messages that fail the check: console errors and uncaught exceptions, as `{ type, text }`. */
export function consoleProblems(messages) {
  return messages.filter((m) => m.type === 'error' || m.type === 'pageerror').map((m) => `${m.type}: ${m.text}`);
}

const fresh = (url) => `${url}${url.includes('?') ? '&' : '?'}live=${Date.now()}`;

async function liveAsset(url) {
  const res = await fetch(fresh(url), { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return scriptAsset(await res.text());
}

async function browserProblems(url) {
  const { chromium } = await import('./profile/playwright.mjs');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    const messages = [];
    page.on('console', (m) => messages.push({ type: m.type(), text: m.text() }));
    page.on('pageerror', (e) => messages.push({ type: 'pageerror', text: e.message }));
    await page.goto(fresh(url), { waitUntil: 'load' });
    await page.waitForTimeout(SETTLE_MS);
    return consoleProblems(messages);
  } finally {
    await browser.close();
  }
}

async function main(args) {
  const url = args.find((a) => !a.startsWith('-')) ?? SITE;
  const dist = process.env.LIVE_DIST ?? 'dist';
  const waitS = Number(process.env.LIVE_WAIT ?? 600);
  const built = scriptAsset(readFileSync(`${dist}/index.html`, 'utf8'));
  const deadline = Date.now() + waitS * 1000;
  let wrong;
  for (;;) {
    wrong = assetMismatch(built, await liveAsset(url));
    if (!wrong || Date.now() + EVERY_S * 1000 > deadline) break;
    console.log(`live: ${wrong}; again in ${EVERY_S} s`);
    await new Promise((r) => setTimeout(r, EVERY_S * 1000));
  }
  if (wrong) {
    console.error(`live: ${url} doesn't serve this build after ${waitS} s: ${wrong}`);
    return 1;
  }
  console.log(`live: ${url} serves this build (${built})`);
  if (args.includes('--no-browser')) return 0;
  const problems = await browserProblems(url);
  if (problems.length) {
    console.error(`live: ${url} opened with ${problems.length} console error(s):\n  ${problems.join('\n  ')}`);
    return 1;
  }
  console.log(`live: ${url} opens in Chromium with no console error`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main(process.argv.slice(2));
