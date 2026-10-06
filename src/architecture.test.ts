import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// The layering AGENTS.md promises: engine/ and layout/ are pure TS (they run in node tests and,
// later, in a worker), and don't reach up into audio/ or ui/.

const SRC = resolve(__dirname);
const files = (dir: string): string[] =>
  readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [join(dir, e.name)] : [],
  );

const FORBIDDEN = [/^svelte(\/|$)/, /^tone(\/|$)/, /^@xyflow\//, /\/(audio|ui)\//, /^\.\.\/(audio|ui)$/];
const importsOf = (src: string): string[] =>
  [...src.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'";]*?from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

describe('layering: engine/ and layout/ are pure', () => {
  for (const dir of ['engine', 'layout'])
    for (const file of files(dir))
      it(`${file} imports nothing from svelte, tone, audio/ or ui/`, () => {
        const bad = importsOf(readFileSync(join(SRC, file), 'utf8')).filter((s) => FORBIDDEN.some((re) => re.test(s)));
        expect(bad).toEqual([]);
      });
});
