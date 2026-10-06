import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
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
  // relative base: the app works under any path (the Pages URL /cell-studio/, a preview subfolder, a local server)
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      // 'prompt': a new service worker waits until the user accepts (UpdateToast), so a piece is never cut off by a reload
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cell studio',
        short_name: 'Cell studio',
        description: 'A minimal music language where everything is a cell.',
        display: 'standalone',
        // theme-color (index.html) and the surface colour of src/app.css
        theme_color: '#2f3652',
        background_color: '#1f222b',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      // precache the app shell and the lazily loaded Tone chunk: the whole app works offline after the first visit
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'], navigateFallback: 'index.html' },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    isolate: false,
  },
});
