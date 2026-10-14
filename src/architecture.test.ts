import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// The layering AGENTS.md promises: layout/ is pure TS (it runs in node tests and, later, in a worker), and doesn't
// reach up into audio/ or ui/. The language itself is yggi/cells (@yggi/cells), pure by its own gate: what is written is
// the language's, how it is drawn layout's (layout/drawn.ts). And no module imports itself round a cycle.

const SRC = resolve(__dirname);
const files = (dir: string): string[] =>
  readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [join(dir, e.name)] : [],
  );

const FORBIDDEN = [/^svelte(\/|$)/, /^tone(\/|$)/, /^@xyflow\//, /\/(audio|ui)\//, /^\.\.\/(audio|ui)$/];
const importsOf = (src: string): string[] => [...src.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

describe('layering: layout/ is pure', () => {
  for (const file of files('layout'))
    it(`${file} imports nothing from svelte, tone, audio/ or ui/`, () => {
      const bad = importsOf(readFileSync(join(SRC, file), 'utf8')).filter((s) => FORBIDDEN.some((re) => re.test(s)));
      expect(bad).toEqual([]);
    });
});

/** `{ type A, type B }`: an import of types only. */
const typesOnly = (what: string) =>
  /^\{[^}]*\}$/.test(what) &&
  what
    .slice(1, -1)
    .split(',')
    .every((n) => !n.trim() || /^type\s/.test(n.trim()));
/** The modules a file imports for their values (not `import type`, nor an import of types only), as paths under src/. */
const valueImports = (file: string): string[] => {
  const src = readFileSync(join(SRC, file), 'utf8');
  return [...src.matchAll(/(?:^|\n)\s*(import|export)\s+(type\s+)?([^'";]*?)\s+from\s+['"](\.[^'"]+)['"]/g)]
    .filter(([, , type, what]) => !type && !typesOnly(what.trim()))
    .map(([, , , , spec]) => {
      const base = join(dirname(file), spec);
      return [`${base}.ts`, `${base}/index.ts`, base].find((f) => FILES.has(f));
    })
    .filter((f): f is string => f !== undefined);
};
const FILES = new Set(
  ['layout', 'audio', 'midi', 'ui'].flatMap(files).concat(readdirSync(SRC).filter((f) => /^[^.]+\.ts$/.test(f) && !/\.test\.ts$/.test(f) && f !== 'vite-env.d.ts')),
);

describe('no import cycles', () => {
  it('no module reaches itself through the values it imports', () => {
    const graph = new Map([...FILES].map((f) => [f, valueImports(f)]));
    const cycles: string[] = [];
    const state = new Map<string, 'open' | 'done'>();
    const visit = (f: string, path: string[]) => {
      if (state.get(f) === 'done') return;
      if (state.get(f) === 'open') return void cycles.push([...path.slice(path.indexOf(f)), f].join(' > '));
      state.set(f, 'open');
      for (const g of graph.get(f) ?? []) visit(g, [...path, f]);
      state.set(f, 'done');
    };
    for (const f of FILES) visit(f, []);
    expect(cycles).toEqual([]);
  });
});
