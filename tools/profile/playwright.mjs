// Finds Playwright: the project's own, or the one preinstalled in the cloud container.
// Chromium: CHROME_PATH when it is set; else Playwright's own (PLAYWRIGHT_BROWSERS_PATH / default install); else, when
// that isn't installed (a cloud container whose preinstalled browsers are another Playwright's, #481), the container's
// /opt/pw-browsers/chromium, with a line on stderr that says so.
import { existsSync } from 'node:fs';

/** The cloud container's Chromium, which a launch falls back to when Playwright's own isn't installed. */
export const FALLBACK = '/opt/pw-browsers/chromium';

/**
 * Launches with `real`'s `launch`: at CHROME_PATH where it is set, else as Playwright would, and when that fails for
 * want of its browser, once more at the fallback, if there is one.
 */
export async function launchWith(real, options = {}, env = process.env, exists = existsSync, warn = (line) => console.error(line)) {
  const executablePath = env.CHROME_PATH ?? options.executablePath;
  if (executablePath) return real.launch({ ...options, executablePath });
  try {
    return await real.launch(options);
  } catch (error) {
    if (!/Executable doesn't exist/.test(String(error?.message)) || !exists(FALLBACK)) throw error;
    warn(`playwright: its own Chromium isn't installed, so ${FALLBACK} is used (CHROME_PATH names another)`);
    return real.launch({ ...options, executablePath: FALLBACK });
  }
}

let pw;
for (const spec of [process.env.PLAYWRIGHT, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean)) {
  try {
    pw = await import(spec);
    break;
  } catch {}
}
if (!pw) throw new Error('Playwright not found: npm i -D playwright, or set PLAYWRIGHT=/path/to/playwright/index.mjs');
const real = pw.chromium;
export const chromium = {
  launch: (o = {}) => launchWith(real, o),
};
