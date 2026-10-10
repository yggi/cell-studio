// Bring a pull request up to date with main when the merge conflicts only in the files that conflict
// mechanically (the senior skill, section 5). In a worktree of its own it merges `origin/main` into the PR's
// branch, resolves what is append-only or generated, runs the gate, and (with --push) pushes, unless the
// author pushed meanwhile. Anything else that conflicts stops it, with the files named: that one is for a person.
//
//   node tools/sync-pr.mjs <pr number> [--push] [--no-gate] [--keep]
//
// Exit: 0 done (or already up to date), 2 a conflict that is not mechanical, 3 the gate failed (the worktree stays),
// 4 the author pushed meanwhile (nothing pushed).
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** How each file that merges mechanically is resolved. */
export const RESOLVERS = {
  // both sides added lines: keep both, main's first (a decision, a changelog line, a piece in the order, a form in a tier)
  'CHANGELOG.md': 'union',
  'docs/MEMORY.md': 'union',
  'src/engine/snapshot.txt': 'union',
  'src/engine/order.ts': 'union',
  'src/engine/ladder.ts': 'union',
  // a JSON object, one entry a line: keep both, then the commas
  'src/layout/quality.baseline.json': 'entries',
  // generated from the examples and the parser's tables: take main's, then regenerate
  'docs/examples.md': 'generated',
  'docs/language/reference.md': 'generated',
};

/** The commands that regenerate the generated files. */
export const REGENERATE = [
  ['npm', 'run', 'docs:examples'],
  ['npx', 'vitest', 'run', 'src/engine/parser/reference.test.ts'],
];

/** The gate: what a contributor runs before pushing. */
export const GATE = [
  ['npm', 'run', 'check'],
  ['npx', 'eslint', 'src', 'tools'],
  ['npm', 'run', 'knip'],
  ['npx', 'prettier', '--check', '.'],
  ['npx', 'vitest', 'run', 'src', 'tools'],
];

/** A file with conflict markers as segments: plain text, or a conflict (`ours`: the branch, `theirs`: main). */
export function parseConflicts(text) {
  const out = [];
  const re = /^<<<<<<< [^\n]*\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> [^\n]*\n/gm;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ ours: m[1], theirs: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Both sides' lines, main's first; a line the branch has that main also has is kept once. Both end with a newline. */
export function union(ours, theirs) {
  const have = new Set(theirs.split('\n').filter(Boolean));
  const mine = ours.split('\n').slice(0, -1);
  return (
    theirs +
    mine
      .filter((l) => l === '' || !have.has(l))
      .map((l) => l + '\n')
      .join('')
  );
}

/** Resolve every conflict of a file by `kind`: 'union', or 'entries' (union, then the commas of a JSON object, one entry a line). */
export function resolveText(text, kind) {
  const joined = parseConflicts(text)
    .map((s) => ('text' in s ? s.text : union(s.ours, s.theirs)))
    .join('');
  return kind === 'entries' ? fixEntries(joined) : joined;
}

/** A JSON object written one `"key": value` entry a line: a comma after every entry but the last. */
export function fixEntries(text) {
  const lines = text.replace(/\n$/, '').split('\n');
  const entry = (l) => /^ {2}"[^"]+": /.test(l);
  const fixed = lines.map((l, i) => {
    if (!entry(l)) return l;
    const bare = l.replace(/,$/, '');
    return entry(lines[i + 1] ?? '') ? bare + ',' : bare;
  });
  return fixed.join('\n') + (text.endsWith('\n') ? '\n' : '');
}

/** Decisions that share a number: `docs/decisions/NNN-*.md` files, grouped (a number twice is a collision). */
export function duplicateDecisions(files) {
  const byNumber = new Map();
  for (const f of files) {
    const n = /^(\d+)-.*\.md$/.exec(f)?.[1];
    if (n) byNumber.set(n, [...(byNumber.get(n) ?? []), f]);
  }
  return [...byNumber].filter(([, fs]) => fs.length > 1).map(([n, fs]) => `${n}: ${fs.join(', ')}`);
}

const run = (cwd, cmd, args, opts = {}) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const ok = (cwd, cmd, args) => spawnSync(cmd, args, { cwd, stdio: 'ignore' }).status === 0;
const step = (cwd, [cmd, ...args], env = {}) => spawnSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } }).status === 0;

