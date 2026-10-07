/**
 * Which plugin code runs. A piece's plugin is code; opening a piece someone else wrote must not run it unasked
 * (decision 009). Trusted: the code of the examples that ship with the app, and the code a user chose to run, kept in
 * this browser by its text (so a changed plugin asks again).
 */
import { SvelteSet } from 'svelte/reactivity';
import { EXAMPLES } from '../examples';
import { storageKey } from '../storageKey';

const KEY = storageKey('cell-studio-plugins');
const shipped = new Set(EXAMPLES.flatMap((e) => e.plugins));

function read(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

const chosen = new SvelteSet<string>(read());

export const isTrusted = (code: string): boolean => shipped.has(code) || chosen.has(code);

/** Run this code from now on (in this browser). */
export function trust(code: string): void {
  chosen.add(code);
  try {
    localStorage.setItem(KEY, JSON.stringify([...chosen]));
  } catch {
    /* kept for this visit only */
  }
}
