/**
 * Keep the screen awake while playing, where the browser allows it (Android Chrome does). The system
 * lets the lock go when the page is hidden; it is asked for again when the page is back.
 */
type Lock = { release(): Promise<void> };
type WakeNavigator = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Lock> } };

export function screenAwake() {
  let lock: Lock | null = null;
  let wanted = false;
  async function set(on: boolean) {
    wanted = on;
    const nav = navigator as WakeNavigator;
    try {
      if (on && !lock && nav.wakeLock) lock = await nav.wakeLock.request('screen');
      if (!on && lock) {
        await lock.release();
        lock = null;
      }
    } catch {
      lock = null; // (not allowed now — e.g. the page is hidden; asked again when it's back)
    }
  }
  const back = () => {
    if (document.visibilityState === 'visible' && wanted) {
      lock = null; // (the system let it go while hidden)
      void set(true);
    }
  };
  document.addEventListener('visibilitychange', back);
  return {
    /** Ask for the screen to stay on (or let it go). */
    set: (on: boolean) => void set(on),
    dispose: () => document.removeEventListener('visibilitychange', back),
  };
}
