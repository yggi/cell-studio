// tools/live.mjs, the land skill's check of the live site: its parsing, and the asset check run against a local server.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error a plain script (tools/live.mjs), exports for the test
import { assetMismatch, consoleProblems, scriptAsset } from './live.mjs';

const page = (asset: string) =>
  `<!doctype html><html><head>\n<script type="module" crossorigin src="./assets/${asset}"></script>\n<link rel="modulepreload" crossorigin href="./assets/esm-Od.js">\n</head></html>`;

describe('live: what it compares', () => {
  it("finds the module script of a page as Vite writes it, and of none it's null", () => {
    expect(scriptAsset(page('index-CrFTZsuw.js'))).toBe('assets/index-CrFTZsuw.js');
    expect(scriptAsset('<script src="x.js"></script><script type=module src=./a/b.js></script>')).toBe('a/b.js');
    expect(scriptAsset('<html><body>404</body></html>')).toBeNull();
  });

  it('passes the same asset and names both when they differ', () => {
    expect(assetMismatch('assets/index-a.js', 'assets/index-a.js')).toBeNull();
    expect(assetMismatch('assets/index-b.js', 'assets/index-a.js')).toBe('the live page loads assets/index-a.js, the build assets/index-b.js');
    expect(assetMismatch(null, 'assets/index-a.js')).toMatch(/no module script/);
    expect(assetMismatch('assets/index-a.js', null)).toMatch(/live page has no module script/);
  });

  it('fails on console errors and uncaught exceptions, not on warnings or logs', () => {
    const messages = [
      { type: 'log', text: 'ready' },
      { type: 'warning', text: 'AudioContext was not allowed to start' },
      { type: 'error', text: 'Failed to load resource: 404' },
      { type: 'pageerror', text: 'boom' },
    ];
    expect(consoleProblems(messages)).toEqual(['error: Failed to load resource: 404', 'pageerror: boom']);
    expect(consoleProblems(messages.slice(0, 2))).toEqual([]);
  });
});

describe('live: the asset check against a server', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cell-studio-live-'));
  let served = page('index-a.js');
  let server: Server;
  let url = '';
  beforeAll(async () => {
    server = createServer((_, res) => res.end(served));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });
  afterAll(() => {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const run = (built: string) => {
    writeFileSync(join(dir, 'index.html'), page(built));
    const script = fileURLToPath(new URL('live.mjs', import.meta.url));
    const child = spawn('node', [script, url, '--no-browser'], { env: { ...process.env, LIVE_DIST: dir, LIVE_WAIT: '0' } });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    return new Promise<{ status: number | null; out: string }>((done) => child.on('close', (status) => done({ status, out })));
  };

  it('passes when the site serves the build', async () => {
    served = page('index-a.js');
    const { status, out } = await run('index-a.js');
    expect(out).toContain('serves this build (assets/index-a.js)');
    expect(status).toBe(0);
  });

  it('fails when the site still serves another build', async () => {
    served = page('index-old.js');
    const { status, out } = await run('index-new.js');
    expect(out).toContain('the live page loads assets/index-old.js, the build assets/index-new.js');
    expect(status).toBe(1);
  });
});
