import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };
// the commit this build is from (CI sets GITHUB_SHA; locally ask git; '' if neither)
const sha = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
})();

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(sha ? `${version} (${sha})` : version) },
  plugins: [svelte(), viteSingleFile()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    isolate: false,
  },
});
