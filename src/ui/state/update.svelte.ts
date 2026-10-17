// "A new version is ready", as the toast and the version sheet both show it. The service worker (vite-plugin-pwa,
// registerType 'prompt') waits until the user accepts, so a playing piece is never cut off by a reload.
// yggi/jambot has the same file (apps/web/src/update.svelte.ts), lifted.
import { registerSW } from 'virtual:pwa-register';

class Update {
  /** A new version is installed and waiting. */
  ready = $state(false);
  /** The toast was sent away with Later; the version sheet still says so. */
  hushed = $state(false);
  #apply: ((reload?: boolean) => Promise<void>) | undefined;

  /** Registers the service worker, once; not in dev, where there is none. */
  start(): void {
    this.#apply ??= registerSW({ onNeedRefresh: () => (this.ready = true) });
  }

  /** Takes the new version and reloads. */
  reload(): void {
    void this.#apply?.(true);
  }
}

export const update = new Update();
