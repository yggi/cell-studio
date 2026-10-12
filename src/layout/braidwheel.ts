/**
 * What a cell's sheet shows of its braid on the wheel (ui/sheet/BraidWheel.svelte): the braid as a list of
 * tokens, a label for each, the hues a token sounds and how many entries one lap of its table has. Pure: the
 * program, the cell's name and the shifts to read it through (live, while playing) are all it takes.
 */
import type { Atom, FreeSpec } from '../engine/ast';
import { period, resolvePitch, semitones, shiftedUnits } from '../engine/helix';
import { parse } from '../engine/parser';
import type { CompileResult, ResolvedCell, Shifts } from '../engine/program';
import { splitWords } from '../engine/edit';
import { pitchFill } from './cellview';
import { effectiveShow, names, noteFrame, noteLabel } from './show';
import { stepText } from './wheel';
import { leaves } from '../engine/subseq';

/**
 * What a cell's sheet draws as its picture, before its wheel: a note's text, a signal's spectrum (a mix, the sound
 * card), an envelope's curve, a voice's spectrum and wave; null: just its wheel.
 */
export function sheetPicture(c: ResolvedCell): 'note' | 'signal' | 'curve' | 'voice' | null {
  if (c.note) return 'note';
  if (c.mix || c.sink) return 'signal';
  if (c.map?.kind === 'adsr') return 'curve';
  if (c.voice) return 'voice';
  return null;
}

/** A voice made from its braid (no s=): the waveform it loops is its braid, so its wheel is drawn too. */
export const braidVoice = (c: ResolvedCell): boolean => c.voice && c.params.s === undefined;

/** Whether a cell's sheet draws its wheel (with the row that turns it): one with no picture, or a voice made from its braid. */
export function sheetWheel(c: ResolvedCell): boolean {
  const picture = sheetPicture(c);
  return picture === null || (picture === 'voice' && braidVoice(c));
}

/** One written token (`3`, `[0, 4, 7]`, `[0 2]`, `[0|2]`, `&bass`) read as the atom it is, or null if it isn't one. */
export function atomOf(token: string): Atom | null {
  const b = parse(`&probe ${token}`).cells[0]?.braid;
  return b?.kind === 'list' ? (b.tokens[0]?.atom ?? null) : null;
}

/** The pitch hues a token sounds, read through `name`'s table (null for refs, rests, functions). */
export function tokenHues(result: CompileResult, name: string, shifts: Shifts, token: string): number[] | null {
  const atom = atomOf(token);
  if (!atom || !result.cells.get(name)) return null;
  const hue = (v: number, alter: number) => pitchFill(result, name, v, alter, shifts).hue;
  const huesOf = (a: Atom): number[] =>
    a.kind === 'note'
      ? [hue(a.value, a.alter)]
      : a.kind === 'chord'
        ? a.notes.map((v, i) => hue(v, a.alters[i]))
        : // a choice: the colour of its first option (as a chord takes its root's)
          a.kind === 'choice'
          ? [hue(a.values[0], a.alters[0])]
          : [];
  try {
    // (a subsequence: the hues of its notes in order, as a chord's, so its step is drawn split among them)
    const out = leaves(atom).flatMap(huesOf);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** A token's name under the cell's show (notes, midi, do, degrees), or null. */
export function tokenName(result: CompileResult, name: string, shifts: Shifts, token: string): string | null {
  if (!result.cells.get(name)) return null;
  const eff = effectiveShow(result, name);
  if (!names(eff.show)) return null;
  const atom = atomOf(token);
  if (!atom || atom.kind !== 'note') return null;
  try {
    const r = resolvePitch(result, name, atom.value, atom.alter, shifts);
    const { base, tonic } = noteFrame(result, name);
    return noteLabel(eff.show, { semis: semitones(result, r.root, r.position), value: atom.value, alter: atom.alter, lap: period(result, name) }, base, tonic, eff.conv);
  } catch {
    return null;
  }
}

/** The braid as a list of tokens, and what kind of braid it is. */
export interface Listed {
  readonly tokens: readonly string[];
  /** Written as a list; empty (the default grid); or made by a function (scan(…), sin(…)). */
  readonly kind: 'list' | 'empty' | 'function';
  /** A braid left free whose steps as they play aren't the ones written: a take, held. */
  readonly held?: boolean;
}

/** A braid left free (free(0 2 4 ~), #210): its free value, or null. */
export const freeBraidOf = (result: CompileResult, name: string): FreeSpec | null => result.cells.get(name)?.frees.find((f) => f.key === 'braid') ?? null;

/**
 * The braid as a list: the tokens written (`braid`, the words of its declaration's braid); a braid left free,
 * its steps as they play (a take's while one is held); empty or a function, the entries it stands for.
 */
export function listed(result: CompileResult, name: string, shifts: Shifts, braid: readonly string[]): Listed {
  const cell = result.cells.get(name);
  const free = freeBraidOf(result, name);
  if (braid.length === 1 && free?.braid !== undefined && /^free\(/.test(braid[0])) {
    const written = braid[0].slice('free('.length, -1).trim().replace(/\s+/g, ' ');
    return { tokens: splitWords(free.braid), kind: 'list', held: free.braid !== written };
  }
  if (braid.length === 0) return { tokens: Array.from({ length: cell?.cycle ?? 12 }, (_, i) => String(i)), kind: 'empty' };
  if (braid.length === 1 && /^(scan|sin)\(/.test(braid[0]) && cell) {
    const vals = shiftedUnits(result, name, shifts(name)).map((u) => (u.atom.kind === 'note' ? String(u.atom.value) : '~'));
    return { tokens: vals, kind: 'function' };
  }
  return { tokens: braid, kind: 'list' };
}

/** A label for each token on the wheel: a reference by its name, a note by its name when shown so, else the step (a long number to three figures). */
export const tokenLabels = (result: CompileResult, name: string, shifts: Shifts, tokens: readonly string[]): string[] =>
  tokens.map((t) => (t.startsWith('&') ? t.replace(/[!*@]\d+$/, '') : (tokenName(result, name, shifts, t) ?? stepText(t))));

/** Entries per lap of the table the cell reads (12 chromatic, 7 for a scale); at least 1. */
export function lap(result: CompileResult, name: string): number {
  try {
    return Math.max(1, period(result, name));
  } catch {
    return 12;
  }
}