function main(argv) {
  const pr = argv.find((a) => /^\d+$/.test(a));
  const flag = (f) => argv.includes(f);
  if (!pr) {
    console.error('usage: node tools/sync-pr.mjs <pr number> [--push] [--no-gate] [--keep]');
    return 1;
  }
  const root = resolve(fileURLToPath(import.meta.url), '../..');
  const info = JSON.parse(run(root, 'gh', ['api', `repos/:owner/:repo/pulls/${pr}`, '--jq', '{ref: .head.ref, sha: .head.sha}']));
  run(root, 'git', ['fetch', '-q', 'origin', 'main', info.ref]);
  if (ok(root, 'git', ['merge-base', '--is-ancestor', 'origin/main', `origin/${info.ref}`])) {
    console.log(`#${pr} already has main merged in.`);
    return 0;
  }
  const wt = join(mkdtempSync(join(tmpdir(), 'sync-pr-')), `pr${pr}`);
  run(root, 'git', ['worktree', 'add', '-q', '-B', `sync/${pr}`, wt, `origin/${info.ref}`]);
  symlinkSync(join(root, 'node_modules'), join(wt, 'node_modules'));
  const merged = spawnSync('git', ['merge', '--no-edit', '-m', `Merge main into ${info.ref}`, 'origin/main'], { cwd: wt, stdio: 'ignore' }).status === 0;
  if (!merged) {
    const conflicted = run(wt, 'git', ['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean);
    const rest = conflicted.filter((f) => !(f in RESOLVERS));
    if (rest.length) {
      run(wt, 'git', ['merge', '--abort']);
      console.error(`#${pr} conflicts in files that are not mechanical, for a person:\n  ${rest.join('\n  ')}`);
      console.error(`(the worktree is ${wt}; the mechanical ones would have been: ${conflicted.filter((f) => f in RESOLVERS).join(', ') || 'none'})`);
      return 2;
    }
    for (const f of conflicted) {
      const kind = RESOLVERS[f];
      if (kind === 'generated') run(wt, 'git', ['checkout', '--theirs', '--', f]);
      else writeFileSync(join(wt, f), resolveText(readFileSync(join(wt, f), 'utf8'), kind));
      run(wt, 'git', ['add', f]);
      console.log(`${f}: ${kind}`);
    }
    run(wt, 'git', ['commit', '-q', '--no-edit']);
  }
  // (generated files can be stale even when the merge was clean: both sides added a piece)
  for (const cmd of REGENERATE) step(wt, cmd, cmd[1] === 'vitest' ? { UPDATE_REFERENCE: '1' } : {});
  step(wt, ['npx', 'prettier', '--write', '--log-level', 'warn', 'CHANGELOG.md', 'docs']);
  if (run(wt, 'git', ['status', '--porcelain', '--untracked-files=no'])) run(wt, 'git', ['commit', '-q', '-a', '-m', 'Regenerate the generated docs after merging main']);
  const markers = spawnSync('git', ['grep', '-nE', '^(<<<<<<<|>>>>>>>) ', '--', ':!docs/notes'], { cwd: wt, encoding: 'utf8' }).stdout.trim();
  if (markers) {
    console.error(`conflict markers left:\n${markers}`);
    return 3;
  }
  const clash = duplicateDecisions(readdirSync(join(wt, 'docs/decisions')));
  if (clash.length) console.warn(`WARNING decisions share a number (renumber one, and its MEMORY line and links):\n  ${clash.join('\n  ')}`);
  if (!flag('--no-gate')) {
    run(wt, 'rm', ['-rf', '.svelte-check']);
    for (const cmd of GATE)
      if (!step(wt, cmd)) {
        console.error(`gate failed at: ${cmd.join(' ')}\n(the worktree is ${wt})`);
        return 3;
      }
  }
  const sha = run(wt, 'git', ['rev-parse', 'HEAD']);
  if (!flag('--push')) {
    console.log(`#${pr}: merged and gated at ${sha.slice(0, 7)} in ${wt}\npush: git -C ${wt} push origin HEAD:${info.ref}`);
    return 0;
  }
  // (the author may have pushed while this ran: then this merge is of an old head)
  const now = run(root, 'git', ['ls-remote', 'origin', `refs/heads/${info.ref}`]).split('\t')[0];
  if (now !== info.sha) {
    console.error(`the author pushed meanwhile (${info.sha.slice(0, 7)} -> ${now.slice(0, 7)}): nothing pushed, run it again`);
    return 4;
  }
  run(wt, 'git', ['push', 'origin', `HEAD:${info.ref}`]);
  console.log(`#${pr}: pushed ${sha.slice(0, 7)} to ${info.ref}`);
  if (!flag('--keep')) {
    run(root, 'git', ['worktree', 'remove', '--force', wt]);
    if (existsSync(wt)) console.warn(`could not remove ${wt}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
