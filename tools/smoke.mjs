// Smoke test: open every piece of the library and press Play, and fail on any page error, any console
// error, or an AudioContext that isn't running (and, for a piece played in full, advancing). It builds
// the audio graph of every voice kind (tapes, resonators, FM, kits …), which the unit tests can't (no
// Web Audio in node). Every piece is started (its voices built, its first window asked for) and stopped
// again at once; the fewest pieces that between them use every kind of audio node (tools/smoke-pick.ts)
// play in full.
//
//   npm run build && npm run smoke            # every piece started, the picks played 2 s each
//   npm run smoke -- 3 Hypercell "Music Box"  # 3 s each, only titles containing these words
//   npm run smoke -- --all                    # every piece played in full (2 s, or the seconds given)
//   npm run smoke -- --list                   # which pieces play in full, and what each brings
//   ENGINE=worker npm run smoke               # with the engine in a Web Worker (?engine=worker, #15)
//
// Then MIDI out (#205): one piece played into a fake Web MIDI port, its note-ons checked against the plan's notes
// (tools/smoke-midi.ts) to within 2 ms of their median offset; then the tempo (a held free()) moved and Pause and Play
// again within the look-ahead, with no All notes off from either cutting what plays, and no note left sounding.
//
// Chromium: Playwright's, or CHROME_PATH=/path/to/chrome (CI uses the runner's Chrome). See tools/profile/playwright.mjs.
import { preview, runnerImport } from 'vite';
import { chromium } from './profile/playwright.mjs';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f) && args.splice(args.indexOf(f), 1);
const [all, list] = [flag('--all'), flag('--list')];
const [secs = '2', ...only] = args;
// (the picker is TypeScript over src/engine: loaded through vite, as vite.config.ts loads the examples' index)
const { module: pick } = await runnerImport('./tools/smoke-pick.ts', { configFile: false });
const picks = pick.smokePicks();
if (list) {
  for (const p of picks) console.log(`${p.title}\n    ${p.brings.join(', ')}`);
  process.exit(0);
}
const full = new Set(picks.map((p) => `example:${p.key}`)); // (as the library names an example: src/App.svelte)
const server = await preview({ preview: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
const engine = process.env.ENGINE;
const url = server.resolvedUrls.local[0] + (engine ? `?engine=${engine}` : '');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.setDefaultTimeout(8000);
let problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
await page.addInitScript(() => {
  window.__ctx = [];
  const A = window.AudioContext;
  window.AudioContext = class extends A {
    constructor(...a) {
      super(...a);
      window.__ctx.push(this);
    }
  };
});

await page.goto(url);
await page.getByRole('radio', { name: 'Cards' }).click();
await page.waitForSelector('button.open', { state: 'attached' });
const pieces = await page.$$eval('button.open', (bs) => bs.map((b) => ({ id: b.dataset.id, title: b.getAttribute('aria-label').replace(/^Open /, '') })));
const missing = [...full].filter((k) => !pieces.some((p) => p.id === k));
if (missing.length) throw new Error(`the library has no piece ${missing.join(', ')} (tools/smoke-pick.ts)`);
const wanted = pieces
  .filter((p) => only.length === 0 || only.some((w) => p.title.toLowerCase().includes(w.toLowerCase())))
  .map((p) => ({ ...p, full: all || only.length > 0 || full.has(p.id) }));
if (wanted.length === 0) throw new Error('no piece matches ' + only.join(', '));

const failed = [];
let stats = null;
for (const [i, p] of wanted.entries()) {
  problems = [];
  try {
    if (await page.locator('button.title').count()) {
      await page.locator('button.title').first().click();
      await page.getByRole('radio', { name: 'Cards' }).click();
    }
    await page.locator(`button.open[data-id="${p.id}"]`).dispatchEvent('click');
    await page.waitForTimeout(300);
    await page.locator('.transport').getByRole('button', { name: 'Play' }).first().click();
    // until it sounds (a running AudioContext, a window asked of the engine), but at least 250 ms for errors to surface
    await Promise.all([
      page.waitForTimeout(250),
      page.waitForFunction(() => window.__ctx.some((c) => c.state === 'running') && window.cellStudio.engine().windows > 0).catch(() => {}), // (if not, the checks below say what's missing)
    ]);
    const t0 = await page.evaluate(() => window.__ctx.map((c) => c.currentTime));
    if (p.full) await page.waitForTimeout(Number(secs) * 1000);
    const now = await page.evaluate(() => window.__ctx.map((c) => ({ state: c.state, t: c.currentTime })));
    const live = now.filter((c) => c.state === 'running');
    if (live.length === 0) problems.push('no running AudioContext');
    else if (p.full && !live.some((c, _k) => c.t > (t0[now.indexOf(c)] ?? 0) + 0.5 * Number(secs))) problems.push('audio clock did not advance');
    await page.locator('.transport').getByRole('button', { name: 'Pause' }).first().click();
    // the engine asked for is the one that played, and it answered (a window it misses is worked out locally)
    const st = await page.evaluate(() => window.cellStudio.engine());
    if (engine && st.kind !== engine) problems.push(`engine: ${st.kind}, not ${engine}`);
    if (st.windows === 0) problems.push('no window asked of the engine');
    if (engine === 'worker' && st.late >= st.windows) problems.push('the worker answered no window in time');
    stats = st;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
    await page.goto(url); // start the next piece from a fresh page
    await page.getByRole('radio', { name: 'Cards' }).click();
  }
  const ok = problems.length === 0;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${String(i + 1).padStart(2)}/${wanted.length} ${p.full ? `${secs} s` : 'start'} ${p.title}${
      ok
        ? ''
        : '\n       ' +
          [...new Set(problems)]
            .slice(0, 3)
            .map((x) => x.slice(0, 200))
            .join('\n       ')
    }`,
  );
  if (!ok) failed.push(p.title);
}
// One piece after another while playing, each drawn against its own program (#144: a piece switch once drew the new
// piece's edges against the old program, and threw on these two)
const SWITCH = ['example:baustelle', 'example:resonanz', 'example:twinkle'];
if (only.length === 0 && SWITCH.every((id) => pieces.some((p) => p.id === id))) {
  problems = [];
  try {
    await page.goto(url);
    await page.getByRole('radio', { name: 'Cards' }).click();
    for (const id of SWITCH) {
      // (a card opens from the library, whichever tab is showing)
      await page.locator(`button.open[data-id="${id}"]`).dispatchEvent('click');
      await page.waitForTimeout(300);
      const play = page.locator('.transport').getByRole('button', { name: 'Play' }).first();
      if (await play.count()) await play.click();
      await page.waitForTimeout(500);
    }
    await page.locator('.transport').getByRole('button', { name: 'Pause' }).first().click();
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} switch: ${SWITCH.join(' → ')}${ok ? '' : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('the piece switch');
}
// MIDI out (#205): a fake port that records what is sent, chosen before the page loads (so it connects without a click)
const MIDI_PIECE = 'sailor';
{
  problems = [];
  const { module: midiPlan } = await runnerImport('./tools/smoke-midi.ts', { configFile: false });
  const mp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  mp.setDefaultTimeout(8000);
  mp.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  mp.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  await mp.addInitScript(() => {
    const sent = (window.__midi = []);
    const out = {
      id: 'fake-out',
      name: 'Fake synth',
      send: (data, timestamp) => sent.push({ data: [...data], timestamp: timestamp ?? performance.now(), sentAt: performance.now() }),
    };
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map(), outputs: new Map([['fake-out', out]]), onstatechange: null });
    localStorage.setItem('cell-studio:midi', JSON.stringify({ out: { id: 'fake-out', name: 'Fake synth' }, in: { id: 'none', name: '' } }));
  });
  const secs = 3;
  let note = '';
  try {
    await mp.goto(url);
    await mp.getByRole('radio', { name: 'Cards' }).click();
    await mp.locator(`button.open[data-id="example:${MIDI_PIECE}"]`).dispatchEvent('click');
    await mp.waitForTimeout(300);
    const transport = mp.locator('.transport');
    await transport.getByRole('button', { name: 'Play' }).first().click();
    await mp.waitForTimeout(secs * 1000);
    // a held free() moved while playing (the tempo): each move recompiles, and must neither cut nor hang a note
    const movedAt = await mp.evaluate(() => performance.now());
    for (const v of [113, 115, 117, 119]) {
      await transport.getByRole('slider', { name: 'Tempo' }).evaluate((el, v) => {
        el.value = String(v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, v);
      await mp.waitForTimeout(150);
    }
    await mp.waitForTimeout(400);
    // then Pause and Play again within the look-ahead (as a seek does): what plays next must not be cut
    const pausedAt = await mp.evaluate(() => performance.now());
    await transport.getByRole('button', { name: 'Pause' }).first().click();
    await mp.waitForTimeout(150);
    const resumedAt = await mp.evaluate(() => performance.now());
    await transport.getByRole('button', { name: 'Play' }).first().click();
    await mp.waitForTimeout(1000);
    await transport.getByRole('button', { name: 'Pause' }).first().click();
    await mp.waitForTimeout(800);
    const sent = await mp.evaluate(() => window.__midi);
    // timing: the note-ons heard before the first move, each against the plan's note with its channel and key nearest
    // in time (notes struck together can come in either order), aligned on the median offset
    const ons = sent
      .filter((m) => (m.data[0] & 0xf0) === 0x90 && m.timestamp < movedAt)
      .map((m) => ({ channel: (m.data[0] & 15) + 1, note: m.data[1], ms: m.timestamp }))
      .sort((a, b) => a.ms - b.ms);
    const want = midiPlan.expectedNoteOns(MIDI_PIECE, secs + 2);
    if (ons.length < 8) problems.push(`only ${ons.length} note-ons were sent`);
    const zero = ons.length ? ons[0].ms - want[0].at * 1000 : 0;
    const taken = new Set();
    const offsets = [];
    for (const [i, o] of ons.entries()) {
      let best = -1;
      for (let j = Math.max(0, i - 8); j < Math.min(want.length, i + 9); j++) {
        const w = want[j];
        if (taken.has(j) || w.channel !== o.channel || w.note !== o.note) continue;
        if (best < 0 || Math.abs(o.ms - zero - w.at * 1000) < Math.abs(o.ms - zero - want[best].at * 1000)) best = j;
      }
      if (best < 0) {
        problems.push(`note-on ${i}: sent ${o.channel}:${o.note}, the plan has none such near it`);
        break;
      }
      taken.add(best);
      offsets.push(o.ms - want[best].at * 1000);
    }
    const median = [...offsets].sort((a, b) => a - b)[Math.floor(offsets.length / 2)] ?? 0;
    const worst = Math.max(0, ...offsets.map((d) => Math.abs(d - median)));
    if (worst > 2) problems.push(`a note-on was ${worst.toFixed(2)} ms off the plan`);
    // what the device plays, message by message in timestamp order (at one moment, in the order sent)
    const order = sent.map((m, i) => ({ ...m, i })).sort((a, b) => a.timestamp - b.timestamp || a.i - b.i);
    const sounding = new Set();
    for (const m of order) {
      const kind = m.data[0] & 0xf0;
      const ch = m.data[0] & 15;
      if (kind === 0x90) sounding.add(`${ch}:${m.data[1]}`);
      else if (kind === 0x80) sounding.delete(`${ch}:${m.data[1]}`);
      else if (kind === 0xb0 && m.data[1] === 123) for (const k of [...sounding]) if (k.startsWith(`${ch}:`)) sounding.delete(k);
    }
    if (sounding.size) problems.push(`left sounding at the end: ${[...sounding].join(', ')}`);
    const allOff = sent.filter((m) => (m.data[0] & 0xf0) === 0xb0 && m.data[1] === 123);
    const moving = allOff.filter((m) => m.sentAt >= movedAt && m.sentAt < pausedAt);
    if (moving.length) problems.push(`moving the tempo sent ${moving.length} All notes off`);
    const resumed = sent.filter((m) => (m.data[0] & 0xf0) === 0x90 && m.sentAt >= resumedAt).map((m) => m.timestamp);
    const cut = allOff.filter((m) => m.sentAt < resumedAt && resumed.some((t) => m.timestamp > t));
    if (cut.length) problems.push(`${cut.length} All notes off from the pause land after Play again`);
    if (allOff.length === 0) problems.push('Pause sent no All notes off');
    const offs = sent.filter((m) => (m.data[0] & 0xf0) === 0x80).length;
    const all = sent.filter((m) => (m.data[0] & 0xf0) === 0x90).length;
    note = `${ons.length} note-ons within ${worst.toFixed(3)} ms of the plan (median offset); then 4 tempo moves, Pause and Play: ${all} note-ons, ${offs} note-offs, ${allOff.length} All notes off, none left sounding`;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  await mp.close();
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} MIDI out: ${MIDI_PIECE} into a fake port${ok ? `: ${note}` : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('MIDI out');
}
await browser.close();
await server.close();
if (failed.length) {
  console.error(`\n${failed.length} of ${wanted.length} pieces failed: ${failed.join(', ')}`);
  process.exit(1);
}
const played = wanted.filter((p) => p.full).length;
console.log(`\nall ${wanted.length} pieces opened and started; ${played === wanted.length ? 'all' : played} played ${secs} s`);
if (engine) console.log('engine:', JSON.stringify(stats));
