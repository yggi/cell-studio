/**
 * Whether the performance overlay is on: `?perf` turns it on (and keeps it on), `?perf=off` turns it
 * off; Files ▾ toggles it too. Kept in this browser; without storage only the address counts.
 */
const KEY = 'cell-studio-perf';

export function perfWanted(): boolean {
  if (typeof location === 'undefined') return false;
  try {
    const q = new URLSearchParams(location.search).get('perf');
    if (q !== null) {
      if (q === 'off' || q === '0') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, '1');
    }
    return localStorage.getItem(KEY) === '1';
  } catch {
    return new URLSearchParams(location.search).has('perf');
  }
}

/** Keep the overlay's state for the next visit (where storage allows). */
export function keepPerf(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* not kept */
  }
}
