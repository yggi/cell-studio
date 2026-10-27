// The session probe (#492, #478 rung 3's bound): a Jambot host plays through its lobby, Cell studio's build follows it,
// and what each played is set against the other's, event for event (`tools/session-compare.ts`): part, note, velocity
// and length alike, onsets and durations within the clock's bound, every event one lacks explained.
//
// Jambot is served from its own checkout, as its e2e setup serves it (`apps/web/playwright.config.ts`):
//   (in jambot)      pnpm build && pnpm preview --port 4317 --strictPort     # the host's page
//   (in jambot)      pnpm lobby --port 4319                                  # its lobby
//   (here)           npm run build && node tools/session-probe.mjs           # 10 minutes
//   node tools/session-probe.mjs --minutes 2 --jambot http://localhost:4317/ --lobby ws://localhost:4319
//   node tools/session-probe.mjs --throttle 4                               # Cell studio's CPU slowed, as a phone's
//
// The host is driven by the names Jambot's e2e drives it by (`e2e/audio.ts`: `useLobby`, `host`, "Start the band"), and
// Cell studio joins through `cellStudio.session.join`. Every 2 s both logs are read (`window.jambot.played(from)`,
// `cellStudio.session.played(from)`), so neither's 20,000 kept are outrun. It says how many bars Cell studio came to
// late (`sound.lacked`, "late by …", #496: 0 is the bound), a click at each section switch by level (its output tapped,
// `tools/session-clicks.ts`, #492), each switch as drawn (`tools/session-switches.ts`, #493) and its page's long tasks.
// Exits 1 where a bound isn't met.
//
// Chromium: Playwright's, or CHROME_PATH=/path/to/chrome (tools/profile/playwright.mjs).
import { mkdirSync, writeFileSync } from 'node:fs';
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
/** CDP's CPU slowdown on Cell studio's page (1: this machine's speed; 4 stands in for a mid-range phone, as the profile skill's). */
const THROTTLE = Number(option('throttle', '1'));
/** CLIPS=dir: the switches heard loudest over the bars either side, as WAV files to listen to, `CLIPS_KEPT` of them. */
const CLIPS = process.env.CLIPS;
const CLIPS_KEPT = 4;
/** How often both logs are read (ms). */
const READ_EVERY = 2000;
/** Jambot's own bound between two pages (1 ms, `apps/web/src/played.ts`), past the clock's. */
const WITHIN = 0.001;

const { module: compare } = await runnerImport('./tools/session-compare.ts', { configFile: false });
const { module: clicks } = await runnerImport('./tools/session-clicks.ts', { configFile: false });
const { module: switches } = await runnerImport('./tools/session-switches.ts', { configFile: false });
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
await host.locator('details[aria-label="Session"] summary .sub').filter({ hasText: 'Hosting' }).waitFor({ state: 'attached', timeout: 15000 });

