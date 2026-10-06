// A piece just opened is at rest: transport stopped at 0, nothing sounding (tape hiss included).
// usage: node tools/profile/fresh-open.mjs http://localhost:4173/   (needs the app served; prints levels, exit 1 if any is audible)
import { chromium } from './playwright.mjs';
const url = process.argv[2];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.addInitScript(() => {
  window.__ans = new Map();
  const c = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (t, ...r) {
    if (t instanceof AudioDestinationNode && this.context.state !== 'closed') {
      let an = window.__ans.get(this.context);
      if (!an) {
        an = this.context.createAnalyser();
        an.fftSize = 2048;
        window.__ans.set(this.context, an);
      }
      try {
        c.call(this, an);
      } catch {}
    }
    return c.call(this, t, ...r);
  };
  window.__level = () => {
    let best = null;
    for (const [cx, an] of window.__ans) {
      if (cx.state !== 'running') continue;
      const d = new Float32Array(2048);
      an.getFloatTimeDomainData(d);
      const v = Math.sqrt(d.reduce((a, x) => a + x * x, 0) / d.length);
      best = Math.max(best ?? 0, v);
    }
    return best;
  };
});
const open = async (t) => {
  if (await p.locator('button.title').count()) {
    await p.locator('button.title').first().click();
    await p.waitForTimeout(600);
  }
  await p.getByRole('radio', { name: 'Cards' }).click();
  await p.locator('input.search').fill(t);
  await p.waitForTimeout(300);
  await p.locator('button.open').first().dispatchEvent('click');
  await p.waitForTimeout(1200);
};
const state = async (label) => {
  await p.waitForTimeout(2500);
  const lv = await p.evaluate(() => window.__level());
  const pl = await p
    .getByRole('button', { name: /^(Play|Pause)$/ })
    .first()
    .getAttribute('aria-label');
  const time = await p
    .locator('.transport')
    .innerText()
    .catch(() => '');
  console.log(label.padEnd(34), 'button:', pl, ' rms:', lv === null ? 'n/a' : lv.toFixed(5), ' time:', time.replace(/\s+/g, ' ').slice(0, 40));
};
let loud = false;
const lvl = async () => {
  const v = await lvl0();
  if (v !== 'n/a' && Number(v) > 0.0005) loud = true;
  return v;
};
const lvl0 = () =>
  p.evaluate(() => {
    const o = window.__level();
    return o === null ? 'n/a' : o.toFixed(5);
  });
const pause = async () => {
  await p.getByRole('button', { name: 'Pause' }).click();
  await p.waitForTimeout(1500);
};
await p.goto(url);
await p.waitForTimeout(800);
await open('Hypercell');
await p.getByRole('button', { name: 'Play' }).click();
await state('playing Hypercell');
await pause();
for (const t of ['Sound on Tape', 'Test Tones on Tape', 'Echo Tape']) {
  await open(t);
  await p.waitForTimeout(2000);
  console.log(
    '  paused, then opened',
    t.padEnd(20),
    'out level:',
    await lvl(),
    await p
      .getByRole('button', { name: /^(Play|Pause)$/ })
      .first()
      .getAttribute('aria-label'),
  );
}
await p.getByRole('button', { name: 'Play' }).click();
await state('playing Echo Tape');
await open('Sound on Tape');
await p.waitForTimeout(2500);
console.log(
  '  playing, then opened Sound on Tape: out level',
  await lvl(),
  await p
    .getByRole('button', { name: /^(Play|Pause)$/ })
    .first()
    .getAttribute('aria-label'),
  (await p.locator('.transport').innerText()).replace(/\s+/g, ' ').slice(0, 40),
);
await b.close();
if (loud) {
  console.log('FAIL: sound in a freshly opened piece');
  process.exit(1);
}
