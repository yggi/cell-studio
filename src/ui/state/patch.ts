// A piece's patch on webmidi's book (decision 040, docs/ui/midi.md): Cell studio's rows (the piece's gates and voices,
// its kit and the kit's members) as webmidi's matrix rows, the routes a setup keeps for a piece as cells' channel table,
// the store from before the book read as it was, and an input's message forwarded where its row is routed. Pure.

import {
  ANY_INPUT,
  AS_PLAYED,
  activeSetup,
  inputRow,
  withClock,
  withCrossing,
  withHeard,
  withProfile,
  type Crossing,
  type PortOption,
  type Routes,
  type Setup,
  type SetupBook,
  type SetupOutput,
} from '@yggi/webmidi/core';
import type { MatrixRow } from '@yggi/webmidi/ui';
import { DEFAULT_BEND_RANGE, type ChannelTable, type OutputChoice } from '@yggi/cells/engine/midi';

/** The row the kit's channel is kept under in a piece's routes: no cell can be named so. */
export const KIT = '*';

/** The context a piece's routes are kept under in a setup: `piece:<title>` (an untitled piece's is `piece:`). */
export const contextOf = (title: string | null): string => `piece:${title ?? ''}`;

/** A value kept under a key of its own: a piece titled `constructor` or `__proto__` has none (not the object's). */
export const own = <T>(o: Readonly<Record<string, T>>, key: string): T | undefined => (Object.hasOwn(o, key) ? o[key] : undefined);

// ---- the store from before the book (`cell-studio:midi`), as it was read ----

type Chosen = { readonly id: string; readonly name: string };
type Numbers = Readonly<Record<string, number>>;
type Range = { readonly from: number; readonly to: number };

/** A piece's matrix as the store before the book kept it: by output key, a row's channel (0: not sent there). */
export type OldRoutes = Readonly<Record<string, Numbers>>;

/** The store before the book (`cell-studio:midi`), as its reader made it: what webmidi's `fromCellStudio` takes. */
export interface OldStore {
  readonly outputs: readonly (Chosen & { readonly key: string })[];
  readonly in: Chosen;
  /** By piece title. */
  readonly routes: Readonly<Record<string, OldRoutes>>;
  readonly drums: Readonly<Record<string, Numbers>>;
  readonly internal: boolean;
  readonly bendRange: number;
  readonly rotate: Range | null;
  readonly bends: Numbers;
  readonly rotates: Readonly<Record<string, Range | null>>;
  readonly clock: Readonly<Record<string, boolean>>;
}

const NONE: Chosen = { id: 'none', name: '' };
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const chosen = (v: unknown): Chosen => (isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string' ? { id: v.id, name: v.name } : NONE);
const numbers = (v: unknown, lo: number, hi: number): Record<string, number> =>
  isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, number] => Number.isInteger(e[1]) && (e[1] as number) >= lo && (e[1] as number) <= hi)) : {};
const nested = (v: unknown, lo: number, hi: number): Record<string, Numbers> => (isRecord(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, numbers(x, lo, hi)])) : {});
const flags = (v: unknown): Record<string, boolean> => (isRecord(v) ? Object.fromEntries(Object.entries(v).filter((e): e is [string, boolean] => typeof e[1] === 'boolean')) : {});
const channel = (v: unknown, fallback: number) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 16 ? (v as number) : fallback);
const rangeOf = (v: unknown): Range | null => (isRecord(v) ? { from: channel(v.from, 2), to: channel(v.to, 16) } : null);
const rangesOf = (v: unknown): Record<string, Range | null> => (isRecord(v) ? Object.fromEntries(Object.entries(v).map(([k, r]) => [k, rangeOf(r)])) : {});

/** The outputs kept (at least one), each under a key of its own. */
function outputsOf(v: unknown): (Chosen & { key: string })[] {
  const out: (Chosen & { key: string })[] = [];
  if (Array.isArray(v)) for (const x of v) if (isRecord(x) && typeof x.key === 'string' && x.key && !out.some((c) => c.key === x.key)) out.push({ key: x.key, ...chosen(x) });
  return out.length ? out : [{ key: 'o1', ...NONE }];
}

/**
 * A store from before the matrix, as the matrix: the one output as the first (`o1`), each piece's channels and kit
 * channel as its routes there, and the devices of the output slots a piece's MIDI cards named (slot n) as the nth
 * output, where that is still free.
 */
