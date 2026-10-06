// A Chrome trace of a playing piece: where the main thread's time goes by event type (script, style,
// layout, paint, GC, …), including the native work a JS profile shows only as "(program)".
// usage: [CSS="canvas{display:none}"] THROTTLE=4 node tools/profile/trace.mjs <url> "<piece title>" [seconds=10]
import { chromium } from './playwright.mjs';
const [url, title, secs = '10'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox'] });
const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await c.newPage();
await p.goto(url);
await p.waitForTimeout(1000);
await p.getByRole('radio', { name: 'Cards' }).click();
await p.locator('input.search').fill(title);
await p.waitForTimeout(300);
await p.locator('button.open').first().dispatchEvent('click');
await p.waitForTimeout(2000);
await p.getByRole('button', { name: 'Play' }).click();
await p.waitForTimeout(4000);
if (process.env.CSS) await p.addStyleTag({ content: process.env.CSS }); // (ablation: switch a kind of drawing off, see what the main thread gets back)
const cdp = await c.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.THROTTLE ?? 1) });
await b.startTracing(p, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink', 'cc', 'toplevel'] });
await p.waitForTimeout(Number(secs) * 1000);
const buf = await b.stopTracing();
const ev = JSON.parse(buf.toString()).traceEvents;
// the renderer main thread: the thread that ran RunTask / FunctionCall most
const mainTid = (() => {
  const m = new Map();
  for (const e of ev) if (e.ph === 'X' && e.name === 'FunctionCall') m.set(`${e.pid}:${e.tid}`, (m.get(`${e.pid}:${e.tid}`) || 0) + e.dur);
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
})();
const on = ev.filter((e) => `${e.pid}:${e.tid}` === mainTid && e.ph === 'X');
const tasks = on.filter((e) => e.name === 'RunTask');
const busy = tasks.reduce((a, e) => a + e.dur, 0);
const span = Math.max(...tasks.map((e) => e.ts + e.dur)) - Math.min(...tasks.map((e) => e.ts)) || 1;
// self time per event type: each event's duration minus its children's (events nest on one thread)
const sorted = on.filter((e) => e.name !== 'RunTask').sort((a, b) => a.ts - b.ts || b.dur - a.dur);
const self = new Map();
const stack = [];
for (const e of sorted) {
  while (stack.length && stack.at(-1).ts + stack.at(-1).dur <= e.ts) stack.pop();
  self.set(e.name, (self.get(e.name) || 0) + e.dur);
  if (stack.length) self.set(stack.at(-1).name, self.get(stack.at(-1).name) - e.dur);
  stack.push(e);
}
console.log(`main thread busy ${((100 * busy) / span).toFixed(0)}% of ${(span / 1e6).toFixed(1)} s (${tasks.length} tasks)`);
const per = (n) => (on.filter((e) => e.name === n).length / (span / 1e6)).toFixed(0);
console.log(
  `per second: frames painted ${per('PaintArtifactCompositor::Update')}, FireAnimationFrame ${per('FireAnimationFrame')}, FunctionCall ${per('FunctionCall')}, tasks ${(tasks.length / (span / 1e6)).toFixed(0)}`,
);
const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, 14);
for (const [k, v] of rows) console.log(`${((100 * v) / busy).toFixed(1).padStart(5)}% of busy  ${k}`);
// the long tasks (> 50 ms): what ran in each — its biggest events, and which line of the bundle a FunctionCall started at
const longs = tasks.filter((e) => e.dur > 50000).slice(0, 6);
for (const t of longs) {
  const inside = on
    .filter((e) => e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e.dur > 4000 && /FunctionCall|Microtask|EvaluateScript|V8.Execute|Gc|GC/.test(e.name))
    .sort((a, b) => b.dur - a.dur)
    .slice(0, 6);
  console.log(
    `long task ${(t.dur / 1000).toFixed(0)} ms: ` +
      inside.map((e) => `${e.name}${e.args?.data?.functionName ? `(${e.args.data.functionName}:${e.args.data.lineNumber})` : ''} ${(e.dur / 1000).toFixed(0)}ms`).join(' | '),
  );
}
await b.close();
