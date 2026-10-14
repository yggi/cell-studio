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
// Then a piece from outside (#406): a string of code opened with `cellStudio.open` over a piece playing, as a file opens.
// Then MIDI out (#205): one piece played into a fake Web MIDI port, its note-ons checked against the plan's notes
// (tools/smoke-midi.ts) each within 2 ms of its neighbour (a slow drift followed, and one step of a clock jump up to 50 ms); then the
// tempo (a held free()) moved and Pause and Play again within the look-ahead (twice, the second at once), with no All notes off from either
// cutting what plays, and no note left sounding. The MIDI clock (#206) is on: its ticks before the tempo moved are
// checked against the meter's (2 ms, as the notes), and Start, Stop, Song Position and Continue in order, no tick while stopped.
// Then MIDI out from a piece's MIDI cards (#208): the channels its cards name, a MIDI-only voice sent and not sounded.
// Then MIDI in (#207): keys from a fake input (`window.midiIn(bytes)`) sound the armed voice and let it go, thru echoes them.
// Then a take (#210): Play in's braid left free, recorded from the fake input (● on the transport), held, then saved.
//
// Chromium: Playwright's, or CHROME_PATH=/path/to/chrome (CI uses the runner's Chrome). See tools/profile/playwright.mjs.
import { preview, runnerImport } from 'vite';
import { chromium } from './profile/playwright.mjs';
import { freshBuild } from './fresh-build.mjs';

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
freshBuild();
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
// A piece from outside (#406): `cellStudio.open(source)` on a card that is playing opens a string of code as a file
// opens: the transport stops, the editor shows the string, the graph draws its cells, and Play sounds them. A string
// that doesn't compile opens too, as a file's would, and says so.
const OUTSIDE = '&piece title="From outside"\n&tune step=3 0 4 7 12\n&lead s=sine loop=C5\n&out map=sample [&tune * &lead * .5]\n';
{
  problems = [];
  const op = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  op.setDefaultTimeout(8000);
  op.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  op.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  let note = '';
  try {
    await op.goto(url);
    await op.getByRole('radio', { name: 'Cards' }).click();
    await op.locator(`button.open[data-id="${pieces[0].id}"]`).dispatchEvent('click');
    await op.waitForTimeout(300);
    const transport = op.locator('.transport');
    await transport.getByRole('button', { name: 'Play' }).first().click();
    await op.waitForFunction(() => window.cellStudio.transport().state === 'playing');
    const opened = await op.evaluate((src) => window.cellStudio.open(src), OUTSIDE);
    if (!opened.ok) problems.push(`it did not compile: ${opened.errors.join('; ')}`);
    await op.waitForTimeout(300);
    const state = await op.evaluate(() => window.cellStudio.transport().state);
    if (state === 'playing') problems.push('the transport still plays the piece before');
    const code = await op.evaluate(() => document.querySelector('textarea')?.value ?? '');
    if (code !== OUTSIDE) problems.push(`the editor shows ${JSON.stringify(code.slice(0, 60))}, not the string`);
    const drawn = await op.$$eval('.svelte-flow__node', (ns) => ns.map((n) => n.dataset.id));
    // (the sound card: its node in the signal path's layout, a socket each thing it hears in the tower layout's)
    const cells = ['tune', 'lead', 'out'].filter((c) => !drawn.includes(`cell:${c}`) && !drawn.some((d) => d?.startsWith('socket:') && d.endsWith(`->cell:${c}`)));
    if (cells.length) problems.push(`the graph has no node for ${cells.join(', ')} (it has ${drawn.join(', ')})`);
    await transport.getByRole('button', { name: 'Play' }).first().click();
    await op.waitForFunction(() => (window.cellStudio.level('lead') ?? 0) > 0.01).catch(() => problems.push('&lead does not sound on Play'));
    const level = await op.evaluate(() => window.cellStudio.level('lead') ?? 0);
    await transport.getByRole('button', { name: 'Pause' }).first().click();
    const broken = await op.evaluate(() => window.cellStudio.open('&tune step=3 0 4 7\n&lead loop=&nowhere\n'));
    if (broken.ok || broken.errors.length === 0) problems.push(`a string that doesn't compile opened as ${JSON.stringify(broken)}`);
    const brokenCode = await op.evaluate(() => document.querySelector('textarea')?.value ?? '');
    if (!brokenCode.includes('&nowhere')) problems.push('the editor does not show the string that does not compile');
    note = `${pieces[0].title} playing, then a string opened: stopped, in the editor, ${drawn.length} nodes drawn, &lead at ${level.toFixed(2)} on Play; one that doesn't compile: "${broken.errors[0]}"`;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  await op.close();
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} A piece from outside: cellStudio.open${ok ? `: ${note}` : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('A piece from outside');
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
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: 'granted' }) }, configurable: true }); // (a page load reconnects only once MIDI is granted)
    localStorage.setItem('cell-studio:midi', JSON.stringify({ out: { id: 'fake-out', name: 'Fake synth' }, in: { id: 'none', name: '' }, clock: { 'Fake synth': true } }));
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
    // and once more at once (the clock's ticks sent ahead outlast the pause: the next run waits for its Stop)
    await transport.getByRole('button', { name: 'Pause' }).first().click();
    await transport.getByRole('button', { name: 'Play' }).first().click();
    await mp.waitForTimeout(800);
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
    // (MIDI follows what is heard: a dropped buffer moves it by about 10 ms, or on a loaded runner a few buffers at
    // once, and a smaller jump is slewed in over a few readings. So what is checked is the time between neighbours:
    // each note-on within 2 ms of the one before it, but one step up to the clock's leap (OUTPUT.leap, 50 ms, beyond
    // which it is another device); a slow drift is followed, not counted)
    const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
    const neighbours = (ds) => {
      const gaps = ds.slice(1).map((d, i) => Math.abs(d - ds[i]));
      const big = gaps.filter((g) => g > 2);
      const step = big.length === 1 ? big[0] : 0;
      const worst = Math.max(0, ...(big.length === 1 ? gaps.filter((g) => g <= 2) : gaps));
      return { worst, step };
    };
    const { worst, step } = neighbours(offsets);
    const gapsOf = (ds) =>
      ds
        .slice(1)
        .map((d, i) => (d - ds[i]).toFixed(1))
        .join(' ');
    if (worst > 2) problems.push(`a note-on was ${worst.toFixed(2)} ms off its neighbour (gaps: ${gapsOf(offsets)})`);
    if (step > 50) problems.push(`the note-ons stepped by ${step.toFixed(2)} ms`);
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
    // the MIDI clock: the ticks before the tempo moved, each against the meter's tick of its index, from Start's tick 0
    // (at the plan's code second 0, where the notes' offset puts it), aligned as the note-ons are
    const clockOrder = order.filter((m) => m.data[0] >= 0xf8 || m.data[0] === 0xf2);
    const ticks = clockOrder.filter((m) => m.data[0] === 0xf8 && m.timestamp < movedAt).map((m) => m.timestamp);
    const wantTicks = midiPlan.expectedTicks(MIDI_PIECE, secs + 2);
    if (ticks.length < 24 * 4) problems.push(`only ${ticks.length} clock ticks before the tempo moved`);
    const tickOffsets = ticks.map((t, k) => t - wantTicks[k] * 1000);
    const { worst: tickWorst, step: tickStep } = neighbours(tickOffsets);
    if (tickWorst > 2)
      problems.push(
        `a clock tick was ${tickWorst.toFixed(2)} ms off its neighbour (largest gaps: ${tickOffsets
          .slice(1)
          .map((d, i) => Math.abs(d - tickOffsets[i]))
          .sort((x, y) => y - x)
          .slice(0, 4)
          .map((g) => g.toFixed(1))
          .join(' ')})`,
      );
    if (tickStep > 50) problems.push(`the clock ticks stepped by ${tickStep.toFixed(2)} ms`);
    if (Math.abs(median(tickOffsets) - median(offsets)) > 2) problems.push(`the clock is ${(median(tickOffsets) - median(offsets)).toFixed(2)} ms off the notes`);
    // in timestamp order: Start first, a tick only while running, Stop after Pause; then the Song Position, Continue
    const names = { 0xfa: 'Start', 0xfb: 'Continue', 0xfc: 'Stop', 0xf2: 'SPP' };
    let running = false;
    const said = [];
    for (const m of clockOrder) {
      if (m.data[0] === 0xf8) {
        if (!running) problems.push('a clock tick while stopped');
        continue;
      }
      said.push(names[m.data[0]]);
      if (m.data[0] === 0xfa || m.data[0] === 0xfb) running = true;
      if (m.data[0] === 0xfc) running = false;
    }
    // (no tick doubled nor bunched: within a run, none nearer the one before than half a tick at the fastest tempo moved to)
    const close = clockOrder.filter((m, i) => m.data[0] === 0xf8 && clockOrder[i - 1]?.data[0] === 0xf8 && m.timestamp - clockOrder[i - 1].timestamp < 60000 / 119 / 24 / 2);
    if (close.length) problems.push(`${close.length} clock ticks closer than half a tick to the one before`);
    if (said.join(' ') !== 'Start Stop SPP Continue Stop SPP Continue Stop') problems.push(`the clock said ${said.join(' ')}`);
    // (and as sent: each clock message timestamped no earlier than the one before it)
    const clockSent = sent.filter((m) => m.data[0] >= 0xf8 || m.data[0] === 0xf2);
    if (clockSent.some((m, i) => i > 0 && m.timestamp < clockSent[i - 1].timestamp)) problems.push('clock messages sent out of order');
    const offs = sent.filter((m) => (m.data[0] & 0xf0) === 0x80).length;
    const all = sent.filter((m) => (m.data[0] & 0xf0) === 0x90).length;
    note = `${ons.length} note-ons within ${worst.toFixed(3)} ms of each other${step ? ` (one step of ${step.toFixed(1)} ms, a clock jump followed)` : ''}; then 4 tempo moves, Pause and Play twice: ${all} note-ons, ${offs} note-offs, ${allOff.length} All notes off, none left sounding; clock: ${ticks.length} ticks within ${tickWorst.toFixed(3)} ms of each other, ${said.join(' ')}`;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  await mp.close();
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} MIDI out: ${MIDI_PIECE} into a fake port${ok ? `: ${note}` : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('MIDI out');
}
// MIDI out from a piece's MIDI cards (#208): a piece that names its channels (map=midi) into the same fake port. Its
// note-ons are the channels and keys its cards name (tools/smoke-midi.ts, slot 1), none other (the default output's
// table doesn't send the rest); its MIDI-only voice is sent on its channel and never sounds on the built-in voices.
const CARD_PIECE = 'midi-out';
const CARD_ONLY = { voice: 'sub', channel: 2 };
{
  problems = [];
  const { module: midiPlan } = await runnerImport('./tools/smoke-midi.ts', { configFile: false });
  const mp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  mp.setDefaultTimeout(8000);
  mp.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  mp.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  await mp.addInitScript(() => {
    const sent = (window.__midi = []);
    const out = { id: 'fake-out', name: 'Fake synth', send: (data, timestamp) => sent.push({ data: [...data], timestamp: timestamp ?? performance.now() }) };
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map(), outputs: new Map([['fake-out', out]]), onstatechange: null });
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: 'granted' }) }, configurable: true }); // (a page load reconnects only once MIDI is granted)
    localStorage.setItem('cell-studio:midi', JSON.stringify({ out: { id: 'fake-out', name: 'Fake synth' }, in: { id: 'none', name: '' } }));
  });
  const secs = 3;
  let note = '';
  try {
    await mp.goto(url);
    await mp.getByRole('radio', { name: 'Cards' }).click();
    await mp.locator(`button.open[data-id="example:${CARD_PIECE}"]`).dispatchEvent('click');
    await mp.waitForTimeout(300);
    const transport = mp.locator('.transport');
    await transport.getByRole('button', { name: 'Play' }).first().click();
    // while it plays: the MIDI-only voice never sounds on the built-in voices, the heard one does
    let quiet = 0;
    let heard = 0;
    for (let t = 0; t < secs * 10; t++) {
      await mp.waitForTimeout(100);
      const [a, b] = await mp.evaluate((v) => [window.cellStudio.level(v) ?? 0, window.cellStudio.level('reed') ?? 0], CARD_ONLY.voice);
      quiet = Math.max(quiet, a);
      heard = Math.max(heard, b);
    }
    await transport.getByRole('button', { name: 'Pause' }).first().click();
    await mp.waitForTimeout(800);
    const sent = await mp.evaluate(() => window.__midi);
    const ons = sent.filter((m) => (m.data[0] & 0xf0) === 0x90).map((m) => ({ channel: (m.data[0] & 15) + 1, note: m.data[1] }));
    const want = midiPlan.expectedNoteOns(CARD_PIECE, secs + 2);
    const channels = (xs) => [...new Set(xs.map((x) => x.channel))].sort((a, b) => a - b).join(' ');
    if (ons.length < 8) problems.push(`only ${ons.length} note-ons were sent`);
    if (channels(ons) !== channels(want)) problems.push(`sent on channels ${channels(ons)}, the cards name ${channels(want)}`);
    const keys = new Set(want.map((w) => `${w.channel}:${w.note}`));
    const stray = ons.filter((o) => !keys.has(`${o.channel}:${o.note}`));
    if (stray.length) problems.push(`${stray.length} note-ons no card names, first ${stray[0].channel}:${stray[0].note}`);
    const sentOnly = ons.filter((o) => o.channel === CARD_ONLY.channel).length;
    if (!sentOnly) problems.push(`&${CARD_ONLY.voice}, on a MIDI card only, was not sent on channel ${CARD_ONLY.channel}`);
    if (quiet > 1e-4) problems.push(`&${CARD_ONLY.voice}, on a MIDI card only, sounded (peak ${quiet.toFixed(4)})`);
    if (!(heard > 1e-3)) problems.push('&reed, on both cards, did not sound');
    note = `${ons.length} note-ons on channels ${channels(ons)}, as the cards name them; &${CARD_ONLY.voice} sent ${sentOnly} times on ${CARD_ONLY.channel} and silent on the built-in voices (peak ${quiet.toFixed(4)}), &reed heard (peak ${heard.toFixed(3)})`;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  await mp.close();
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} MIDI out from cards: ${CARD_PIECE}${ok ? `: ${note}` : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('MIDI out from cards');
}
// MIDI in (#207): a fake input, played with `window.midiIn(bytes)` on a stopped piece. A key sounds the armed voice (the
// first cell that plays: sailor's &tune, on &fiddle) and takes the transport to paused; its note-off lets it go; thru
// echoes both where the routing matrix sends &fiddle (put on channel 2 here). Made-to-analysed time of a live note (the second: the first wakes the sound engine), and the output's
// own latency, reported.
{
  problems = [];
  const mp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  mp.setDefaultTimeout(8000);
  mp.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  mp.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  await mp.addInitScript(() => {
    const sent = (window.__midi = []);
    const out = { id: 'fake-out', name: 'Fake synth', send: (data) => sent.push([...data]) };
    const input = { id: 'fake-in', name: 'Fake keys', onmidimessage: null };
    window.midiIn = (bytes) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: performance.now() });
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['fake-in', input]]), outputs: new Map([['fake-out', out]]), onstatechange: null });
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: 'granted' }) }, configurable: true }); // (a page load reconnects only once MIDI is granted)
    localStorage.setItem(
      'cell-studio:midi',
      JSON.stringify({
        outputs: [{ key: 'o1', id: 'fake-out', name: 'Fake synth' }],
        in: { id: 'fake-in', name: 'Fake keys' },
        routes: { 'Drunken Sailor: D Dorian, with a kit': { o1: { fiddle: 2 } } },
      }),
    );
    localStorage.setItem('cell-studio:keys', JSON.stringify({ thru: true }));
    window.__ctx = [];
    const A = window.AudioContext;
    window.AudioContext = class extends A {
      constructor(...a) {
        super(...a);
        window.__ctx.push(this);
      }
    };
    // what reaches the speakers, after the master and the Stop gain: an analyser per context beside whatever connects to
    // its destination (the page makes more than one context, and Tone more than one node into each)
    const connect = AudioNode.prototype.connect;
    const taps = (window.__taps = new Map());
    AudioNode.prototype.connect = function (dest, ...rest) {
      if (dest === this.context.destination) {
        if (!taps.has(this.context)) taps.set(this.context, Object.assign(this.context.createAnalyser(), { fftSize: 2048 }));
        connect.call(this, taps.get(this.context));
      }
      return connect.call(this, dest, ...rest);
    };
    window.__outPeak = () => {
      let peak = null;
      for (const [ctx, a] of taps) {
        if (ctx.state !== 'running') continue;
        const buf = new Float32Array(a.fftSize);
        a.getFloatTimeDomainData(buf);
        peak = Math.max(
          peak ?? 0,
          buf.reduce((m, x) => Math.max(m, Math.abs(x)), 0),
        );
      }
      return peak;
    };
  });
  let note = '';
  try {
    await mp.goto(url);
    await mp.getByRole('radio', { name: 'Cards' }).click();
    await mp.locator(`button.open[data-id="example:${MIDI_PIECE}"]`).dispatchEvent('click');
    await mp.waitForTimeout(500);
    // a key, until the voice is heard (or 3 s), then how long that took: polled about every millisecond
    const sound = (bytes) =>
      mp.evaluate(
        (bytes) =>
          new Promise((done) => {
            const t0 = performance.now();
            window.midiIn(bytes);
            const look = () => {
              const level = window.cellStudio.level('fiddle') ?? 0;
              if (level > 0.01) return done({ ms: performance.now() - t0, level });
              if (performance.now() - t0 > 3000) return done({ ms: null, level });
              setTimeout(look, 1);
            };
            look();
          }),
        bytes,
      );
    const first = await sound([0x90, 60, 100]);
    if (first.ms === null) problems.push('a key on an armed voice did not sound');
    // the wheel of the mix the voice goes through hears the key while it is held (#252), and falls silent after
    // (the first ask only attaches the analyser)
    await mp.evaluate(() => window.cellStudio.level('mix'));
    await mp.waitForTimeout(150);
    const mixHeld = await mp.evaluate(() => window.cellStudio.level('mix') ?? 0);
    if (mixHeld < 0.001) problems.push(`the mix's wheel does not hear a held key (${mixHeld.toFixed(4)})`);
    await mp.evaluate(() => window.midiIn([0x80, 60, 0]));
    await mp.waitForTimeout(800);
    const after = await mp.evaluate(() => window.cellStudio.level('fiddle') ?? 0);
    if (after > 0.001) problems.push(`still sounding ${after.toFixed(4)} after the note-off`);
    const mixAfter = await mp.evaluate(() => window.cellStudio.level('mix') ?? 0);
    if (mixAfter > 0.001) problems.push(`the mix's wheel still hears ${mixAfter.toFixed(4)} after the note-off`);
    // again, the engine awake: a live note's latency
    const lat = [];
    for (let i = 0; i < 5; i++) {
      const r = await sound([0x90, 62 + i, 100]);
      if (r.ms !== null) lat.push(r.ms);
      await mp.evaluate((n) => window.midiIn([0x80, n, 0]), 62 + i);
      await mp.waitForTimeout(600);
    }
    if (lat.length < 5) problems.push(`${5 - lat.length} of 5 keys did not sound`);
    // Stop with a key down cuts it (the 'stopped' gain), and a key pressed after Stop sounds again
    await mp.evaluate(() => window.midiIn([0x90, 60, 100]));
    await mp.waitForTimeout(300);
    await mp.locator('.transport').getByRole('button', { name: 'Stop' }).first().click();
    await mp.waitForTimeout(800);
    const cut = await mp.evaluate(() => window.cellStudio.level('fiddle') ?? 0);
    if (cut > 0.001) problems.push(`still sounding ${cut.toFixed(4)} after Stop with a key down`);
    // (heard at the output, past the Stop gain: the voice's own analyser sits before it and can't tell)
    const outCut = await mp.evaluate(() => window.__outPeak?.() ?? null);
    if (outCut === null) problems.push('no tap on the output to measure Stop with');
    else if (outCut > 0.001) problems.push(`the output still carries ${outCut.toFixed(4)} after Stop with a key down`);
    await mp.evaluate(() => window.midiIn([0x90, 64, 100]));
    const heard = await mp.evaluate(
      () =>
        new Promise((done) => {
          const t0 = performance.now();
          const look = () => {
            if ((window.__outPeak?.() ?? 0) > 0.001) return done(true);
            if (performance.now() - t0 > 3000) return done(false);
            setTimeout(look, 5);
          };
          look();
        }),
    );
    if (!heard) problems.push('a key pressed after Stop was not heard at the output');
    await mp.evaluate(() => window.midiIn([0x80, 64, 0]));
    const audio = await mp.evaluate(() => {
      const c = window.__ctx.find((x) => x.state === 'running');
      return c ? { baseLatency: c.baseLatency, outputLatency: c.outputLatency } : null;
    });
    const sent = await mp.evaluate(() => window.__midi);
    const thru = sent.filter((m) => m[0] === 0x91 || m[0] === 0x81);
    if (!thru.some((m) => m[0] === 0x91 && m[1] === 60 && m[2] === 100) || !thru.some((m) => m[0] === 0x81 && m[1] === 60))
      problems.push(`thru did not echo the key on channel 2: ${JSON.stringify(thru.slice(0, 4))}`);
    const med = [...lat].sort((a, b) => a - b)[Math.floor(lat.length / 2)] ?? NaN;
    note = `a key sounds &fiddle (first, waking the engine: ${first.ms?.toFixed(0)} ms), its note-off lets it go; made-to-analysed ${med.toFixed(1)} ms median of ${lat.map((x) => x.toFixed(1)).join(', ')}${audio ? ` + the output's ${(1000 * ((audio.baseLatency ?? 0) + (audio.outputLatency ?? 0))).toFixed(1)} ms` : ''}; thru echoed on channel 2`;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  await mp.close();
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} MIDI in: keys on ${MIDI_PIECE}${ok ? `: ${note}` : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('MIDI in');
}
// A take (#210): Play in's riff, a braid left free (16 steps at 6.4 a second: a pass of 2.5 s), armed by default. ● starts
// play and the recorder places the pass it takes; each key goes in through the fake input stamped with the moment its
// step is heard (`cellStudio.heardAt`, as a real MIDI message carries its `timeStamp`), sent once that moment has come:
// the take reads a key's time from its stamp, so a loaded machine sending it late doesn't move it (#360). The take is
// held (the riff's pill shows it, the code doesn't), then Save writes it: the code line shows free(…) with the take.
{
  problems = [];
  const mp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  mp.setDefaultTimeout(8000);
  mp.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  mp.on('console', (m) => m.type() === 'error' && problems.push(`console error: ${m.text()}`));
  await mp.addInitScript(() => {
    const input = { id: 'fake-in', name: 'Fake keys', onmidimessage: null };
    window.midiIn = (bytes, at = performance.now()) => input.onmidimessage?.({ data: new Uint8Array(bytes), timeStamp: at });
    navigator.requestMIDIAccess = () => Promise.resolve({ inputs: new Map([['fake-in', input]]), outputs: new Map(), onstatechange: null });
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: 'granted' }) }, configurable: true }); // (a page load reconnects only once MIDI is granted)
    localStorage.setItem('cell-studio:midi', JSON.stringify({ in: { id: 'fake-in', name: 'Fake keys' } }));
  });
  const WANT = '0 ~ [2,4]@4 ~ ~ 7 ~ ~ ~ ~ ~ ~ ~';
  let note = '';
  try {
    await mp.goto(url);
    await mp.getByRole('radio', { name: 'Cards' }).click();
    await mp.locator('button.open[data-id="example:play-in"]').dispatchEvent('click');
    await mp.waitForTimeout(500);
    await mp.getByRole('button', { name: 'Record', exact: true }).click();
    const line = await mp.evaluate(
      () =>
        new Promise((done) => {
          const STEPS = 6.4;
          // (key on or off, at a step of the pass: a twentieth of a step after it, as heard)
          const plan = [
            [0, [0x90, 60, 100]],
            [0.8, [0x80, 60, 0]],
            [2, [0x90, 64, 100]],
            [2, [0x90, 67, 100]],
            [5.8, [0x80, 64, 0]],
            [5.8, [0x80, 67, 0]],
            [8, [0x90, 72, 100]],
            [8.8, [0x80, 72, 0]],
          ];
          // the page's moment (ms) a piece's time (code seconds) is heard: heardAt rises with ms, so halve the span
          const momentOf = (seconds) => {
            let [lo, hi] = [performance.now() - 10_000, performance.now() + 10_000];
            for (let i = 0; i < 50; i++) {
              const mid = (lo + hi) / 2;
              if ((window.cellStudio.heardAt(mid) ?? -1) < seconds) lo = mid;
              else hi = mid;
            }
            return hi;
          };
          const t0 = performance.now();
          let stamps = null;
          let k = 0;
          const look = () => {
            const take = window.cellStudio.take();
            const t = window.cellStudio.transport();
            if (!stamps && take.start !== null && t.state === 'playing' && window.cellStudio.heardAt(performance.now()) !== null)
              stamps = plan.map(([step]) => momentOf((take.start + step + 0.05) / STEPS));
            while (stamps && k < plan.length && performance.now() >= stamps[k]) window.midiIn(plan[k][1], stamps[k++]);
            if (k === plan.length && take.state === 'off') return done({ ok: true, seconds: t.seconds });
            if (performance.now() - t0 > 12_000) return done({ ok: false, at: t, take, sent: k });
            setTimeout(look, 1);
          };
          look();
        }),
    );
    if (!line.ok) problems.push(`the take did not run: ${JSON.stringify(line)}`);
    await mp.waitForTimeout(200);
    const pill = (await mp.locator('button.pill', { hasText: 'braid' }).first().textContent())?.replace(/\s+/g, ' ').trim();
    const code = () => mp.evaluate(() => document.querySelector('textarea')?.value ?? '');
    const before = await code();
    if (!pill?.startsWith(`braid: ${WANT.slice(0, 12)}`)) problems.push(`the take held is not what was played: pill "${pill}", wanted ${WANT}`);
    if (!before.includes('free(0 2 4 ~ 4 2 0 ~ 0 2 4 ~ 7@2 ~ ~)')) problems.push('the code changed before Save');
    await mp.getByRole('button', { name: 'Save', exact: true }).click();
    await mp.waitForTimeout(200);
    const after = (await code()).split('\n').find((l) => l.startsWith('&riff')) ?? '';
    if (!after.includes(`free(${WANT})`)) problems.push(`Save wrote "${after}", wanted free(${WANT})`);
    note = `a pass recorded from the fake input and held (pill "${pill}"), then saved: ${after}`;
  } catch (e) {
    problems.push(String(e.message).split('\n')[0]);
  }
  await mp.close();
  const ok = problems.length === 0;
  console.log(`${ok ? 'ok  ' : 'FAIL'} A take: Play in${ok ? `: ${note}` : '\n       ' + [...new Set(problems)].slice(0, 3).join('\n       ')}`);
  if (!ok) failed.push('A take');
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
