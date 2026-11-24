/**
 * A fragment heard alone, pictured by its facet (#623, the mock-up's "heard alone" sheet): what it plays, as the facet
 * reads best (a drum grid, a roll, its sections, the keys it plays, a meter's ticks, the roles it gives), and what it
 * reads, as controls (each optional parameter at its default: a knob for a value 0…1, sliders for a style it picks from,
 * the text as written otherwise). Every number comes from the fragment's text and the events its host plays: nothing is
 * kept per fragment. Pure.
 */
import { splitComment } from '@yggi/cells/edit';
import { readFrom } from '@yggi/cells/repository';

/** An event as the picture reads it: when, how long, at what pitch, on which voice, how loud. */
export interface HeardNote {
  readonly at: number;
  readonly dur: number;
  readonly freq: number;
  readonly voice: string;
  readonly level: number;
}

/** What the picture draws, in a unit square (x and y 0…1, y up), by the facet. */
export type Picture =
  /** A rhythm: a row per voice, a slot per sixteenth of its first bar, each slot's level (0 none, 1 the loudest). */
  | { readonly kind: 'grid'; readonly rows: readonly { readonly voice: string; readonly slots: readonly number[] }[] }
  /** A line, a harmony, a mode: its notes over its first bars. */
  | { readonly kind: 'roll'; readonly notes: readonly { readonly x: number; readonly w: number; readonly y: number }[] }
  /** A form: the sections its head plays, in order, each lettered by the first time it comes. */
  | { readonly kind: 'sections'; readonly sections: readonly { readonly name: string; readonly letter: string }[] }
  /** An instrument: the keys it is played on (MIDI notes), the lit ones those its host plays. */
  | { readonly kind: 'keys'; readonly lo: number; readonly hi: number; readonly lit: readonly number[] }
  /** A meter: its ticks over a bar, the first strong. */
  | { readonly kind: 'ticks'; readonly ticks: readonly { readonly x: number; readonly strong: boolean }[] }
  /** A performer, a band: the roles (heads) it gives. */
  | { readonly kind: 'roles'; readonly roles: readonly string[] }
  /** Nothing it plays alone (a style, a table of envelopes). */
  | { readonly kind: 'none' };

/** A parameter it reads, at its default: a knob (a number 0…1), sliders (a style's axes), or the text as written. */
export type Control =
  | { readonly kind: 'knob'; readonly name: string; readonly value: number }
  | { readonly kind: 'sliders'; readonly name: string; readonly axes: readonly { readonly axis: string; readonly value: number }[] }
  | { readonly kind: 'text'; readonly name: string; readonly text: string };

const PICTURE: Readonly<Record<string, Picture['kind']>> = {
  rhythm: 'grid',
  motif: 'roll',
  bass: 'roll',
  stab: 'roll',
  harmony: 'roll',
  mode: 'roll',
  expression: 'roll',
  form: 'sections',
  instrument: 'keys',
  meter: 'ticks',
  // (a module's picture is its knobs: alone, its host's one drone says little)
  module: 'none',
  performer: 'roles',
  band: 'roles',
  style: 'none',
};

/** The picture a facet draws (its first facet's; a roll for one this doesn't know). */
export const pictureKind = (facets: readonly string[]): Picture['kind'] => PICTURE[facets[0] ?? ''] ?? 'roll';

const signatureOf = (text: string) => {
  for (const raw of text.split('\n')) {
    const f = readFrom(splitComment(raw)[0].trim());
    if (f?.kind === 'signature') return f;
  }
  return null;
};
/** The fragment's own line for a name: a cell of that name (never a `from` line). */
const lineOf = (text: string, name: string): string | null => {
  for (const raw of text.split('\n')) {
    const code = splitComment(raw)[0].trim();
    if (readFrom(code) !== undefined) continue;
    if (new RegExp(`^${name}(?![A-Za-z0-9_])`).test(code)) return code.slice(name.length).trim();
  }
  return null;
};
/** The cells a line reads by name, bare tokens only (`&call`, not `&call^-2`), in order. */
const refsOf = (line: string | null): string[] => (line ?? '').split(/\s+/).filter((t) => /^&[A-Za-z_]\w*$/.test(t));
const midiOf = (freq: number) => Math.round(69 + 12 * Math.log2(freq / 440));

