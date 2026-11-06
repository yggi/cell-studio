/**
 * A roving tabindex (#338): a row of controls is one tab stop, the arrows move along it. Which control the key takes
 * focus to, from `at`, among `items` in their order; null: the key doesn't move it.
 */
export function roveTo<T>(items: readonly T[], at: T, key: string): T | null {
  const i = items.indexOf(at);
  if (i < 0 || !items.length) return null;
  const to = key === 'ArrowRight' || key === 'ArrowDown' ? i + 1 : key === 'ArrowLeft' || key === 'ArrowUp' ? i - 1 : key === 'Home' ? 0 : key === 'End' ? items.length - 1 : null;
  return to === null ? null : items[Math.max(0, Math.min(items.length - 1, to))]!;
}
