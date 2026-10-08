/**
 * What a plugin's drawing is given: one plain value, a frozen copy: no handles on the program or the player. Everything
 * it may know about the cell, the piece's time and (for a day's law) the law, as data.
 */
import { dayLaw } from '../engine/fiveto12';
import type { CompileResult } from '../engine/program';
import type { ShowPlugin } from '../engine/plugins';
import { NOTE_NAMES } from '../theory/modes';

export interface PluginView {
  readonly name: string;
  /** The cell's parameters as written (anchor=, …). */
  readonly params: Readonly<Record<string, number | string>>;
  readonly size: number;
  /** Ids for gradients and clips, unique to this drawing (the same cell can be drawn twice at once). */
  readonly uid: string;
  readonly tokens: Readonly<Record<string, string>>;
  /** Seconds: the piece's time while it plays, else where play will start. */
  readonly time: { readonly seconds: number; readonly playing: boolean };
  /** The law that reads this cell through over= (`law=fiveto12`): its day as data; null if none does. */
  readonly law: (ReturnType<typeof dayLaw> & { readonly noteNames: readonly string[] }) | null;
}

export function viewOf(program: CompileResult, plugin: ShowPlugin, name: string, uid: string, seconds: number, playing: boolean): PluginView {
  const cell = program.cells.get(name);
  const reads = [...program.cells.values()].some((c) => c.params.law === 'fiveto12' && c.over === name);
  // (a copy, frozen: a drawing reads the piece, it does not hold it)
  return Object.freeze({
    name,
    params: Object.freeze({ ...cell?.params }),
    size: plugin.size,
    uid,
    tokens: Object.freeze({ ...plugin.tokens }),
    time: Object.freeze({ seconds, playing }),
    law: reads ? { ...dayLaw(), noteNames: NOTE_NAMES } : null,
  });
}