function beforeMatrix(kept: Record<string, unknown>): Pick<OldStore, 'outputs' | 'routes'> {
  const outputs: (Chosen & { key: string })[] = [{ key: 'o1', ...chosen(kept.out) }];
  const routes: Record<string, Record<string, Numbers>> = {};
  for (const [title, voices] of Object.entries(nested(kept.channels, 1, 16))) routes[title] = { o1: voices };
  for (const [title, kit] of Object.entries(numbers(kept.kits, 1, 16))) routes[title] = { o1: { ...routes[title]?.o1, [KIT]: kit } };
  if (isRecord(kept.slots))
    for (const slots of Object.values(kept.slots))
      if (isRecord(slots))
        for (const [n, c] of Object.entries(slots)) {
          const i = Number(n) - 1;
          if (!Number.isInteger(i) || i < 1 || i > 15 || chosen(c) === NONE) continue;
          while (outputs.length <= i) outputs.push({ key: `o${outputs.length + 1}`, ...NONE });
          const at = outputs[i]!;
          if (at.id === 'none') outputs[i] = { key: at.key, ...chosen(c) };
        }
  return { outputs, routes };
}

/** The store before the book, as its reader read it (anything: junk is the defaults), or null: nothing kept. */
export function readOldStore(text: string | null): OldStore | null {
  let kept: unknown;
  try {
    kept = JSON.parse(text ?? 'null');
  } catch {
    kept = {};
  }
  if (kept === null) return null;
  if (!isRecord(kept)) kept = {};
  const k = kept as Record<string, unknown>;
  const matrix =
    'outputs' in k
      ? { outputs: outputsOf(k.outputs), routes: isRecord(k.routes) ? Object.fromEntries(Object.entries(k.routes).map(([t, r]) => [t, nested(r, 0, 16)])) : {} }
      : beforeMatrix(k);
  return {
    ...matrix,
    in: chosen(k.in),
    drums: nested(k.drums, 0, 127),
    internal: typeof k.internal === 'boolean' ? k.internal : true,
    bendRange: typeof k.bendRange === 'number' && k.bendRange >= 1 && k.bendRange <= 96 ? k.bendRange : DEFAULT_BEND_RANGE,
    rotate: rangeOf(k.rotate),
    bends: numbers(k.bends, 1, 96),
    rotates: rangesOf(k.rotates),
    clock: flags(k.clock),
  };
}

// ---- a piece's routes, as cells' channel table reads them ----

/** A crossing that sends on a channel (an input's `AS_PLAYED` on a voice's row sends nothing). */
const sends = (c: Crossing | undefined): c is number => c !== undefined && Number.isInteger(c) && c >= 1 && c <= 16;

/**
 * The choices cells' `channelTable` takes from a setup's routes for a piece: each row on each output exactly where its
 * crossings say, and nowhere else (the book's rule: a crossing that is absent sends nothing), so the defaults cells
 * gives a row with no choice are switched off for every row of the piece (`voices`: its routable gates and voices).
 */
export function choicesOf(routes: Routes, outputs: readonly SetupOutput[], voices: readonly string[]): OutputChoice[] {
  const at = (row: string, key: string): number => {
    const c = own(routes, row);
    const v = c && own(c, key);
    return sends(v) ? v : 0;
  };
  return outputs.map((o) => ({ voices: Object.fromEntries(voices.map((v) => [v, at(v, o.key)])), kit: at(KIT, o.key) }));
}

/** The choices a piece's matrix from before the book makes (its title's, by output key): cells' defaults where it chose nothing. */
export const oldChoicesOf = (routes: OldRoutes | undefined, outputs: readonly SetupOutput[]): OutputChoice[] =>
  outputs.map((o) => {
    const { [KIT]: kit, ...voices } = (routes && own(routes, o.key)) ?? {};
    return { voices, kit };
  });

/** A channel table as a setup's routes: each gate and voice, and the kit (`KIT`), on each output and channel it goes to. */
export function routesOfTable(table: ChannelTable, outputs: readonly SetupOutput[]): Record<string, Record<string, Crossing>> {
  const routes: Record<string, Record<string, Crossing>> = {};
  const put = (row: string, port: number, ch: number) => {
    const key = outputs[port - 1]?.key;
    if (key && !own(routes[row] ?? {}, key)) (routes[row] ??= {})[key] = ch;
  };
  for (const v of table.voices) put(v.voice, v.port, v.channel);
  for (const k of table.kits) put(KIT, k.port, k.channel);
  return routes;
}

/** The book with the setup in use's routes for a context replaced, written in place: no custom variant (for what is shown, or a fact refreshed). */
export function withContext(book: SetupBook, context: string, routes: Routes): SetupBook {
  const active = activeSetup(book);
  return withSetup(book, { ...active, routes: { ...active.routes, [context]: routes } });
}

/** The book with one of its setups replaced in place (by id): no custom variant. */
export const withSetup = (book: SetupBook, setup: Setup): SetupBook => ({ ...book, setups: book.setups.map((s) => (s.id === setup.id ? setup : s)) });

/**
 * A change made on a book shown (`shown`, the book with what a piece plays written in), kept on the book itself: the
 * setup the change put in use as changed, every other setup as the book has it (what was only shown isn't kept there).
 */
