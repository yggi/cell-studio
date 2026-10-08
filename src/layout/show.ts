/**
 * show= — how a cell is shown (never how it sounds). Every cell has an
 * inferred show; show= overrides it, and is the default for everything below
 * the cell (its parts, &refs, and its tables, over=) — wherever it fits.
 * step= drivers aren't below in this sense: a melody's show never renames its meter.
 */
import { codeShifts, ROOT, type CompileResult } from '../engine/program';
import { entries, resolveIn, resolvePitch, semitones } from '../engine/helix';
import { modeName, mod } from '../theory/modes';
import { SHOWS } from '../engine/parser';

export type Show = (typeof SHOWS)[number];

/** What a cell is, for showing it. */
export type Kind = 'voice' | 'adsr' | 'grid' | 'meter' | 'mix' | 'table' | 'braid' | 'volume' | 'note' | 'selector' | 'lfo';

/** The shows that fit each kind of cell (the first is the plain one). */
export const FITS: Readonly<Record<Kind, readonly Show[]>> = {
  voice: ['wave', 'spectrum', 'petal', 'off'],
  adsr: ['adsr', 'table', 'petal', 'off'],
  grid: ['grid', 'table', 'off'],
  meter: ['meter', 'pattern', 'sun', 'off'],
  mix: ['mix'],
  table: ['table', 'equal', 'scale', 'mode', 'key', 'notes', 'midi', 'do', 'degrees', 'brightness', 'petal', 'off'],
  braid: ['braid', 'pattern', 'notes', 'midi', 'do', 'degrees', 'petal', 'off'],
  volume: ['levels', 'braid', 'pattern', 'petal', 'off'],
  note: ['note', 'off'],
  selector: ['matrix', 'braid', 'pattern', 'petal', 'off'],
  lfo: ['lfo', 'levels', 'braid', 'petal', 'off'],
};

/** Shows that belong to the cell itself, not passed down: hiding a cell hides only it. */
const OWN: readonly Show[] = ['petal', 'off'];

/** show= as written: the show, and a naming convention (notes:flats, do:fixed). */
function parseShow(raw: string | null | undefined): { show: Show; conv: string } | null {
  if (!raw) return null;
  const [show, conv = ''] = raw.split(':');
  return (SHOWS as readonly string[]).includes(show) ? { show: show as Show, conv } : null;
}

/** What each show does, for the picker. */
export const SHOW_MEANING: Readonly<Record<Show, string>> = {
  braid: 'steps, coloured by pitch',
  pattern: 'rhythm only: hits and rests',
  equal: 'its entries evenly round the ring, wired from the slots they take: the taps stay put as it turns',
  notes: 'note names: C4 D4 E4',
  midi: 'MIDI numbers: 60 62 64',
  do: 'movable do: do re mi from the tonic',
  degrees: 'scale degrees: 1 2 3',
  table: 'its entries as numbers',
  scale: 'a scale: its mode on its tonic',
  mode: 'its mode: major, minor, Dorian …',
  key: 'a key: its tonic',
  grid: 'a grid: steps to its period',
  meter: 'a meter: beats to the bar',
  spectrum: 'the sound: a spectral waterfall',
  adsr: 'an envelope curve',
  mix: 'the voices it mixes',
  wave: 'its waveform: one cycle, and the sound itself while it plays',
  sun: 'a day meter as the sun: a 24-hour dial, noon at the top',
  brightness: 'its modes by brightness: each degree shaded by the mode that starts on it (Lydian bright … Locrian dark)',
  levels: 'its levels, as bars',
  note: 'a note in the graph: its label',
  petal: 'small, hung from the cell that uses it',
  off: 'hidden from the graph',
  matrix: 'a barrel of pins: a ring per part, a pin where it plays',
  lfo: 'one cycle of its movement, round the ring, at its rate',
};

