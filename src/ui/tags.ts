/**
 * Tags in colour, chromatic: every tag one of the twelve note colours, dealt round
 * the circle of fifths in alphabetical order (so neighbours differ); past twelve,
 * the half-steps between. The same colours wherever tags appear.
 */
import { noteColour } from './theme';

export function tagColours(tags: Iterable<string>): Map<string, string> {
  const sorted = [...new Set(tags)].sort((a, b) => a.localeCompare(b));
  return new Map(sorted.map((t, i) => [t, noteColour(((i * 7) % 12) * 30 + (Math.floor(i / 12) % 2) * 15)]));
}
