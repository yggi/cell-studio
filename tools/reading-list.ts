// The boot set: what a fresh agent reads before it does anything, `AGENTS.md` (imported by `CLAUDE.md`) and
// `docs/MEMORY.md` (which `AGENTS.md` says to start with). Its size has a ceiling, so the reading list stays something
// an agent takes in whole. Growth goes elsewhere by default: a fact lives next to what it describes, or on its page in
// `docs/`, which MEMORY points to. Condensing the boot set is its own deliberate change, made when the ceiling is
// reached, not a trim tucked into a feature's pull request.
//
// Lifted from yggi/jambot tooling/reading-list.ts @ 8871429ee9e489ad2af37270e7a4b0b090d91507 (the ceiling is this
// repository's).
import { Buffer } from 'node:buffer';

export const BOOT_SET = ['AGENTS.md', 'docs/MEMORY.md'];

/** In bytes: about 7k tokens, a little over the 23 KB the set had when the ceiling was set (yggi/music-commons#4). A ceiling far above the size could never fire. */
export const CEILING = 28 * 1024;

/** The boot set's size in bytes, given a reader of a path's text. */
export function bootBytes(read: (path: string) => string): number {
  return BOOT_SET.reduce((sum, path) => sum + Buffer.byteLength(read(path)), 0);
}