export function keptChange(book: SetupBook, shown: SetupBook, changed: SetupBook): SetupBook {
  if (changed === shown) return book;
  return { ...changed, setups: changed.setups.map((s) => (s.id === changed.active ? s : (book.setups.find((b) => b.id === s.id) ?? s))) };
}

/**
 * A change made on a locked matrix's book (`shown`: a piece routed by its MIDI cards, their channels written in on every
 * slot they name), kept on the book itself as the locked matrix edits it (webmidi v0.1.4): the inputs heard, the input
 * rows' crossings in `context`, the clock, and the devices' profiles. The cards' own rows are theirs, not the setup's,
 * and a crossing or the clock to a slot only the cards name (the setup lacks its output) isn't kept. Each through
 * webmidi's changes, so a change to a named setup is its custom variant; the book as it is when nothing kept changed.
 */
export function lockedChange(book: SetupBook, shown: SetupBook, changed: SetupBook, context: string): SetupBook {
  if (changed === shown) return book;
  const [was, now] = [activeSetup(shown), activeSetup(changed)];
  const keys = activeSetup(book).outputs.map((o) => o.key);
  let kept = book;
  if (JSON.stringify(now.heard) !== JSON.stringify(was.heard)) kept = withHeard(kept, now.heard);
  for (const key of keys) if (now.clock.includes(key) !== was.clock.includes(key)) kept = withClock(kept, key, now.clock.includes(key));
  const inputs = (s: Setup) => (own(s.routes, context) ?? {}) as Routes;
  const [before, after] = [inputs(was), inputs(now)];
  const rows = new Set([...Object.keys(before), ...Object.keys(after)].filter((row) => row.startsWith('in:')));
  for (const row of rows)
    for (const key of keys) {
      const value = own(own(after, row) ?? {}, key);
      if (value !== own(own(before, row) ?? {}, key)) kept = withCrossing(kept, context, row, key, value);
    }
  if (changed.devices !== shown.devices)
    for (const [name, profile] of Object.entries(changed.devices)) if (name && profile !== own(shown.devices, name)) kept = withProfile(kept, name, profile);
  return kept;
}

/** The outputs a book shows for a piece whose MIDI cards name slots past the setup's: one more with no device for each, keyed as `addOutput` would key it. */
export function slotsOf(outputs: readonly SetupOutput[], slots: number): SetupOutput[] {
  const all = [...outputs];
  while (all.length < slots) {
    let n = all.length + 1;
    while (all.some((o) => o.key === `o${n}`)) n++;
    all.push({ key: `o${n}`, id: 'none', name: '' });
  }
  return all;
}

// ---- the rows ----

/** The matrix's rows for a piece: its gates and voices in order, then its kit and the kit's members (by General MIDI note). */
export function rowsOfPiece(voices: readonly string[], kit: readonly { readonly member: string; readonly note: number }[]): MatrixRow[] {
  const rows: MatrixRow[] = voices.map((v) => ({ id: v, label: `&${v}`, kind: 'voice' }));
  if (kit.length) {
    rows.push({ id: KIT, label: 'Kit', kind: 'kit', group: true });
    for (const k of kit) rows.push({ id: `${KIT}${k.member}`, label: `&${k.member}`, kind: 'member', note: k.note });
  }
  return rows;
}

// ---- the inputs ----

/** Whether a message came from an input among `ports` (by its name, as a message says where it came from; or `'all'`). */
export const isAmong = (ports: readonly PortOption[] | 'all', source: string): boolean => ports === 'all' || ports.some((p) => (p.name || p.id) === source);

/**
 * Where a message from an input goes (its row `in:<name>`, and every input's, `ANY_INPUT`, when the frontend hears it):
 * each output its row crosses, with the channel replaced by the crossing's, or kept (`AS_PLAYED`). Only a channel's
 * messages (note, pressure, a control, a program, a bend) go: the system's (the clock, SysEx) are not forwarded.
 */
export function forwards(data: ArrayLike<number>, source: string, heard: boolean, routes: Routes): { key: string; data: number[] }[] {
  const status = data[0] ?? 0;
  if (status < 0x80 || status >= 0xf0) return [];
  const out: { key: string; data: number[] }[] = [];
  const rows = [inputRow({ id: source, name: source }), ...(heard ? [ANY_INPUT] : [])];
  for (const row of rows) {
    const crossings = own(routes, row);
    if (!crossings) continue;
    for (const [key, ch] of Object.entries(crossings)) {
      if (ch !== AS_PLAYED && !sends(ch)) continue;
      const bytes = Array.from(data);
      if (ch !== AS_PLAYED) bytes[0] = (status & 0xf0) | (ch - 1);
      out.push({ key, data: bytes });
    }
  }
  return out;
}

/** Whether any input row is routed in a context (every input's, `ANY_INPUT`, included). */
export const forwardsAny = (routes: Routes): boolean => Object.entries(routes).some(([row, c]) => row.startsWith('in:') && Object.keys(c).length > 0);