// Cell studio: joined through the lobby, then the band started
const studio = await (await browser.newContext()).newPage();
studio.on('pageerror', (e) => errors.push(`Cell studio: ${e.message}`));
studio.on('console', (m) => m.type() === 'error' && errors.push(`Cell studio: ${m.text()}`));
// (the page's long tasks, each on its clock and how long: what holds the scheduler, #496)
await studio.addInitScript((clips) => {
  // (what the page sounds, by level, #492: tools/session-clicks.ts. Each render quantum's peak at the context's time,
  // from a worklet beside the destination, wherever something is connected to it)
  window.__levels = [];
  // (CLIPS=dir: it also keeps the last 3 s of what it hears, stereo, and gives a stretch of it when asked, `ask`)
  const tap = `registerProcessor('level-tap', class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.kept = [];
      this.ring = [new Float32Array(3 * sampleRate), new Float32Array(3 * sampleRate)];
      this.asks = [];
      this.port.onmessage = (e) => this.asks.push(e.data);
    }
    process(inputs) {
      const [l, r] = [inputs[0]?.[0], inputs[0]?.[1] ?? inputs[0]?.[0]];
      let peak = 0;
      for (const channel of inputs[0] ?? []) for (let i = 0; i < channel.length; i++) peak = Math.max(peak, Math.abs(channel[i]));
      this.kept.push(currentTime, peak);
      if (this.kept.length >= 256) { this.port.postMessage(this.kept); this.kept = []; }
      // (the ring always, so an ask finds the second before it)
      const n = this.ring[0].length;
      for (let i = 0; i < 128; i++) { this.ring[0][(currentFrame + i) % n] = l?.[i] ?? 0; this.ring[1][(currentFrame + i) % n] = r?.[i] ?? 0; }
      if (this.asks.length) {
        const end = currentFrame + 128;
        this.asks = this.asks.filter((a) => {
          const [f0, f1] = [Math.round(a.from * sampleRate), Math.round(a.to * sampleRate)];
          if (f1 > end) return true;
          const clip = f0 >= end - n ? [0, 1].map((c) => Float32Array.from({ length: f1 - f0 }, (_, i) => this.ring[c][(f0 + i) % n])) : null;
          this.port.postMessage({ clip: a.id, rate: sampleRate, from: a.from, samples: clip });
          return false;
        });
      }
      return true;
    }
  });`;
  const url = URL.createObjectURL(new Blob([tap], { type: 'text/javascript' }));
  const connect = AudioNode.prototype.connect;
  const taps = new WeakMap();
  AudioNode.prototype.connect = function (to, ...rest) {
    const made = connect.call(this, to, ...rest);
    if (to instanceof AudioDestinationNode) {
      const context = to.context;
      if (!taps.has(context))
        taps.set(
          context,
          context.audioWorklet.addModule(url).then(() => {
            const node = new AudioWorkletNode(context, 'level-tap', { numberOfInputs: 1, numberOfOutputs: 0 });
            // (each context's levels apart, on its own clock: the app replaces Tone's first, audio/device.ts, and makes
            // others that close in seconds; the one that runs on is the one that plays)
            const mine = (window.__tapped = (window.__tapped ?? 0) + 1);
            window.__quantum = 128 / context.sampleRate;
            node.port.onmessage = (e) => (e.data.clip !== undefined ? window.__clips.set(e.data.clip, e.data) : window.__levels.push([mine, e.data]));
            window.__tapNodes.push([context, node]);
            return node;
          }),
        );
      taps.get(context).then((node) => connect.call(this, node));
    }
    return made;
  };
  // (each switch heard, from 1 s before it to 1 s after, asked of the context that plays as its bar is laid)
  window.__clips = new Map();
  window.__tapNodes = [];
  if (clips) {
    const asked = new Set();
    setInterval(() => {
      const bars = window.cellStudio?.session?.state().sound?.bars ?? [];
      const playing = window.__tapNodes.filter(([c]) => c.state === 'running').sort(([a], [b]) => b.currentTime - a.currentTime)[0];
      for (const b of bars)
        if (b.switched && !asked.has(b.bar) && playing) {
          asked.add(b.bar);
          playing[1].port.postMessage({ id: b.bar, from: b.at - 1, to: b.at + 1 });
        }
    }, 250);
  }
  window.__longTasks = [];
  new PerformanceObserver((l) => window.__longTasks.push(...l.getEntries().map((e) => [e.startTime, e.duration]))).observe({ type: 'longtask', buffered: true });
  // (each section switch as drawn, #493: tools/session-switches.ts. Each frame's time; at each change of the editor's
  // text, where the graph's cells stood just before and 1.5 s after, and the editor's scrolls; the code scrolled to its
  // middle once it can be, so that keeping the scroll means something)
  window.__frames = [];
  window.__switches = [];
  const cells = () =>
    Object.fromEntries(
      [...document.querySelectorAll('.svelte-flow__node:not(.leaving)')].map((n) => {
        // (its centre: the flow places a node by it, nodeOrigin [0.5, 0.5], its corner moving as its size does)
        const m = /translate\(\s*(-?[\d.e+-]+)px,\s*(-?[\d.e+-]+)px/.exec(n.style.transform);
        return [n.dataset.id, m ? `translate(${Number(m[1]) + n.offsetWidth / 2}px, ${Number(m[2]) + n.offsetHeight / 2}px)` : ''];
      }),
    );
  let text = null;
  let following = false;
  let scroll = 0;
  let snapshot = {};
  let snapped = -Infinity;
  let scrolled = false;
  const frame = (t) => {
    window.__frames.push(t);
    if (window.__frames.length > 200000) window.__frames.splice(0, 100000);
    const code = document.querySelector('textarea[aria-label="Cell program"]');
    const editor = code?.closest('.editor');
    // (a switch: the text changed while it was already the session's, read only; the first is the session opened)
    if (code && following && code.value !== text) {
      // (the cells whose line the new text rewrites: what moves in the tower layout, where a cell's height is its line's)
      const lineOf = (x) => new Map(x.split('\n').flatMap((l) => (/^&[\w:]+/.test(l) ? [[`cell:${/^&([\w:]+)/.exec(l)[1]}`, l]] : [])));
      const [was, is] = [lineOf(text), lineOf(code.value)];
      const rewritten = [...is.keys()].filter((id) => was.has(id) && was.get(id) !== is.get(id));
      const record = { at: t, before: snapshot, after: null, rewritten, scroll: { before: scroll, after: null, gutter: null, paint: null } };
      window.__switches.push(record);
      setTimeout(() => {
        record.after = cells();
        record.scroll = {
          ...record.scroll,
          after: code.scrollTop,
          max: code.scrollHeight - code.clientHeight,
          gutter: editor?.querySelector('.gutter')?.scrollTop ?? null,
          paint: editor?.querySelector('.paint')?.scrollTop ?? null,
        };
      }, 1500);
    } else if (t - snapped > 250) {
      snapshot = cells();
      snapped = t;
    }
    if (code && !scrolled && code.value && code.scrollHeight > code.clientHeight) {
      code.scrollTop = (code.scrollHeight - code.clientHeight) / 2;
      code.dispatchEvent(new Event('scroll'));
      scrolled = true;
    }
    text = code?.value ?? null;
    following = !!code?.readOnly;
    scroll = code?.scrollTop ?? 0;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}, !!CLIPS);
await studio.goto(server.resolvedUrls.local[0]);
await studio.waitForFunction(() => window.cellStudio?.session);
const cdp = await studio.context().newCDPSession(studio);
if (THROTTLE !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
// (PROFILE=file.json: a CPU profile of Cell studio's page over the run, for the profile skill's tools/profile/agg.mjs)
if (process.env.PROFILE) {
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
  await cdp.send('Profiler.start');
}
await studio.evaluate(([lobby, session]) => window.cellStudio.session.join(lobby, session, 'Probe'), [LOBBY, SESSION]);
await studio.waitForFunction(() => window.cellStudio.session.state().status === 'joined', null, { timeout: 15000 });
await host.getByRole('button', { name: 'Start the band' }).click();
console.log(`hosting “${SESSION}” at ${JAMBOT} through ${LOBBY}; Cell studio joined; ${MINUTES} minutes${THROTTLE !== 1 ? `, its CPU slowed ×${THROTTLE}` : ''}`);

const logs = { host: [], studio: [], late: [], lackedBars: new Set(), lacks: [], lateBars: new Set(), bars: new Map(), levelsBy: new Map(), quantum: 0 };
const next = { host: 0, studio: 0 };
let bound = 0;
// (SHOTS=dir: the page at each read, and, of the 2nd to 4th section switches, the one before and the one after it, #493)
const SHOTS = process.env.SHOTS;
const shots = { last: null, switches: 0, after: null };
const shoot = async () => {
  const png = await studio.screenshot();
  const seen = await studio.evaluate(() => window.__switches.length);
  if (shots.after) {
    writeFileSync(`${SHOTS}/switch-${shots.after}-after.png`, png);
    shots.after = null;
  }
  if (seen > shots.switches && seen >= 2 && seen <= 4 && shots.last) {
    writeFileSync(`${SHOTS}/switch-${seen}-before.png`, shots.last);
    shots.after = seen;
  }
  shots.switches = seen;
  shots.last = png;
};
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const read = async () => {
  const h = await host.evaluate((from) => window.jambot.played(from), next.host);
  const s = await studio.evaluate(
    (from) => ({
      ...window.cellStudio.session.played(from),
      state: window.cellStudio.session.state(),
      levels: window.__levels.splice(0),
      quantum: window.__quantum ?? 0,
    }),
    next.studio,
  );
  for (const [context, batch] of s.levels) {
    const kept = logs.levelsBy.get(context) ?? logs.levelsBy.set(context, []).get(context);
    for (let i = 0; i + 1 < batch.length; i += 2) kept.push([batch[i], batch[i + 1]]);
  }
  logs.quantum = s.quantum;
  for (const b of s.state.sound?.bars ?? []) logs.bars.set(b.bar, b);
  logs.host.push(...h.events);
  logs.late = h.late;
  logs.studio.push(...s.events);
  [next.host, next.studio] = [h.next, s.next];
  for (const l of s.state.sound?.lacked ?? []) {
    const said = `${l.bar} ${l.why}`;
    if (!logs.lacks.includes(said)) logs.lacks.push(said);
    logs.lackedBars.add(l.bar);
    if (l.why.startsWith('late by')) logs.lateBars.add(l.bar);
  }
  bound = Math.max(bound, s.state.clock?.bound ?? 0);
  if (SHOTS) await shoot();
  return s.state;
};
const end = Date.now() + MINUTES * 60_000;
while (Date.now() < end) {
  await read();
  await new Promise((r) => setTimeout(r, READ_EVERY));
}
const last = await read();
const long = await studio.evaluate(() => window.__longTasks.map(([, d]) => d));
const shown = switches.switchesOf(...(await studio.evaluate(() => [window.__switches, window.__frames, window.__longTasks])));
const unkept = shown.filter((d) => !switches.within(d));
const most = (f) => Math.max(0, ...shown.map(f));
if (process.env.PROFILE) writeFileSync(process.env.PROFILE, JSON.stringify((await cdp.send('Profiler.stop')).profile));
/** The switches heard loudest over their neighbours, each a WAV of 1 s either side of it, written to CLIPS. */
async function keepClips(levels) {
  mkdirSync(CLIPS, { recursive: true });
  const worst = [...levels]
    .filter(clicks.heard)
    .sort((a, b) => b.over - a.over)
    .slice(0, CLIPS_KEPT);
  const kept = [];
  for (const l of worst) {
    const c = await studio.evaluate((bar) => {
      const x = window.__clips.get(bar);
      return x?.samples ? { rate: x.rate, samples: x.samples.map((s) => Array.from(s)) } : null;
    }, l.bar);
    if (!c) continue;
    const file = `${CLIPS}/bar-${l.bar}-${l.over >= 0 ? '+' : ''}${l.over.toFixed(1)}dB.wav`;
    writeFileSync(file, clicks.wav(c.samples, c.rate));
    kept.push(file);
  }
  return kept;
}
const within = bound + WITHIN;
// (the context that played: the one whose levels run longest)
logs.levels = [...logs.levelsBy.values()].reduce((a, b) => (b.length > a.length ? b : a), []);
const levels = clicks.switchLevels(
  [...logs.bars.values()].sort((a, b) => a.bar - b.bar),
  logs.levels,
  logs.quantum,
);
const sounded = levels.filter(clicks.heard);
const clicked = sounded.filter((l) => !clicks.clean(l));
const clipped = CLIPS ? await keepClips(levels) : [];
await browser.close();
await server.close();

const dB = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-∞');
const c = compare.compareSession(logs.host, logs.studio, within, { late: logs.late, lackedBars: [...logs.lackedBars] });
console.log(
  [
    `bars ${c.bars ? `${c.bars.from} to ${c.bars.to}` : 'none in common'}: the host played ${c.events} events, ${c.paired} paired`,
    `mismatched: velocity ${c.mismatched.velocity}, length ${c.mismatched.length}, onset ${c.mismatched.onset}, duration ${c.mismatched.duration} (within ${(within * 1000).toFixed(3)} ms)`,
    `onsets: Cell studio's less the host's ${(c.onset.median * 1000).toFixed(3)} ms in the middle, ${(c.onset.largest * 1000).toFixed(3)} ms at most; durations ${(c.duration.largest * 1000).toFixed(3)} ms at most`,
    `lacked: Cell studio ${c.lacked.studio.events} (${c.lacked.studio.unexplained} unexplained), the host ${c.lacked.host.events} (${c.lacked.host.unexplained} unexplained)`,
    `Cell studio said it lacked: ${logs.lacks.length ? logs.lacks.join('; ') : 'nothing'}; at the end ${last.status}, playing ${last.sound?.playing}, ${last.sound?.unread ?? 0} events the feel didn't read`,
    `Cell studio came late (#496: 0 is the bound) to ${logs.lateBars.size} bars${logs.lateBars.size ? `: ${[...logs.lateBars].join(', ')}` : ''}`,
    `clicks at a switch, by level (#492: the peak from 5 ms before a switch's start to 10 ms after no more than ${clicks.CLICK_DB} dB over the bars' either side): ${sounded.length} switches heard, ${clicked.length} over; the most over ${dB(Math.max(-Infinity, ...sounded.map((l) => l.over)))} dB${
      levels.length > sounded.length ? `; ${levels.length - sounded.length} silent here (nothing sounded round them)` : ''
    }${logs.levels.length ? `, over ${Math.round(logs.levels.length * logs.quantum)} s of levels` : ' (no level was taken: no audio ran)'}`,
    ...clicked.map((l) => `  bar ${l.bar}: ${dB(l.peak)} dBFS, the bars either side ${dB(l.before)} and ${dB(l.after)}`),
    `section switches drawn: ${shown.length} (#493: main-thread work under ${switches.BOUNDS.work} ms, frames under ${switches.BOUNDS.frame} ms at the 95th percentile, the cells that stay moved ${switches.BOUNDS.moved} px, the code's scroll kept), ${unkept.length} not: work ${Math.round(most((d) => d.work))} ms at most (the longest task ${Math.round(most((d) => d.longest))} ms), frames ${most((d) => d.frame).toFixed(1)} ms at most, moved ${most((d) => d.moved).toFixed(1)} px at most, the scroll kept ${shown.filter((d) => d.scrollKept).length} times; cells ${shown.reduce((a, d) => a + d.stayed, 0)} stayed (their lines the same; ${shown.reduce((a, d) => a + d.rewritten, 0)} more rewritten, moved ${most((d) => d.rewrittenMoved).toFixed(1)} px at most), ${shown.reduce((a, d) => a + d.came, 0)} came, ${shown.reduce((a, d) => a + d.went, 0)} went`,
    ...unkept.map(
      (d) =>
        `  switch at ${(d.at / 1000).toFixed(1)} s: work ${Math.round(d.work)} ms (longest ${Math.round(d.longest)}), frames ${d.frame.toFixed(1)} ms, moved ${d.moved.toFixed(1)} px${d.movers.length ? ` (${d.movers.join(' ')})` : ''}, scroll ${d.scrollKept ? 'kept' : `not kept (${JSON.stringify(d.scroll)})`}`,
    ),
    ...(CLIPS ? [`clips of the switches heard loudest (1 s either side, the switch at 1 s): ${clipped.length ? clipped.join(', ') : 'none kept'}`] : []),
    `Cell studio's long tasks: ${long.filter((d) => d > 100).length} over 100 ms, ${long.filter((d) => d > 300).length} over 300 ms, the longest ${Math.round(Math.max(0, ...long))} ms`,
    `errors: ${errors.length ? errors.join('; ') : 'none'}`,
    ...c.differing.map((d) => `  ${d}`),
  ].join('\n'),
);
process.exit(compare.agrees(c) && !errors.length && !logs.lateBars.size && !clicked.length && !unkept.length ? 0 : 1);