export function kindOf(result: CompileResult, name: string): Kind {
  const c = result.cells.get(name);
  if (!c) return 'braid';
  if (c.note) return 'note';
  if (isSelector(result, name)) return 'selector';
  if (c.voice) return 'voice';
  if (c.map?.kind === 'adsr') return 'adsr';
  if (c.root) return 'grid';
  if (c.mix || c.sink || c.kit) return 'mix';
  if (result.clocks.get(name)?.positional) return 'meter';
  // a bar written as levels (meter(…)): a meter, whatever it reads through
  if (result.clocks.has(name) && c.leveled) return 'meter';
  // it loops at a rate, and nothing plays it as a melody: it moves something (a vibrato, a sweep, a breath)
  if (c.loops && !result.outputs.some((o) => o.cell === name)) return 'lfo';
  if (c.map?.kind === 'amp' || c.map?.kind === 'lin' || c.map?.kind === 'db') return 'volume';
  const readAsTable = [...result.cells.values()].some((x) => x.over === name);
  const played = result.outputs.some((o) => o.cell === name);
  return readAsTable && !played ? 'table' : 'braid';
}

/** A selector: a cell reading a table whose entries are mixes (parts) — its numbers pick which play. */
export function isSelector(result: CompileResult, name: string): boolean {
  const t = result.cells.get(result.cells.get(name)?.over ?? '');
  return !!t && t.units.length > 0 && t.units.every((u) => u.atom.kind === 'ref' && !!result.cells.get(u.atom.name)?.mix && !result.cells.get(u.atom.name)?.sink);
}

/** The show a cell has without show=: what it has always looked like. */
export function inferShow(result: CompileResult, name: string): Show {
  const kind = kindOf(result, name);
  if (kind !== 'table') return FITS[kind][0];
  const es = entries(result, name, 0);
  if (es.length === 12) return 'key';
  try {
    const shifts = codeShifts(result);
    const pitches = es.map((e) => {
      const r = resolvePitch(result, name, e.value, e.alter, shifts);
      return semitones(result, r.root, r.position);
    });
    if (modeName(pitches)) return 'scale';
  } catch {
    /* not resolvable: a plain table */
  }
  return 'table';
}

/** The cells right above a cell: those that splice it (&refs) or read it (over=). */
function parentsOf(result: CompileResult, name: string): string[] {
  const out: string[] = [];
  for (const c of result.cells.values()) {
    if (c.over === name) out.push(c.name);
    else if (c.units.some((u) => u.atom.kind === 'ref' && u.atom.name === name)) out.push(c.name);
  }
  return out;
}

/**
 * A cell's show, and where it comes from: its own show=, the nearest cell above
 * it whose show= fits it, or inferred.
 */
export function effectiveShow(result: CompileResult, name: string): EffectiveShow {
  let byName = effectiveCache.get(result);
  if (!byName) effectiveCache.set(result, (byName = new Map()));
  let hit = byName.get(name);
  if (!hit) byName.set(name, (hit = computeShow(result, name)));
  return hit;
}

/** (Every glyph asks on every redraw, and each answer walks the cells above it: kept per compiled program.) */
type EffectiveShow = { readonly show: Show; readonly conv: string; readonly from: 'set' | 'inferred' | string };
const effectiveCache = new WeakMap<CompileResult, Map<string, EffectiveShow>>();

function computeShow(result: CompileResult, name: string): EffectiveShow {
  const fits = FITS[kindOf(result, name)];
  const own = parseShow(result.cells.get(name)?.show);
  if (own && fits.includes(own.show)) return { ...own, from: 'set' };
  // breadth first, upward: the nearest show= that fits
  const seen = new Set([name]);
  let level = [name];
  for (let depth = 0; depth < 16 && level.length; depth++) {
    const next: string[] = [];
    for (const n of level)
      for (const p of parentsOf(result, n)) {
        if (seen.has(p)) continue;
        seen.add(p);
        const s = parseShow(result.cells.get(p)?.show);
        if (s && !OWN.includes(s.show) && fits.includes(s.show)) return { ...s, from: p };
        next.push(p);
      }
    level = next;
  }
  return { show: inferShow(result, name), conv: '', from: 'inferred' };
}

/**
 * The grid whose colours a voice, a mix or the sound card wears (the owner's rule, #34): colour follows the grid each
 * voice's notes are read through. A voice: its notes' grid. A mix or the sound card: the one grid every voice it hears is
 * on; several collide, and it shows no colour (null) — unless its own `show=mix:&grid` names the grid it follows. A voice
 * with no pitched notes (a kit, a gate) has no say; nothing to say, the default grid.
 */
