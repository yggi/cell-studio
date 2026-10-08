/**
 * Which plugin code runs. A piece's plugin is code that runs with the page's full powers (it can read your saved pieces
 * and use the network: there is no sandbox yet); opening a piece someone else wrote must not run it unasked (decision
 * 009). Trusted: the examples that ship with the app, and what the user chose to run, kept in this browser. Both by
 * `pluginKey` (manifest and code: a changed plugin asks again).
 *
 * A choice is kept only once the plugin has drawn once: code that hangs or throws while it first runs is not kept, so
 * the next visit to the piece does not freeze (the choice is "pending" until then).
 */
import { SvelteSet } from 'svelte/reactivity';
import { EXAMPLES } from '../examples';
import { storageKey } from '../storageKey';

const KEY = storageKey('cell-studio-plugins');
const PENDING = storageKey('cell-studio-plugins-pending');
const shipped = new Set(EXAMPLES.flatMap((e) => e.plugins));

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}
function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* kept for this visit only */
  }
}

const stored = read(KEY);
const chosen = new SvelteSet<string>(Array.isArray(stored) ? stored.filter((x): x is string => typeof x === 'string') : []);
// (a choice still pending when the page was opened never drew: it hung or threw — forgotten)
const left = read(PENDING);
if (typeof left === 'string') {
  chosen.delete(left);
  write(KEY, [...chosen]);
  write(PENDING, null);
}
let pending: string | null = null;

export const isShipped = (key: string): boolean => shipped.has(key);
export const isTrusted = (key: string): boolean => shipped.has(key) || chosen.has(key);

/** Run this plugin (this visit; kept once it has drawn: `confirmed`). */
export function trust(key: string): void {
  chosen.add(key);
  pending = key;
  write(PENDING, key);
}

/** The plugin drew: keep the choice. */
export function confirmed(key: string): void {
  if (pending !== key) return;
  pending = null;
  write(KEY, [...chosen]);
  write(PENDING, null);
}

/** Stop running this plugin: it asks again. */
export function revoke(key: string): void {
  chosen.delete(key);
  write(KEY, [...chosen]);
}
