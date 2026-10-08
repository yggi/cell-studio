/**
 * Tags in colour, chromatic: every tag one of the twelve note colours, dealt round
 * the circle of fifths in alphabetical order (so neighbours differ); past twelve,
 * the half-steps between; the tutorial a neutral of its own. The same colours wherever tags appear.
 */
import { tagName, TUTORIAL } from '../engine/tags';
import { noteColour } from './theme';

export function tagColours(tags: Iterable<string>): Map<string, string> {
  // (by name, not kind: a tag keeps its colour when it gains a prefix)
  const sorted = [...new Set(tags)].sort((a, b) => tagName(a).localeCompare(tagName(b)) || a.localeCompare(b));
  // (the tutorial is no genre: a neutral of its own)
  return new Map(sorted.map((t, i) => [t, t === TUTORIAL ? 'var(--tutorial)' : noteColour(((i * 7) % 12) * 30 + (Math.floor(i / 12) % 2) * 15)]));
}
