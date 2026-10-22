/**
 * The name Cell studio goes by in a Jambot session. A host refuses a join whose name a player in the session already
 * goes by (trimmed, in any case: the session contract's handshake), so two Cell studios in one session can't both be
 * "Cell studio": each takes a short suffix of its own ("Cell studio k7m"), kept in the browser so a reload comes back
 * as the same player. Where nothing can be kept (no storage, or storage refused), a fresh one is drawn each time.
 * Refused for a name all the same, a client offers another (`anotherName`).
 */

/** Where a name is kept: localStorage's two calls, either of which may throw. */
export interface NameStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** The suffix's letters: lower case and digits, with none that read alike (i l o 0 1). */
const LETTERS = 'abcdefghjkmnpqrstuvwxyz23456789';
/** Three of them: 29 791 suffixes, so two clients of one session share one by a chance of about 1 in 30 000. */
const SUFFIX = 3;
const BASE = 'Cell studio';

const suffix = (draw: () => number): string => Array.from({ length: SUFFIX }, () => LETTERS[Math.min(LETTERS.length - 1, Math.floor(draw() * LETTERS.length))]).join('');

/** The name kept under `key`, or, with none kept, a new one ("Cell studio" and a suffix), kept from now on where it can be. */
export function defaultPlayerName(store: NameStore | null, key: string, draw: () => number = Math.random): string {
  try {
    const kept = store?.getItem(key)?.trim();
    if (kept) return kept;
  } catch {
    // (storage refused: a name of this visit's own)
  }
  const name = `${BASE} ${suffix(draw)}`;
  keepPlayerName(store, key, name);
  return name;
}

/** Keep a name to go by from now on (one joined with, typed or offered), where it can be kept. */
export function keepPlayerName(store: NameStore | null, key: string, name: string): void {
  if (!name.trim()) return;
  try {
    store?.setItem(key, name.trim());
  } catch {
    // (full or refused: the name lasts this visit)
  }
}

/** Another name for one a host refused as taken: the same, its suffix drawn anew (or one added), never the same name. */
export function anotherName(name: string, draw: () => number = Math.random): string {
  const base = name.trim().replace(new RegExp(` [${LETTERS}]{${SUFFIX}}$`), '') || BASE;
  for (let guard = 0; guard < 8; guard++) {
    const next = `${base} ${suffix(draw)}`;
    if (next.toLowerCase() !== name.trim().toLowerCase()) return next;
  }
  // (a draw that keeps giving the same suffix: a second word tells them apart)
  return `${base} ${suffix(draw)} 2`;
}

/**
 * Whether a host's refusal is of the name joined with: the contract makes `reason` a sentence for people, not a code,
 * so a refusal that names the name is taken for one (Jambot's: "A player named Ada is already in this session. Pick
 * another name."). One of another version, or of a blank name, doesn't name it.
 */
export const refusesName = (reason: string, name: string | null): boolean => !!name?.trim() && reason.toLowerCase().includes(name.trim().toLowerCase());

/** The browser's storage, where it is there to reach (a private window, or blocked site data, may refuse even that). */
export function browserStore(): NameStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
