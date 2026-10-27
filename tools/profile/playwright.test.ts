// tools/profile/playwright.mjs: which Chromium a launch uses, against a stand-in for Playwright's `chromium`.
import { describe, expect, it } from 'vitest';
import { FALLBACK, launchWith } from './playwright.mjs';

const missing = new Error("browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1248/chrome");
/** A stand-in whose launch fails for want of its own browser, unless given a path, and records each launch's path. */
function standIn(fails: Error | null = missing) {
  const paths: (string | undefined)[] = [];
  return {
    paths,
    launch: async (o: { executablePath?: string }) => {
      paths.push(o.executablePath);
      if (!o.executablePath && fails) throw fails;
      return { at: o.executablePath ?? 'own' };
    },
  };
}
const quiet = () => {};

describe('launchWith', () => {
  it("falls back to the container's Chromium when Playwright's own isn't installed, and says so", async () => {
    const real = standIn();
    const said: string[] = [];
    expect(
      await launchWith(
        real,
        {},
        {},
        () => true,
        (line: string) => said.push(line),
      ),
    ).toEqual({ at: FALLBACK });
    expect(real.paths).toEqual([undefined, FALLBACK]);
    expect(said.join('')).toContain(FALLBACK);
  });

  it("uses Playwright's own when it is installed", async () => {
    const real = standIn(null);
    expect(await launchWith(real, {}, {}, () => true, quiet)).toEqual({ at: 'own' });
    expect(real.paths).toEqual([undefined]);
  });

  it('uses CHROME_PATH where it is set, and nothing else', async () => {
    const real = standIn();
    expect(await launchWith(real, {}, { CHROME_PATH: '/usr/bin/google-chrome' }, () => true, quiet)).toEqual({ at: '/usr/bin/google-chrome' });
    expect(real.paths).toEqual(['/usr/bin/google-chrome']);
  });

  it('keeps the error where there is no fallback, or the launch failed for another reason', async () => {
    await expect(launchWith(standIn(), {}, {}, () => false, quiet)).rejects.toBe(missing);
    const other = new Error('Target page, context or browser has been closed');
    await expect(launchWith(standIn(other), {}, {}, () => true, quiet)).rejects.toBe(other);
  });
});