export function heardGrid(result: CompileResult, name: string): string | null {
  const c = result.cells.get(name);
  const own = c && kindOf(result, name) === 'mix' ? parseShow(c.show) : null;
  const named = own?.show === 'mix' && own.conv.startsWith('&') ? own.conv.slice(1) : null;
  if (named && result.cells.get(named)?.root) return named;
  const shifts = codeShifts(result);
  const grids = new Set<string>();
  for (const o of result.outputs)
    if ((o.voice === name || o.via.includes(name) || o.through.includes(name)) && !o.kit && !o.gate)
      try {
        grids.add(resolvePitch(result, o.cell, 0, 0, shifts).root);
      } catch {
        /* not resolvable: no say */
      }
  return grids.size > 1 ? null : ([...grids][0] ?? ROOT);
}

/** The pitch 0 of the voice that plays a cell (directly or as a part), in Hz; C4 if none. */
export function voiceBase(result: CompileResult, name: string): number {
  const containsIt = (cell: string, seen = new Set<string>()): boolean => {
    if (cell === name) return true;
    if (seen.has(cell)) return false;
    seen.add(cell);
    const c = result.cells.get(cell);
    return !!c && (c.over === name || c.units.some((u) => u.atom.kind === 'ref' && containsIt(u.atom.name, seen)) || (!!c.over && containsIt(c.over, seen)));
  };
  for (const o of result.outputs) if (!o.kit && containsIt(o.cell)) return result.cells.get(o.voice)?.freq ?? 261.63;
  return 261.63;
}

const NOTE = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const SHARPS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const FLATS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
/** German: B♭ is B, B is H; flats otherwise as es-names would be (written here with ♭). */
const GERMAN = ['C', 'Cis', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'];
/** Movable do, by semitones from the tonic (chromatic syllables between the scale's). */
const SOLFEGE = ['do', 'di', 're', 'me', 'mi', 'fa', 'fi', 'sol', 'le', 'la', 'te', 'ti'];

/** A note to be named: its pitch (semitones from its grid's 0), its value, and the table it's read through. */
export interface Named {
  readonly semis: number;
  readonly value: number;
  readonly alter: number;
  /** Entries in its table (for degrees). */
  readonly lap: number;
}

/**
 * A note's name under a show: notes, midi, do (from the tonic), degrees — or
 * null where the show doesn't name notes. base: the voice's pitch 0 (Hz);
 * tonic: the semitones of the cell's own 0.
 */
export function noteLabel(show: Show, n: Named, base: number, tonic: number, conv = ''): string | null {
  const freq = base * Math.pow(2, n.semis / 12);
  const midi = 69 + 12 * Math.log2(freq / 440);
  switch (show) {
    case 'notes': {
      const m = Math.round(midi);
      const names = conv === 'flats' ? FLATS : conv === 'sharps' ? SHARPS : conv === 'german' ? GERMAN : NOTE;
      return `${names[mod(m, 12)]}${Math.floor(m / 12) - 1}`;
    }
    case 'midi':
      return String(Math.round(midi));
    case 'do':
      // movable do counts from the tonic; fixed do from C
      return SOLFEGE[conv === 'fixed' ? mod(Math.round(midi), 12) : mod(Math.round(n.semis - tonic), 12)];
    case 'degrees': {
      const d = mod(Math.round(n.value), Math.max(1, n.lap)) + 1;
      return `${n.alter > 0 ? '♯' : n.alter < 0 ? '♭' : ''}${d}`;
    }
    default:
      return null;
  }
}

/** Does a show name notes (so wheels label their steps)? */
export const names = (s: Show) => s === 'notes' || s === 'midi' || s === 'do' || s === 'degrees';

/**
 * The tonic for movable do: 0 of the table a cell reads — as the table turns (a
 * key changing moves do), but not as the reference shifts it (&scale[>>] reads a
 * step up: a sequence, still in the key).
 */
export function tonicOf(result: CompileResult, name: string): number {
  try {
    const shifts = codeShifts(result);
    const table = result.cells.get(name)?.over;
    const r = table ? resolveIn(result, table, 0, 0, 0, shifts) : resolvePitch(result, name, 0, 0, shifts);
    return semitones(result, r.root, r.position);
  } catch {
    return 0;
  }
}
