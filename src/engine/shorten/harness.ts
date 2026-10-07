/**
 * What every Shorten rule shares: the cells it may rewrite, how a suggestion's
 * saving is measured, and the note-for-note check a rule runs before it offers
 * a rewrite whose sound depends on its tables.
 */
import { compileSource } from '../compile';
import { codeShifts } from '../program';
import { declWords, spansLines } from '../edit';
import { flatten } from '../flatten';

export interface Suggestion {
  readonly id: string;
  readonly kind: 'run' | 'phrase' | 'fraction' | 'same';
  /** In a sentence: what it does. */
  readonly title: string;
  /** What was written, and what it becomes (short excerpts). */
  readonly before: string;
  readonly after: string;
  /** Characters saved. */
  readonly saving: number;
  readonly apply: (source: string) => string;
}

export type Result = ReturnType<typeof compileSource>;

/** A cell whose steps are written out one by one: its name, its braid's tokens, and whether its numbers are grid steps. */
export interface Candidate {
  readonly name: string;
  readonly tokens: string[];
  /** Transposable: its numbers are steps of a grid (no table between them and it). */
  readonly grid: boolean;
}

/** The cells whose steps are written out one by one, and safe to rewrite. */
export function candidates(source: string): { result: Result; cells: Candidate[] } {
  const r = compileSource(source);
  const readAsTable = new Set([...r.cells.values()].flatMap((c) => (c.over ? [c.over] : [])));
  const out: Candidate[] = [];
  for (const c of r.cells.values()) {
    if (c.lambda || c.implicit || c.voice || c.mix || c.sink || c.kit || c.note || c.map) continue;
    if (readAsTable.has(c.name) || spansLines(source, c.name)) continue;
    const w = declWords(source, c.name);
    if (!w || w.braid.length < 2 || w.braid.some((t) => t.startsWith('[') && t.includes('&'))) continue;
    const over = c.over ? r.cells.get(c.over) : null;
    if (over?.implicit && over.kit) continue; // a braid of voices: its steps are names, not numbers
    out.push({ name: c.name, tokens: w.braid, grid: !over || !!over.root });
  }
  return { result: r, cells: out };
}

/** A suggestion with its saving measured on its result; null when it saves nothing (or its rewrite fails). */
export const measured = (source: string, s: Omit<Suggestion, 'saving'>): Suggestion | null => {
  try {
    const next = s.apply(source);
    const saving = source.length - next.length;
    return saving > 0 && next !== source ? { ...s, saving } : null;
  } catch {
    return null;
  }
};

/** Do these cells play the same notes (value, place, length) in both programs? */
export function sameNotes(a: string, b: string, names: readonly string[]): boolean {
  try {
    const ra = compileSource(a);
    const rb = compileSource(b);
    if (!rb.ok) return false;
    const notes = (r: Result, n: string) =>
      flatten(r, n, codeShifts(r))
        .map((e) => `${e.step.toFixed(6)}:${e.duration.toFixed(6)}:${e.value + e.alter + (e.transpose ?? 0)}:${e.table}`)
        .join(' ');
    return names.every((n) => notes(ra, n) === notes(rb, n));
  } catch {
    return false;
  }
}