/** The picture of a fragment heard alone, by its facets: `notes` its host's events, `bar` its bar's length in seconds. */
export function pictureOf(facets: readonly string[], text: string, notes: readonly HeardNote[], bar: number): Picture {
  const kind = pictureKind(facets);
  if (kind === 'roles') {
    // (the heads its head's line plays, where it lists two or more: a band's parts; else every head)
    const heads = signatureOf(text)?.names ?? [];
    const listed = heads[0] ? refsOf(lineOf(text, heads[0])).filter((r) => heads.includes(r)) : [];
    return { kind, roles: (listed.length >= 2 ? listed : heads).map((n) => n.slice(1)) };
  }
  if (kind === 'sections') {
    const head = signatureOf(text)?.names[0];
    const refs = head ? refsOf(lineOf(text, head)) : [];
    if (!refs.length) return rollOf(notes, bar);
    const letters = new Map<string, string>();
    for (const r of refs) if (!letters.has(r)) letters.set(r, String.fromCharCode(65 + letters.size));
    return { kind, sections: refs.map((r) => ({ name: r.slice(1), letter: letters.get(r)! })) };
  }
  if (kind === 'none') return { kind };
  const heard = notes.filter((n) => n.level > 0);
  if (kind === 'grid') {
    const SLOTS = 16;
    const voices = [...new Set(heard.map((n) => n.voice))];
    const loudest = Math.max(1e-9, ...heard.map((n) => n.level));
    const rows = voices.map((voice) => {
      const slots = Array.from({ length: SLOTS }, () => 0);
      for (const n of heard) {
        if (n.voice !== voice || n.at >= bar) continue;
        const i = Math.min(SLOTS - 1, Math.floor((n.at / bar) * SLOTS + 1e-6));
        slots[i] = Math.max(slots[i]!, n.level / loudest);
      }
      return { voice, slots };
    });
    return { kind, rows };
  }
  if (kind === 'keys') {
    const lit = [...new Set(heard.map((n) => midiOf(n.freq)))].sort((a, b) => a - b);
    if (!lit.length) return { kind, lo: 60, hi: 71, lit };
    // (whole octaves round what it plays, from a C)
    const lo = Math.floor(lit[0]! / 12) * 12;
    const hi = Math.max(lo + 11, Math.ceil((lit[lit.length - 1]! + 1) / 12) * 12 - 1);
    return { kind, lo, hi, lit };
  }
  if (kind === 'ticks') {
    const onsets = [...new Set(heard.filter((n) => n.at < bar).map((n) => Math.round((n.at / bar) * 1000) / 1000))].sort((a, b) => a - b);
    return { kind, ticks: onsets.map((x, i) => ({ x, strong: i === 0 })) };
  }
  return rollOf(heard, bar);
}

/** Its notes over its first four bars (8 s at most), pitch up. */
function rollOf(notes: readonly HeardNote[], bar: number): Picture {
  const span = Math.min(8, 4 * bar) || 8;
  const shown = notes.filter((n) => n.level > 0 && n.at < span);
  if (!shown.length) return { kind: 'roll', notes: [] };
  const pitch = shown.map((n) => 12 * Math.log2(n.freq / 440));
  const [lo, hi] = [Math.min(...pitch), Math.max(...pitch)];
  return {
    kind: 'roll',
    notes: shown.map((n, i) => ({ x: n.at / span, w: Math.min(n.dur, span - n.at) / span, y: hi > lo ? (pitch[i]! - lo) / (hi - lo) : 0.5 })),
  };
}

/** What it reads, as controls: each optional parameter of its signature, at its default line. */
export function controlsOf(text: string): Control[] {
  const sig = signatureOf(text);
  if (!sig) return [];
  return sig.optional.flatMap((p): Control[] => {
    const name = p.slice(1);
    const line = lineOf(text, p);
    if (line === null) return [];
    if (/\bmap=style\b/.test(line)) {
      const axes = [...line.matchAll(/\b([a-z]+)=(-?\d*\.?\d+)/g)].map((m) => ({ axis: m[1]!, value: Number(m[2]) }));
      return [{ kind: 'sliders', name, axes }];
    }
    // (a number 0…1 after its map: a knob; anything else as written)
    const tokens = line.split(/\s+/).filter((t) => !/^[a-z]+=/.test(t));
    const value = tokens.length === 1 ? Number(tokens[0]) : NaN;
    return [Number.isFinite(value) && value >= 0 && value <= 1 ? { kind: 'knob', name, value } : { kind: 'text', name, text: line }];
  });
}
