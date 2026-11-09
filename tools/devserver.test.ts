// The dev server's dependency optimization, run as `npm run dev` and the gallery (tools/gallery/fast.mjs) run it: the
// first thing either does, and nothing else in the gate does it (`build` doesn't pre-bundle). At cells v0.22.0 it threw,
// so neither started (#627): the optimizer read `@yggi/cells/engine/clocking`'s exports with a JavaScript lexer, which a
// TypeScript `x! / y` throws off, then fell back to a JSX parse that fails on `import type` (vite.config.ts excludes cells).
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { optimizeDeps, resolveConfig } from 'vite';
import { afterAll, describe, expect, it } from 'vitest';

// (its own cache, so a dev server running beside the tests keeps its own)
const cacheDir = mkdtempSync(join(tmpdir(), 'cell-studio-deps-'));
afterAll(() => rmSync(cacheDir, { recursive: true, force: true }));

describe("the dev server's dependency optimization (#627)", () => {
  it("pre-bundles what index.html and the gallery's harness reach, and serves the language as source", async () => {
    const root = new URL('..', import.meta.url).pathname;
    const config = await resolveConfig({ root, configFile: join(root, 'vite.config.ts'), cacheDir, logLevel: 'error' }, 'serve');
    // (vite calls it deprecated as an API, since the dev server runs it itself: the same scan and the same bundling)
    const metadata = await optimizeDeps(config, true);
    const ids = Object.keys(metadata.optimized);
    expect(ids).toContain('@xyflow/svelte');
    expect(ids.filter((id) => id.startsWith('@yggi/cells'))).toEqual([]);
  });
});
