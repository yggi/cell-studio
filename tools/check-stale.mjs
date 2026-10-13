// Before `npm run check`: svelte-check --tsgo transpiles each component into .svelte-check/svelte/ and never removes one
// whose .svelte is gone, so a deleted component's leftovers report errors from code that no longer exists (#361). This
// removes every transpiled file whose component isn't there any more; the rest stay, for the next check to reuse.
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '.svelte-check/svelte';
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
if (existsSync(ROOT))
  for (const file of walk(ROOT)) {
    // (`++Name.svelte.ts` (or `.js`) and `Name.d.svelte.ts`, beside where `Name.svelte` was)
    const m = /^(?:\+\+)?(.+?)(?:\.d)?\.svelte\.[jt]s$/.exec(file.slice(file.lastIndexOf('/') + 1));
    const source = m && join(file.slice(ROOT.length + 1, file.lastIndexOf('/')), `${m[1]}.svelte`);
    if (source && !existsSync(source)) {
      rmSync(file);
      console.log(`check: removed ${file} (${source} is gone)`);
    }
  }
