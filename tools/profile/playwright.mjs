// Finds Playwright: the project's own, or the one preinstalled in the cloud container.
// Chromium: PLAYWRIGHT_BROWSERS_PATH / default install, or CHROME_PATH to point at a binary.
let pw;
for (const spec of [process.env.PLAYWRIGHT, 'playwright', '/opt/node-tools/node_modules/playwright/index.mjs'].filter(Boolean)) {
  try { pw = await import(spec); break; } catch {}
}
if (!pw) throw new Error('Playwright not found: npm i -D playwright, or set PLAYWRIGHT=/path/to/playwright/index.mjs');
const real = pw.chromium;
export const chromium = {
  launch: (o = {}) => real.launch({ ...o, executablePath: process.env.CHROME_PATH ?? o.executablePath }),
};
