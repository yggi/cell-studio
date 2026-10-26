// The session probe (#492, #478 rung 3's bound): a Jambot host plays through its lobby, Cell studio's build follows it,
// and what each played is set against the other's, event for event (`tools/session-compare.ts`): part, note, velocity
// and length alike, onsets and durations within the clock's bound, every event one lacks explained.
//
// Jambot is served from its own checkout, as its e2e setup serves it (`apps/web/playwright.config.ts`):
//   (in jambot)      pnpm build && pnpm preview --port 4317 --strictPort     # the host's page
//   (in jambot)      pnpm lobby --port 4319                                  # its lobby
//   (here)           npm run build && node tools/session-probe.mjs           # 10 minutes
//   node tools/session-probe.mjs --minutes 2 --jambot http://localhost:4317/ --lobby ws://localhost:4319
//
// The host is driven by the names Jambot's e2e drives it by (`e2e/audio.ts`: `useLobby`, `host`, "Start the band"), and
// Cell studio joins through `cellStudio.session.join`. Every 2 s both logs are read (`window.jambot.played(from)`,
// `cellStudio.session.played(from)`), so neither's 20,000 kept are outrun. Exits 1 where the bound isn't met.
//
// Chromium: Playwright's, or CHROME_PATH=/path/to/chrome (tools/profile/playwright.mjs).
import { preview, runnerImport } from 'vite';
import { chromium } from './profile/playwright.mjs';
import { freshBuild } from './fresh-build.mjs';

const option = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const JAMBOT = option('jambot', 'http://localhost:4317/');
const LOBBY = option('lobby', 'ws://localhost:4319');
const MINUTES = Number(option('minutes', '10'));
const SESSION = option('session', `probe ${Date.now() % 100000}`);
/** How often both logs are read (ms). */
const READ_EVERY = 2000;
/** Jambot's own bound between two pages (1 ms, `apps/web/src/played.ts`), past the clock's. */
const WITHIN = 0.001;

const { module: compare } = await runnerImport('./tools/session-compare.ts', { configFile: false });
freshBuild();
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const errors = [];
const page = async (name, url) => {
  const p = await (await browser.newContext()).newPage();
  p.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  p.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  await p.goto(url);
  return p;
};

// the host: the lobby given on Settings (the drawer's rider), the session named and hosted globally
const host = await page('host', JAMBOT);
const drawer = host.getByRole('navigation', { name: 'Drawer' });
const drawn = async (rider) => {
  if ((await drawer.count()) > 0) return drawer.getByRole('button', { name: rider, exact: true }).click();
  await host.locator(`details[aria-label="${rider}"] summary .title`).click();
};
await drawn('Settings');
await host.getByLabel('Lobby server').fill(LOBBY);
await host.getByLabel('Lobby server').blur();
const shut = host.getByRole('navigation', { name: 'Drawer' }).locator('[aria-expanded="true"]');
if ((await shut.count()) > 0) await shut.click();
await host.getByRole('textbox', { name: 'Session name' }).fill(SESSION);
await host.getByRole('radio', { name: /Global/ }).click();
await host.getByRole('button', { name: 'Host', exact: true }).click();
await host.locator('details[aria-label="Session"] summary .sub').filter({ hasText: 'Hosting' }).waitFor({ timeout: 15000 });

// Cell studio: joined through the lobby, then the band started
const studio = await page('Cell studio', server.resolvedUrls.local[0]);
await studio.waitForFunction(() => window.cellStudio?.session);
await studio.evaluate(([lobby, session]) => window.cellStudio.session.join(lobby, session, 'Probe'), [LOBBY, SESSION]);
await studio.waitForFunction(() => window.cellStudio.session.state().status === 'joined', null, { timeout: 15000 });
await host.getByRole('button', { name: 'Start the band' }).click();
console.log(`hosting “${SESSION}” at ${JAMBOT} through ${LOBBY}; Cell studio joined; ${MINUTES} minutes`);

const logs = { host: [], studio: [], late: [], lackedBars: new Set(), lacks: [] };
const next = { host: 0, studio: 0 };
let bound = 0;
const read = async () => {
  const h = await host.evaluate((from) => window.jambot.played(from), next.host);
  const s = await studio.evaluate((from) => ({ ...window.cellStudio.session.played(from), state: window.cellStudio.session.state() }), next.studio);
  logs.host.push(...h.events);
  logs.late = h.late;
  logs.studio.push(...s.events);
  [next.host, next.studio] = [h.next, s.next];
  for (const l of s.state.sound?.lacked ?? []) {
    const said = `${l.bar} ${l.why}`;
    if (!logs.lacks.includes(said)) logs.lacks.push(said);
    if (l.bar !== null) logs.lackedBars.add(l.bar);
  }
  bound = Math.max(bound, s.state.clock?.bound ?? 0);
  return s.state;
};
const end = Date.now() + MINUTES * 60_000;
while (Date.now() < end) {
  await read();
  await new Promise((r) => setTimeout(r, READ_EVERY));
}
const last = await read();
await browser.close();
await server.close();

const within = bound + WITHIN;
const c = compare.compareSession(logs.host, logs.studio, within, { late: logs.late, lackedBars: [...logs.lackedBars] });
console.log(
  [
    `bars ${c.bars ? `${c.bars.from} to ${c.bars.to}` : 'none in common'}: the host played ${c.events} events, ${c.paired} paired`,
    `mismatched: velocity ${c.mismatched.velocity}, length ${c.mismatched.length}, onset ${c.mismatched.onset}, duration ${c.mismatched.duration} (within ${(within * 1000).toFixed(3)} ms)`,
    `onsets: Cell studio's less the host's ${(c.onset.median * 1000).toFixed(3)} ms in the middle, ${(c.onset.largest * 1000).toFixed(3)} ms at most; durations ${(c.duration.largest * 1000).toFixed(3)} ms at most`,
    `lacked: Cell studio ${c.lacked.studio.events} (${c.lacked.studio.unexplained} unexplained), the host ${c.lacked.host.events} (${c.lacked.host.unexplained} unexplained)`,
    `Cell studio said it lacked: ${logs.lacks.length ? logs.lacks.join('; ') : 'nothing'}; at the end ${last.status}, playing ${last.sound?.playing}, ${last.sound?.unread ?? 0} events the feel didn't read`,
    `errors: ${errors.length ? errors.join('; ') : 'none'}`,
    ...c.differing.map((d) => `  ${d}`),
  ].join('\n'),
);
process.exit(compare.agrees(c) && !errors.length ? 0 : 1);
