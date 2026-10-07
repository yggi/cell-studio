// The corpus yardstick (#10): every example measured — its size, its diagnostics, what Shorten still
// finds, and a fingerprint of the notes it plays (voice, onset, length, frequency, gains; 0–120 s).
// Record on the base, then check a change against it: which pieces sound different, and how their code moved.
//   node tools/corpus.mjs > /tmp/corpus.json            record (a table on stderr)
//   node tools/corpus.mjs --check /tmp/corpus.json      compare: exits 1 if a piece's notes changed
//   node tools/corpus.mjs --check /tmp/corpus.json --expect "acid,pop"   … except these (meant to change)
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';

const arg = (k) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : null;
};
const UNTIL = 120;
const server = await createServer({ configFile: false, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const { compileSource } = await server.ssrLoadModule('/src/engine/compile.ts');
  const { plan, eventsBetween } = await server.ssrLoadModule('/src/engine/realize.ts');
  const { codeShifts } = await server.ssrLoadModule('/src/engine/program.ts');
  const { shorten } = await server.ssrLoadModule('/src/engine/shorten/index.ts');
  const measure = (src) => {
    const r = compileSource(src);
    const events = r.ok
      ? eventsBetween(plan(r, codeShifts(r)), 0, UNTIL)
          .map((e) => `${e.voice} ${e.at.toFixed(5)} ${e.dur.toFixed(5)} ${e.freq.toFixed(3)} ${e.gains.map((g) => g.toFixed(4)).join(',')}`)
          .sort()
      : [];
    const s = r.ok ? shorten(src) : [];
    return {
      chars: src.length,
      lines: src.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#')).length,
      cells: r.cells.size,
      diagnostics: r.diagnostics.length,
      shorten: s.length,
      saving: s.reduce((a, x) => a + x.saving, 0),
      events: events.length,
      notes: createHash('sha1').update(events.join('\n')).digest('hex').slice(0, 16),
    };
  };
  const dir = new URL('../examples/', import.meta.url);
  const now = Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.cells'))
      .sort()
      .map((f) => [f.replace(/\.cells$/, ''), measure(readFileSync(new URL(f, dir), 'utf8'))]),
  );
  const base = arg('--check') ? JSON.parse(readFileSync(arg('--check'), 'utf8')) : null;
  if (!base) {
    const total = (k) => Object.values(now).reduce((a, m) => a + m[k], 0);
    for (const [k, m] of Object.entries(now))
      process.stderr.write(
        `${k.padEnd(14)} ${String(m.chars).padStart(6)} chars ${String(m.lines).padStart(4)} lines ${String(m.cells).padStart(4)} cells  shorten ${m.shorten} (−${m.saving})  ${m.diagnostics ? `${m.diagnostics} diagnostics` : ''}\n`,
      );
    process.stderr.write(`${Object.keys(now).length} pieces, ${total('chars')} chars, ${total('lines')} lines, ${total('cells')} cells\n`);
    process.stdout.write(JSON.stringify(now, null, 1) + '\n');
  } else {
    const expect = new Set((arg('--expect') ?? '').split(',').filter(Boolean));
    let unexpected = 0;
    const d = (a, b) => (b - a > 0 ? `+${b - a}` : `${b - a}`);
    for (const k of new Set([...Object.keys(base), ...Object.keys(now)])) {
      const a = base[k];
      const b = now[k];
      if (!a || !b) {
        process.stdout.write(`${k.padEnd(14)} ${a ? 'removed' : 'new'}\n`);
        continue;
      }
      const sound = a.notes === b.notes ? 'same notes' : expect.has(k) ? 'notes changed (expected)' : 'NOTES CHANGED';
      if (a.notes !== b.notes && !expect.has(k)) unexpected++;
      if (a.notes !== b.notes || a.chars !== b.chars || a.diagnostics !== b.diagnostics || a.shorten !== b.shorten)
        process.stdout.write(
          `${k.padEnd(14)} ${sound.padEnd(26)} chars ${d(a.chars, b.chars)}  lines ${d(a.lines, b.lines)}  cells ${d(a.cells, b.cells)}  shorten ${a.shorten}→${b.shorten}  diagnostics ${a.diagnostics}→${b.diagnostics}\n`,
        );
    }
    const sum = (o, k) => Object.values(o).reduce((x, m) => x + m[k], 0);
    process.stdout.write(
      `total: chars ${d(sum(base, 'chars'), sum(now, 'chars'))}, lines ${d(sum(base, 'lines'), sum(now, 'lines'))}, cells ${d(sum(base, 'cells'), sum(now, 'cells'))}; ${unexpected} pieces changed sound unexpectedly\n`,
    );
    process.exitCode = unexpected ? 1 : 0;
  }
} finally {
  await server.close();
}
