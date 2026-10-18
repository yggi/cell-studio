// Escape in a cell sheet's name field (#328), in a real browser: with a typed draft the first Escape puts the
// name back and the sheet stays open, the second closes it; with nothing typed Escape closes the sheet at once.
//
//   CHROME_PATH=/opt/pw-browsers/chromium node tools/sheetescape.mjs
//
// Runs the working tree on a dev server (no build; the first load is slow). Exits 1 when a step fails.
import { createServer } from 'vite';
import { chromium } from './profile/playwright.mjs';

const T = { timeout: 5000 };
const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
let failed = 0;
const check = (what, ok) => (console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`), ok || failed++);
const sheet = page.locator('[role="dialog"].sheet, .sheet:visible').first();
const name = page.locator('input[aria-label="Name"]');
try {
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForTimeout(2500); // (the layout settles)
  await page.evaluate(() => [...document.querySelectorAll('button')].find((e) => /^Cards$/.test(e.textContent)).click());
  await page.locator('button.open').first().dispatchEvent('click');
  await page.waitForTimeout(1500);
  // (the first node whose sheet has a name field: a named cell, not a lambda)
  const nodes = page.locator('.svelte-flow__node:visible');
  const count = await nodes.count();
  let found = false;
  for (let i = 0; i < count && !found; i++) {
    await nodes.nth(i).dblclick({ force: true, ...T });
    await page.waitForTimeout(500);
    found = (await name.count()) > 0;
    if (!found) await page.keyboard.press('Escape');
  }
  if (!found) throw new Error('no cell sheet with a name field');
  const before = await name.inputValue();

  await name.focus();
  await page.keyboard.type('zz');
  check('typing changes the draft', (await name.inputValue()) === `${before}zz`);
  await page.keyboard.press('Escape');
  check('first Escape puts the name back', (await name.inputValue()) === before);
  check('first Escape leaves the sheet open', await sheet.isVisible());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('second Escape closes the sheet', !(await sheet.isVisible()));

  await nodes.first().dblclick({ force: true, ...T });
  // (a sheet whose name field is there again: the same cell)
  for (let i = 0; i < count && (await name.count()) === 0; i++) {
    await page.keyboard.press('Escape');
    await nodes.nth(i).dblclick({ force: true, ...T });
    await page.waitForTimeout(500);
  }
  await name.focus();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape with nothing typed closes the sheet at once', !(await sheet.isVisible()));
} catch (e) {
  console.log(`could not run: ${String(e).split('\n')[0]}`);
  failed++;
}
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
